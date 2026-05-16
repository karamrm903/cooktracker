import { Router } from 'express';
import { adminClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { mealToCamel } from '../utils/mappers.js';

const router = Router();

// GET /api/meals?date=YYYY-MM-DD
router.get('/meals', requireAuth, async (req, res) => {
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
router.post('/meals', requireAuth, async (req, res) => {
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

    const newStreak = await updateStreak(req.user.id);

    console.log(`[meals POST] ✔ logged "${m.name}" for user ${req.user.id} | streak: ${newStreak}`);
    res.status(201).json({ meal: mealToCamel(data), streak: newStreak });
  } catch (err) {
    console.error('[meals POST] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meals/:id
router.patch('/meals/:id', requireAuth, async (req, res) => {
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
router.delete('/meals/:id', requireAuth, async (req, res) => {
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
router.post('/plan/save', requireAuth, async (req, res) => {
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

// ── Streak helper ─────────────────────────────────────────────────────────────

async function updateStreak(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const { data: prof } = await adminClient
    .from('users')
    .select('streak, last_logged_date')
    .eq('id', userId)
    .single();

  if (!prof) return 1;

  const last = prof.last_logged_date;
  let newStreak = 1;

  if (last === today) return prof.streak; // already logged today

  if (last === yesterday) {
    newStreak = (prof.streak || 0) + 1;
  }
  // else: missed a day → reset to 1

  await adminClient
    .from('users')
    .update({ streak: newStreak, last_logged_date: today })
    .eq('id', userId);

  return newStreak;
}

export default router;
