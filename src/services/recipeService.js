import { supabase } from '../lib/supabase';

export async function saveRecipe(session, recipe, sourceUrl) {
  const ingredients = Array.isArray(recipe.ingredients)
    ? JSON.stringify(recipe.ingredients)
    : (recipe.ingredients ?? null);

  const instructions = Array.isArray(recipe.steps)
    ? recipe.steps.map((s, i) => `${i + 1}. ${s.text ?? s}`).join('\n')
    : null;

  const { data, error } = await supabase
    .from('recipes')
    .upsert({
      user_id:      session?.user?.id ?? null,
      title:        recipe.title,
      ingredients,
      instructions,
      steps:        recipe.steps ?? null,
      nutrition:    recipe.nutrition ?? null,
      calories:     recipe.nutrition?.total?.calories ?? recipe.nutrition?.calories ?? null,
      protein:      recipe.nutrition?.total?.protein  ?? recipe.nutrition?.protein  ?? null,
      carbs:        recipe.nutrition?.total?.carbs    ?? recipe.nutrition?.carbs    ?? null,
      fat:          recipe.nutrition?.total?.fat      ?? recipe.nutrition?.fat      ?? null,
      emoji:        recipe.emoji ?? null,
      source_url:   sourceUrl ?? null,
    }, { onConflict: 'user_id,title' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSavedRecipes(session) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', session?.user?.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function setSavedCategory(session, id, category) {
  const { error } = await supabase
    .from('recipes')
    .update({ saved_category: category })
    .eq('id', id)
    .eq('user_id', session?.user?.id);

  if (error) throw error;
}

export async function fetchAllRecipes(session) {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, calories, protein, carbs, fat, emoji, steps, nutrition, ingredients')
    .eq('user_id', session?.user?.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function unsaveRecipeById(session, id) {
  const { error } = await supabase
    .from('recipes')
    .update({ saved_category: null })
    .eq('id', id)
    .eq('user_id', session?.user?.id);

  if (error) throw error;
}
