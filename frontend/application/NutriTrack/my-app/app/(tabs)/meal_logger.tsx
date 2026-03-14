import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import TimelineView from "../components/meal_logger/components/timeline-view";
import AddMealMenu from "../components/meal_logger/components/add-meal-menu";
import MealFormModal, { Meal } from "../components/meal_logger/components/meal-form-modal";
import DateSelector from "../components/meal_logger/components/date-selector";
import { useGoals } from "../context/GoalsContext";

interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  meals: number;
}

export default function MealLogger() {
  const { setMeals: setSharedMeals } = useGoals();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  // Load meals from AsyncStorage on mount
  useEffect(() => {
    const loadMeals = async () => {
      const stored = await AsyncStorage.getItem("meals");
      if (stored) {
        const parsed = JSON.parse(stored);
        setMeals(parsed);
        setSharedMeals(parsed); // sync to context so dashboard can read
      }
    };
    loadMeals();
  }, []);

  // Save meals to both AsyncStorage and shared context
  const saveMeals = async (data: Meal[]) => {
    setMeals(data);
    setSharedMeals(data);
    await AsyncStorage.setItem("meals", JSON.stringify(data));
  };

  const handleAddMeal = (mealData: Omit<Meal, "id">) => {
    const newMeal: Meal = { ...mealData, id: Date.now().toString() };
    saveMeals([newMeal, ...meals]);
  };

  const handleUpdateMeal = (updatedMeal: Meal) => {
    const updated = meals.map((m) => m.id === updatedMeal.id ? updatedMeal : m);
    saveMeals(updated);
  };

  const handleDeleteMeal = (id: string) => {
    saveMeals(meals.filter((m) => m.id !== id));
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowMenu(true);
  };

  const handleMethodSelect = (method: string) => {
    if (method === "manual") {
      setEditingMeal(null);
      setShowFormModal(true);
    }
    setShowMenu(false);
  };

  const handleSaveMeal = (mealData: Meal | Omit<Meal, "id">) => {
    if ("id" in mealData) {
      handleUpdateMeal(mealData as Meal);
    } else {
      handleAddMeal(mealData as Omit<Meal, "id">);
    }
    setShowFormModal(false);
    setEditingMeal(null);
  };

  useEffect(() => {
    if (editingMeal) setShowFormModal(true);
  }, [editingMeal]);

  const selectedDateString = selectedDate.toISOString().split("T")[0];
  const mealsForSelectedDate = meals.filter((meal) => meal.date === selectedDateString);

  const getSummary = (): DailySummary => {
    let calories = 0, protein = 0, carbs = 0;
    mealsForSelectedDate.forEach((meal) => {
      calories += meal.calories || 0;
      protein += meal.protein || 0;
      carbs += meal.carbs || 0;
    });
    return { calories, protein, carbs, meals: mealsForSelectedDate.length };
  };

  const summary = getSummary();

  const formatDateLabel = () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (selectedDate.toDateString() === today.toDateString()) return "Today";
    if (selectedDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    return selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      <LinearGradient colors={["#dbeafe", "#f3e8ff"]} style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Meal Logger</Text>
            <Text style={styles.subtitle}>Track Your Daily Meals and Nutrition</Text>
          </View>

          <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryDate}>{formatDateLabel()}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryText}>🔥 {summary.calories} Calories</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryText}>💪 {summary.protein}g Protein</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryText}>🍞 {summary.carbs}g Carbs</Text>
              </View>
            </View>
          </View>

          <TimelineView
            meals={mealsForSelectedDate}
            onTimeSelect={handleTimeSelect}
            onEditMeal={setEditingMeal}
            onDeleteMeal={handleDeleteMeal}
          />

          <AddMealMenu
            open={showMenu}
            selectedTime={selectedTime}
            onOpenChange={setShowMenu}
            onSelectMethod={handleMethodSelect}
          />

          <MealFormModal
            open={showFormModal}
            meal={editingMeal}
            initialTime={selectedTime}
            onClose={() => {
              setShowFormModal(false);
              setEditingMeal(null);
            }}
            onSave={handleSaveMeal}
          />
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", marginTop: 60, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: "bold", color: "#16a34a" },
  subtitle: { marginTop: 6, color: "#555" },
  summaryCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
    elevation: 2,
  },
  summaryDate: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryText: { fontSize: 13, fontWeight: "600", color: "#334155" },
});