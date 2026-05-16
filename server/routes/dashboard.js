import { Router } from 'express';
import { adminClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { mealToCamel } from '../utils/mappers.js';
import { config } from '../config.js';

const router = Router();

// GET /api/dashboard?targetDate=YYYY-MM-DD
router.get('/dashboard', requireAuth, async (req, res) => {
  const date = req.query.targetDate;
  if (!date) return res.status(400).json({ error: 'targetDate query param required (YYYY-MM-DD)' });

  try {
    const [mealsRes, profRes] = await Promise.all([
      adminClient
        .from('logged_meals')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('date_key', date)
        .order('logged_at', { ascending: true }),
      adminClient
        .from('users')
        .select('streak')
        .eq('id', req.user.id)
        .single(),
    ]);

    if (mealsRes.error) throw mealsRes.error;

    const meals = mealsRes.data.map(mealToCamel);
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fat: acc.fat + (m.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    res.json({ meals, totals, streak: profRes.data?.streak ?? 0 });
  } catch (err) {
    console.error('[dashboard GET] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config — client reads server-controlled config values
router.get('/config', (req, res) => {
  res.json({ searchResultsCount: config.search.resultsCount });
});

export default router;
