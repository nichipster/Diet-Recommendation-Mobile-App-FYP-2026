import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import TimelineView from "../components/timeline-view";
import MealList from "../components/meal-list";
import MealForm from "../components/meal-form";
import { AddMealMenu } from "../components/add-meal-menu";

export interface Meal {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  time: string;
  notes?: string;
  date: string;
}

export default function App() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Load meals on mount
  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      const stored = await AsyncStorage.getItem("meals");
      if (stored) setMeals(JSON.parse(stored));
    } catch (e) {
      console.log("Error loading meals:", e);
    }
  };

  const saveMeals = async (data: Meal[]) => {
    try {
      await AsyncStorage.setItem("meals", JSON.stringify(data));
    } catch (e) {
      console.log("Error saving meals:", e);
    }
  };

  const handleAddMeal = (mealData: Omit<Meal, "id">) => {
    const newMeal: Meal = {
      ...mealData,
      id: Date.now().toString(),
    };
    const updated = [newMeal, ...meals];
    setMeals(updated);
    saveMeals(updated);

    setShowManualForm(false);
    setSelectedTime("");
  };

  const handleDeleteMeal = (id: string) => {
    const updated = meals.filter((m) => m.id !== id);
    setMeals(updated);
    saveMeals(updated);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowMenu(true); // open AddMealMenu
  };

  const handleMethodSelect = (method: "manual" | "barcode" | "database" | "ai") => {
    if (method === "manual") setShowManualForm(true);
    // TODO: handle other methods (barcode, database, AI)
    setShowMenu(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meal Logger</Text>
        <Text style={styles.subtitle}>Track your daily meals and nutrition</Text>
      </View>

      {/* Show MealForm if manual logging selected */}
      {showManualForm ? (
        <MealForm
          initialTime={selectedTime}
          onAddMeal={handleAddMeal}
          onCancel={() => {
            setShowManualForm(false);
            setSelectedTime("");
          }}
        />
      ) : (
        <TimelineView onTimeSelect={handleTimeSelect} />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Meals</Text>
        <MealList meals={meals} onDeleteMeal={handleDeleteMeal} onEditMeal={() => {}} />
      </View>

      {/* AddMealMenu popup */}
      <AddMealMenu
        open={showMenu}
        selectedTime={selectedTime}
        onOpenChange={setShowMenu}
        onSelectMethod={handleMethodSelect}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { alignItems: "center", marginTop: 60, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: "bold", color: "#16a34a" },
  subtitle: { color: "#777", marginTop: 4 },
  section: { marginTop: 20, paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 10 },
});