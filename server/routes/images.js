import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../db/client.js';
import { ensureRecipeImage, ensureFoodItemImage, getPublicImageUrl, getPublicImageUrls } from '../utils/images.js';

const router = Router();

// POST /api/recipes/:id/image
// Lazy-load entry point. Looks up the recipe, fetches a Pexels photo if the
// row has none, uploads it to the private `images` bucket, and returns a
// 1-hour signed URL the client can render directly.
router.post('/recipes/:id/image', requireAuth, async (req, res) => {
  const { id } = req.params;
  const q = (req.body?.q ?? '').toString().trim();

  try {
    const signedUrl = await ensureRecipeImage(id, q);
    if (!signedUrl) {
      // No Pexels match / no API key — let the client render a placeholder.
      return res.json({ signedUrl: null, expiresIn: 3600, placeholder: true });
    }
    res.json({ signedUrl, expiresIn: 3600, placeholder: false });
  } catch (err) {
    console.error('[images] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recipes/images — bulk SIGN-ONLY. Body: { ids: string[] } → { images: { id: url|null } }.
// Reads image_url from the DB and mints signed URLs in parallel. Skips Pexels
// fetch/upload entirely — that stays on the lazy per-card route so this stays
// fast (sub-second) even when the seed hasn't run yet. Cards without a stored
// image return null; the client falls back to lazy load for those.
router.post('/recipes/images', requireAuth, async (req, res) => {
  const raw = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = [...new Set(raw.map(String).filter(Boolean))].slice(0, 100);
  if (!ids.length) return res.json({ images: {}, expiresIn: 3600 });

  try {
    const { data, error } = await adminClient
      .from('recipes')
      .select('id, image_url')
      .in('id', ids);
    if (error) throw error;

    const rows = data ?? [];
    // Public URLs — pure string building, no signing round-trip.
    const urls = getPublicImageUrls(rows.map((r) => r.image_url));
    const entries = rows.map((row) => [
      String(row.id),
      row.image_url ? (urls[row.image_url] ?? null) : null,
    ]);
    res.json({ images: Object.fromEntries(entries), expiresIn: 3600 });
  } catch (err) {
    console.error('[images/bulk] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/food-items/:id/image
// Lazy-load entry point for a persisted food_items row (mirrors the recipe
// route). Fetches a Pexels photo if the row has none, uploads as WebP, and
// returns a 1-hour signed URL.
router.post('/food-items/:id/image', requireAuth, async (req, res) => {
  const { id } = req.params;
  const q = (req.body?.q ?? '').toString().trim();

  try {
    const signedUrl = await ensureFoodItemImage(id, q);
    if (!signedUrl) {
      return res.json({ signedUrl: null, expiresIn: 3600, placeholder: true });
    }
    res.json({ signedUrl, expiresIn: 3600, placeholder: false });
  } catch (err) {
    console.error('[images/food-item] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/food/image — name-keyed fallback for food items not anchored to a
// food_items id yet. Searches Pexels by query and returns a signed URL,
// persisting under a food_items cache row so future hits are free.
router.post('/food/image', requireAuth, async (req, res) => {
  const q = (req.body?.q ?? '').toString().trim();
  if (!q) return res.status(400).json({ error: 'q required' });

  try {
    // Reuse an existing food_items cache row if present.
    const { data: existing } = await adminClient
      .from('food_items')
      .select('id, image_url')
      .eq('name_lower', q.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (existing?.image_url) {
      const url = getPublicImageUrl(existing.image_url);
      return res.json({ signedUrl: url, expiresIn: 3600, placeholder: !url });
    }

    let foodItemId = existing?.id;
    if (!foodItemId) {
      // Insert a stub row so we have a stable id to anchor the storage path.
      const { data: ins, error } = await adminClient
        .from('food_items')
        .insert({ name: q, name_lower: q.toLowerCase() })
        .select('id')
        .single();
      if (error) throw error;
      foodItemId = ins.id;
    }

    const signedUrl = await ensureFoodItemImage(foodItemId, q);
    res.json({ signedUrl, expiresIn: 3600, placeholder: !signedUrl });
  } catch (err) {
    console.error('[images/food] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
