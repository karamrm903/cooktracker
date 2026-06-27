import { adminClient } from "../db/client.js";

export async function checkRecipeImportUsage(req, res, next) {
  const userId = req.user.id;

  try {
    const { data: user, error } = await adminClient
      .from("users")
      .select("subscription_status, subscription_expires_at")
      .eq("id", userId)
      .single();

    if (error) throw error;

    if (isAccessGranted(user)) {
      console.log(
        `[usage] recipe_import GRANTED user=${userId} status=${user.subscription_status}`,
      );
      return next();
    }

    console.log(
      `[usage] recipe_import BLOCKED user=${userId} status=${user.subscription_status}`,
    );
    return res.status(403).json({
      allowed: false,
      reason: "limit_reached",
      feature: "recipe_import",
      limit: 0,
      used: 0,
      resetAt: null,
    });
  } catch (err) {
    console.error("[checkRecipeImportUsage] ✖", err.message);
    next();
  }
}

export async function checkSearchUsage(req, res, next) {
  const userId = req.user.id;

  try {
    const { data: user, error } = await adminClient
      .from("users")
      .select("subscription_status, subscription_expires_at")
      .eq("id", userId)
      .single();

    if (error) throw error;

    if (isAccessGranted(user)) {
      console.log(
        `[usage] search GRANTED user=${userId} status=${user.subscription_status}`,
      );
      return next();
    }

    console.log(
      `[usage] search BLOCKED user=${userId} status=${user.subscription_status}`,
    );
    return res.status(403).json({
      allowed: false,
      reason: "limit_reached",
      feature: "search",
      limit: 0,
      used: 0,
      resetAt: null,
    });
  } catch (err) {
    console.error("[checkSearchUsage] ✖", err.message);
    next();
  }
}

// Gate the AI food-search results, but leave the cheap autocomplete
// (mode='suggestions') open so non-premium users still get a value preview.
export async function checkFoodSearchUsage(req, res, next) {
  if ((req.body?.mode ?? "results") === "suggestions") return next();
  return checkSearchUsage(req, res, next);
}

/**
 * Cancelled users retain access until subscription_expires_at.
 */
function isAccessGranted(user) {
  const { subscription_status: status, subscription_expires_at: expiresAt } =
    user;
  if (status === "active" || status === "trial") return true;
  if (status === "cancelled" && expiresAt && new Date(expiresAt) > new Date())
    return true;
  return false;
}
