import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../db/client.js';
import { getPublicImageUrls } from '../utils/images.js';

const router = Router();

// Only curated/seeded categories qualify for the explore swipe deck.
// Excludes AI search cache ('ai_cache') and food-search autocomplete ('food_search').
const CURATED_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'];

// Curated deck/trending are GLOBAL (user_id IS NULL) — identical for every user
// and rarely change. On Render's single free-tier worker each uncached Supabase
// query costs ~2.5s and blocks every other request. Cache the built payloads in
// memory so repeat focuses (the common case) return in ~1ms instead of re-querying.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _cache = new Map(); // key → { at, data }

function cacheGet(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return e.data;
}

function cacheSet(key, data) {
  _cache.set(key, { at: Date.now(), data });
}

function rowToCard(r) {
  let ingredients = [];
  try { ingredients = Array.isArray(r.ingredients) ? r.ingredients : JSON.parse(r.ingredients ?? '[]'); } catch { }
  const meta = r.nutrition ?? {};
  return {
    id: String(r.id),
    name: r.title,
    emoji: r.emoji ?? '🍽️',
    calories: r.calories ?? 0,
    time: meta.time ?? '—',
    difficulty: meta.difficulty ?? 'Medium',
    category: r.saved_category ?? meta.category ?? 'dinner',
    macros: { protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0 },
    ingredients,
    steps: r.steps ?? [],
    nutrition: r.nutrition ?? { total: { calories: r.calories ?? 0, protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0 } },
    estimatedGrams: meta.estimatedGrams ?? 400,
    imageUrl: null, // filled in by signCards() below
  };
}

// Attach each row's public image URL (no network — pure string building), so the
// deck arrives image-ready in a single request (no separate /recipes/images call).
function signCards(rows) {
  const list = rows ?? [];
  const urls = getPublicImageUrls(list.map((r) => r.image_url));
  return list.map((r) => {
    const card = rowToCard(r);
    card.imageUrl = r.image_url ? (urls[r.image_url] ?? null) : null;
    return card;
  });
}

// GET /api/explore/swipe — curated swipe deck (global recipes, no images).
router.get('/explore/swipe', requireAuth, async (req, res) => {
  const { category, q, limit = 20, page = 1 } = req.query ?? {};
  const parsedLimit = Number(limit) || 20;
  const parsedPage = Math.max(1, Number(page) || 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const cacheKey = `swipe:${category || 'all'}:${(q || '').trim().toLowerCase()}:${parsedLimit}:${parsedPage}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ cards: cached.cards, hasMore: cached.hasMore, totalCount: cached.totalCount });

  // Whitelist curated categories so AI search cache / food-search autocomplete
  // rows can never leak into the deck.
  let query = adminClient
    .from('recipes')
    .select('id, title, emoji, calories, protein, carbs, fat, ingredients, steps, nutrition, saved_category, image_url', { count: 'exact' })
    .is('user_id', null)
    .range(offset, offset + parsedLimit - 1);

  if (category && category !== 'all') query = query.eq('saved_category', category);
  if (q && typeof q === 'string' && q.trim()) query = query.ilike('title', `%${q.trim()}%`);

  const { data, count, error } = await query;
  if (error) {
    console.error('[swipe] ✖', error.message);
    return res.status(500).json({ error: error.message });
  }

  const cards = await signCards(data);
  const hasMore = cards.length === parsedLimit;
  cacheSet(cacheKey, { cards, hasMore, totalCount: count });
  res.json({ cards, hasMore, totalCount: count });
});

// GET /api/explore/trending — small horizontal "Trending Now" set.
router.get('/explore/trending', requireAuth, async (req, res) => {
  const cached = cacheGet('trending');
  if (cached) return res.json({ items: cached });

  const { data, error } = await adminClient
    .from('recipes')
    .select('id, title, emoji, calories, protein, carbs, fat, saved_category, nutrition, image_url')
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[trending] ✖', error.message);
    return res.status(500).json({ error: error.message });
  }
  const items = await signCards(data);
  cacheSet('trending', items);
  res.json({ items });
});

export default router;
