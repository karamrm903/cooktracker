import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../db/client.js';

const router = Router();

// Recipes are a single shared global pool (user_id = NULL). RLS blocks client
// writes to global rows, so all writes go through the server (adminClient).
// Reads stay client-direct via the recipes_select_global policy.

function buildRow(recipe, sourceUrl) {
  const ingredients = Array.isArray(recipe.ingredients)
    ? JSON.stringify(recipe.ingredients)
    : (recipe.ingredients ?? null);
  const instructions = Array.isArray(recipe.steps)
    ? recipe.steps.map((s, i) => `${i + 1}. ${s.text ?? s}`).join('\n')
    : null;
  return {
    user_id: null,
    title: recipe.title,
    ingredients,
    instructions,
    steps: recipe.steps ?? null,
    nutrition: recipe.nutrition ?? null,
    calories: recipe.nutrition?.total?.calories ?? recipe.nutrition?.calories ?? null,
    protein: recipe.nutrition?.total?.protein ?? recipe.nutrition?.protein ?? null,
    carbs: recipe.nutrition?.total?.carbs ?? recipe.nutrition?.carbs ?? null,
    fat: recipe.nutrition?.total?.fat ?? recipe.nutrition?.fat ?? null,
    emoji: recipe.emoji ?? null,
    source_url: sourceUrl ?? null,
  };
}

// POST /api/recipes — save into the shared pool. Dedupes by exact title:
// updates the matching global row if one exists, else inserts a new one.
router.post('/recipes', requireAuth, async (req, res) => {
  const recipe = req.body?.recipe ?? req.body ?? {};
  const sourceUrl = req.body?.sourceUrl ?? recipe.sourceUrl ?? null;
  if (!recipe.title) return res.status(400).json({ error: 'title required' });

  try {
    const row = buildRow(recipe, sourceUrl);

    const { data: existing } = await adminClient
      .from('recipes')
      .select('id')
      .is('user_id', null)
      .eq('title', row.title)
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await adminClient
        .from('recipes')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await adminClient
        .from('recipes')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json({ recipe: result });
  } catch (err) {
    console.error('[recipes POST] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/recipes/:id/category — set or clear saved_category. Global field
// now (shared across all users) since recipes are a shared pool.
router.patch('/recipes/:id/category', requireAuth, async (req, res) => {
  const { id } = req.params;
  const category = req.body?.category ?? null;
  try {
    const { error } = await adminClient
      .from('recipes')
      .update({ saved_category: category })
      .eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[recipes PATCH category] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
