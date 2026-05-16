// DB snake_case row → camelCase object for the mobile app
export function mealToCamel(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? undefined,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    mealType: row.meal_type,
    meal: row.meal ?? '',
    time: row.time ?? '',
    dateKey: row.date_key,
    loggedAt: row.logged_at,
    source: row.source ?? undefined,
    recipeId: row.recipe_id ?? undefined,
    gramsEaten: row.grams_eaten ?? undefined,
    estimatedRecipeGrams: row.estimated_recipe_grams ?? undefined,
    fullRecipeNutrition: row.full_recipe_nutrition ?? undefined,
  };
}
