import 'dotenv/config';

import express       from 'express';
import { execFile }  from 'child_process';
import { promisify } from 'util';
import fs            from 'fs';
import os            from 'os';
import path          from 'path';

const execFileAsync = promisify(execFile);
const app           = express();
app.use(express.json());

const FRAME_EVERY_SECONDS = 5;
const MAX_FRAMES          = 12;
const SCALE_WIDTH         = 640;

// ── Shared helper ─────────────────────────────────────────────────────────────
async function extractFrameFiles(url, tmpDir, {
  everySeconds = FRAME_EVERY_SECONDS,
  maxFrames    = MAX_FRAMES,
  width        = SCALE_WIDTH,
} = {}) {
  await execFileAsync('yt-dlp', [
  '--force-ipv4',
  '--no-playlist',
  '--socket-timeout',
  '60',
  '-f',
  'best',
  '-o',
  path.join(tmpDir, 'video.mp4'),
  url
], { timeout: 180000 });
const videoStreamUrl = path.join(tmpDir, 'video.mp4');
  if (!videoStreamUrl) throw new Error('yt-dlp returned an empty URL');

  const framePattern = path.join(tmpDir, 'frame%03d.jpg');
  await execFileAsync('ffmpeg', [
    '-i',        videoStreamUrl,
    '-vf',       `fps=1/${everySeconds},scale=${width}:-2`,
    '-frames:v', String(maxFrames),
    '-q:v',      '3',
    framePattern,
  ], { timeout: 60_000 });

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
  if (files.length === 0) throw new Error('ffmpeg produced no frames');
  return files.map(f => path.join(tmpDir, f));
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Metadata ──────────────────────────────────────────────────────────────────
app.post('/metadata', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--force-ipv4',
      '--no-playlist',
      '--socket-timeout', '60',
      '--no-check-certificates',
      '-J',
      url
    ], { timeout: 180000 });

    const info = JSON.parse(stdout.trim());

    res.json({
      title:       info.title       ?? '',
      description: info.description ?? '',
      channelName: info.uploader    ?? info.channel ?? '',
      tags:        Array.isArray(info.tags) ? info.tags : [],
      durationSec: info.duration    ?? 0,
    });
  } catch (err) {
    console.error('[metadata] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── OCR ───────────────────────────────────────────────────────────────────────
app.post('/ocr', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  if (!visionKey) return res.status(500).json({ error: 'GOOGLE_VISION_API_KEY not set' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-ocr-'));
  try {
    const filePaths = await extractFrameFiles(url, tmpDir, { everySeconds: 10, maxFrames: 8 });

    const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`;
    const rawResults = await Promise.all(filePaths.map(async (fp, i) => {
      const base64 = fs.readFileSync(fp).toString('base64');
      const vRes = await fetch(VISION_URL, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image:    { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      });
      const data = await vRes.json();
      const text = data.responses?.[0]?.fullTextAnnotation?.text?.trim() ?? '';
      return { timestamp: i * 10, text };
    }));

    const withText = rawResults.filter(r => r.text.length > 0);
    const seen     = new Set();
    const deduped  = withText.filter(({ text }) => {
      const key = text.slice(0, 60).toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const combinedText = deduped.map(r => r.text).join(' | ');

    let language = 'en';
    if (/[\u0600-\u06FF]/.test(combinedText)) language = 'ar';
    else if (/[\u4E00-\u9FFF]/.test(combinedText)) language = 'zh';
    else if (!combinedText) language = 'unknown';

    console.log(`[ocr] ✔ ${deduped.length}/${filePaths.length} frames had text`);
    res.json({ language, framesScanned: filePaths.length, detectedFrames: deduped, combinedText });
  } catch (err) {
    console.error('[ocr] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Transcript (Groq Whisper STT) ─────────────────────────────────────────────
app.post('/transcript', async (req, res) => {
  const { url, language } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-stt-'));
  try {
    await execFileAsync('yt-dlp', [
  '--force-ipv4',
  '--no-playlist',
  '--socket-timeout', '60',
  '--no-check-certificates',

  '-x',
  '--audio-format', 'mp3',
  '--audio-quality', '0',

  '-o', path.join(tmpDir, 'audio.%(ext)s'),
  url
], { timeout: 120000 });

    const audioFileName = fs.readdirSync(tmpDir).find(f => f.endsWith('.mp3'));
    if (!audioFileName) throw new Error('yt-dlp produced no audio file');

    const audioBuffer = fs.readFileSync(path.join(tmpDir, audioFileName));

    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'verbose_json');
    if (language && language !== 'unknown') form.append('language', language);

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${groqKey}` },
      body:    form,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      throw new Error(`Whisper API ${whisperRes.status}: ${errText}`);
    }

    const data = await whisperRes.json();

    const LANG_NAMES = {
      english: 'en', arabic: 'ar', german: 'de',
      french:  'fr', spanish: 'es', portuguese: 'pt',
    };
    const detectedLang = LANG_NAMES[data.language?.toLowerCase()] ?? data.language ?? 'unknown';
    const text         = data.text?.trim() ?? '';
    const wordCount    = text.split(/\s+/).filter(Boolean).length;

    console.log(`[transcript] ✔ Whisper: ${detectedLang} | ${wordCount} words`);
    res.json({
      available:  true,
      language:   detectedLang,
      confidence: 0.85,
      wordCount,
      text,
      source:    'server_whisper',
      _fallback: 'server_whisper',
    });
  } catch (err) {
    console.error('[transcript] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Frames (raw base64 export) ────────────────────────────────────────────────
app.post('/frames', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-frames-'));
  try {
    const filePaths = await extractFrameFiles(url, tmpDir);
    const frames = filePaths.map(fp => ({
      base64:    fs.readFileSync(fp).toString('base64'),
      mediaType: 'image/jpeg',
    }));
    console.log(`[frames] ✔ ${frames.length} frames extracted`);
    res.json({ frames, count: frames.length });
  } catch (err) {
    console.error('[frames] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Vision (Claude Haiku) ─────────────────────────────────────────────────────
const VISION_PROMPT =
  'You are analyzing sampled frames from a cooking video. Examine every image carefully.\n\n' +
  'Return ONLY a JSON object — no markdown, no code block — with this exact shape:\n' +
  '{\n' +
  '  "ingredients": ["ingredient 1", "ingredient 2"],\n' +
  '  "tools": ["pan", "spatula"],\n' +
  '  "actions": ["searing steak", "frying eggs"],\n' +
  '  "dishType": "most specific dish name visible",\n' +
  '  "confidence": 0.85,\n' +
  '  "frameDescriptions": ["one English sentence per frame in order"]\n' +
  '}\n\n' +
  'Rules:\n' +
  '- Only list ingredients you can actually see — no guesses.\n' +
  '- dishType: use the most specific name the evidence supports.\n' +
  '- confidence: 0.0–1.0 based on how clearly cooking content is visible.\n' +
  '- All text must be in English.';

app.post('/vision', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-vision-'));
  try {
    const filePaths = await extractFrameFiles(url, tmpDir);

    const imageBlocks = filePaths.map(fp => ({
      type:   'image',
      source: {
        type:       'base64',
        media_type: 'image/jpeg',
        data:       fs.readFileSync(fp).toString('base64'),
      },
    }));

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     'You are a culinary vision AI. Always respond with valid JSON only. No markdown fences.',
        messages: [{
          role:    'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: VISION_PROMPT },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Anthropic API ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const raw        = claudeData.content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Claude returned non-JSON: ' + raw.slice(0, 200));
      parsed = JSON.parse(match[0]);
    }

    console.log(`[vision] ✔ ${filePaths.length} frames analysed | dish: ${parsed.dishType}`);
    res.json({
      ingredients:       Array.isArray(parsed.ingredients)      ? parsed.ingredients      : [],
      tools:             Array.isArray(parsed.tools)             ? parsed.tools            : [],
      actions:           Array.isArray(parsed.actions)           ? parsed.actions          : [],
      dishType:          typeof parsed.dishType === 'string'     ? parsed.dishType         : 'Unknown',
      confidence:        typeof parsed.confidence === 'number'   ? Math.min(1, Math.max(0, parsed.confidence)) : 0.6,
      frameDescriptions: Array.isArray(parsed.frameDescriptions) ? parsed.frameDescriptions : [],
    });
  } catch (err) {
    console.error('[vision] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running on http://0.0.0.0:${PORT}`);
  console.log('[server] Routes: GET /health | POST /metadata /ocr /transcript /frames /vision');
});
