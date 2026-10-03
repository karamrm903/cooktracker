import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';

export interface PlateItem {
  name: string;
  category: 'protein' | 'carb' | 'veggie' | 'fat' | 'condiment';
  dotColor: string;
  portionGrams: number;
  calories: number;
}

export interface PlateRecommendation {
  id: string;
  text: string;
  scoreImpact: number;
}

export interface PlateAnalysisResult {
  dishName: string;
  items: PlateItem[];
  initialScore: number;
  refinedScore: number;
  potentialScore: number;
  statusLabel: string;
  macros: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  insights: string[];
  recommendations: PlateRecommendation[];
  accuracyDefaults: {
    cookingOil: string;
    sauce: string;
    exactAmounts: string;
  };
}

export const FALLBACK_PLATE_ANALYSIS: PlateAnalysisResult = {
  dishName: "Grilled Chicken Kebab Platter",
  items: [
    { name: "grilled chicken kebab", category: "protein", dotColor: "#FF8A45", portionGrams: 220, calories: 340 },
    { name: "white rice", category: "carb", dotColor: "#F59E0B", portionGrams: 160, calories: 210 },
    { name: "onion herb salad", category: "veggie", dotColor: "#22C55E", portionGrams: 90, calories: 45 },
    { name: "tomato slice", category: "veggie", dotColor: "#22C55E", portionGrams: 50, calories: 15 },
    { name: "grilled green chili", category: "veggie", dotColor: "#22C55E", portionGrams: 25, calories: 10 },
    { name: "pita or tortilla flatbread", category: "carb", dotColor: "#F59E0B", portionGrams: 60, calories: 180 },
  ],
  initialScore: 100,
  refinedScore: 89,
  potentialScore: 99,
  statusLabel: "On plan. Keep it up.",
  macros: {
    calories: 800,
    carbs: 70,
    protein: 80,
    fat: 28,
  },
  insights: [
    "Protein supports satiety for fat loss",
    "Vegetable volume helps fullness",
  ],
  recommendations: [
    { id: "rice", text: "Cut back on white rice", scoreImpact: 6 },
    { id: "bread", text: "Cut back on flatbread", scoreImpact: 4 },
  ],
  accuracyDefaults: {
    cookingOil: "1 tbsp cooking oil / butter",
    sauce: "Sauce on the side",
    exactAmounts: "Standard 1 plate portion",
  },
};

export async function analyzePlateImage(params: {
  image: string; // base64 string
  diningContext: 'dining_in' | 'dining_out';
  mealType?: string;
  session: any;
  locale?: string;
}): Promise<PlateAnalysisResult> {
  const { image, diningContext, mealType = 'dinner', session, locale = 'en' } = params;

  const headers = await getAuthHeaders(session);
  const baseUrl = getBaseUrl();
  console.log(`[PlateScanner] Calling ${baseUrl}/api/plate-scanner/analyze (diningContext: ${diningContext})`);

  const res = await fetch(`${baseUrl}/api/plate-scanner/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image,
      diningContext,
      mealType,
      locale,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.warn(`[PlateScanner] Server returned ${res.status}: ${errorText}`);
    throw new Error(`Server returned ${res.status}: ${errorText || 'Analysis request failed'}`);
  }

  const data = await handleResponse<PlateAnalysisResult>(res);
  console.log(`[PlateScanner] ✔ Successfully received analysis for "${data.dishName}", items: ${data.items?.length}`);
  return data;
}
