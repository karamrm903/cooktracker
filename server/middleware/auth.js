import { anonClient } from '../db/client.js';

// Verifying the token with Supabase Auth is a network round-trip. Doing it on
// every request makes each endpoint pay that latency (and a launch burst fires
// dozens at once). Cache the verified user per token for a few minutes and dedupe
// concurrent verifications so the burst collapses to a single Auth call.
const USER_TTL = 5 * 60 * 1000; // 5 min (tokens live ~1h, so this is safe)
const _userCache = new Map(); // token -> { user, exp }
const _userInFlight = new Map(); // token -> Promise

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Fast path — recently verified.
  const cached = _userCache.get(token);
  if (cached && cached.exp > Date.now()) {
    req.user = cached.user;
    return next();
  }

  try {
    let pending = _userInFlight.get(token);
    if (!pending) {
      pending = anonClient.auth.getUser(token).finally(() => _userInFlight.delete(token));
      _userInFlight.set(token, pending);
    }
    const { data: { user } = {}, error } = await pending;

    if (error || !user) {
      _userCache.delete(token);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    _userCache.set(token, { user, exp: Date.now() + USER_TTL });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}
