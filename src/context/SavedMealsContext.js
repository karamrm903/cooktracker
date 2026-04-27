import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  fetchSavedRecipes,
  setSavedCategory,
  unsaveRecipeById,
} from '../services/recipeService';

const SavedMealsContext = createContext(null);

function rowToMeal(row) {
  return {
    id: row.id,
    name: row.title,
    category: row.saved_category,
    calories: row.calories ?? 0,
    emoji: row.emoji ?? '🍽️',
    color: '#F3F4F6',
    macros: row.protein != null
      ? { protein: row.protein, carbs: row.carbs, fat: row.fat }
      : null,
  };
}

export function SavedMealsProvider({ children }) {
  const [savedMeals, setSavedMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const session = useSelector(state => state.auth.session);

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await fetchSavedRecipes(session);
      setSavedMeals(rows.map(rowToMeal));
    } catch (err) {
      console.warn('[SavedMealsContext] fetch failed:', err?.message ?? err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      reload();
    }
  }, [reload, session]);

  function isSaved(identifier) {
    return savedMeals.some((m) => m.id === identifier || m.name === identifier);
  }

  function getSavedCategory(identifier) {
    return savedMeals.find((m) => m.id === identifier || m.name === identifier)?.category ?? null;
  }

  async function saveMeal(dbId, category) {
    if (!session) return;
    await setSavedCategory(session, dbId, category);

    setSavedMeals((prev) => {
      const exists = prev.find((m) => m.id === dbId);
      if (exists) {
        return prev.map((m) => (m.id === dbId ? { ...m, category } : m));
      }
      return prev;
    });

    await reload();
  }

  async function unsaveMeal(dbId) {
    if (!session) return;
    await unsaveRecipeById(session, dbId);
    setSavedMeals((prev) => prev.filter((m) => m.id !== dbId));
  }

  return (
    <SavedMealsContext.Provider
      value={{
        savedMeals,
        loading,
        isSaved,
        getSavedCategory,
        saveMeal,
        unsaveMeal,
        reload,
      }}
    >
      {children}
    </SavedMealsContext.Provider>
  );
}

export function useSavedMeals() {
  return useContext(SavedMealsContext);
}