/**
 * Stage 3 — OCR Extractor
 *
 * Delegates frame extraction + Google Vision TEXT_DETECTION to the local
 * frame server (server/index.js POST /ocr).
 *
 * Output shape — OCRResult:
 * {
 *   language:       string,    // ISO 639-1 detected from text content
 *   framesScanned:  number,
 *   detectedFrames: [{ timestamp: number, text: string }],
 *   combinedText:   string,
 * }
 */

import { getBaseUrl } from '../../utils/api';
const FRAME_SERVER_URL = `${getBaseUrl()}/ocr`;

/**
 * Extract on-screen text from video keyframes via OCR.
 *
 * @param {string} url          Normalised video URL.
 * @param {string} platform     Detected platform.
 * @returns {Promise<OCRResult>}
 */
export async function extractOCR(url, platform) {
  if (!['youtube', 'tiktok', 'instagram'].includes(platform)) {
    throw new Error(`OCR not yet supported for platform: ${platform}`);
  }

  const response = await fetch(FRAME_SERVER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OCR server error ${response.status}: ${text}`);
  }

  const result = await response.json();

  console.log(`[ocrExtractor] scanned ${result.framesScanned} frames | ${result.detectedFrames?.length ?? 0} with text`);

  return result;
}
