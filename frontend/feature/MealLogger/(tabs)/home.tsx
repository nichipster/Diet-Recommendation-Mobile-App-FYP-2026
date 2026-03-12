import { Stack } from "expo-router";
import { View } from "react-native";
import { useState } from "react";

import MealList from "../components/meal-list";

export default function HomeScreen() {
  const [meals, setMeals] = useState([]);

  const addMeal = (meal) => {
    setMeals((prev) => [...prev, meal]);
  };

  const deleteMeal = (id) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== id));
  };

  const editMeal = (updatedMeal) => {
    setMeals((prev) =>
      prev.map((meal) => (meal.id === updatedMeal.id ? updatedMeal : meal))
    );
  };

  return (
    <>
      {/* Hide the default header completely */}
      <Stack.Screen
        options={{
          headerShown: false, // ensures no top-left "index" appears
        }}
      />

      <View style={{ flex: 1 }}>
        <MealList
          meals={meals}
          deleteMeal={deleteMeal}
          editMeal={editMeal}
        />
      </View>
    </>
  );
}