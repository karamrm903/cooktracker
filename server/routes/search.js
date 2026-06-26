import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkRecipeImportUsage, checkSearchUsage, checkFoodSearchUsage } from '../middleware/checkUsage.js';
import { callClaude, LOCALE_TO_LANGUAGE } from '../utils/claude.js';
import { adminClient } from '../db/client.js';
import { config } from '../config.js';

const router = Router();

// ── Cache helpers ─────────────────────────────────────────────────────────────
// Cache hits skip the Claude call. Global rows (user_id IS NULL) act as the
// shared cache; per-user rows are this user's saved library, not cache.

// Categories whose rows are full recipes (carry steps + ingredients). Food
// nutrition items now live in their own `food_items` table, so the recipes
// cache only ever deals with these recipe categories.
const RECIPE_CATEGORIES = ['ai_cache', 'breakfast', 'lunch', 'dinner', 'snack'];

async function findCachedRecipes(query, limit) {
  const { data, error } = await adminClient
    .from('recipes')
    .select('*')
    .is('user_id', null)
    .in('saved_category', RECIPE_CATEGORIES)
    .ilike('title', `%${query}%`)
    .limit(limit);
  if (error) {
    console.warn('[search] cache lookup failed:', error.message);
    return [];
  }
  return data ?? [];
}

function dbRowToExploreResult(r, i) {
  const ingredients = Array.isArray(r.ingredients)
    ? r.ingredients
    : (() => { try { return JSON.parse(r.ingredients ?? '[]'); } catch { return []; } })();

  return {
    id: String(r.id),
    name: r.title,
    emoji: r.emoji ?? '🍽️',
    calories: r.calories ?? 0,
    time: r.nutrition?.time ?? '—',
    difficulty: r.nutrition?.difficulty ?? 'Medium',
    // Prefer nutrition.category — saved_category may be 'ai_cache' marker.
    category: r.nutrition?.category ?? r.saved_category ?? 'dinner',
    macros: { protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0 },
    ingredients,
    steps: r.steps ?? [],
    nutrition: r.nutrition ?? { total: { calories: r.calories ?? 0, protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0 } },
    estimatedGrams: r.nutrition?.estimatedGrams ?? 400,
    _cached: true,
  };
}

async function cacheExploreResults(results) {
  // Skip rows whose title already lives in the global cache to avoid dupes
  // (the unique (user_id, title) constraint treats NULLs as distinct).
  const titles = results.map(r => r.name).filter(Boolean);
  if (!titles.length) return;
  const { data: existing } = await adminClient
    .from('recipes')
    .select('title')
    .is('user_id', null)
    .in('saved_category', RECIPE_CATEGORIES)
    .in('title', titles);
  const seen = new Set((existing ?? []).map(r => r.title));

  const rows = results
    .filter(r => !seen.has(r.name))
    .map(r => {
      const steps = r.steps ?? [];
      const instructions = Array.isArray(steps)
        ? steps.map((s, idx) => `${idx + 1}. ${s.text ?? s}`).join('\n')
        : null;

      return {
        user_id: null,
        title: r.name,
        emoji: r.emoji,
        calories: r.calories,
        protein: r.macros?.protein ?? 0,
        carbs: r.macros?.carbs ?? 0,
        fat: r.macros?.fat ?? 0,
        ingredients: JSON.stringify(r.ingredients ?? []),
        instructions,
        steps: steps,
        nutrition: {
          ...(r.nutrition ?? {}),
          time: r.time,
          difficulty: r.difficulty,
          category: r.category,
          estimatedGrams: r.estimatedGrams,
        },
        // Mark as AI cache so it is not surfaced in the curated swipe deck.
        // Real category lives in nutrition.category for cache hit re-rendering.
        saved_category: 'ai_cache',
      };
    });

  if (!rows.length) return;
  const { error } = await adminClient.from('recipes').insert(rows);
  if (error) console.warn('[search] cache insert failed:', error.message);
}

async function findCachedFoodItems(query, limit) {
  const { data, error } = await adminClient
    .from('food_items')
    .select('*')
    .not('calories', 'is', null) // Only fetch fully populated food items (skip stubs)!
    .ilike('name', `%${query}%`)
    .limit(limit);
  if (error) {
    console.warn('[food-search] cache lookup failed:', error.message);
    return [];
  }
  return (data ?? []).map(dbRowToFoodItem);
}

async function findCachedSuggestions(query, limit = 5) {
  const { data, error } = await adminClient
    .from('food_items')
    .select('name')
    .ilike('name', `%${query}%`)
    .limit(limit * 2); // fetch extra for deduplication

  if (error) {
    console.warn('[suggestions] cache lookup failed:', error.message);
    return [];
  }

  const seen = new Set();
  const list = [];
  for (const r of data ?? []) {
    const nameLower = r.name.toLowerCase();
    if (!seen.has(nameLower)) {
      seen.add(nameLower);
      list.push(r.name);
    }
    if (list.length >= limit) break;
  }
  return list;
}

async function cacheSuggestions(suggestions) {
  if (!suggestions || !suggestions.length) return;
  const lowers = suggestions.map(s => s.toLowerCase());
  const { data: existing, error } = await adminClient
    .from('food_items')
    .select('name_lower')
    .in('name_lower', lowers);

  if (error) {
    console.warn('[suggestions] existing check failed:', error.message);
    return;
  }

  const seen = new Set((existing ?? []).map(r => r.name_lower));
  const rows = suggestions
    .filter(s => !seen.has(s.toLowerCase()))
    .map(s => ({
      name:       s,
      name_lower: s.toLowerCase(),
      calories:   null, // stub — backfilled to a full item on results-mode search
    }));

  if (!rows.length) return;
  const { error: insertError } = await adminClient.from('food_items').insert(rows);
  if (insertError) console.warn('[suggestions] cache insert failed:', insertError.message);
}

function dbRowToFoodItem(r) {
  return {
    id: String(r.id),
    name: r.name,
    verified: r.verified ?? true,
    calories: r.calories ?? 0,
    servingSize: r.serving_size ?? '1 serving',
    servingSizeGrams: r.serving_grams ?? 100,
    macros: {
      protein: r.protein ?? 0,
      carbs: r.carbs ?? 0,
      fat: r.fat ?? 0,
    },
  };
}

// Caches food items and returns a Map(titleLower → DB id) so the route can
// hand the client real recipe ids. With a DB id the client hits
// /api/recipes/:id/image (CDN) instead of the name-keyed fallback.
async function cacheFoodItems(items) {
  const idByTitle = new Map();
  const lowers = items.map(i => i.name?.toLowerCase()).filter(Boolean);
  if (!lowers.length) return idByTitle;

  const { data: existing } = await adminClient
    .from('food_items')
    .select('id, name_lower, calories')
    .in('name_lower', lowers);
  const existingByLower = new Map((existing ?? []).map(r => [r.name_lower, r]));

  const fullPayload = (i) => ({
    calories: i.calories,
    protein: i.macros?.protein ?? 0,
    carbs: i.macros?.carbs ?? 0,
    fat: i.macros?.fat ?? 0,
    serving_size: i.servingSize,
    serving_grams: i.servingSizeGrams,
    verified: i.verified,
  });

  const toInsert = [];
  const stubBackfills = []; // suggestion stubs (null calories) to upgrade to full items
  const queued = new Set(); // dedupe items that repeat (bestMatch often == results[0])

  for (const i of items) {
    const key = i.name.toLowerCase();
    const row = existingByLower.get(key);
    if (row) {
      idByTitle.set(key, row.id);
      if (row.calories == null && !queued.has(key)) {
        queued.add(key);
        stubBackfills.push({ id: row.id, payload: fullPayload(i) });
      }
      continue;
    }
    if (queued.has(key)) continue;
    queued.add(key);
    toInsert.push({ name: i.name, name_lower: key, ...fullPayload(i) });
  }

  // Backfill name-only suggestion stubs so they surface as full results next time.
  if (stubBackfills.length) {
    await Promise.all(
      stubBackfills.map(s =>
        adminClient.from('food_items').update(s.payload).eq('id', s.id),
      ),
    );
  }

  if (toInsert.length) {
    const { data: inserted, error } = await adminClient
      .from('food_items')
      .insert(toInsert)
      .select('id, name_lower');
    if (error) console.warn('[food-search] cache insert failed:', error.message);
    for (const r of inserted ?? []) idByTitle.set(r.name_lower, r.id);
  }

  return idByTitle;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/recipe-import/begin', requireAuth, checkRecipeImportUsage, (req, res) => {
  const remaining = req.usageAfterIncrement?.remaining ?? 0;
  res.json({ allowed: true, remaining });
});

// POST /api/search — AI recipe search with DB cache lookup
router.post('/search', requireAuth, checkSearchUsage, async (req, res) => {
  const { q, locale } = req.body ?? {};
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'q (search query) required' });
  }

  const languageName = LOCALE_TO_LANGUAGE[locale] ?? 'English';
  const query = q.trim();
  const resultCount = config.search.resultsCount;

  // Cache check — if we already have any global rows, return them first.
  const cached = await findCachedRecipes(query, 10);
  if (cached.length > 0) {
    const results = cached.map(dbRowToExploreResult);
    console.log(`[search] ✔ DB CACHE HIT query: "${query}" | ${results.length} results`);
    return res.json({ results });
  }

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
      id: typeof r.id === 'string' ? r.id : `search_${Date.now()}_${i}`,
      name: typeof r.name === 'string' ? r.name : query,
      emoji: typeof r.emoji === 'string' ? r.emoji : '🍽️',
      calories: typeof r.calories === 'number' ? r.calories : 0,
      time: typeof r.time === 'string' ? r.time : '—',
      difficulty: typeof r.difficulty === 'string' ? r.difficulty : 'Medium',
      category: typeof r.category === 'string' ? r.category : 'dinner',
      macros: r.macros ?? { protein: 0, carbs: 0, fat: 0 },
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : [],
      nutrition: r.nutrition ?? { total: { calories: r.calories ?? 0, protein: r.macros?.protein ?? 0, carbs: r.macros?.carbs ?? 0, fat: r.macros?.fat ?? 0 } },
      estimatedGrams: typeof r.estimatedGrams === 'number' ? r.estimatedGrams : 400,
    }));

    // Persist into the global cache (no images — lazy fetched on detail open).
    cacheExploreResults(results).catch(err => console.warn('[search] cache write:', err.message));

    console.log(`[search] ✔ query: "${query}" | ${results.length} results`);
    res.json({ results });
  } catch (err) {
    console.error('[search] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/food-search — food item search with cache + per-serving nutrition
router.post('/food-search', requireAuth, checkFoodSearchUsage, async (req, res) => {
  const { q, mode = 'results', locale } = req.body ?? {};
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'q (search query) required' });
  }

  const languageName = LOCALE_TO_LANGUAGE[locale] ?? 'English';
  const query = q.trim();

  if (mode === 'suggestions') {
    const cachedSugs = await findCachedSuggestions(query, 5);
    if (cachedSugs.length > 0) {
      console.log(`[food-search] ✔ SUGGESTIONS CACHE HIT for "${query}":`, cachedSugs);
      return res.json({ suggestions: cachedSugs });
    }

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
      const list = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [];

      cacheSuggestions(list).catch(err => console.warn('[suggestions] cache write:', err.message));

      console.log(`[food-search] ✔ suggestions for "${query}":`, list);
      return res.json({ suggestions: list });
    } catch (err) {
      console.warn('[food-search] suggestions fallback:', err.message);
      return res.json({ suggestions: [] });
    }
  }

  // Cache check (results mode only).
  const cached = await findCachedFoodItems(query, 8);
  if (cached.length > 0) {
    const bestMatch = cached[0] ?? null;
    console.log(`[food-search] ✔ DB CACHE HIT query: "${query}" | ${cached.length} results`);
    return res.json({ bestMatch, results: cached });
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
      id: typeof r.id === 'string' ? r.id : `food_${Date.now()}_${i}`,
      name: typeof r.name === 'string' ? r.name : query,
      verified: typeof r.verified === 'boolean' ? r.verified : true,
      calories: typeof r.calories === 'number' ? Math.round(r.calories) : 0,
      servingSize: typeof r.servingSize === 'string' ? r.servingSize : '1 serving',
      servingSizeGrams: typeof r.servingSizeGrams === 'number' ? r.servingSizeGrams : 100,
      macros: {
        protein: typeof r.macros?.protein === 'number' ? Math.round(r.macros.protein * 10) / 10 : 0,
        carbs: typeof r.macros?.carbs === 'number' ? Math.round(r.macros.carbs * 10) / 10 : 0,
        fat: typeof r.macros?.fat === 'number' ? Math.round(r.macros.fat * 10) / 10 : 0,
      },
    });

    const bestMatch = parsed.bestMatch ? normalize(parsed.bestMatch, 0) : null;
    const results = Array.isArray(parsed.results) ? parsed.results.map(normalize) : [];

    const toCache = [...(bestMatch ? [bestMatch] : []), ...results];
    // Await the cache write so we can swap AI ids for real DB ids — that lets
    // the client load images via /api/recipes/:id/image (CDN) on first click.
    const idByTitle = await cacheFoodItems(toCache).catch(err => {
      console.warn('[food-search] cache write:', err.message);
      return new Map();
    });
    const withDbId = (it) =>
      it ? { ...it, id: idByTitle.get(it.name.toLowerCase()) ?? it.id } : it;

    console.log(`[food-search] ✔ query: "${query}" | ${results.length} results`);
    res.json({ bestMatch: withDbId(bestMatch), results: results.map(withDbId) });
  } catch (err) {
    console.error('[food-search] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
