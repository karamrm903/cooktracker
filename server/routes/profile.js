import { Router } from 'express';
import { adminClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/profile', requireAuth, async (req, res) => {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'Missing request body' });

  for (const k of ['gender', 'goal', 'activity']) {
    if (!payload[k] || typeof payload[k] !== 'string') {
      return res.status(400).json({ error: `Invalid or missing field: ${k}` });
    }
  }

  try {
    const { data, error } = await adminClient
      .from('users')
      .upsert({
        id: req.user.id,
        ...(payload.name !== undefined && { name: payload.name || null }),
        gender: payload.gender,
        age: parseInt(payload.age) || null,
        height_cm: parseFloat(payload.height_cm) || null,
        weight_kg: parseFloat(payload.weight_kg) || null,
        goal: payload.goal,
        activity_level: payload.activity,
        calories: parseInt(payload.calories) || 0,
        protein: parseInt(payload.protein) || 0,
        carbs: parseInt(payload.carbs) || 0,
        fat: parseInt(payload.fat) || 0,
        ...(payload.locale && { locale: payload.locale }),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    console.error('[profile POST] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/profile', requireAuth, async (req, res) => {
  const { locale } = req.body ?? {};
  if (!locale || typeof locale !== 'string') {
    return res.status(400).json({ error: 'locale required' });
  }

  try {
    const { error } = await adminClient
      .from('users')
      .update({ locale, updated_at: new Date().toISOString() })
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[profile PATCH] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { data, error } = await adminClient
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ profile: data || null });
  } catch (err) {
    console.error('[profile GET] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
