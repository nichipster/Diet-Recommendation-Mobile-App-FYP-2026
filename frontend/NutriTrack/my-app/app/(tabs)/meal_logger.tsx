import React, { useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AddMealMenu from "../../components/meal_logger/components/add-meal-menu";
import DateSelector from "../../components/meal_logger/components/date-selector";
import MealFormModal from "../../components/meal_logger/components/meal-form-modal";
import TimelineView from "../../components/meal_logger/components/timeline-view";
import { BarcodeScanner } from "../../components/meal_logger/components/barcode-scanner";
import DatabaseSearch from "../../components/meal_logger/components/database-search";
import { AiPhotoCapture } from "../../components/meal_logger/components/ai-photo-capture";
import { FoodData } from "../../components/meal_logger/components/database-search";
import { useGoals } from "../../context/GoalsContext";
import { AiRecognitionResult } from "../../components/meal_logger/components/ai-photo-capture";
import { AiResultModal } from "../../components/meal_logger/components/ai-result-modal";
import { API_URL, getAuthHeaders } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Meal {
  meal_id?: number;
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  time: string;
  notes?: string;
  date: string;
}

interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
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
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // ── barcode ──
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedFood, setScannedFood] = useState<FoodData | null>(null);

  // ── database ──
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodData | null>(null);

  // ── ai photo ──
  const [showAiCapture, setShowAiCapture] = useState(false);
  const [aiResult, setAiResult] = useState<AiRecognitionResult | null>(null);
  const [showAiResult, setShowAiResult] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      loadMeals();
    }
  }, [selectedDate, token]);

  const loadMeals = async () => {
    setLoading(true);
    try {
        const dateStr = selectedDate.toLocaleDateString("en-CA", {
          timeZone: "Asia/Singapore",
        });
        const response = await fetch(`${API_URL}/meal/?entry_date=${dateStr}`, {
        headers: getAuthHeaders(token!),
      });

      if (!response.ok) {
        throw new Error("Failed to load meals");
      }

      const data = await response.json();
      const formattedMeals = data.map((m: any) => ({
        meal_id: m.meal_id,
        id: m.meal_id.toString(),
        name: m.meal_name,
        calories: m.calories,
        protein: m.protein_g,
        carbs: m.carb_g,
        fats: m.fat_g,
        amonut: m.amount_g,
        time: new Date(m.consumed_at).toLocaleTimeString("en-SG", {
          timeZone: "Asia/Singapore",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        date: dateStr,
      }));
      setMeals(formattedMeals);
      setSharedMeals(formattedMeals);
    } catch (error) {
      Alert.alert("Error", "Failed to load meals");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowMenu(true);
  };

  const handleMethodSelect = (method: string) => {
    setShowMenu(false);
    if (method === "manual") {
      setEditingMeal(null);
      setShowFormModal(true);
    }
    if (method === "barcode") setShowBarcodeScanner(true);
    if (method === "database") setShowDatabaseSearch(true);
    if (method === "ai") setShowAiCapture(true);
  };

  const handleSaveMeal = () => {
    loadMeals();
    setShowFormModal(false);
    setEditingMeal(null);
    setSelectedFood(null);
    setScannedFood(null);
  };

  const handleDeleteMeal = async (id: string) => {
    if (!token) return;

    Alert.alert("Delete Meal", "Are you sure?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/meal/${id}`, {
              method: "DELETE",
              headers: getAuthHeaders(token),
            });

            if (!response.ok) {
              throw new Error("Failed to delete meal");
            }

            loadMeals();
          } catch (error) {
            Alert.alert("Error", "Failed to delete meal");
            console.error(error);
          }
        },
      },
    ]);
  };

  // Receives the full FoodData object from BarcodeScanner
  const handleBarcodeScan = (foodData: FoodData) => {
    setScannedFood(foodData);
    setShowBarcodeScanner(false);
    setShowFormModal(true);
  };

  const handleFoodSelect = (food: FoodData) => {
    setSelectedFood(food);
    setShowDatabaseSearch(false);
    setShowFormModal(true);
  };

  const handleAiResult = (result: AiRecognitionResult) => {
    setAiResult(result);
    setShowAiResult(true);
  };

  const selectedDateString = selectedDate.toLocaleDateString("en-CA", {
    timeZone: "Asia/Singapore",
  });
  const mealsForSelectedDate = meals.filter((meal) => meal.date === selectedDateString);

  const getSummary = (): DailySummary => {
    let calories = 0, protein = 0, carbs = 0, fats = 0;
    mealsForSelectedDate.forEach((meal) => {
      calories += meal.calories || 0;
      protein += meal.protein || 0;
      carbs += meal.carbs || 0;
      fats += meal.fats || 0;
    });
    return { calories, protein, carbs, fats, meals: mealsForSelectedDate.length };
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

  const formatNum = (val: number) => val === 0 ? "0" : parseFloat(val.toFixed(2)).toString();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>NutriTrack</Text>
          </View>
          <Text style={styles.title}>Meal Logger</Text>
          <Text style={styles.subtitle}>Track your daily meals and nutrition</Text>
        </View>

        <View style={styles.contentWrapper}>
          <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryDate}>{formatDateLabel()}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatNum(summary.calories)}</Text>
                <Text style={styles.summaryLabel}>🔥 Calories</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatNum(summary.protein)}g</Text>
                <Text style={styles.summaryLabel}>💪 Protein</Text>
              </View>
              <View style={styles.summaryItemDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatNum(summary.carbs)}g</Text>
                <Text style={styles.summaryLabel}>🍞 Carbs</Text>
              </View>
              <View style={styles.summaryItemDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatNum(summary.fats)}g</Text>
                <Text style={styles.summaryLabel}>🧈 Fats</Text>
              </View>
            </View>
          </View>

          <TimelineView
            meals={mealsForSelectedDate}
            onTimeSelect={handleTimeSelect}
            onEditMeal={(meal) => {
              setEditingMeal(meal);
              setShowFormModal(true);
            }}
            onDeleteMeal={handleDeleteMeal}
          />
        </View>
      </ScrollView>

      {/* ── Add Meal Menu ── */}
      <AddMealMenu
        open={showMenu}
        selectedTime={selectedTime}
        onOpenChange={setShowMenu}
        onSelectMethod={handleMethodSelect}
      />

      {/* ── Manual / Barcode / Database Form Modal ── */}
      <MealFormModal
        open={showFormModal}
        meal={editingMeal}
        initialTime={selectedTime}
        onClose={() => {
          setShowFormModal(false);
          setEditingMeal(null);
          setSelectedFood(null);
          setScannedFood(null);
        }}
        onSave={handleSaveMeal}
        selectedFood={scannedFood ?? selectedFood}
        token={token}
      />

      {/* ── Barcode Scanner ── */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onScanSuccess={handleBarcodeScan}
        token={token}
      />

      {/* ── Database Search ── */}
      <DatabaseSearch
        open={showDatabaseSearch}
        onOpenChange={setShowDatabaseSearch}
        onSelectFood={handleFoodSelect}
        token={token}
      />

      {/* ── AI Photo Capture ── */}
      <AiPhotoCapture
        open={showAiCapture}
        onOpenChange={setShowAiCapture}
        onResult={handleAiResult}
        token={token}
      />

      {/* ── AI Result Modal ── */}
      <AiResultModal
        open={showAiResult}
        result={aiResult}
        token={token}
        onClose={() => {
          setShowAiResult(false);
          setAiResult(null);
        }}
        onLogged={async () => {
          await loadMeals();
          setShowAiResult(false);
        }}
        onRetake={() => {
          setShowAiResult(false);
          setAiResult(null);
          setShowAiCapture(true);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  safeArea: { backgroundColor: "#10b981" },
  scroll: { flex: 1, backgroundColor: "#f9fafb" },
  scrollContent: { paddingBottom: 120 },
  header: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 72,
    alignItems: "center",
  },
  headerBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerBadgeText: { fontSize: 12, color: "#fff", fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.75)" },
  contentWrapper: {
    backgroundColor: "#f9fafb",
    marginTop: -52,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryDate: { fontSize: 18, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 14 },
  summaryDivider: { height: 1, backgroundColor: "#f3f4f6", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryItemDivider: { width: 1, height: 36, backgroundColor: "#f3f4f6" },
  summaryNumber: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
});
