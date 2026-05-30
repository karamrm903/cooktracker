/**
 * URL parsing utilities for the video analysis pipeline.
 *
 * Responsibilities:
 *   - Normalise any supported URL form to a canonical form before processing
 *   - Detect platform (youtube / tiktok / instagram / facebook)
 *   - Extract the platform-specific video/content ID
 *
 * All functions are pure (no side effects) and platform-agnostic.
 * Plug in real URL resolution (e.g. follow redirects for vm.tiktok.com) here.
 */

// ── Supported platforms ───────────────────────────────────────────────────────
export const SUPPORTED_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook'];

// ── URL normalisation ─────────────────────────────────────────────────────────

/**
 * Convert any supported short/redirect URL to a canonical form.
 * Returns the original string unchanged if no conversion applies.
 *
 * Conversions:
 *   youtube.com/shorts/ID  → youtube.com/watch?v=ID
 *   youtu.be/ID            → youtube.com/watch?v=ID
 *
 * Real implementation note:
 *   - Add redirect-following here for vm.tiktok.com and Instagram link shorteners.
 *   - Add support for mobile app URLs (e.g. tiktok://...) if needed.
 *
 * @param {string} rawUrl
 * @returns {string}
 */
export async function normalizeUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  const url = rawUrl.trim();
  // Expand TikTok short links like vm.tiktok.com
if (url.includes('vm.tiktok.com')) {
  try {
    const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);

const res = await fetch(url, {
  redirect: 'follow',
  signal: controller.signal
});

clearTimeout(timeout);
const expanded = res.url;
console.log('[urlParser] Expanded URL:', expanded);
    console.log('[urlParser] TikTok short link expanded:', url, '→', expanded);
    return expanded;
  } catch (err) {
    console.warn('[urlParser] TikTok short link expansion failed:', err.message);
    return url;
  }
}

  // YouTube Shorts — https://www.youtube.com/shorts/VIDEO_ID[?si=…]
  const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,20})/i);
  if (shortsMatch) {
    const normalized = `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    console.log('[urlParser] Shorts → watch:', url, '→', normalized);
    return normalized;
  }

  // youtu.be/VIDEO_ID[?si=…]
  const shortLinkMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,20})/i);
  if (shortLinkMatch) {
    const normalized = `https://www.youtube.com/watch?v=${shortLinkMatch[1]}`;
    console.log('[urlParser] youtu.be → watch:', url, '→', normalized);
    return normalized;
  }

  return url;
}

// ── Platform & ID detection ───────────────────────────────────────────────────

/**
 * Detect the hosting platform and extract its native content ID from the URL.
 *
 * Called AFTER normalizeUrl() so Shorts and youtu.be links are already
 * in canonical form.
 *
 * @param {string} url  Normalised URL.
 * @returns {{ platform: string, videoId: string | null }}
 *
 * Real implementation note:
 *   - For vm.tiktok.com, resolve the redirect first, then call this.
 *   - For Instagram, the shortcode in /reel/CODE/ is the content ID.
 */
export function detectPlatformAndId(url) {
  if (!url) return { platform: 'unknown', videoId: null };

  // ── YouTube ──────────────────────────────────────────────────────────────
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  // Standard watch URL
const ytWatch = url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,20})/i);
  if (ytWatch) return { platform: 'youtube', videoId: ytWatch[1] };

  // Shorts (not yet normalised — defensive fallback)
  const ytShorts = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,20})/i);
  if (ytShorts) return { platform: 'youtube', videoId: ytShorts[1] };

  // youtu.be (not yet normalised — defensive fallback)
  const ytShort = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,20})/i);
  if (ytShort) return { platform: 'youtube', videoId: ytShort[1] };

  // ── TikTok ───────────────────────────────────────────────────────────────
  // Long form: tiktok.com/@username/video/12345678
  const ttLong = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (ttLong) return { platform: 'tiktok', videoId: ttLong[1] };

  // Path form: tiktok.com/v/12345678
  const ttPath = url.match(/tiktok\.com\/v\/(\d+)/i);
  if (ttPath) return { platform: 'tiktok', videoId: ttPath[1] };

  // Short URL: vm.tiktok.com/SHORTCODE  (needs redirect resolution in production)
  const ttShort = url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/i);
  if (ttShort) return { platform: 'tiktok', videoId: ttShort[1] };

  // Any remaining tiktok.com domain — ID unknown without redirect
  if (/tiktok\.com/i.test(url)) return { platform: 'tiktok', videoId: null };

  // ── Instagram ────────────────────────────────────────────────────────────
  // Reels: instagram.com/reel/SHORTCODE/
  // Posts: instagram.com/p/SHORTCODE/
  // IGTV:  instagram.com/tv/SHORTCODE/
  const igMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (igMatch) return { platform: 'instagram', videoId: igMatch[1] };

  if (/instagram\.com/i.test(url)) return { platform: 'instagram', videoId: null };

  // ── Facebook ─────────────────────────────────────────────────────────────
  if (/facebook\.com|fb\.com|fb\.watch/i.test(url)) return { platform: 'facebook', videoId: null };

  return { platform: 'unknown', videoId: null };
}

/**
 * Returns true if the platform is one the pipeline can handle.
 * @param {string} platform
 */
export function isSupportedPlatform(platform) {
  return SUPPORTED_PLATFORMS.includes(platform);
}
