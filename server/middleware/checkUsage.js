import { adminClient } from '../db/client.js';

export async function checkRecipeImportUsage(req, res, next) {
  const userId = req.user.id;

  try {
    const { data: user, error } = await adminClient
      .from('users')
      .select('subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (isAccessGranted(user)) return next();

    return res.status(403).json({
      allowed: false,
      reason: 'limit_reached',
      feature: 'recipe_import',
      limit: 0,
      used: 0,
      resetAt: null,
    });
  } catch (err) {
    console.error('[checkRecipeImportUsage] ✖', err.message);
    next();
  }
}

export async function checkSearchUsage(req, res, next) {
  const userId = req.user.id;

  try {
    const { data: user, error } = await adminClient
      .from('users')
      .select('subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (isAccessGranted(user)) return next();

    return res.status(403).json({
      allowed: false,
      reason: 'limit_reached',
      feature: 'search',
      limit: 0,
      used: 0,
      resetAt: null,
    });
  } catch (err) {
    console.error('[checkSearchUsage] ✖', err.message);
    next();
  }
}

/**
 * Cancelled users retain access until subscription_expires_at.
 */
function isAccessGranted(user) {
  const { subscription_status: status, subscription_expires_at: expiresAt } = user;
  if (status === 'active' || status === 'trial') return true;
  if (status === 'cancelled' && expiresAt && new Date(expiresAt) > new Date()) return true;
  return false;
}
