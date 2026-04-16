import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { API_URL, getAuthHeaders } from "@/constants/api";
import { FoodData } from "./database-search";

interface MealFormModalProps {
  open: boolean;
  meal?: any | null;
  initialTime?: string;
  onClose: () => void;
  onSave: () => void;
  selectedFood?: FoodData | null;
  scannedBarcode?: string;
  token: string | null;
}

function getSGTHour(): number {
  const sgHour = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(sgHour);
}

function buildSGTConsumedAt(timeStr?: string): string {
  const now = new Date();
  const sgDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  if (timeStr) return `${sgDateStr}T${timeStr}:00+08:00`;
  const sgTimeStr = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${sgDateStr}T${sgTimeStr}+08:00`;
}

export default function MealFormModal({
  open,
  meal,
  initialTime = "",
  onClose,
  onSave,
  selectedFood,
  scannedBarcode,
  token,
}: MealFormModalProps) {
  const isFromDatabase = !!selectedFood;

  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [amount, setAmount] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    mealName: "", calories: "", protein: "", carbs: "", fats: "",
  });

  // For database foods: compute nutrition from base values × (amount / base serving grams)
  const baseAmount = 100; // API returns nutrition per 100g
  const amountMultiplier = isFromDatabase ? (parseFloat(amount) || 100) / baseAmount : 1;

  const computedCalories = isFromDatabase
    ? Math.round((selectedFood?.calories ?? 0) * amountMultiplier)
    : undefined;
  const computedProtein = isFromDatabase
    ? ((selectedFood?.protein ?? 0) * amountMultiplier).toFixed(1)
    : undefined;
  const computedCarbs = isFromDatabase
    ? ((selectedFood?.carbs ?? 0) * amountMultiplier).toFixed(1)
    : undefined;
  const computedFat = isFromDatabase
    ? ((selectedFood?.fat ?? 0) * amountMultiplier).toFixed(1)
    : undefined;

  useEffect(() => {
    if (meal && open) {
      setMealName(meal.name || "");
      setCalories(meal.calories?.toString() || "");
      setProtein(meal.protein?.toString() || "");
      setCarbs(meal.carbs?.toString() || "");
      setFats(meal.fats?.toString() || "");
      setAmount(meal.amount?.toString() || "100");
    } else if (selectedFood && open) {
      setMealName(selectedFood.name || "");
      setAmount("100");
      // Don't set calories/protein/carbs — they're computed
    } else {
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
      setAmount("100");
    }
    setErrors({ mealName: "", calories: "", protein: "", carbs: "", fats: "" });
  }, [selectedFood, scannedBarcode, meal, open]);

  const validate = (): boolean => {
    const newErrors = { mealName: "", calories: "", protein: "", carbs: "", fats: "" };
    let hasError = false;

    if (!mealName.trim()) {
      newErrors.mealName = "Meal name is required";
      hasError = true;
    }

    if (!isFromDatabase) {
      if (calories) {
        const cal = parseFloat(calories);
        if (isNaN(cal) || cal < 1) { newErrors.calories = "Calories must be at least 1 kcal"; hasError = true; }
        else if (cal > 5000) { newErrors.calories = "Calories cannot exceed 5,000 kcal"; hasError = true; }
      }
      if (protein) {
        const pro = parseFloat(protein);
        if (isNaN(pro) || pro < 0) { newErrors.protein = "Protein cannot be negative"; hasError = true; }
        else if (pro > 300) { newErrors.protein = "Protein cannot exceed 300g"; hasError = true; }
      }
      if (carbs) {
        const carb = parseFloat(carbs);
        if (isNaN(carb) || carb < 0) { newErrors.carbs = "Carbs cannot be negative"; hasError = true; }
        else if (carb > 500) { newErrors.carbs = "Carbs cannot exceed 500g"; hasError = true; }
      }
      if (fats) {
        const fat = parseFloat(fats);
        if (isNaN(fat) || fat < 0) { newErrors.fats = "Fats cannot be negative"; hasError = true; }
        else if (fat > 300) { newErrors.fats = "Fats cannot exceed 300g"; hasError = true; }
      }
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleSave = async () => {
    if (!validate() || !token) return;
    setSubmitting(true);

    try {
      const hour = initialTime ? parseInt(initialTime.split(":")[0]) : getSGTHour();
      let mealType = "breakfast";
      if (hour >= 12 && hour < 17) mealType = "lunch";
      else if (hour >= 17) mealType = "dinner";

      const consumed_at = buildSGTConsumedAt(initialTime || undefined);

      if (isFromDatabase && selectedFood.external_id) {
        const saveResponse = await fetch(`${API_URL}/food/save-external`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            external_id: selectedFood.external_id,
            source: selectedFood.source,
          }),
        });
        if (!saveResponse.ok) throw new Error(`Failed to save food (${saveResponse.status})`);
        const { food_id } = await saveResponse.json();

        const mealResponse = await fetch(`${API_URL}/meal/`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            food_id: food_id,
            amount: parseFloat(amount) || 100,
            meal_name: mealName.trim(),
            consumed_at,
          }),
        });
        if (!mealResponse.ok) throw new Error(`Failed to log meal (${mealResponse.status})`);
      } else {
        const mealResponse = await fetch(`${API_URL}/meal/manual`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            meal_name: mealName.trim(),
            consumed_at,
            amount: parseFloat(amount) || 100,
            unit: "g",
            calories: calories ? parseFloat(calories) : 0,
            protein_g: protein ? parseFloat(protein) : 0,
            carb_g: carbs ? parseFloat(carbs) : 0,
            fat_g: fats ? parseFloat(fats) : 0,
            sugar_g: 0,
            fiber_g: 0,
            sodium_mg: 0,
          }),
        });
        if (!mealResponse.ok) throw new Error(`Failed to log meal (${mealResponse.status})`);
      }

      Alert.alert("Success ✅", "Meal added successfully!");
      onSave();
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save meal. Please try again.");
      console.error("Meal save error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>
              {selectedFood ? `Add ${selectedFood.name}` : meal ? "Edit Meal" : "Add Meal"}
            </Text>

            {/* Meal Name */}
            <Text style={styles.label}>Meal Name *</Text>
            <TextInput
              placeholder="e.g. Grilled Chicken Salad"
              value={mealName}
              onChangeText={(v) => { setMealName(v); setErrors((e) => ({ ...e, mealName: "" })); }}
              style={[styles.input, errors.mealName ? styles.inputError : null]}
              editable={!submitting}
            />
            {errors.mealName ? <Text style={styles.errorText}>{errors.mealName}</Text> : null}

            {/* Amount */}
            <Text style={styles.label}>Amount (g)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="100"
              style={styles.input}
              editable={!submitting}
            />
            {isFromDatabase && (
              <Text style={styles.infoText}>
                Nutrition values update automatically based on amount
              </Text>
            )}

            {/* ── DATABASE MODE: read-only computed nutrition ── */}
            {isFromDatabase ? (
              <View style={styles.nutritionBox}>
                <Text style={styles.nutritionHeading}>Nutrition Info (auto-calculated)</Text>
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <View style={[styles.nutritionValueBox, { borderColor: "#f97316" }]}>
                    <Text style={[styles.nutritionValue, { color: "#f97316" }]}>{computedCalories} kcal</Text>
                  </View>
                </View>
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <View style={[styles.nutritionValueBox, { borderColor: "#3b82f6" }]}>
                    <Text style={[styles.nutritionValue, { color: "#3b82f6" }]}>{computedProtein}g</Text>
                  </View>
                </View>
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                  <View style={[styles.nutritionValueBox, { borderColor: "#22c55e" }]}>
                    <Text style={[styles.nutritionValue, { color: "#22c55e" }]}>{computedCarbs}g</Text>
                  </View>
                </View>
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Fats</Text>
                  <View style={[styles.nutritionValueBox, { borderColor: "#eab308" }]}>
                    <Text style={[styles.nutritionValue, { color: "#eab308" }]}>{computedFat}g</Text>
                  </View>
                </View>
                {selectedFood?.servingSize && (
                  <Text style={styles.infoText}>Base serving: {selectedFood.servingSize}</Text>
                )}
              </View>
            ) : (
              /* ── MANUAL MODE: fully editable nutrition fields ── */
              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Calories (kcal)</Text>
                  <TextInput
                    value={calories}
                    onChangeText={(v) => { setCalories(v); setErrors((e) => ({ ...e, calories: "" })); }}
                    keyboardType="numeric"
                    placeholder="Optional"
                    style={[styles.input, errors.calories ? styles.inputError : null]}
                    editable={!submitting}
                  />
                  {errors.calories ? <Text style={styles.errorText}>{errors.calories}</Text> : null}
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Protein (g)</Text>
                  <TextInput
                    value={protein}
                    onChangeText={(v) => { setProtein(v); setErrors((e) => ({ ...e, protein: "" })); }}
                    keyboardType="numeric"
                    placeholder="Optional"
                    style={[styles.input, errors.protein ? styles.inputError : null]}
                    editable={!submitting}
                  />
                  {errors.protein ? <Text style={styles.errorText}>{errors.protein}</Text> : null}
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Carbs (g)</Text>
                  <TextInput
                    value={carbs}
                    onChangeText={(v) => { setCarbs(v); setErrors((e) => ({ ...e, carbs: "" })); }}
                    keyboardType="numeric"
                    placeholder="Optional"
                    style={[styles.input, errors.carbs ? styles.inputError : null]}
                    editable={!submitting}
                  />
                  {errors.carbs ? <Text style={styles.errorText}>{errors.carbs}</Text> : null}
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Fats (g)</Text>
                  <TextInput
                    value={fats}
                    onChangeText={(v) => { setFats(v); setErrors((e) => ({ ...e, fats: "" })); }}
                    keyboardType="numeric"
                    placeholder="Optional"
                    style={[styles.input, errors.fats ? styles.inputError : null]}
                    editable={!submitting}
                  />
                  {errors.fats ? <Text style={styles.errorText}>{errors.fats}</Text> : null}
                </View>
              </View>
            )}


            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, submitting && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add Meal</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: 20 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingBottom: 20 },
  card: {
    backgroundColor: "#fff", padding: 20, borderRadius: 12,
    borderWidth: 1, borderColor: "#eee", width: "90%", maxWidth: 500, alignSelf: "center",
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  label: { fontWeight: "600", marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 4 },
  inputError: { borderColor: "#ef4444", backgroundColor: "#fff5f5" },
  errorText: { fontSize: 11, color: "#ef4444", marginBottom: 10, fontWeight: "500" },
  infoText: { fontSize: 12, color: "#6b7280", marginBottom: 8, marginTop: 2 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  column: { flex: 1, minWidth: 100 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 10 },
  cancelButton: { backgroundColor: "#6b7280", padding: 14, borderRadius: 8, flex: 1, alignItems: "center" },
  saveButton: { backgroundColor: "#7c3aed", padding: 14, borderRadius: 8, flex: 1, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  nutritionBox: {
    padding: 12, backgroundColor: "#f9f9f9", borderRadius: 8,
    marginVertical: 12, borderWidth: 1, borderColor: "#eee",
  },
  nutritionHeading: {
    fontSize: 12, fontWeight: "600", color: "#6b7280",
    marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
  },
  nutritionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  nutritionLabel: { fontSize: 14, fontWeight: "500", color: "#333" },
  nutritionValueBox: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#fff" },
  nutritionValue: { fontSize: 15, fontWeight: "600" },
});