import crypto from 'crypto';
import sharp from 'sharp';
import { adminClient } from '../db/client.js';

const PEXELS_API = 'https://api.pexels.com/v1/search';
const BUCKET = 'images';
const FOLDER = 'food-images';
const SIGNED_URL_TTL = 3600; // 1 hour
const IMAGE_WIDTH = 600; // target display width
const WEBP_QUALITY = 70;

function randSuffix(len = 8) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

/**
 * Search Pexels for a food photo matching the query.
 * Returns { buffer, contentType } or null when no key / no result.
 */
export async function fetchPexelsPhoto(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const url = `${PEXELS_API}?query=${encodeURIComponent(query + ' food')}&per_page=5&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) {
    console.warn(`[images] pexels ${res.status}: ${await res.text().catch(() => '')}`);
    return null;
  }
  const data = await res.json();
  const photo = data.photos?.[0];
  const baseUrl = photo?.src?.large ?? photo?.src?.medium ?? photo?.src?.original;
  if (!baseUrl) return null;

  // Ask Pexels for a compressed, resized source to cut download weight.
  const sep = baseUrl.includes('?') ? '&' : '?';
  const photoUrl = `${baseUrl}${sep}auto=compress&cs=tinysrgb&w=${IMAGE_WIDTH}&dpr=1`;

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) return null;
  const raw = Buffer.from(await imgRes.arrayBuffer());

  // Re-encode to WebP at display width — smallest size for same quality.
  const buffer = await sharp(raw)
    .resize(IMAGE_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { buffer, contentType: 'image/webp' };
}

/**
 * Upload an image buffer into the private bucket under
 * `food-images/${recipeId}-${random}.jpg` and return the storage path.
 */
export async function uploadRecipeImage(recipeId, buffer, contentType = 'image/jpeg') {
  const ext = contentType.includes('webp')
    ? 'webp'
    : contentType.includes('png')
      ? 'png'
      : 'jpg';
  const path = `${FOLDER}/${recipeId}-${randSuffix()}.${ext}`;
  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return path;
}

/**
 * Mint a short-lived signed URL for a private storage path.
 * Returns null when the path is empty or the signer fails.
 */
export async function getSignedImageUrl(storagePath, ttl = SIGNED_URL_TTL) {
  if (!storagePath) return null;
  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, ttl);
  if (error) {
    console.warn(`[images] sign failed: ${error.message}`);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * End-to-end helper: fetch a Pexels photo for `query`, upload it, persist the
 * resulting storage path onto the recipe row, and return a 1h signed URL.
 *
 * If the row already has an `image_url`, just sign it. If Pexels is unavailable
 * (no API key / no match), returns null so callers can render a placeholder.
 */
export async function ensureRecipeImage(recipeId, query) {
  const { data: existing, error } = await adminClient
    .from('recipes')
    .select('id, image_url, title')
    .eq('id', recipeId)
    .maybeSingle();
  if (error) throw new Error(`recipe lookup failed: ${error.message}`);
  if (!existing) throw new Error(`recipe ${recipeId} not found`);

  if (existing.image_url) {
    return getSignedImageUrl(existing.image_url);
  }

  const photo = await fetchPexelsPhoto(query || existing.title);
  if (!photo) return null;

  const storagePath = await uploadRecipeImage(recipeId, photo.buffer, photo.contentType);
  await adminClient.from('recipes').update({ image_url: storagePath }).eq('id', recipeId);
  return getSignedImageUrl(storagePath);
}

/**
 * Food-item counterpart of `ensureRecipeImage`: fetch a Pexels photo for a
 * `food_items` row, upload it, persist the path onto the row, return a 1h
 * signed URL. Reuses the shared upload (id-keyed filename) + signer helpers.
 *
 * If the row already has an `image_url`, just sign it. Returns null when Pexels
 * is unavailable so callers can render a placeholder.
 */
export async function ensureFoodItemImage(foodItemId, query) {
  const { data: existing, error } = await adminClient
    .from('food_items')
    .select('id, image_url, name')
    .eq('id', foodItemId)
    .maybeSingle();
  if (error) throw new Error(`food item lookup failed: ${error.message}`);
  if (!existing) throw new Error(`food item ${foodItemId} not found`);

  if (existing.image_url) {
    return getSignedImageUrl(existing.image_url);
  }

  const photo = await fetchPexelsPhoto(query || existing.name);
  if (!photo) return null;

  const storagePath = await uploadRecipeImage(foodItemId, photo.buffer, photo.contentType);
  await adminClient.from('food_items').update({ image_url: storagePath }).eq('id', foodItemId);
  return getSignedImageUrl(storagePath);
}
