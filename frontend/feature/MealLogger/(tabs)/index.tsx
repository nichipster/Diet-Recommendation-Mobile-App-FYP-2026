import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { Stack } from "expo-router";

import TimelineView from "../components/timeline-view";
import MealList from "../components/meal-list";
import AddMealMenu from "../components/add-meal-menu";
import MealFormModal, { Meal } from "../components/meal-form-modal";

export default function App() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  // Load meals from AsyncStorage
  useEffect(() => {
    const loadMeals = async () => {
      const stored = await AsyncStorage.getItem("meals");
      if (stored) setMeals(JSON.parse(stored));
    };
    loadMeals();
  }, []);

  // Open modal whenever editingMeal changes
  useEffect(() => {
    if (editingMeal !== null) {
      setShowFormModal(true);
    }
  }, [editingMeal]);

  // Save meals to state + AsyncStorage
  const saveMeals = async (data: Meal[]) => {
    setMeals(data);
    await AsyncStorage.setItem("meals", JSON.stringify(data));
  };

  // Add new meal
  const handleAddMeal = (mealData: Omit<Meal, "id">) => {
    const newMeal: Meal = { ...mealData, id: Date.now().toString() };
    saveMeals([newMeal, ...meals]);
  };

  // Update existing meal
  const handleUpdateMeal = (updatedMeal: Meal) => {
    const updated = meals.map((m) => (m.id === updatedMeal.id ? updatedMeal : m));
    saveMeals(updated);
  };

  // Delete meal
  const handleDeleteMeal = (id: string) => {
    const updated = meals.filter((m) => m.id !== id);
    saveMeals(updated);
  };

  // Open Add Meal Menu
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowMenu(true);
  };

  // Handle method selection from Add Meal Menu
  const handleMethodSelect = (method: "manual" | "barcode" | "database" | "ai") => {
    if (method === "manual") {
      setEditingMeal(null);
      setShowFormModal(true);
    }
    setShowMenu(false);
  };

  // Unified save handler for both add & edit
  const handleSaveMeal = (mealData: Meal | Omit<Meal, "id">) => {
    if ("id" in mealData) {
      handleUpdateMeal(mealData as Meal);
    } else {
      handleAddMeal(mealData as Omit<Meal, "id">);
    }
    setShowFormModal(false);
    setEditingMeal(null);
  };

  return (
    <>
      {/* Hide the default Expo Router header */}
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#dbeafe", "#f3e8ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Meal Logger</Text>
            <Text style={styles.subtitle}>Track Your Daily Meals and Nutrition</Text>
          </View>

          <TimelineView onTimeSelect={handleTimeSelect} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Meals</Text>
            <MealList
              meals={meals}
              onDeleteMeal={handleDeleteMeal}
              onEditMeal={(meal) => setEditingMeal(meal)}
            />
          </View>

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
  header: { alignItems: "center", marginTop: 60, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: "bold", color: "#16a34a" },
  subtitle: { color: "#777", marginTop: 4, fontWeight: "bold" },
  section: { marginTop: 20, paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 10, textAlign: "center" },
});