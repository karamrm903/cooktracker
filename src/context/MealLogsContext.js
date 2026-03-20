import React, { createContext, useState, useContext } from 'react';

const MealLogsContext = createContext();

export function MealLogsProvider({ children }) {
  const [meals, setMeals] = useState([]);

  // ➕ Add meal
  const addMeal = (meal) => {
    setMeals((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ...meal,
      },
    ]);
  };

  // ❌ Delete meal
  const removeMeal = (id) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== id));
  };

  // 📊 Totals
  const totals = meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fat += meal.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
 <MealLogsContext.Provider
  value={{
    allMeals: meals,
    meals,
    addMeal,
    addMealLog: addMeal,
    removeMeal,
  }}
>
  {children}
</MealLogsContext.Provider>
  );
}

export const useMealLogs = () => {
  return useContext(MealLogsContext);
};