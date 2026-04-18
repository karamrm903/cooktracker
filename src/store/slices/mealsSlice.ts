import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Meal } from "../../types";
import {
  dashboardService,
  DashboardTotals,
} from "../../services/dashboard.service";
import { mealService } from "../../services/meal.service";

interface MealsState {
  meals: Meal[];
  totals: DashboardTotals;
  streak: number;
  loading: boolean;
  isInitialLoad: boolean;
  error: string | null;
}

const initialState: MealsState = {
  meals: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  streak: 0,
  loading: false,
  isInitialLoad: true,
  error: null,
};

function recalcTotals(meals: Meal[]): DashboardTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchDashboard = createAsyncThunk(
  "meals/fetchDashboard",
  async ({ session, date }: { session: any; date: string }) =>
    dashboardService.getDashboard(session, date)
);

// No optimistic — caller awaits this and navigates only on success
export const addMealThunk = createAsyncThunk(
  "meals/add",
  async ({ session, meal }: { session: any; meal: Omit<Meal, "id"> }) =>
    mealService.addMeal(session, meal)
);

export const removeMealThunk = createAsyncThunk(
  "meals/remove",
  async ({ session, id }: { session: any; id: string }) => {
    await mealService.deleteMeal(session, id);
    return id;
  }
);

export const patchMealThunk = createAsyncThunk(
  "meals/patch",
  async ({
    session,
    id,
    updates,
  }: {
    session: any;
    id: string;
    updates: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      gramsEaten?: number;
    };
  }) => mealService.updateMeal(session, id, updates)
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const mealsSlice = createSlice({
  name: "meals",
  initialState,
  reducers: {
    clearMeals: (state) => {
      state.meals = [];
      state.totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      state.streak = 0;
      state.error = null;
      state.loading = false;
      state.isInitialLoad = true;
    },
    optimisticRemoveMeal: (state, action: PayloadAction<string>) => {
      state.meals = state.meals.filter((m) => m.id !== action.payload);
      state.totals = recalcTotals(state.meals);
    },
    optimisticUpdateMeal: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Meal> }>
    ) => {
      const idx = state.meals.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) {
        state.meals[idx] = { ...state.meals[idx], ...action.payload.updates };
        state.totals = recalcTotals(state.meals);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.isInitialLoad = false;
        state.meals = action.payload.meals;
        state.totals = action.payload.totals;
        state.streak = action.payload.streak ?? state.streak;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.isInitialLoad = false;
        state.error = action.error.message ?? "Failed to load meals";
      });

    builder
      .addCase(addMealThunk.fulfilled, (state, action) => {
        state.meals.push(action.payload);
        state.totals = recalcTotals(state.meals);
      })
      .addCase(addMealThunk.rejected, (state, action) => {
        state.error = action.error.message ?? "Failed to add meal";
      });

    builder.addCase(removeMealThunk.rejected, (state, action) => {
      state.error = action.error.message ?? "Failed to delete meal";
    });

    builder
      .addCase(patchMealThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.meals.findIndex((m) => m.id === updated.id);
        if (idx !== -1) {
          state.meals[idx] = updated;
          state.totals = recalcTotals(state.meals);
        }
      })
      .addCase(patchMealThunk.rejected, (state, action) => {
        state.error = action.error.message ?? "Failed to update meal";
      });
  },
});

export const { clearMeals, optimisticRemoveMeal, optimisticUpdateMeal } =
  mealsSlice.actions;
export default mealsSlice.reducer;
