/**
 * Stage 1 — Video Metadata Extractor
 *
 * Three-tier fallback for YouTube. Whichever tier succeeds first wins.
 *
 *   Tier 1 — YouTube Data API v3 (richest: title, description, tags, duration)
 *             Requires EXPO_PUBLIC_YOUTUBE_API_KEY.
 *
 *   Tier 2 — Local frame server /metadata (yt-dlp --dump-json)
 *             Requires the frame server to be running (cd server && npm start).
 *             Same richness as Tier 1; no API key needed.
 *
 *   Tier 3 — YouTube oEmbed (title + channel only; no key, no server)
 *             Weakest signal but always available for public videos.
 *
 * Output shape — VideoMetadata:
 * {
 *   platform:       string,
 *   videoId:        string | null,
 *   title:          string,
 *   description:    string,
 *   channelName:    string,
 *   creatorCaption: string,   // hashtags joined as a space-separated string
 *   hashtags:       string[], // e.g. ['#steak', '#cooking']
 *   durationSec:    number,
 * }
 */

const FRAME_SERVER_URL = 'http://192.168.100.41:3001';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse ISO 8601 duration (PT1M30S) into seconds. */
function parseIsoDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? 0) * 3600)
       + (parseInt(m[2] ?? 0) * 60)
       + parseInt(m[3] ?? 0);
}

function tagsToHashtags(tags) {
  return (tags ?? []).map(t => (t.startsWith('#') ? t : `#${t}`));
}

// ── Tier 1: YouTube Data API v3 ───────────────────────────────────────────────

async function fetchFromYouTubeAPI(videoId, apiKey) {
  const url =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error('YouTube API returned no items');

  const snippet = item.snippet;
  const tags    = snippet.tags ?? [];
  const hashtags = tagsToHashtags(tags);

  return {
    title:          snippet.title        ?? '',
    description:    snippet.description  ?? '',
    channelName:    snippet.channelTitle ?? '',
    creatorCaption: hashtags.join(' '),
    hashtags,
    durationSec:    parseIsoDuration(item.contentDetails?.duration),
  };
}

// ── Tier 2: Frame server (yt-dlp) ─────────────────────────────────────────────

async function fetchFromFrameServer(url) {
  const res = await fetch(`${FRAME_SERVER_URL}/metadata`, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Frame server metadata error ${res.status}`);

  const data = await res.json();
console.log('[metadataExtractor] frame server raw metadata:', data);
  const hashtags = tagsToHashtags(data.tags ?? []);

  return {
  title:          data.title ?? '',
  description:    data.description ?? '',
  channelName:    data.channelName ?? data.uploader ?? '',
  creatorCaption:
  data.creatorCaption ??
  data.caption ??
  data.fulltitle ??
  data.description ??
  data.webpage_description ??
  data.webpage_url_basename ??
  '',
  hashtags,
  durationSec:    data.durationSec ?? data.duration ?? 0,
};
}

// ── Tier 3: YouTube oEmbed (no key, no server) ────────────────────────────────

async function fetchFromOEmbed(url) {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`oEmbed ${res.status}`);

  const data = await res.json();

  return {
    title:          data.title        ?? '',
    description:    '',               // oEmbed does not expose description
    channelName:    data.author_name  ?? '',
    creatorCaption: '',
    hashtags:       [],
    durationSec:    0,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Extract video metadata for the given URL.
 *
 * @param {string} url          Normalised video URL.
 * @param {string} platform     Detected platform.
 * @param {string|null} videoId Platform-specific content ID.
 * @returns {Promise<VideoMetadata>}
 */
export async function extractMetadata(url, platform, videoId) {
  if (!['youtube','tiktok','instagram'].includes(platform)) {
    throw new Error(`Metadata extraction not yet supported for platform: ${platform}`);
  }

  const youtubeApiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  const errors        = [];

  // Tier 1 — YouTube Data API v3
  if (platform === 'youtube' && youtubeApiKey && videoId) {
    try {
      const meta = await fetchFromYouTubeAPI(videoId, youtubeApiKey);
      console.log('[metadataExtractor] ✔ Tier 1 (YouTube Data API):', meta.title);
      return { platform, videoId, ...meta };
    } catch (err) {
      errors.push(`Tier 1 (YouTube API): ${err.message}`);
      console.warn('[metadataExtractor] ⚠ Tier 1 failed:', err.message);
    }
  }

  // Tier 2 — Frame server (yt-dlp)
  try {
    const meta = await fetchFromFrameServer(url);
    console.log('[metadataExtractor] ✔ Tier 2 (frame server / yt-dlp):', meta.title);
    return { platform, videoId, ...meta };
  } catch (err) {
    errors.push(`Tier 2 (frame server): ${err.message}`);
    console.warn('[metadataExtractor] ⚠ Tier 2 failed:', err.message);
  }

  // Tier 3 — oEmbed (YouTube only)
if (platform === 'youtube') {
  try {
    const meta = await fetchFromOEmbed(url);
    console.log('[metadataExtractor] ✔ Tier 3 (oEmbed):', meta.title);
    return { platform, videoId, ...meta };
  } catch (err) {
    errors.push(`Tier 3 (oEmbed): ${err.message}`);
    console.warn('[metadataExtractor] ⚠ Tier 3 failed:', err.message);
  }
}

throw new Error(`All metadata tiers failed: ${errors.join(' | ')}`);
}