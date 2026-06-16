import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../db/client.js';

const router = Router();

function rowToCard(r) {
  let ingredients = [];
  try { ingredients = Array.isArray(r.ingredients) ? r.ingredients : JSON.parse(r.ingredients ?? '[]'); } catch {}
  const meta = r.nutrition ?? {};
  return {
    id:             String(r.id),
    name:           r.title,
    emoji:          r.emoji ?? '🍽️',
    calories:       r.calories ?? 0,
    time:           meta.time ?? '—',
    difficulty:     meta.difficulty ?? 'Medium',
    category:       r.saved_category ?? meta.category ?? 'dinner',
    macros:         { protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0 },
    ingredients,
    steps:          r.steps ?? [],
    nutrition:      r.nutrition ?? { total: { calories: r.calories ?? 0, protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0 } },
    estimatedGrams: meta.estimatedGrams ?? 400,
    // image_url intentionally omitted — clients lazy-fetch via /api/recipes/:id/image
  };
}

// GET /api/explore/swipe — curated swipe deck (global recipes, no images).
router.get('/explore/swipe', requireAuth, async (req, res) => {
  const { category, q, limit = 20 } = req.query ?? {};
  const max = Math.min(Number(limit) || 20, 50);

  // Skip the food-search cache rows (those are autocomplete entries, not recipes).
  let query = adminClient
    .from('recipes')
    .select('id, title, emoji, calories, protein, carbs, fat, ingredients, steps, nutrition, saved_category')
    .is('user_id', null)
    .or('saved_category.is.null,saved_category.neq.food_search')
    .limit(max);

  if (category && category !== 'all') query = query.eq('saved_category', category);
  if (q && typeof q === 'string' && q.trim()) query = query.ilike('title', `%${q.trim()}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[swipe] ✖', error.message);
    return res.status(500).json({ error: error.message });
  }

  const cards = (data ?? []).map(rowToCard);
  res.json({ cards });
});

// GET /api/explore/trending — small horizontal "Trending Now" set.
router.get('/explore/trending', requireAuth, async (req, res) => {
  const { data, error } = await adminClient
    .from('recipes')
    .select('id, title, emoji, calories, protein, carbs, fat, saved_category, nutrition')
    .is('user_id', null)
    .or('saved_category.is.null,saved_category.neq.food_search')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[trending] ✖', error.message);
    return res.status(500).json({ error: error.message });
  }
  res.json({ items: (data ?? []).map(rowToCard) });
});

export default router;
