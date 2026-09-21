import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../db/client.js';
import { callClaude } from '../utils/claude.js';
import { ensureRecipeImage, getPublicImageUrl } from '../utils/images.js';

const router = Router();

const RECIPE_COUNT = 7;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// ── Input normalization + hashing ─────────────────────────────────────────────

function normalize(body) {
  const budget = Math.max(0, Math.round(Number(body?.budget) || 0));
  const norm = (arr) =>
    Array.isArray(arr)
      ? [...new Set(arr.map((v) => String(v).trim().toLowerCase()).filter(Boolean))].sort()
      : [];
  return {
    budget,
    vibes: norm(body?.vibes),
    dietary: norm(body?.dietary),
    equipment: norm(body?.equipment),
  };
}

function hashInputs(input) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt({ budget, vibes, dietary, equipment }) {
  return (
    `Plan a full 7-day weekly dinner rotation for a home cook — one recipe per day, Monday through Sunday. Also produce a consolidated grocery shopping list that combines all ingredients across every recipe.\n\n` +
    `Preferences:\n` +
    `- Weekly grocery budget (USD): ${budget}\n` +
    `- Vibes: ${vibes.length ? vibes.join(', ') : 'no preference'}\n` +
    `- Dietary needs: ${dietary.length ? dietary.join(', ') : 'none'}\n` +
    `- Kitchen equipment available: ${equipment.length ? equipment.join(', ') : 'basic pantry only'}\n\n` +
    `Return ONLY valid JSON — no markdown, no code fences — matching:\n` +
    `{\n` +
    `  "recipes": [\n` +
    `    {\n` +
    `      "day": "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",\n` +
    `      "price": integer estimated USD cost per serving (grocery share for this recipe),\n` +
    `      "title": "Short dish name",\n` +
    `      "emoji": "single emoji glyph representing the dish",\n` +
    `      "time": "e.g. 25 min",\n` +
    `      "difficulty": "easy" | "medium" | "hard",\n` +
    `      "calories": integer total kcal per serving,\n` +
    `      "macros": { "protein": grams, "carbs": grams, "fat": grams },\n` +
    `      "ingredients": ["e.g. 2 chicken breasts", "1 cup rice"],\n` +
    `      "steps": [ { "text": "Do X", "timerMinutes": null | integer } ]\n` +
    `    }\n` +
    `  ],\n` +
    `  "shoppingList": [\n` +
    `    {\n` +
    `      "category": "veggies" | "meat & fish" | "dairy & eggs" | "bakery" | "pasta, rice & noodles" | "pantry" | "other",\n` +
    `      "name": "Item name (e.g. Potatoes)",\n` +
    `      "qty": "human-readable total across the week (e.g. \\"3 pcs\\", \\"500 g\\", \\"1 kg bag\\", \\"200 ml\\")",\n` +
    `      "emoji": "single emoji representing the item"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- Exactly ${RECIPE_COUNT} recipes, one per day, in order mon → sun.\n` +
    `- Sum of all "price" values MUST be ≤ ${budget}. Distribute cost sensibly across the week.\n` +
    `- Honor every dietary restriction strictly.\n` +
    `- Only use tools within the listed equipment (assume knife, cutting board, and stovetop are always available).\n` +
    `- Each recipe: 4-6 ingredients, 3-5 steps. Steps concise (one sentence).\n` +
    `- Vary cuisine and protein sources across the week — no repeats.\n` +
    `- Shopping list MUST aggregate identical ingredients across recipes (e.g. eggs used Mon + Wed → single row with combined qty).\n` +
    `- Use one of the seven canonical categories exactly as spelled above.`
  );
}

// ── Recipe -> DB row + client shape ──────────────────────────────────────────

function toRecipeRow(r) {
  const nutrition = {
    total: {
      calories: Number(r.calories) || 0,
      protein: Number(r.macros?.protein) || 0,
      carbs: Number(r.macros?.carbs) || 0,
      fat: Number(r.macros?.fat) || 0,
    },
  };
  const ingredients = Array.isArray(r.ingredients)
    ? JSON.stringify(r.ingredients)
    : null;
  const instructions = Array.isArray(r.steps)
    ? r.steps.map((s, i) => `${i + 1}. ${s.text ?? s}`).join('\n')
    : null;
  return {
    user_id: null,
    title: r.title,
    emoji: r.emoji ?? null,
    ingredients,
    instructions,
    steps: r.steps ?? null,
    nutrition,
    calories: nutrition.total.calories,
    protein: nutrition.total.protein,
    carbs: nutrition.total.carbs,
    fat: nutrition.total.fat,
    saved_category: 'ai_generated',
  };
}

function toClientRecipe(row, meta) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.title,
    emoji: row.emoji,
    calories: row.calories ?? row.nutrition?.total?.calories ?? 0,
    macros: {
      protein: row.protein ?? row.nutrition?.total?.protein ?? 0,
      carbs: row.carbs ?? row.nutrition?.total?.carbs ?? 0,
      fat: row.fat ?? row.nutrition?.total?.fat ?? 0,
    },
    ingredients: (() => {
      try {
        return typeof row.ingredients === 'string'
          ? JSON.parse(row.ingredients)
          : row.ingredients ?? [];
      } catch {
        return [];
      }
    })(),
    steps: row.steps ?? [],
    nutrition: row.nutrition ?? null,
    imageUrl: row.image_url ? getPublicImageUrl(row.image_url) : null,
    day: meta?.day ?? null,
    price: meta?.price ?? null,
  };
}

const ROW_COLS = 'id, title, emoji, calories, protein, carbs, fat, nutrition, ingredients, steps, image_url';

async function upsertRecipe(r) {
  if (!r?.title) return null;
  const row = toRecipeRow(r);
  const { data: existing } = await adminClient
    .from('recipes')
    .select('id, image_url')
    .is('user_id', null)
    .eq('title', row.title)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await adminClient
      .from('recipes')
      .update(row)
      .eq('id', existing.id)
      .select(ROW_COLS)
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await adminClient
    .from('recipes')
    .insert(row)
    .select(ROW_COLS)
    .single();
  if (error) throw error;
  return data;
}

async function ensureImageForRow(row) {
  if (row.image_url) return row;
  try {
    await ensureRecipeImage(row.id, row.title);
    const { data } = await adminClient
      .from('recipes')
      .select(ROW_COLS)
      .eq('id', row.id)
      .single();
    return data ?? row;
  } catch (err) {
    console.warn(`[ai-recipes] image failed for "${row.title}":`, err.message);
    return row;
  }
}

// ── POST /api/ai-recipes/generate ─────────────────────────────────────────────

router.post('/ai-recipes/generate', requireAuth, async (req, res) => {
  const input = normalize(req.body);
  const force = !!req.body?.force;
  const hash = hashInputs(input);

  console.log(
    `[ai-recipes] ▶ request received (hash=${hash.slice(0, 8)}${force ? ', force=true' : ''})`,
    input,
  );
  try {
    // 1. Cache lookup — skipped when the client requests a regenerate.
    if (!force) {
      const { data: cacheRow, error: lookupErr } = await adminClient
        .from('ai_recipe_cache')
        .select('recipe_ids, metadata')
        .eq('hash', hash)
        .maybeSingle();

      if (lookupErr) {
        console.error(
          `[ai-recipes] ✖ cache lookup failed for hash=${hash.slice(0, 8)}: ${lookupErr.message}.`,
        );
      }

      if (cacheRow?.recipe_ids?.length) {
        const cachedIds = cacheRow.recipe_ids;
        const { data: rows, error } = await adminClient
          .from('recipes')
          .select(ROW_COLS)
          .in('id', cachedIds);
        if (!error && rows?.length) {
          const byId = new Map(rows.map((r) => [String(r.id), r]));
          const metaItems = cacheRow.metadata?.items ?? [];
          const metaById = new Map(metaItems.map((m) => [String(m.id), m]));
          const ordered = cachedIds
            .map((id) => {
              const row = byId.get(String(id));
              if (!row) return null;
              return toClientRecipe(row, metaById.get(String(id)));
            })
            .filter(Boolean);
          // Backfill any missing image (rare) then re-project.
          const filled = await Promise.all(
            ordered.map(async (rec) => {
              if (rec.imageUrl) return rec;
              const rawRow = byId.get(String(rec.id));
              const refreshed = await ensureImageForRow(rawRow);
              return toClientRecipe(refreshed, metaById.get(String(rec.id)));
            }),
          );
          const totalPrice = filled.reduce((s, r) => s + (Number(r.price) || 0), 0);
          const shoppingList = Array.isArray(cacheRow.metadata?.shoppingList)
            ? cacheRow.metadata.shoppingList
            : [];
          console.log(
            `[ai-recipes] 🗄  SOURCE=DB_CACHE — served ${filled.length} recipes from ai_recipe_cache (hash=${hash.slice(0, 8)}). No Claude call.`,
          );
          return res.json({
            recipes: filled,
            cached: true,
            budget: input.budget,
            totalPrice,
            shoppingList,
          });
        }
        console.log(`[ai-recipes] cache row present but recipes missing — regenerating`);
      } else {
        console.log(`[ai-recipes] no cache row for hash=${hash.slice(0, 8)} — calling Claude`);
      }
    } else {
      console.log(`[ai-recipes] force=true — skipping cache read, regenerating`);
    }

    // 2. Cache miss (or force) — call Claude.
    const parsed = await callClaude({
      system: 'You are a culinary planning AI. Always respond with valid JSON only. No markdown fences.',
      messages: [{ role: 'user', content: [{ type: 'text', text: buildPrompt(input) }] }],
      maxTokens: 5000,
    });

    const raw = Array.isArray(parsed?.recipes) ? parsed.recipes.slice(0, RECIPE_COUNT) : [];
    if (raw.length === 0) throw new Error('AI returned no recipes');

    const shoppingList = Array.isArray(parsed?.shoppingList)
      ? parsed.shoppingList.map((it) => ({
          category: String(it?.category ?? 'other').toLowerCase(),
          name: String(it?.name ?? '').trim(),
          qty: String(it?.qty ?? '').trim(),
          emoji: it?.emoji ? String(it.emoji) : null,
        })).filter((it) => it.name)
      : [];

    // 3. Persist recipes; pair each with its day+price metadata.
    const persisted = [];
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const row = await upsertRecipe(r);
      if (!row) continue;
      const day = DAYS.includes(String(r.day).toLowerCase())
        ? String(r.day).toLowerCase()
        : DAYS[i] ?? null;
      const price = Math.max(0, Math.round(Number(r.price) || 0));
      persisted.push({ row, day, price });
    }
    const withImages = await Promise.all(
      persisted.map(async (p) => ({ ...p, row: await ensureImageForRow(p.row) })),
    );

    // 4. Cache the id + metadata for future identical requests (overwrite on force).
    if (withImages.length) {
      const ids = withImages.map((p) => String(p.row.id));
      const items = withImages.map((p) => ({
        id: String(p.row.id),
        day: p.day,
        price: p.price,
      }));
      const { error: cacheErr } = await adminClient
        .from('ai_recipe_cache')
        .upsert(
          { hash, recipe_ids: ids, metadata: { items, shoppingList } },
          { onConflict: 'hash' },
        );
      if (cacheErr) {
        console.error(
          `[ai-recipes] ✖ CACHE WRITE FAILED for hash=${hash.slice(0, 8)}: ${cacheErr.message}.`,
        );
      } else {
        console.log(
          `[ai-recipes] 💾 cached ${ids.length} recipes under hash=${hash.slice(0, 8)}`,
        );
      }
    }

    const projected = withImages.map((p) => toClientRecipe(p.row, { day: p.day, price: p.price }));
    const totalPrice = projected.reduce((s, r) => s + (Number(r.price) || 0), 0);
    console.log(
      `[ai-recipes] 🤖 SOURCE=CLAUDE_AI — generated ${projected.length} fresh recipes (hash=${hash.slice(0, 8)}, total=$${totalPrice}, shoppingList=${shoppingList.length}).`,
    );
    res.json({
      recipes: projected,
      cached: false,
      budget: input.budget,
      totalPrice,
      shoppingList,
    });
  } catch (err) {
    console.error('[ai-recipes] ✖', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
