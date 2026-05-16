import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

import { extractFrameFiles, makeTmpDir, cleanTmpDir } from '../utils/frames.js';
import { callClaude, LOCALE_TO_LANGUAGE } from '../utils/claude.js';

const router = Router();
const execFileAsync = promisify(execFile);

// ── Metadata ──────────────────────────────────────────────────────────────────

router.post('/metadata', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--force-ipv4', '--no-playlist', '--socket-timeout', '60',
      '--no-check-certificates', '-J', url,
    ], { timeout: 180000 });

    const info = JSON.parse(stdout.trim());
    res.json({
      title: info.title ?? '',
      description: info.description ?? '',
      channelName: info.uploader ?? info.channel ?? '',
      tags: Array.isArray(info.tags) ? info.tags : [],
      durationSec: info.duration ?? 0,
    });
  } catch (err) {
    console.error('[metadata] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── OCR ───────────────────────────────────────────────────────────────────────

router.post('/ocr', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  if (!visionKey) return res.status(500).json({ error: 'GOOGLE_VISION_API_KEY not set' });

  const tmpDir = makeTmpDir('ct-ocr-');
  try {
    const filePaths = await extractFrameFiles(url, tmpDir, { everySeconds: 10, maxFrames: 8 });
    const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`;

    const rawResults = await Promise.all(filePaths.map(async (fp, i) => {
      const base64 = fs.readFileSync(fp).toString('base64');
      const vRes = await fetch(VISION_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      });
      const data = await vRes.json();
      return { timestamp: i * 10, text: data.responses?.[0]?.fullTextAnnotation?.text?.trim() ?? '' };
    }));

    const seen = new Set();
    const deduped = rawResults
      .filter(r => r.text.length > 0)
      .filter(({ text }) => {
        const key = text.slice(0, 60).toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const combinedText = deduped.map(r => r.text).join(' | ');
    let language = 'en';
    if (/[؀-ۿ]/.test(combinedText)) language = 'ar';
    else if (/[一-鿿]/.test(combinedText)) language = 'zh';
    else if (!combinedText) language = 'unknown';

    console.log(`[ocr] ✔ ${deduped.length}/${filePaths.length} frames had text`);
    res.json({ language, framesScanned: filePaths.length, detectedFrames: deduped, combinedText });
  } catch (err) {
    console.error('[ocr] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    cleanTmpDir(tmpDir);
  }
});

// ── Transcript ────────────────────────────────────────────────────────────────

router.post('/transcript', async (req, res) => {
  const { url, language } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const tmpDir = makeTmpDir('ct-stt-');
  try {
    await execFileAsync('yt-dlp', [
      '--force-ipv4', '--no-playlist', '--socket-timeout', '60',
      '--no-check-certificates', '-x', '--audio-format', 'mp3',
      '--audio-quality', '0', '-o', path.join(tmpDir, 'audio.%(ext)s'), url,
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
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}` },
      body: form,
    });

    if (!whisperRes.ok) throw new Error(`Whisper API ${whisperRes.status}: ${await whisperRes.text()}`);

    const data = await whisperRes.json();
    const LANG_NAMES = { english: 'en', arabic: 'ar', german: 'de', french: 'fr', spanish: 'es', portuguese: 'pt' };
    const detectedLang = LANG_NAMES[data.language?.toLowerCase()] ?? data.language ?? 'unknown';
    const text = data.text?.trim() ?? '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    console.log(`[transcript] ✔ Whisper: ${detectedLang} | ${wordCount} words`);
    res.json({ available: true, language: detectedLang, confidence: 0.85, wordCount, text, source: 'server_whisper', _fallback: 'server_whisper' });
  } catch (err) {
    console.error('[transcript] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    cleanTmpDir(tmpDir);
  }
});

// ── Frames ────────────────────────────────────────────────────────────────────

router.post('/frames', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const tmpDir = makeTmpDir('ct-frames-');
  try {
    const filePaths = await extractFrameFiles(url, tmpDir);
    const frames = filePaths.map(fp => ({ base64: fs.readFileSync(fp).toString('base64'), mediaType: 'image/jpeg' }));
    console.log(`[frames] ✔ ${frames.length} frames extracted`);
    res.json({ frames, count: frames.length });
  } catch (err) {
    console.error('[frames] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    cleanTmpDir(tmpDir);
  }
});

// ── Vision ────────────────────────────────────────────────────────────────────

function buildVisionPrompt(languageName) {
  return (
    'You are analyzing sampled frames from a cooking video. Examine every image carefully.\n\n' +
    'Return ONLY a JSON object — no markdown, no code block — with this exact shape:\n' +
    '{\n' +
    '  "ingredients": ["ingredient 1", "ingredient 2"],\n' +
    '  "tools": ["pan", "spatula"],\n' +
    '  "actions": ["searing steak", "chopping onions"],\n' +
    '  "dishType": "most specific dish name visible",\n' +
    '  "confidence": 0.85,\n' +
    `  "frameDescriptions": ["one sentence per frame in order"]\n` +
    '}\n\n' +
    'Rules:\n' +
    '- Only list ingredients you can actually see — no guesses.\n' +
    '- dishType: use the most specific name the evidence supports.\n' +
    '- confidence: 0.0–1.0 based on how clearly cooking content is visible.\n' +
    `- Respond entirely in ${languageName}. All extracted text must be in ${languageName}.`
  );
}

router.post('/vision', async (req, res) => {
  const { url, locale } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const languageName = LOCALE_TO_LANGUAGE[locale] ?? 'English';

  const tmpDir = makeTmpDir('ct-vision-');
  try {
    const filePaths = await extractFrameFiles(url, tmpDir);
    const imageBlocks = filePaths.map(fp => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(fp).toString('base64') },
    }));

    const parsed = await callClaude({
      system: 'You are a culinary vision AI. Always respond with valid JSON only. No markdown fences.',
      messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: buildVisionPrompt(languageName) }] }],
    });

    console.log(`[vision] ✔ ${filePaths.length} frames analysed | dish: ${parsed.dishType}`);
    res.json({
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      dishType: typeof parsed.dishType === 'string' ? parsed.dishType : 'Unknown',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.6,
      frameDescriptions: Array.isArray(parsed.frameDescriptions) ? parsed.frameDescriptions : [],
    });
  } catch (err) {
    console.error('[vision] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    cleanTmpDir(tmpDir);
  }
});

export default router;
