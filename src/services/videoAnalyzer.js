/**
 * videoAnalyzer.js — public entry point (re-export wrapper)
 *
 * The full pipeline has been split into focused modules under:
 *   src/services/pipeline/
 *     ├── index.js              ← main orchestrator
 *     ├── urlParser.js          ← URL normalisation & platform detection
 *     ├── metadataExtractor.js  ← video title / description / hashtags
 *     ├── transcriptExtractor.js ← captions / STT / multi-language
 *     ├── ocrExtractor.js       ← keyframe OCR (multi-language)
 *     ├── frameAnalyzer.js      ← AI vision analysis (always English output)
 *     ├── recipeExtractor.js    ← structured context + AI recipe extraction
 *     ├── validator.js          ← cross-source validation + confidence scoring
 *     └── mockData.js           ← shared mock scenarios & delays
 *
 * Everything that AnalyzingScreen, DashboardScreen, and RecipeSummaryScreen
 * import from this file continues to work without changes.
 */

export {
  analyzeVideo,
  PIPELINE_STAGES,
  PIPELINE_ERRORS,
  PipelineError,
} from './pipeline/index.js';

export {
  normalizeUrl,
  detectPlatformAndId,
  isSupportedPlatform,
  SUPPORTED_PLATFORMS,
} from './pipeline/urlParser.js';

export {
  detectLanguage,
  SUPPORTED_LANGUAGES,
} from './pipeline/transcriptExtractor.js';
