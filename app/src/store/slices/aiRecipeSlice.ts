import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AIGeneratedRecipe {
  id: string;
  name: string;
  emoji?: string | null;
  time?: string;
  difficulty?: string;
  calories?: number;
  macros?: { protein: number; carbs: number; fat: number };
  ingredients?: any[];
  steps?: Array<{ text: string; timerMinutes?: number | null }>;
  nutrition?: any;
  imageUrl?: string | null;
  dbId?: string | null;
  day?: string | null;
  price?: number | null;
}

export interface ShoppingItem {
  category: string;
  name: string;
  qty: string;
  emoji?: string | null;
}

interface AIRecipeState {
  step: number; // 0..3 wizard, 4 = results
  budget: number;
  vibes: string[];
  dietary: string[];
  equipment: string[];
  loading: boolean;
  error: string | null;
  recipes: AIGeneratedRecipe[];
  cached: boolean;
  totalPrice: number;
  shoppingList: ShoppingItem[];
}

const initialState: AIRecipeState = {
  step: 0,
  budget: 25,
  vibes: [],
  dietary: [],
  equipment: [],
  loading: false,
  error: null,
  recipes: [],
  cached: false,
  totalPrice: 0,
  shoppingList: [],
};

const MAX_VIBES = 3;

const aiRecipeSlice = createSlice({
  name: "aiRecipe",
  initialState,
  reducers: {
    resetWizard: () => initialState,
    setStep: (s, a: PayloadAction<number>) => {
      s.step = a.payload;
    },
    setBudget: (s, a: PayloadAction<number>) => {
      s.budget = a.payload;
    },
    toggleVibe: (s, a: PayloadAction<string>) => {
      const id = a.payload;
      const idx = s.vibes.indexOf(id);
      if (idx >= 0) s.vibes.splice(idx, 1);
      else if (s.vibes.length < MAX_VIBES) s.vibes.push(id);
    },
    toggleDietary: (s, a: PayloadAction<string>) => {
      // "none" acts as an exclusive reset
      const id = a.payload;
      if (id === "none") {
        s.dietary = s.dietary.includes("none") ? [] : ["none"];
        return;
      }
      s.dietary = s.dietary.filter((d) => d !== "none");
      const idx = s.dietary.indexOf(id);
      if (idx >= 0) s.dietary.splice(idx, 1);
      else s.dietary.push(id);
    },
    toggleEquipment: (s, a: PayloadAction<string>) => {
      const id = a.payload;
      const idx = s.equipment.indexOf(id);
      if (idx >= 0) s.equipment.splice(idx, 1);
      else s.equipment.push(id);
    },
    generateStart: (s) => {
      s.loading = true;
      s.error = null;
      s.recipes = [];
      s.cached = false;
      s.totalPrice = 0;
      s.shoppingList = [];
    },
    generateSuccess: (
      s,
      a: PayloadAction<{
        recipes: AIGeneratedRecipe[];
        cached: boolean;
        totalPrice?: number;
        shoppingList?: ShoppingItem[];
      }>,
    ) => {
      s.loading = false;
      s.recipes = a.payload.recipes;
      s.cached = a.payload.cached;
      s.totalPrice = a.payload.totalPrice ?? 0;
      s.shoppingList = a.payload.shoppingList ?? [];
    },
    generateFail: (s, a: PayloadAction<string>) => {
      s.loading = false;
      s.error = a.payload;
    },
  },
});

export const {
  resetWizard,
  setStep,
  setBudget,
  toggleVibe,
  toggleDietary,
  toggleEquipment,
  generateStart,
  generateSuccess,
  generateFail,
} = aiRecipeSlice.actions;

export default aiRecipeSlice.reducer;
