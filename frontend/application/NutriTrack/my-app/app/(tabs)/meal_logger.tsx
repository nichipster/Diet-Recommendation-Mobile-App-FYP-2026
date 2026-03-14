import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  useEffect(() => {
    const loadMeals = async () => {
      const stored = await AsyncStorage.getItem("meals");
      if (stored) {
        const parsed = JSON.parse(stored);
        setMeals(parsed);
        setSharedMeals(parsed);
      }
    };
    loadMeals();
  }, []);

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Green header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>NutriTrack</Text>
          </View>
          <Text style={styles.title}>Meal Logger</Text>
          <Text style={styles.subtitle}>Track your daily meals and nutrition</Text>
        </View>

        {/* White content area */}
        <View style={styles.contentWrapper}>

          {/* Date selector */}
          <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryDate}>{formatDateLabel()}</Text>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{summary.calories}</Text>
                <Text style={styles.summaryLabel}>🔥 Calories</Text>
              </View>
              <View style={styles.summaryItemDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{summary.protein}g</Text>
                <Text style={styles.summaryLabel}>💪 Protein</Text>
              </View>
              <View style={styles.summaryItemDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{summary.carbs}g</Text>
                <Text style={styles.summaryLabel}>🍞 Carbs</Text>
              </View>
            </View>
          </View>

          {/* Timeline */}
          <TimelineView
            meals={mealsForSelectedDate}
            onTimeSelect={handleTimeSelect}
            onEditMeal={setEditingMeal}
            onDeleteMeal={handleDeleteMeal}
          />

        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Green header
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 72,
    alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },

  // White content area overlapping green header
  contentWrapper: {
    backgroundColor: '#f9fafb',
    marginTop: -52,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    flex: 1,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f3f4f6',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
});