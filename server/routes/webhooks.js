import { Router } from 'express';
import crypto from 'crypto';
import { adminClient } from '../db/client.js';
import { config } from '../config.js';

const router = Router();

const REVENUECAT_STATUS_MAP = {
  INITIAL_PURCHASE:  'active',
  RENEWAL:           'active',
  TRIAL_STARTED:     'trial',
  TRIAL_CONVERTED:   'active',
  // TRIAL_CANCELLED: user cancelled but trial period still runs — keep 'trial'
  // until EXPIRATION fires and revokes access
  TRIAL_CANCELLED:   'trial',
  CANCELLATION:      'cancelled',
  EXPIRATION:        'expired',
  UNCANCELLATION:    'active',
  // BILLING_ISSUE: no status change — grace period, access continues
};

// POST /webhooks/revenuecat
// Always returns 200 — RevenueCat retries on non-2xx with exponential backoff.
router.post('/revenuecat', async (req, res) => {
  const webhookSecret = config.revenuecat.webhookSecret;

  // RevenueCat does NOT send an HMAC signature header. It sends the value you
  // configure in RC Dashboard → Webhooks → "Authorization header value" verbatim
  // in the `Authorization` header. Verify by constant-time comparing that header
  // to REVENUECAT_WEBHOOK_SECRET. The RC value must EXACTLY equal the env var.
  if (webhookSecret) {
    const authHeader = req.headers['authorization'] ?? '';
    const a = Buffer.from(authHeader);
    const b = Buffer.from(webhookSecret);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      console.warn('[webhook] auth: REJECTED (Authorization header missing or ≠ REVENUECAT_WEBHOOK_SECRET)');
      return res.status(200).json({ received: true });
    }
    console.log('[webhook] auth: VERIFIED');
  } else {
    console.warn('[webhook] auth: SKIPPED (REVENUECAT_WEBHOOK_SECRET not set — set it in Render → Environment)');
  }

  const event = req.body?.event;
  if (!event?.type || !event?.app_user_id) {
    console.warn('[webhook] ignored: missing event.type or app_user_id', JSON.stringify(req.body ?? {}));
    return res.status(200).json({ received: true });
  }

  const {
    type: eventType,
    app_user_id: userId,
    expiration_at_ms: expiresAtMs,
    environment,
    store,
  } = event;

  console.log(
    `[webhook] received: type=${eventType} user=${userId} env=${environment ?? '?'} ` +
    `store=${store ?? '?'} expires=${expiresAtMs ? new Date(expiresAtMs).toISOString() : 'none'}`,
  );
  console.log('[webhook] event payload:', JSON.stringify(event));

  try {
    const newStatus = REVENUECAT_STATUS_MAP[eventType];

    if (!newStatus && eventType !== 'BILLING_ISSUE') {
      console.log(`[webhook] no status mapping for "${eventType}" — ignored (access unchanged)`);
      return res.status(200).json({ received: true });
    }

    const updates = {};
    if (newStatus) updates.subscription_status = newStatus;
    if (expiresAtMs) updates.subscription_expires_at = new Date(expiresAtMs).toISOString();

    if (eventType === 'TRIAL_STARTED') {
      updates.trial_ends_at = expiresAtMs ? new Date(expiresAtMs).toISOString() : null;
    }
    if (eventType === 'EXPIRATION') {
      updates.trial_ends_at = null;
    }

    console.log(`[webhook] mapping: ${eventType} → status=${newStatus ?? 'unchanged'} | updates=`, JSON.stringify(updates));

    if (Object.keys(updates).length > 0) {
      const { error } = await adminClient.from('users').update(updates).eq('id', userId);
      if (error) {
        console.error('[webhook] ✖ DB update failed for', userId, '—', error.message, JSON.stringify(error));
      } else {
        console.log(`[webhook] ✔ DB updated: user=${userId} status=${newStatus ?? 'unchanged'}`);
      }
    } else {
      console.log(`[webhook] no DB changes for ${eventType} (user=${userId})`);
    }
  } catch (err) {
    console.error('[webhook] ✖ handler error:', err.message);
  }

  res.status(200).json({ received: true });
});

export default router;
