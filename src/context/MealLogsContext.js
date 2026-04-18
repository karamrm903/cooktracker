import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchDashboard,
  addMealThunk,
  removeMealThunk,
  patchMealThunk,
  optimisticRemoveMeal,
  optimisticUpdateMeal,
  clearMeals,
} from '../store/slices/mealsSlice';

const MealLogsContext = createContext();

export function MealLogsProvider({ children }) {
  const dispatch = useDispatch();
  const session = useSelector((state) => state.auth.session);
  const { meals, totals, loading: isLoadingMeals, isInitialLoad, error } = useSelector(
    (state) => state.meals
  );

  const currentDate = new Date().toISOString().slice(0, 10);
  // Tracks in-flight mutations so focus-refresh doesn't overwrite optimistic state
  const pendingMutations = useRef(0);

  const refreshMeals = useCallback(() => {
    if (session?.access_token) {
      dispatch(fetchDashboard({ session, date: currentDate }));
    }
  }, [session, currentDate, dispatch]);

  // Safe refresh: skips if a mutation (patch/delete) is in-flight
  const safeRefreshMeals = useCallback(() => {
    if (pendingMutations.current === 0) {
      refreshMeals();
    }
  }, [refreshMeals]);

  useEffect(() => {
    if (session?.access_token) {
      dispatch(fetchDashboard({ session, date: currentDate }));
    } else {
      dispatch(clearMeals());
    }
  }, [session?.access_token]);

  // Awaitable — caller (LogMealScreen) waits for this before navigating back.
  // No optimistic add: avoids duplicate when LogMealScreen passes its own id field.
  const addMeal = useCallback(
    async (meal) => {
      if (!session?.access_token) throw new Error('Not authenticated');
      // Strip any client-generated id — DB generates the real UUID
      const { id: _drop, ...mealData } = meal;
      return dispatch(addMealThunk({ session, meal: mealData })).unwrap();
    },
    [session, dispatch]
  );

  const removeMeal = useCallback(
    (id) => {
      dispatch(optimisticRemoveMeal(id));
      pendingMutations.current++;
      dispatch(removeMealThunk({ session, id }))
        .unwrap()
        .catch(() => refreshMeals())
        .finally(() => { pendingMutations.current--; });
    },
    [session, dispatch, refreshMeals]
  );

  const updateMeal = useCallback(
    (id, updates) => {
      dispatch(optimisticUpdateMeal({ id, updates }));
      pendingMutations.current++;
      dispatch(patchMealThunk({ session, id, updates }))
        .unwrap()
        .catch(() => refreshMeals())
        .finally(() => { pendingMutations.current--; });
    },
    [session, dispatch, refreshMeals]
  );

  return (
    <MealLogsContext.Provider
      value={{
        allMeals: meals,
        meals,
        totals,
        isLoadingMeals,
        isInitialLoad,
        error,
        addMeal,
        addMealLog: addMeal,
        removeMeal,
        updateMeal,
        refreshMeals: safeRefreshMeals,
      }}
    >
      {children}
    </MealLogsContext.Provider>
  );
}

export const useMealLogs = () => useContext(MealLogsContext);
