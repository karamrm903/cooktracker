import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../db/client.js';
import { ensureRecipeImage, getSignedImageUrl } from '../utils/images.js';

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

    const entries = await Promise.all(
      (data ?? []).map(async (row) => {
        if (!row.image_url) return [String(row.id), null];
        const url = await getSignedImageUrl(row.image_url).catch(() => null);
        return [String(row.id), url];
      }),
    );
    res.json({ images: Object.fromEntries(entries), expiresIn: 3600 });
  } catch (err) {
    console.error('[images/bulk] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/food/image — for ad-hoc food items (not yet persisted as a recipe).
// Searches Pexels by query and returns a signed URL, persisting under a
// "food_search" cache row so future hits are free.
router.post('/food/image', requireAuth, async (req, res) => {
  const q = (req.body?.q ?? '').toString().trim();
  if (!q) return res.status(400).json({ error: 'q required' });

  try {
    // Reuse an existing food_search cache row if present.
    const { data: existing } = await adminClient
      .from('recipes')
      .select('id, image_url')
      .is('user_id', null)
      .eq('saved_category', 'food_search')
      .ilike('title', q)
      .limit(1)
      .maybeSingle();

    if (existing?.image_url) {
      const url = await getSignedImageUrl(existing.image_url);
      return res.json({ signedUrl: url, expiresIn: 3600, placeholder: !url });
    }

    let recipeId = existing?.id;
    if (!recipeId) {
      // Insert a stub row so we have a stable id to anchor the storage path.
      const { data: ins, error } = await adminClient
        .from('recipes')
        .insert({ user_id: null, title: q, saved_category: 'food_search' })
        .select('id')
        .single();
      if (error) throw error;
      recipeId = ins.id;
    }

    const signedUrl = await ensureRecipeImage(recipeId, q);
    res.json({ signedUrl, expiresIn: 3600, placeholder: !signedUrl });
  } catch (err) {
    console.error('[images/food] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
