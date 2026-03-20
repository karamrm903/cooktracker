/**
 * Stage 2 — Transcript Extractor
 *
 * Supported languages (transcript + OCR): EN · AR · DE · FR · ES · PT
 *
 * Extraction order (most → least reliable):
 *   1. Platform-native captions / auto-captions
 *   2. Whisper STT (all six languages, with metadata language hint)
 *   3. Metadata fallback (creatorCaption + description concatenated)
 *   4. Visual-only mode (available: false — OCR + frames compensate)
 *
 * Key design rules:
 *   - Transcript text is kept in the SOURCE language; the AI extraction step
 *     reads and translates it to English output.
 *   - detectLanguage() scores all six languages simultaneously; the winner
 *     must beat the runner-up by a minimum margin to avoid false positives.
 *   - guessLanguageFromMetadata() provides a language hint before the
 *     transcript arrives, improving Whisper STT accuracy.
 */


export const SUPPORTED_LANGUAGES = ['en', 'ar', 'de', 'fr', 'es', 'pt'];

// ── Language scoring helpers ──────────────────────────────────────────────────

/**
 * Count pattern matches and normalise by text length.
 * weights[] apply a multiplier to each pattern's normalised hit-rate.
 *
 * @param {string}   text
 * @param {RegExp[]} patterns
 * @param {number[]} weights
 * @returns {number}  raw score (not 0–1, used for relative comparison only)
 */
function scoreByPatterns(text, patterns, weights) {
  const len = Math.max(text.length, 1);
  let score = 0;
  for (let i = 0; i < patterns.length; i++) {
    const hits = (text.match(patterns[i]) ?? []).length;
    score += (hits / len) * (weights[i] ?? 1);
  }
  return score;
}

/**
 * Detect the primary language of a text string by scoring all six supported
 * languages simultaneously and picking the winner by margin.
 *
 * Scoring approach:
 *   - Arabic: character-ratio (Unicode block U+0600–U+06FF).
 *     Wins immediately when ≥ 15 % of chars are Arabic.
 *   - Latin-script languages: three weighted pattern groups per language:
 *       (a) common function words — low weight (shared with neighbours)
 *       (b) language-distinctive characters / diacritics — medium weight
 *       (c) cooking-domain words in that language — high weight
 *     Cooking-domain vocabulary is the key differentiator because it is
 *     domain-specific and rarely borrowed verbatim between languages.
 *
 * Confidence = function of margin between winner and runner-up.
 * Falls back to 'en' / low-confidence when text is too short or ambiguous.
 *
 * Real implementation: replace with Google Cloud Translation detectLanguage,
 * Azure Translator Detect, or the `franc` npm package.
 *
 * @param {string} text
 * @returns {{ language: string, confidence: number }}
 */
export function detectLanguage(text) {
  if (!text || text.trim().length < 15) {
    return { language: 'en', confidence: 0.40 };
  }

  const lower = text.toLowerCase();

  // ── Arabic: character-ratio wins outright ──────────────────────────────────
  // Includes main Arabic block + Supplement + Extended-A
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) ?? []).length;
  const arabicRatio  = arabicChars / text.length;
  if (arabicRatio >= 0.15) {
    return { language: 'ar', confidence: Math.min(0.97, 0.65 + arabicRatio) };
  }

  // ── Latin-script languages: scored simultaneously ──────────────────────────
  // Group weights: [function_words, diacritics_chars, cooking_terms]
  // Cooking terms weight is highest (5×) — they are domain-specific and rarely
  // shared across languages.

  const scores = {

    de: scoreByPatterns(lower, [
      /\b(und|die|der|das|mit|von|für|ist|ein|eine|nicht|auch|auf|ich|wir|man)\b/g,
      /[äöüß]/g,
      /\b(kochen|braten|schneiden|backen|zutaten|schritt|hitze|pfanne|topf|würzen|erhitzen|rühren|dünsten)\b/g,
    ], [2, 4, 5]),

    fr: scoreByPatterns(lower, [
      /\b(le|la|les|un|une|des|est|avec|pour|dans|sur|je|vous|nous|ce|se|au|aux|du|en)\b/g,
      /[àâéèêëîïôùûüç]/g,
      /\b(cuisiner|ajouter|mélanger|cuire|ingrédients|étapes|feu|poêle|casserole|recette|chauffer|remuer|faire revenir)\b/g,
    ], [2, 4, 5]),

    es: scoreByPatterns(lower, [
      /\b(el|los|las|una|con|por|que|en|de|del|al|se|lo|su|pero|como|hay)\b/g,
      /[áéíóúüñ]/g,
      /\b(cocinar|agregar|mezclar|cortar|ingredientes|pasos|fuego|sartén|cacerola|receta|calentar|revolver|sofreír)\b/g,
    ], [1, 4, 5]),

    pt: scoreByPatterns(lower, [
      /\b(os|as|um|uma|com|que|em|de|do|da|se|ao|pela|pelo|nos|nas|numa)\b/g,
      /[ãõáéíóúâêôàç]/g,
      /\b(cozinhar|adicionar|misturar|cortar|ingredientes|passos|fogo|frigideira|panela|receita|aquecer|mexer|refogar)\b/g,
    ], [1, 4, 5]),

    en: scoreByPatterns(lower, [
      /\b(the|and|with|for|add|mix|cook|heat|stir|in|on|of|to|a|an|it|is|are|then|until)\b/g,
      // English has few unique diacritics — use common letter digraphs instead
      /\b(th|wh|sh|ch)\w+/g,
      /\b(ingredients|steps|minutes|tablespoon|teaspoon|preheat|simmer|sauté|boil|roast|bake|fry|whisk|chop|slice|dice)\b/g,
    ], [1, 1, 5]),
  };

  // Sort by score descending
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestLang, bestScore] = ranked[0];
  const [, secondScore]       = ranked[1];

  // Require a meaningful margin to avoid flip-flopping on short or bilingual text
  const margin = bestScore - secondScore;
  if (bestScore < 0.0005 || margin < 0.0002) {
    // Ambiguous — default to English with low confidence
    return { language: 'en', confidence: 0.45 };
  }

  const confidence = Math.min(0.92, 0.50 + margin * 150);
  return { language: bestLang, confidence };
}

/**
 * Attempt to guess the video language from metadata fields before the
 * transcript is fetched. Used as a hint for Whisper STT and caption-track
 * selection.
 *
 * Heuristic priority:
 *   1. Arabic Unicode chars in title/description → 'ar'
 *   2. Known language hashtags (#arabic, #deutsch, #français, etc.)
 *   3. Script/language markers in the description
 *   4. detectLanguage on the concatenated metadata text
 *
 * @param {object} metadata  Result from extractMetadata().
 * @returns {{ language: string, confidence: number }}
 */
export function guessLanguageFromMetadata(metadata) {
  const text = [metadata.title, metadata.description, metadata.creatorCaption]
    .filter(Boolean)
    .join(' ');

  if (!text.trim()) return { language: 'en', confidence: 0.30 };

  // Quick Arabic Unicode check on the title specifically
  const arabicInTitle = (metadata.title ?? '').match(/[\u0600-\u06FF]/g)?.length ?? 0;
  if (arabicInTitle / Math.max(metadata.title?.length ?? 1, 1) > 0.10) {
    return { language: 'ar', confidence: 0.88 };
  }

  // Language-specific hashtags
  const hashtags = (metadata.hashtags ?? []).join(' ').toLowerCase();
  const hashtagMap = {
    ar: /\#(arabic|عربي|عربية|arab)/i,
    de: /\#(deutsch|german|küche|kochen)/i,
    fr: /\#(français|french|cuisine|recette)/i,
    es: /\#(español|spanish|cocina|receta)/i,
    pt: /\#(português|portuguese|cozinha|receita)/i,
  };
  for (const [lang, pattern] of Object.entries(hashtagMap)) {
    if (pattern.test(hashtags)) return { language: lang, confidence: 0.82 };
  }

  // Fall back to full language detection on metadata text
  const result = detectLanguage(text);
  // Reduce confidence since metadata tends to be shorter / bilingual
  return { ...result, confidence: result.confidence * 0.75 };
}

/**
 * Caption language preference order when multiple tracks are available.
 * The first track that exists in the list is selected.
 * Auto-generated tracks are preferred over nothing, but ranked below manual ones.
 *
 * Real implementation:
 *   YouTube returns track objects: { languageCode, trackKind: 'standard'|'asr' }
 *   Filter by SUPPORTED_LANGUAGES, prefer 'standard' over 'asr', use this order.
 */
export const CAPTION_LANGUAGE_PREFERENCE = ['en', 'ar', 'de', 'fr', 'es', 'pt'];

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Extract transcript for a video using a multi-level fallback chain.
 *
 * @param {string}      url
 * @param {object}      metadata      Result from extractMetadata().
 * @param {string}      platform
 * @param {string|null} videoId
 * @returns {Promise<TranscriptResult>}
 */
const TRANSCRIPT_SERVER_URL = 'http://192.168.100.41:3001/transcript';

export async function extractTranscript(url, metadata, platform, videoId) {

  // Guess language from metadata before making API calls (used as STT hint)
  const langHint = guessLanguageFromMetadata(metadata);
  console.log('[transcriptExtractor] Language hint from metadata:',
    langHint.language, '| confidence:', langHint.confidence.toFixed(2));

  // ── YouTube: fetch captions via youtube-transcript ────────────────────────
  if (['youtube','tiktok','instagram'].includes(platform) && videoId) {
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');

      // Prefer the language hinted from metadata, fall back to the full preference list
      const langPrefs = langHint.confidence > 0.70
        ? [langHint.language, ...CAPTION_LANGUAGE_PREFERENCE.filter(l => l !== langHint.language)]
        : CAPTION_LANGUAGE_PREFERENCE;

      let segments = null;

      // Try each preferred language until one returns segments
      for (const lang of langPrefs) {
        try {
          const result = await YoutubeTranscript.fetchTranscript(videoId, { lang });
          if (result && result.length > 0) {
            segments = result;
            console.log('[transcriptExtractor] ✔ YouTube captions fetched (lang:', lang, ')');
            break;
          }
        } catch {
          // This language track not available — try next
        }
      }

      // If language-specific attempts all failed, try without a lang hint (YouTube auto-selects)
      if (!segments) {
        try {
          const result = await YoutubeTranscript.fetchTranscript(videoId);
          if (result && result.length > 0) {
            segments = result;
            console.log('[transcriptExtractor] ✔ YouTube captions fetched (auto lang)');
          }
        } catch {
          // No captions at all
        }
      }

      if (segments && segments.length > 0) {
        const text = segments.map(s => s.text).join(' ').trim();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const { language, confidence } = detectLanguage(text);

        console.log('[transcriptExtractor] ✔ YouTube captions:',
          language, '| words:', wordCount, '| confidence:', confidence.toFixed(2));

        return {
          available:  true,
          language,
          confidence,
          wordCount,
          text,
          source:    'youtube_captions',
          _fallback: null,
        };
      }

      console.warn('[transcriptExtractor] No caption tracks found for', videoId);
    } catch (err) {
      console.warn('[transcriptExtractor] YouTube captions error:', err.message);
    }
  }

  // ── Server-side Whisper STT ────────────────────────────────────────────────
  if (['youtube','tiktok','instagram'].includes(platform)) {
    try {
      const sttRes = await fetch(TRANSCRIPT_SERVER_URL, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ url, language: langHint.language }),
      });

      if (!sttRes.ok) {
        const errText = await sttRes.text();
        throw new Error(`STT server ${sttRes.status}: ${errText}`);
      }

      const result = await sttRes.json();
      if (!result.available || !result.text?.trim()) {
        throw new Error('STT returned empty transcript');
      }

      console.log('[transcriptExtractor] server STT success');
      console.log('[transcriptExtractor] words:', result.wordCount);

      return result;
    } catch (err) {
      console.warn('[transcriptExtractor] Server STT failed:', err.message);
    }
  }

  // ── No transcript from any source ─────────────────────────────────────────
  console.warn('[transcriptExtractor] No transcript available — returning EMPTY_TRANSCRIPT');
  return EMPTY_TRANSCRIPT;
}

/**
 * Build a fallback transcript from metadata text when API extraction fails.
 *
 * @param {object} metadata
 * @returns {TranscriptResult | null}
 */
export function buildMetadataFallbackTranscript(metadata) {
  const raw = [metadata.creatorCaption, metadata.description]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (raw.length < 20) return null;

  const { language } = detectLanguage(raw);
  const wordCount = raw.split(/\s+/).length;

  console.log('[transcriptExtractor] Metadata fallback transcript:',
    language, '| words:', wordCount);

  return {
    available:  true,
    language,
    confidence: 0.45,
    wordCount,
    text:       raw,
    source:     'metadata_captions',
    _fallback:  'metadata_captions',
  };
}

/** Sentinel used in visual-only mode (no transcript from any source). */
export const EMPTY_TRANSCRIPT = {
  available:  false,
  language:   'unknown',
  confidence: 0,
  wordCount:  0,
  text:       '',
  source:     'visual_only',
  _fallback:  'visual_only',
};
