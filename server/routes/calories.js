import { Router } from 'express';
import { adminClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { mealToCamel } from '../utils/mappers.js';

const router = Router();

// GET /api/calories/history
// Returns logged_meals grouped by date_key, including daily totals, paginated by day.
router.get('/calories/history', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    // 1. Get all unique dates for this user, sorted descending
    const { data: dateData, error: dateError } = await adminClient
      .from('logged_meals')
      .select('date_key')
      .eq('user_id', req.user.id)
      .order('date_key', { ascending: false });

    if (dateError) throw dateError;

    // Supabase doesn't support distinct() directly in JS client easily without RPC,
    // so we distinct in memory.
    const uniqueDates = [...new Set(dateData.map(d => d.date_key))];
    const totalDays = uniqueDates.length;
    
    const paginatedDates = uniqueDates.slice(offset, offset + limit);
    
    if (paginatedDates.length === 0) {
      return res.json({ 
        history: [], 
        hasMore: false,
        totalDays
      });
    }

    // 2. Fetch all meals for those paginated dates
    const { data: mealsData, error: mealsError } = await adminClient
      .from('logged_meals')
      .select('*')
      .eq('user_id', req.user.id)
      .in('date_key', paginatedDates)
      .order('date_key', { ascending: false })
      .order('logged_at', { ascending: true });

    if (mealsError) throw mealsError;

    // 3. Group and aggregate
    const historyMap = {};
    for (const row of mealsData) {
      const meal = mealToCamel(row);
      const d = meal.dateKey;
      if (!historyMap[d]) {
        historyMap[d] = {
          dateKey: d,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          meals: []
        };
      }
      historyMap[d].totalCalories += (meal.calories || 0);
      historyMap[d].totalProtein += (meal.protein || 0);
      historyMap[d].totalCarbs += (meal.carbs || 0);
      historyMap[d].totalFat += (meal.fat || 0);
      historyMap[d].meals.push(meal);
    }

    // Convert map to array in the correct order (paginatedDates preserves descending order)
    const history = paginatedDates.map(d => historyMap[d] || {
      dateKey: d,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: []
    });

    const hasMore = offset + limit < totalDays;

    res.json({
      history,
      hasMore,
      totalDays
    });

  } catch (err) {
    console.error('[calories history GET] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});


export default router;
