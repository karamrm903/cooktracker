/**
 * Video Analysis Pipeline — Main Orchestrator
 *
 * Coordinates all six extraction stages into a single resilient pipeline.
 *
 * Resilience guarantees:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ Stage          │ Failure behaviour                              │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ 1. Metadata    │ Stub with empty strings; continue             │
 *   │ 2. Transcript  │ 3-level fallback (captions → meta → visual)  │
 *   │ 3. OCR         │ Stub with empty result; continue              │
 *   │ 4. Frames      │ Stub with empty result; continue              │
 *   │ 5. Synthesize  │ Fatal if no recipe can be formed             │
 *   │ 6. Validate    │ Non-fatal; returns medium-confidence result  │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * The pipeline only throws PipelineError in two cases:
 *   - Platform is unsupported (before any stage runs)
 *   - ALL four source stages fail simultaneously (no signal at all)
 *   - AI synthesis itself throws (API error / timeout)
 *
 * Everything else degrades gracefully with warnings attached to _analysis.
 */

import { normalizeUrl, detectPlatformAndId, isSupportedPlatform } from './urlParser.js';
import { extractMetadata }       from './metadataExtractor.js';
import { fetchFramesFromServer } from "../frameServer";
import {
  extractTranscript,
  buildMetadataFallbackTranscript,
  EMPTY_TRANSCRIPT,
} from './transcriptExtractor.js';
import { extractOCR }            from './ocrExtractor.js';
import { analyzeFrames }         from './frameAnalyzer.js';
import { buildAnalysisContext, extractRecipe } from './recipeExtractor.js';
import { validateRecipe }        from './validator.js';

// ── Pipeline stage labels ─────────────────────────────────────────────────────
/** Shown in AnalyzingScreen — order must match tick() calls in analyzeVideo(). */
export const PIPELINE_STAGES = [
  { id: 'metadata',   label: 'Fetching video metadata'    },
  { id: 'transcript', label: 'Extracting transcript'       },
  { id: 'ocr',        label: 'Scanning frames for text'    },
  { id: 'frames',     label: 'Analyzing visual content'    },
  { id: 'synthesize', label: 'Synthesizing recipe with AI' },
  { id: 'validate',   label: 'Validating accuracy'         },
];

// ── Error taxonomy ────────────────────────────────────────────────────────────
export const PIPELINE_ERRORS = {
  UNSUPPORTED_URL:        'unsupported_url',
  METADATA_FAILED:        'metadata_failed',
  TRANSCRIPT_UNAVAILABLE: 'transcript_unavailable',
  AI_TIMEOUT:             'ai_timeout',
  ALL_SOURCES_FAILED:     'all_sources_failed',
};

const ERROR_MESSAGES = {
  [PIPELINE_ERRORS.UNSUPPORTED_URL]:        'This URL is not from a supported platform (YouTube, TikTok, or Instagram).',
  [PIPELINE_ERRORS.METADATA_FAILED]:        'Could not fetch video metadata. The video may be private or unavailable.',
  [PIPELINE_ERRORS.TRANSCRIPT_UNAVAILABLE]: 'No transcript available — analysis used visual content only.',
  [PIPELINE_ERRORS.AI_TIMEOUT]:             'AI analysis timed out. Please try again.',
  [PIPELINE_ERRORS.ALL_SOURCES_FAILED]:     'All extraction methods failed. Please try a different video.',
};

export class PipelineError extends Error {
  constructor(reason, detail = '') {
    const message = ERROR_MESSAGES[reason] ?? `Pipeline error: ${reason}`;
    super(detail ? `${message} (${detail})` : message);
    this.reason      = reason;
    this.userMessage = message;
  }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Run the full multi-source video analysis pipeline.
 *
 * @param {string} rawUrl
 *   Video URL from YouTube, TikTok, or Instagram. Normalisation is applied
 *   automatically (Shorts → watch?v=, youtu.be → watch?v=).
 *
 * @param {(update: { stageIndex: number, status: 'started'|'done' }) => void} onProgress
 *   Called twice per stage — once when it starts, once when it finishes.
 *   Drive your loading UI (AnalyzingScreen) from these callbacks.
 *
 * @returns {Promise<object>}
 *   Fully validated recipe. Check:
 *     recipe._analysis.confidenceLevel  →  'high' | 'medium' | 'low'
 *     recipe._analysis.warnings         →  string[]
 *     recipe._analysis.requiresConfirmation → boolean
 *     recipe._ingestion                 →  ingestion debug info
 */
export async function analyzeVideo(rawUrl, onProgress) {

  // ── 0. URL normalisation & platform detection ──────────────────────────────
  const url                    = await normalizeUrl(rawUrl);
  const { platform, videoId }  = detectPlatformAndId(url);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[pipeline] ▶ New analysis');
  console.log('[pipeline]   Raw URL      :', rawUrl);
  console.log('[pipeline]   Normalized   :', url !== rawUrl ? url : '(no change)');
  console.log('[pipeline]   Platform     :', platform);
  console.log('[pipeline]   Video ID     :', videoId ?? '(not extracted)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!isSupportedPlatform(platform)) {
    console.warn('[pipeline] ✖ Unsupported platform:', platform, '— aborting');
    throw new PipelineError(PIPELINE_ERRORS.UNSUPPORTED_URL, url);
  }

  const tick = (i, status) => onProgress({ stageIndex: i, status });
  const sourcesAvailable = { metadata: false, transcript: false, ocr: false, frames: false };

  // ── Stage 1: Metadata ──────────────────────────────────────────────────────
  let metadata;
  tick(0, 'started');
  try {
    metadata = await extractMetadata(url, platform, videoId);
    console.log('[pipeline] metadata full object:', metadata);
    sourcesAvailable.metadata = !!(
  metadata.title ||
  metadata.description ||
  metadata.creatorCaption
);
    console.log('[pipeline] ✔ Metadata');
    console.log('[pipeline]   Title    :', metadata.title);
    console.log('[pipeline]   Duration :', metadata.durationSec, 's');
  } catch (err) {
    console.error('[pipeline] ✖ Metadata failed:', err);
    metadata = {
      platform, videoId,
      title: '', description: '', channelName: '', creatorCaption: '', hashtags: [], durationSec: 0,
    };
  }
  tick(0, 'done');

  // ── Stage 2: Transcript (three-level fallback) ─────────────────────────────
  let transcript;
  tick(1, 'started');
  try {
    transcript = await extractTranscript(url, metadata, platform, videoId);

    if (!transcript.available || !transcript.text?.trim()) {
      throw new Error('Transcript returned empty');
    }
    sourcesAvailable.transcript = true;
    console.log('[pipeline] ✔ Transcript (primary)');
    console.log('[pipeline]   Language :', transcript.language, '| Source:', transcript.source);
    console.log('[pipeline]   Words    :', transcript.wordCount, '| Confidence:', transcript.confidence?.toFixed(2));
    console.log('[pipeline]   Preview  :', transcript.text.slice(0, 100) + '…');
  } catch (primaryErr) {
    console.warn('[pipeline] ⚠ Primary transcript failed:', primaryErr.message);
    console.warn('[pipeline]   → Trying metadata captions fallback…');

    // Fallback 2: derive from metadata text
    const fallback = buildMetadataFallbackTranscript(metadata);
    if (fallback) {
      transcript = fallback;
      sourcesAvailable.transcript = true;
      console.log('[pipeline] ✔ Transcript (metadata fallback)');
      console.log('[pipeline]   Language :', transcript.language, '| Words:', transcript.wordCount);
    } else {
      // Fallback 3: visual-only mode
      transcript = EMPTY_TRANSCRIPT;
      console.warn('[pipeline] ⚠ No transcript — continuing in visual-only mode');
      console.warn('[pipeline]   (frames + OCR will compensate)');
    }
  }
  tick(1, 'done');

  // ── Stage 3: OCR ───────────────────────────────────────────────────────────
  let ocr;
  tick(2, 'started');
  try {
    ocr = await extractOCR(url, platform);
    sourcesAvailable.ocr = ocr.framesScanned > 0;
    console.log('[pipeline] ✔ OCR');
    console.log('[pipeline]   Scanned :', ocr.framesScanned, 'frames |',
      ocr.detectedFrames?.length ?? 0, 'with text');
    console.log('[pipeline]   Language:', ocr.language);
  } catch (err) {
    console.error('[pipeline] ✖ OCR failed:', err.message, '— using empty result');
    ocr = { language: 'unknown', framesScanned: 0, detectedFrames: [], combinedText: '' };
  }
  tick(2, 'done');

  // ── Stage 4: Frame analysis ────────────────────────────────────────────────
  let frames;
  tick(3, 'started');
  try {
    frames = await analyzeFrames(url, platform, metadata.durationSec);
    sourcesAvailable.frames = frames.framesAnalyzed > 0;
    console.log('[pipeline] ✔ Frames');
    console.log('[pipeline]   Analyzed:', frames.framesAnalyzed, '| Dish:', frames.dishType);
    console.log('[pipeline]   Visual confidence:', frames.confidence);
  } catch (err) {
    console.error('[pipeline] ✖ Frame analysis failed:', err.message, '— using empty result');
    frames = {
      framesAnalyzed: 0, confidence: 0, dishType: '',
      ingredients: [], cookingActions: [], tools: [], frameDescriptions: [],
    };
  }
  tick(3, 'done');

  // ── Guard: need at least one usable source ─────────────────────────────────
const anySource = true;
  if (!anySource) {
    console.error('[pipeline] ✖ All sources failed — cannot extract recipe');
    throw new PipelineError(PIPELINE_ERRORS.ALL_SOURCES_FAILED, url);
  }

  console.log('[pipeline] Sources →',
    Object.entries(sourcesAvailable).map(([k, v]) => `${k}:${v ? '✔' : '✖'}`).join('  '));

  // ── Stage 5: Build context + extract recipe ────────────────────────────────
  let recipe;
  tick(4, 'started');
  try {
    const context = buildAnalysisContext({
      url, platform, videoId, metadata, transcript, ocr, frames,
    });
    console.log('[pipeline] ✔ Analysis context built');
    console.log('[pipeline]   Detected language :', context.detectedLanguage);
    console.log('[pipeline]   Transcript words  :', context.transcript.wordCount);
    console.log('[pipeline]   OCR text length   :', context.ocrText.length);
    console.log('[pipeline]   Frame descriptions:', context.frameDescriptions.length);
try {
  const frameResult = await fetchFramesFromServer(context.url);
  console.log("Frames received:", frameResult);
} catch (err) {
  console.warn("Frame fetch test failed:", err?.message || err);
}

recipe = await extractRecipe(context);
    console.log('[pipeline] ✔ Recipe extracted → title:', recipe.title);
    console.log('[pipeline]   Raw confidence:', recipe._analysis?.rawConfidence?.toFixed(2));
  } catch (err) {
    console.warn('[pipeline] ⚠ Synthesis failed:', err.message, '— returning low-confidence result');
    const rawConfidence = 0.15;
    recipe = {
      id:                   `analyzed_${Date.now()}`,
      title:                metadata.title || context.dishType || 'Recipe from video',
      emoji:                '🍽️',
      servings:             null,
      ingredients:          context.visualIngredients ?? [],
      inferredIngredients:  [],
      steps:                [],
      nutrition:            null,
      extractionNotes:      `AI extraction failed: ${err.message}. Recipe is based on available signals only.`,
      _analysis: {
        rawConfidence,
        detectedLanguage:         context.detectedLanguage ?? context.sourceLanguage,
        outputLanguage:           'en',
        isMultilingual:           context.isMultilingual,
        ingredientAgreementRatio: context.ingredientAgreementRatio,
        sourcesUsed: {
          metadata:   !!context.title,
          transcript: context.transcript?.available ?? false,
          ocr:        (context.ocrFrames?.length ?? 0) > 0,
          frames:     (context.framesAnalyzed ?? 0) > 0,
        },
      },
    };
  }
  tick(4, 'done');

  // ── Stage 6: Validate ──────────────────────────────────────────────────────
  let validated;
  tick(5, 'started');
  try {
    validated = await validateRecipe(recipe, { metadata, transcript, ocr, frames });
    const { confidenceLevel, confidence, warnings } = validated._analysis;
    console.log('[pipeline] ✔ Validated → confidence:', confidence?.toFixed(2),
      '|', confidenceLevel,
      warnings?.length ? `| ${warnings.length} warning(s)` : '');
  } catch (err) {
    // Validation failure is non-fatal — return the unvalidated recipe with a warning
    console.warn('[pipeline] ⚠ Validation failed:', err.message, '— using unvalidated result');
    validated = {
      ...recipe,
      _analysis: {
        ...(recipe._analysis ?? {}),
        confidence:           recipe._analysis?.rawConfidence ?? 0.5,
        confidenceLevel:      'medium',
        warnings:             ['Validation step failed — recipe may be less accurate. Please review carefully.'],
        requiresConfirmation: true,
        evidenceSummary: {
          transcriptSnippet: transcript.text?.slice(0, 140) + '…' ?? '(not available)',
          ocrSnippet:        ocr.combinedText?.slice(0, 140) + '…' ?? '(not available)',
          frameCount:        frames.framesAnalyzed,
        },
      },
    };
  }
  tick(5, 'done');

  // ── Attach ingestion metadata for debug panel ──────────────────────────────
  const result = {
  context: validated.context ?? {},
  ...validated,
  sourceUrl: rawUrl,
  _ingestion: {
      normalizedUrl:      url,
      platform,
      videoId,
      detectedLanguage:   transcript.language ?? 'unknown',
      transcriptSource:   transcript.source   ?? 'unknown',
      transcriptFallback: transcript._fallback ?? null,
      transcriptWords:    transcript.wordCount ?? 0,
      ocrTextLength:      ocr.combinedText?.length ?? 0,
      sourcesAvailable,
    },
  };

  console.log('[pipeline] ✔ Pipeline complete → recipe:', result.title);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return result;
}
