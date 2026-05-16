import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkRecipeImportUsage, checkSearchUsage } from '../middleware/checkUsage.js';
import { callClaude, LOCALE_TO_LANGUAGE } from '../utils/claude.js';
import { config } from '../config.js';

const router = Router();

// POST /api/recipe-import/begin — usage gate called before the video pipeline
router.post('/recipe-import/begin', requireAuth, checkRecipeImportUsage, (req, res) => {
  const remaining = req.usageAfterIncrement?.remaining ?? 0;
  res.json({ allowed: true, remaining });
});

// POST /api/search — AI food search
router.post('/search', requireAuth, checkSearchUsage, async (req, res) => {
  const { q, locale } = req.body ?? {};
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'q (search query) required' });
  }

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
    const parsed = await callClaude({
      system: 'You are an expert culinary AI. Always respond with valid JSON only. No markdown fences.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: config.search.maxTokens,
    });

    const results = (Array.isArray(parsed.results) ? parsed.results : []).map((r, i) => ({
      id:             typeof r.id === 'string'         ? r.id             : `search_${Date.now()}_${i}`,
      name:           typeof r.name === 'string'       ? r.name           : query,
      emoji:          typeof r.emoji === 'string'      ? r.emoji          : '🍽️',
      calories:       typeof r.calories === 'number'   ? r.calories       : 0,
      time:           typeof r.time === 'string'       ? r.time           : '—',
      difficulty:     typeof r.difficulty === 'string' ? r.difficulty     : 'Medium',
      category:       typeof r.category === 'string'   ? r.category       : 'dinner',
      macros:         r.macros ?? { protein: 0, carbs: 0, fat: 0 },
      ingredients:    Array.isArray(r.ingredients)     ? r.ingredients    : [],
      steps:          Array.isArray(r.steps)           ? r.steps          : [],
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

// POST /api/food-search — food item search with per-serving nutrition data
router.post('/food-search', requireAuth, async (req, res) => {
  const { q, mode = 'results', locale } = req.body ?? {};
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'q (search query) required' });
  }

  const languageName = LOCALE_TO_LANGUAGE[locale] ?? 'English';
  const query = q.trim();

  if (mode === 'suggestions') {
    const prompt =
      `User is typing a food search: "${query}"\n` +
      `Return ONLY a JSON object: {"suggestions":["word1","word2","word3","word4","word5"]}\n` +
      `List up to 5 common food names or variations related to the query. Short names. In ${languageName}.`;
    try {
      const parsed = await callClaude({
        system: 'You are a food database. Return valid JSON only, no markdown.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 120,
      });
      return res.json({ suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [] });
    } catch {
      return res.json({ suggestions: [] });
    }
  }

  const prompt =
    `The user is searching for a food item to log nutritionally: "${query}"\n\n` +
    `Return ONLY a JSON object with this exact shape:\n` +
    `{\n` +
    `  "bestMatch": {\n` +
    `    "id": "unique_string",\n` +
    `    "name": "Egg",\n` +
    `    "verified": true,\n` +
    `    "calories": 72,\n` +
    `    "servingSize": "1 egg",\n` +
    `    "servingSizeGrams": 50,\n` +
    `    "macros": { "protein": 6.2, "carbs": 0.5, "fat": 5.0 }\n` +
    `  },\n` +
    `  "results": [\n` +
    `    { "id":"s1","name":"Egg","verified":true,"calories":72,"servingSize":"1 egg","servingSizeGrams":50,"macros":{"protein":6.2,"carbs":0.5,"fat":5.0} }\n` +
    `  ]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- bestMatch: most common/generic version of this food.\n` +
    `- results: 6-8 different variants (different serving sizes, preparations, or brands).\n` +
    `- calories and macros must be nutritionally accurate per the serving size.\n` +
    `- verified: true for well-known standard foods.\n` +
    `- All values in ${languageName}.`;

  try {
    const parsed = await callClaude({
      system: 'You are a nutrition database AI. Always respond with valid JSON only. No markdown fences.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1200,
    });

    const normalize = (r, i) => ({
      id:               typeof r.id === 'string'              ? r.id             : `food_${Date.now()}_${i}`,
      name:             typeof r.name === 'string'            ? r.name           : query,
      verified:         typeof r.verified === 'boolean'       ? r.verified       : true,
      calories:         typeof r.calories === 'number'        ? Math.round(r.calories) : 0,
      servingSize:      typeof r.servingSize === 'string'     ? r.servingSize    : '1 serving',
      servingSizeGrams: typeof r.servingSizeGrams === 'number'? r.servingSizeGrams : 100,
      macros: {
        protein: typeof r.macros?.protein === 'number' ? Math.round(r.macros.protein * 10) / 10 : 0,
        carbs:   typeof r.macros?.carbs   === 'number' ? Math.round(r.macros.carbs   * 10) / 10 : 0,
        fat:     typeof r.macros?.fat     === 'number' ? Math.round(r.macros.fat     * 10) / 10 : 0,
      },
    });

    const bestMatch = parsed.bestMatch ? normalize(parsed.bestMatch, 0) : null;
    const results   = Array.isArray(parsed.results) ? parsed.results.map(normalize) : [];

    console.log(`[food-search] ✔ query: "${query}" | ${results.length} results`);
    res.json({ bestMatch, results });
  } catch (err) {
    console.error('[food-search] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
