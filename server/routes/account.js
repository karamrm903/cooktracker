import { Router } from 'express';
import { adminClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// DELETE /api/account — GDPR: deletes all user data
router.delete('/account', requireAuth, async (req, res) => {
  const userId = req.user.id;
  console.log(`[account delete] Initiated for user ${userId}`);

  try {
    // Delete in dependency order to avoid FK violations
    await adminClient.from('logged_meals').delete().eq('user_id', userId);
    await adminClient.from('recipes').delete().eq('user_id', userId);
    await adminClient.from('users').delete().eq('id', userId);

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;

    console.log(`[account delete] ✔ All data deleted for ${userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[account delete] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
