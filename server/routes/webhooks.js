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

  if (webhookSecret) {
    const signature = req.headers['x-revenuecat-webhook-signature'];
    if (!signature) {
      console.warn('[webhook] Missing signature — ignoring event');
      return res.status(200).json({ received: true });
    }

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      console.warn('[webhook] Invalid signature — ignoring event');
      return res.status(200).json({ received: true });
    }
  } else {
    console.warn('[webhook] REVENUECAT_WEBHOOK_SECRET not set — skipping signature check (set it in server/.env)');
  }

  const event = req.body?.event;
  if (!event?.type || !event?.app_user_id) {
    return res.status(200).json({ received: true });
  }

  const { type: eventType, app_user_id: userId, expiration_at_ms: expiresAtMs } = event;

  console.log(`[webhook] ${eventType} for user ${userId}`);

  try {
    const newStatus = REVENUECAT_STATUS_MAP[eventType];

    if (!newStatus && eventType !== 'BILLING_ISSUE') {
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

    if (Object.keys(updates).length > 0) {
      const { error } = await adminClient.from('users').update(updates).eq('id', userId);
      if (error) {
        console.error('[webhook] DB update failed:', error.message);
      } else {
        console.log(`[webhook] ✔ ${eventType} → status=${newStatus ?? 'unchanged'} for ${userId}`);
      }
    }
  } catch (err) {
    console.error('[webhook] ✖', err.message);
  }

  res.status(200).json({ received: true });
});

export default router;
