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

function estimateFats(calories: string, protein: string, carbs: string): number | undefined {
  const cal = parseFloat(calories);
  const pro = parseFloat(protein);
  const carb = parseFloat(carbs);
  if (isNaN(cal) || isNaN(pro) || isNaN(carb)) return undefined;
  const fats = (cal - pro * 4 - carb * 4) / 9;
  return fats < 0 ? 0 : Math.round(fats * 10) / 10;
}

// Returns current SGT hour (0-23) regardless of device timezone
function getSGTHour(): number {
  const sgHour = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(sgHour);
}

// Builds an SGT ISO string using the tapped time slot (HH:MM) for hour/minute,
// and today's SGT date. Falls back to current SGT time if no timeStr provided.
function buildSGTConsumedAt(timeStr?: string): string {
  // Get today's date parts in SGT
  const now = new Date();
  const sgDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); // YYYY-MM-DD

  if (timeStr) {
    // Combine SGT date + tapped time slot + SGT offset
    return `${sgDateStr}T${timeStr}:00+08:00`;
  }

  // Fallback: current SGT time
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
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    mealName: "",
    calories: "",
    protein: "",
    carbs: "",
  });

  useEffect(() => {
    if (selectedFood && open) {
      // Pre-fill with selected food
      setMealName(selectedFood.name || "");
      setCalories(selectedFood.calories?.toString() || "");
      setProtein(selectedFood.protein?.toString() || "");
      setCarbs(selectedFood.carbs?.toString() || "");
      setAmount("");
      setNotes("");
    } else if (scannedBarcode && open) {
      // Barcode flow - will be pre-filled by barcode form
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setAmount("");
      setNotes("");
    } else if (!meal && open) {
      // New meal entry
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setAmount("");
      setNotes("");
    }
    setErrors({ mealName: "", calories: "", protein: "", carbs: "" });
  }, [selectedFood, scannedBarcode, meal, open]);

  const estimatedFats = estimateFats(calories, protein, carbs);

  const validate = (): boolean => {
    const newErrors = { mealName: "", calories: "", protein: "", carbs: "" };
    let hasError = false;

    if (!mealName.trim()) {
      newErrors.mealName = "Meal name is required";
      hasError = true;
    }

    if (calories) {
      const cal = parseFloat(calories);
      if (isNaN(cal) || cal < 1) {
        newErrors.calories = "Calories must be at least 1 kcal";
        hasError = true;
      } else if (cal > 5000) {
        newErrors.calories = "Calories cannot exceed 5,000 kcal";
        hasError = true;
      }
    }

    if (protein) {
      const pro = parseFloat(protein);
      if (isNaN(pro) || pro < 0) {
        newErrors.protein = "Protein cannot be negative";
        hasError = true;
      } else if (pro > 300) {
        newErrors.protein = "Protein cannot exceed 300g";
        hasError = true;
      }
    }

    if (carbs) {
      const carb = parseFloat(carbs);
      if (isNaN(carb) || carb < 0) {
        newErrors.carbs = "Carbs cannot be negative";
        hasError = true;
      } else if (carb > 500) {
        newErrors.carbs = "Carbs cannot exceed 500g";
        hasError = true;
      }
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleSave = async () => {
    if (!validate() || !token) return;

    setSubmitting(true);

    try {
      // Use the tapped time slot hour for meal type if available,
      // otherwise fall back to current SGT hour
      const hour = initialTime
        ? parseInt(initialTime.split(":")[0])
        : getSGTHour();

      let mealType = "breakfast";
      if (hour >= 12 && hour < 17) mealType = "lunch";
      else if (hour >= 17) mealType = "dinner";

      // consumed_at uses the tapped slot time, or current SGT if no slot was tapped
      const consumed_at = buildSGTConsumedAt(initialTime || undefined);

      if (selectedFood && selectedFood.external_id) {
        // Log meal from database search
        const saveResponse = await fetch(`${API_URL}/food/save-external`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            external_id: selectedFood.external_id,
            source: selectedFood.source,
          }),
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save food (${saveResponse.status}): ${errorText}`);
        }

        const { food_id } = await saveResponse.json();

        const mealResponse = await fetch(`${API_URL}/meal/`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            meal_type: mealType,
            consumed_at,
            items: [
              {
                food_id,
                amount: amount ? parseFloat(amount) : 100,
              },
            ],
          }),
        });

        if (!mealResponse.ok) {
          const errorText = await mealResponse.text();
          throw new Error(`Failed to log meal (${mealResponse.status}): ${errorText}`);
        }
      } else {
        // Manual meal entry
        const fatsValue = estimatedFats !== undefined ? estimatedFats : 0;

        const mealResponse = await fetch(`${API_URL}/meal/manual`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            meal_type: mealType,
            consumed_at,
            items: [
              {
                name: mealName.trim(),
                amount: amount ? parseFloat(amount) : 100,
                unit: "g",
                calories: calories ? parseFloat(calories) : 0,
                protein_g: protein ? parseFloat(protein) : 0,
                carb_g: carbs ? parseFloat(carbs) : 0,
                fat_g: fatsValue,
                sugar_g: 0,
                fiber_g: 0,
                sodium_mg: 0,
              },
            ],
          }),
        });

        if (!mealResponse.ok) {
          const errorText = await mealResponse.text();
          throw new Error(`Failed to log meal (${mealResponse.status}): ${errorText}`);
        }
      }

      Alert.alert("Success ✅", "Meal added successfully!");
      onSave();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to save meal. Please try again.";
      Alert.alert("Error", errorMessage);
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
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>{selectedFood ? `Add ${selectedFood.name}` : "Add Meal"}</Text>

            {/* Meal Name */}
            <Text style={styles.label}>Meal Name *</Text>
            <TextInput
              placeholder="e.g. Grilled Chicken Salad"
              value={mealName}
              onChangeText={(v) => {
                setMealName(v);
                setErrors((e) => ({ ...e, mealName: "" }));
              }}
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

            <View style={styles.row}>
              {/* Calories */}
              <View style={styles.column}>
                <Text style={styles.label}>Calories (kcal)</Text>
                <TextInput
                  value={calories}
                  onChangeText={(v) => {
                    setCalories(v);
                    setErrors((e) => ({ ...e, calories: "" }));
                  }}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={[styles.input, errors.calories ? styles.inputError : null]}
                  editable={!submitting}
                />
                {errors.calories ? <Text style={styles.errorText}>{errors.calories}</Text> : null}
              </View>

              {/* Protein */}
              <View style={styles.column}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  value={protein}
                  onChangeText={(v) => {
                    setProtein(v);
                    setErrors((e) => ({ ...e, protein: "" }));
                  }}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={[styles.input, errors.protein ? styles.inputError : null]}
                  editable={!submitting}
                />
                {errors.protein ? <Text style={styles.errorText}>{errors.protein}</Text> : null}
              </View>

              {/* Carbs */}
              <View style={styles.column}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  value={carbs}
                  onChangeText={(v) => {
                    setCarbs(v);
                    setErrors((e) => ({ ...e, carbs: "" }));
                  }}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={[styles.input, errors.carbs ? styles.inputError : null]}
                  editable={!submitting}
                />
                {errors.carbs ? <Text style={styles.errorText}>{errors.carbs}</Text> : null}
              </View>
            </View>

            {/* Fats preview */}
            {estimatedFats !== undefined && (
              <View style={styles.fatsPreview}>
                <Text style={styles.fatsPreviewLabel}>🥑 Estimated Fats</Text>
                <Text style={styles.fatsPreviewValue}>{estimatedFats}g</Text>
                <Text style={styles.fatsPreviewHint}>Auto-calculated from calories, protein and carbs</Text>
              </View>
            )}

            {/* Notes */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Add notes about your meal..."
              style={[styles.input, styles.textArea]}
              editable={!submitting}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, submitting && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Add Meal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    width: "90%",
    maxWidth: 500,
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontWeight: "600", marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
    marginBottom: 10,
    fontWeight: "500",
  },
  textArea: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  column: { flex: 1, minWidth: 100 },
  fatsPreview: {
    backgroundColor: "#fefce8",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#fde68a",
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
  },
  fatsPreviewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b45309",
    marginBottom: 2,
  },
  fatsPreviewValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#d97706",
    marginBottom: 2,
  },
  fatsPreviewHint: {
    fontSize: 11,
    color: "#92400e",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#6b7280",
    padding: 14,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
