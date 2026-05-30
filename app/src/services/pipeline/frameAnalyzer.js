/**
 * Stage 4 — Frame / Vision Analyzer
 *
 * Delegates frame extraction + Claude vision analysis to the local server
 * (server/index.js POST /vision). The server handles yt-dlp, ffmpeg, and
 * the Anthropic API call — the app only makes a single HTTP request.
 *
 * Output shape — FrameAnalysisResult:
 * {
 *   framesAnalyzed:    number,
 *   confidence:        number,   // 0–1
 *   dishType:          string,
 *   ingredients:       string[],
 *   cookingActions:    string[],
 *   tools:             string[],
 *   frameDescriptions: string[],
 * }
 */

import { getBaseUrl } from '../../utils/api';
const VISION_SERVER_URL = `${getBaseUrl()}/vision`;

/**
 * Run vision analysis on sampled video frames via the frame server.
 *
 * @param {string} url          Normalised video URL.
 * @param {string} platform     Detected platform.
 * @param {number} _durationSec Reserved for future use.
 * @param {string} [locale]     BCP-47 language code (e.g. 'fr'). Server responds in this language.
 * @returns {Promise<FrameAnalysisResult>}
 */
export async function analyzeFrames(url, platform, _durationSec, locale) {
  if (!['youtube', 'tiktok', 'instagram'].includes(platform)) {
    throw new Error(`Frame analysis not yet supported for platform: ${platform}`);
  }

  const response = await fetch(VISION_SERVER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, locale }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vision server error ${response.status}: ${text}`);
  }

  const data = await response.json();

  console.log(`[frameAnalyzer] ✔ dish: ${data.dishType} | confidence: ${data.confidence}`);

  return {
    framesAnalyzed: typeof data.framesAnalyzed === 'number' ? data.framesAnalyzed : (data.frameDescriptions?.length ?? 0),
    confidence: typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0.6,
    dishType: typeof data.dishType === 'string' ? data.dishType : 'Unknown',
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    cookingActions: Array.isArray(data.actions) ? data.actions : [],
    tools: Array.isArray(data.tools) ? data.tools : [],
    frameDescriptions: Array.isArray(data.frameDescriptions) ? data.frameDescriptions : [],
  };
}
