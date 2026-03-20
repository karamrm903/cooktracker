import { supabase } from '../lib/supabase';

/**
 * Insert an extracted recipe row into Supabase.
 * Returns the saved row (including the generated `id`).
 */
export async function saveRecipe(recipe, sourceUrl) {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      title:       recipe.title,
      ingredients: recipe.ingredients,
      steps:       recipe.steps,
      calories:    recipe.nutrition?.calories ?? null,
      protein:     recipe.nutrition?.protein  ?? null,
      carbs:       recipe.nutrition?.carbs    ?? null,
      fat:         recipe.nutrition?.fat      ?? null,
      emoji:       recipe.emoji ?? null,
      source_url:  sourceUrl ?? null,
      user_id:     null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all recipes the user has saved (saved_category IS NOT NULL).
 */
export async function fetchSavedRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .not('saved_category', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Set (or update) the saved category for a recipe row.
 */
export async function setSavedCategory(id, category) {
  const { error } = await supabase
    .from('recipes')
    .update({ saved_category: category })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch all recipes (saved or not) as candidates for meal planning.
 * Only fetches the columns needed for planning.
 */
export async function fetchAllRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, calories, protein, carbs, fat, emoji, saved_category')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Remove a recipe from Saved by nulling its saved_category.
 */
export async function unsaveRecipeById(id) {
  const { error } = await supabase
    .from('recipes')
    .update({ saved_category: null })
    .eq('id', id);

  if (error) throw error;
}
