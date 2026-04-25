export interface UserProfile {
  id: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: 'lose' | 'maintain' | 'muscle' | 'healthy';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  locale?: string;
  updated_at?: string;
}

export interface Meal {
  id: string;
  recipeId?: string;
  name: string;
  emoji?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  meal: string; // e.g. "Lunch", "Breakfast"
  time: string; // e.g. "12:30 PM"
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dateKey: string; // ISO date string YYYY-MM-DD
  loggedAt: string;
  source?: 'recipe' | 'manual';
  gramsEaten?: number;
  estimatedRecipeGrams?: number;
  fullRecipeNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  pending?: boolean;
}

export interface OnboardingPayload {
  gender: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string;
  activity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
