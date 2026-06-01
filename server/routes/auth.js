import { Router } from 'express';
import { adminClient, anonClient } from '../db/client.js';

const router = Router();

async function findUserByEmail(email) {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

router.post('/signup-init', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      if (existing.email_confirmed_at) {
        return res.status(409).json({ error: 'EMAIL_ALREADY_REGISTERED' });
      }
      const { error: delErr } = await adminClient.auth.admin.deleteUser(existing.id);
      if (delErr) throw delErr;
      console.log(`[signup-init] Recycled unconfirmed user ${existing.id} (${email})`);
    }

    const { error: signErr } = await anonClient.auth.signUp({ email, password });
    if (signErr) {
      return res.status(400).json({ error: signErr.message });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[signup-init] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
