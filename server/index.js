import 'dotenv/config';

import { config } from './config.js';
import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { adminClient, anonClient } from './db/client.js';

const execFileAsync = promisify(execFile);
const app = express();
app.use(cors());
app.use(express.json());

const FRAME_EVERY_SECONDS = 5;
const MAX_FRAMES = 12;
const SCALE_WIDTH = 640;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function extractFrameFiles(url, tmpDir, {
  everySeconds = FRAME_EVERY_SECONDS,
  maxFrames = MAX_FRAMES,
  width = SCALE_WIDTH,
} = {}) {
  await execFileAsync('yt-dlp', [
    '--force-ipv4', '--no-playlist', '--socket-timeout', '60',
    '-f', 'best', '-o', path.join(tmpDir, 'video.mp4'), url,
  ], { timeout: 180000 });

  const videoPath = path.join(tmpDir, 'video.mp4');
  if (!videoPath) throw new Error('yt-dlp returned an empty URL');

  const framePattern = path.join(tmpDir, 'frame%03d.jpg');
  await execFileAsync('ffmpeg', [
    '-i', videoPath,
    '-vf', `fps=1/${everySeconds},scale=${width}:-2`,
    '-frames:v', String(maxFrames),
    '-q:v', '3',
    framePattern,
  ], { timeout: 60_000 });

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
  if (files.length === 0) throw new Error('ffmpeg produced no frames');
  return files.map(f => path.join(tmpDir, f));
}

// Convert DB snake_case row → camelCase Meal object for the app
function mealToCamel(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? undefined,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    mealType: row.meal_type,
    meal: row.meal ?? '',
    time: row.time ?? '',
    dateKey: row.date_key,
    loggedAt: row.logged_at,
    source: row.source ?? undefined,
    recipeId: row.recipe_id ?? undefined,
    gramsEaten: row.grams_eaten ?? undefined,
    estimatedRecipeGrams: row.estimated_recipe_grams ?? undefined,
    fullRecipeNutrition: row.full_recipe_nutrition ?? undefined,
  };
}

// ── Auth middleware ────────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Metadata ──────────────────────────────────────────────────────────────────

app.post('/metadata', async (req, res) => {
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

// ── Transcript ────────────────────────────────────────────────────────────────

app.post('/transcript', async (req, res) => {
  const { url, language } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-stt-'));
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
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Frames ────────────────────────────────────────────────────────────────────

app.post('/frames', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-frames-'));
  try {
    const filePaths = await extractFrameFiles(url, tmpDir);
    const frames = filePaths.map(fp => ({ base64: fs.readFileSync(fp).toString('base64'), mediaType: 'image/jpeg' }));
    console.log(`[frames] ✔ ${frames.length} frames extracted`);
    res.json({ frames, count: frames.length });
  } catch (err) {
    console.error('[frames] ✖', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Vision ────────────────────────────────────────────────────────────────────

const LOCALE_TO_LANGUAGE = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German',
};

app.get('/api/config', (req, res) => {
  res.json({ searchResultsCount: config.search.resultsCount });
});

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

app.post('/vision', async (req, res) => {
  const { url, locale } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'Body must contain { url }' });

  const languageName = LOCALE_TO_LANGUAGE[locale] ?? 'English';
  const VISION_PROMPT = buildVisionPrompt(languageName);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-vision-'));
  try {
    const filePaths = await extractFrameFiles(url, tmpDir);
    const imageBlocks = filePaths.map(fp => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(fp).toString('base64') },
    }));

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'You are a culinary vision AI. Always respond with valid JSON only. No markdown fences.',
        messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: VISION_PROMPT }] }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Anthropic API ${claudeRes.status}: ${await claudeRes.text()}`);

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text.trim();

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
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Profile ───────────────────────────────────────────────────────────────────

app.post('/api/profile', requireAuth, async (req, res) => {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'Missing request body' });

  for (const k of ['gender', 'goal', 'activity']) {
    if (!payload[k] || typeof payload[k] !== 'string') {
      return res.status(400).json({ error: `Invalid or missing field: ${k}` });
    }
  }

  try {
    const { data, error } = await adminClient
      .from('users')
      .upsert({
        id: req.user.id,
        ...(payload.name !== undefined && { name: payload.name || null }),
        gender: payload.gender,
        age: parseInt(payload.age) || null,
        height_cm: parseFloat(payload.height_cm) || null,
        weight_kg: parseFloat(payload.weight_kg) || null,
        goal: payload.goal,
        activity_level: payload.activity,
        calories: parseInt(payload.calories) || 0,
        protein: parseInt(payload.protein) || 0,
        carbs: parseInt(payload.carbs) || 0,
        fat: parseInt(payload.fat) || 0,
        ...(payload.locale && { locale: payload.locale }),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    console.error('[profile POST] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/profile', requireAuth, async (req, res) => {
  const { locale } = req.body ?? {};
  if (!locale || typeof locale !== 'string') {
    return res.status(400).json({ error: 'locale required' });
  }

  try {
    const { error } = await adminClient
      .from('users')
      .update({ locale, updated_at: new Date().toISOString() })
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[profile PATCH] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const { data, error } = await adminClient
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ profile: data || null });
  } catch (err) {
    console.error('[profile GET] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Meals ─────────────────────────────────────────────────────────────────────

// GET /api/meals?date=YYYY-MM-DD
app.get('/api/meals', requireAuth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });

  try {
    const { data, error } = await adminClient
      .from('logged_meals')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date_key', date)
      .order('logged_at', { ascending: true });

    if (error) throw error;
    res.json({ meals: data.map(mealToCamel) });
  } catch (err) {
    console.error('[meals GET] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meals
app.post('/api/meals', requireAuth, async (req, res) => {
  const m = req.body;
  if (!m?.name || !m?.mealType || !m?.dateKey) {
    return res.status(400).json({ error: 'name, mealType, dateKey required' });
  }

  try {
    const { data, error } = await adminClient
      .from('logged_meals')
      .insert({
        user_id: req.user.id,
        name: m.name,
        emoji: m.emoji ?? null,
        calories: m.calories ?? 0,
        protein: m.protein ?? 0,
        carbs: m.carbs ?? 0,
        fat: m.fat ?? 0,
        meal_type: m.mealType,
        meal: m.meal ?? null,
        time: m.time ?? null,
        date_key: m.dateKey,
        logged_at: m.loggedAt ?? new Date().toISOString(),
        source: m.source ?? null,
        recipe_id: m.recipeId ?? null,
        grams_eaten: m.gramsEaten ?? null,
        estimated_recipe_grams: m.estimatedRecipeGrams ?? null,
        full_recipe_nutrition: m.fullRecipeNutrition ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Streak computation
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data: prof } = await adminClient
      .from('users')
      .select('streak, last_logged_date')
      .eq('id', req.user.id)
      .single();

    let newStreak = 1;
    if (prof) {
      const last = prof.last_logged_date;
      if (last === today) {
        newStreak = prof.streak; // already logged today, no change
      } else if (last === yesterday) {
        newStreak = (prof.streak || 0) + 1;
      }
      // else missed a day → reset to 1
      if (last !== today) {
        await adminClient
          .from('users')
          .update({ streak: newStreak, last_logged_date: today })
          .eq('id', req.user.id);
      }
    }

    console.log(`[meals POST] ✔ logged "${m.name}" for user ${req.user.id} | streak: ${newStreak}`);
    res.status(201).json({ meal: mealToCamel(data), streak: newStreak });
  } catch (err) {
    console.error('[meals POST] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meals/:id — update portion/macros after grams edit
app.patch('/api/meals/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const patch = {};
  if (updates.calories != null) patch.calories = updates.calories;
  if (updates.protein != null) patch.protein = updates.protein;
  if (updates.carbs != null) patch.carbs = updates.carbs;
  if (updates.fat != null) patch.fat = updates.fat;
  if (updates.gramsEaten != null) patch.grams_eaten = updates.gramsEaten;
  if (updates.mealType != null) patch.meal_type = updates.mealType;
  if (updates.meal != null) patch.meal = updates.meal;
  if (updates.emoji != null) patch.emoji = updates.emoji;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const { data, error } = await adminClient
      .from('logged_meals')
      .update(patch)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ meal: mealToCamel(data) });
  } catch (err) {
    console.error('[meals PATCH] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/meals/:id
app.delete('/api/meals/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await adminClient
      .from('logged_meals')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[meals DELETE] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plan/save
app.post('/api/plan/save', requireAuth, async (req, res) => {
  const { dateKey, meals } = req.body;
  if (!dateKey || !Array.isArray(meals) || meals.length === 0) {
    return res.status(400).json({ error: 'dateKey and non-empty meals array required' });
  }

  try {
    const insertData = meals.map(m => ({
      user_id: req.user.id,
      name: m.name,
      emoji: m.emoji ?? null,
      calories: m.calories ?? 0,
      protein: m.protein ?? 0,
      carbs: m.carbs ?? 0,
      fat: m.fat ?? 0,
      meal_type: m.mealType,
      meal: m.meal ?? null,
      date_key: dateKey,
      logged_at: new Date().toISOString(),
      source: m.source ?? 'manual',
      recipe_id: m.recipeId ?? null,
    }));

    const { data, error } = await adminClient
      .from('logged_meals')
      .insert(insertData)
      .select();

    if (error) throw error;

    console.log(`[plan save] ✔ user ${req.user.id} saved ${data.length} meals for ${dateKey}`);
    res.status(201).json({ success: true, count: data.length, meals: data.map(mealToCamel) });
  } catch (err) {
    console.error('[plan save] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

// GET /api/dashboard?targetDate=YYYY-MM-DD
// Returns meals for the date plus pre-summed macro totals.
app.get('/api/dashboard', requireAuth, async (req, res) => {
  const date = req.query.targetDate;
  if (!date) return res.status(400).json({ error: 'targetDate query param required (YYYY-MM-DD)' });

  try {
    const { data, error } = await adminClient
      .from('logged_meals')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date_key', date)
      .order('logged_at', { ascending: true });

    if (error) throw error;

    const meals = data.map(mealToCamel);
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fat: acc.fat + (m.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const { data: prof } = await adminClient
      .from('users')
      .select('streak')
      .eq('id', req.user.id)
      .single();

    res.json({ meals, totals, streak: prof?.streak ?? 0 });
  } catch (err) {
    console.error('[dashboard GET] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Explore: AI food search ───────────────────────────────────────────────────

app.post('/api/search', requireAuth, async (req, res) => {
  const { q, locale } = req.body ?? {};
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'q (search query) required' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const languageName = LOCALE_TO_LANGUAGE[locale] ?? 'English';
  const query = q.trim();
  const resultCount = config.search.resultsCount;

  const prompt =
    `The user is searching for: "${query}"\n\n` +
    `Return ONLY a JSON object — no markdown, no code fences — with this exact shape:\n` +
    `{\n` +
    `  "results": [\n` +
    `    {\n` +
    `      "id": "unique_string",\n` +
    `      "name": "recipe name",\n` +
    `      "emoji": "single emoji",\n` +
    `      "calories": 500,\n` +
    `      "time": "20 min",\n` +
    `      "difficulty": "Easy",\n` +
    `      "category": "breakfast|lunch|dinner|snack",\n` +
    `      "macros": { "protein": 25, "carbs": 55, "fat": 18 },\n` +
    `      "ingredients": ["200g pasta", "2 eggs"],\n` +
    `      "steps": [\n` +
    `        { "text": "step description", "timerMinutes": null, "timerLabel": null }\n` +
    `      ],\n` +
    `      "nutrition": { "total": { "calories": 500, "protein": 25, "carbs": 55, "fat": 18 } },\n` +
    `      "estimatedGrams": 400\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- Return exactly ${resultCount} diverse recipe variants for the query.\n` +
    `- steps: minimum 4 steps, include timerMinutes for any step with a cooking time.\n` +
    `- calories and macros must be realistic and consistent with ingredients.\n` +
    `- estimatedGrams: realistic total weight of one serving.\n` +
    `- Respond entirely in ${languageName}. All text fields must be in ${languageName}.`;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: config.search.maxTokens,
        system: 'You are an expert culinary AI. Always respond with valid JSON only. No markdown fences.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Anthropic API ${claudeRes.status}: ${await claudeRes.text()}`);

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Claude returned non-JSON: ' + raw.slice(0, 200));
      parsed = JSON.parse(match[0]);
    }

    const results = (Array.isArray(parsed.results) ? parsed.results : []).map((r, i) => ({
      id:             typeof r.id === 'string'      ? r.id             : `search_${Date.now()}_${i}`,
      name:           typeof r.name === 'string'    ? r.name           : query,
      emoji:          typeof r.emoji === 'string'   ? r.emoji          : '🍽️',
      calories:       typeof r.calories === 'number'? r.calories       : 0,
      time:           typeof r.time === 'string'    ? r.time           : '—',
      difficulty:     typeof r.difficulty === 'string' ? r.difficulty  : 'Medium',
      category:       typeof r.category === 'string'? r.category       : 'dinner',
      macros:         r.macros ?? { protein: 0, carbs: 0, fat: 0 },
      ingredients:    Array.isArray(r.ingredients)  ? r.ingredients    : [],
      steps:          Array.isArray(r.steps)        ? r.steps          : [],
      nutrition:      r.nutrition ?? { total: { calories: r.calories ?? 0, protein: r.macros?.protein ?? 0, carbs: r.macros?.carbs ?? 0, fat: r.macros?.fat ?? 0 } },
      estimatedGrams: typeof r.estimatedGrams === 'number' ? r.estimatedGrams : 400,
    }));

    console.log(`[search] ✔ query: "${query}" | ${results.length} results`);
    res.json({ results });
  } catch (err) {
    console.error('[search] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running on http://0.0.0.0:${PORT}`);
  console.log('[server] Routes: GET /health | POST /metadata /ocr /transcript /frames /vision');
  console.log('[server] Auth: POST/GET /api/profile');
  console.log('[server] Meals: GET/POST /api/meals | PATCH/DELETE /api/meals/:id | GET /api/dashboard');
});
