import { supabase } from '../lib/supabase';
import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';

// Recipes are a single shared global pool (user_id = NULL) visible to every
// user. Reads go client-direct (allowed by the recipes_select_global RLS
// policy); writes route through the server (RLS blocks client writes to global
// rows). Cache rows (ai_cache / food_search) are excluded so they never surface
// in Explore / Saved.
const NON_RECIPE = 'saved_category.is.null,saved_category.not.in.(ai_cache,food_search)';

export async function saveRecipe(session, recipe, sourceUrl) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${getBaseUrl()}/api/recipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ recipe, sourceUrl: sourceUrl ?? null }),
  });
  const data = await handleResponse(res);
  return data.recipe;
}

export async function fetchSavedRecipes(session) {
  // Saved library = global recipes that have been categorised into a slot.
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .is('user_id', null)
    .not('saved_category', 'is', null)
    .not('saved_category', 'in', '(ai_cache,food_search)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function setSavedCategory(session, id, category) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${getBaseUrl()}/api/recipes/${id}/category`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ category }),
  });
  await handleResponse(res);
}

export async function fetchAllRecipes(session) {
  // The whole shared recipe pool (minus cache rows) — same for every user.
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, calories, protein, carbs, fat, emoji, steps, nutrition, ingredients')
    .is('user_id', null)
    .or(NON_RECIPE)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function unsaveRecipeById(session, id) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${getBaseUrl()}/api/recipes/${id}/category`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ category: null }),
  });
  await handleResponse(res);
}
