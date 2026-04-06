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
} from "react-native";

export interface Meal {
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

interface MealFormModalProps {
  open: boolean;
  meal?: Meal | null;
  initialTime?: string;
  onClose: () => void;
  onSave: (meal: Meal | Omit<Meal, "id">) => void;
}

function estimateFats(calories: string, protein: string, carbs: string): number | undefined {
  const cal = parseFloat(calories);
  const pro = parseFloat(protein);
  const carb = parseFloat(carbs);
  if (isNaN(cal) || isNaN(pro) || isNaN(carb)) return undefined;
  const fats = (cal - (pro * 4) - (carb * 4)) / 9;
  return fats < 0 ? 0 : Math.round(fats * 10) / 10;
}

export default function MealFormModal({
  open,
  meal,
  initialTime = "",
  onClose,
  onSave,
}: MealFormModalProps) {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({
    mealName: '', calories: '', protein: '', carbs: '',
  });

  useEffect(() => {
    if (meal) {
      setMealName(meal.name || "");
      setCalories(meal.calories?.toString() || "");
      setProtein(meal.protein?.toString() || "");
      setCarbs(meal.carbs?.toString() || "");
      setNotes(meal.notes || "");
    } else {
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setNotes("");
    }
    setErrors({ mealName: '', calories: '', protein: '', carbs: '' });
  }, [meal, open]);

  const estimatedFats = estimateFats(calories, protein, carbs);

  const validate = (): boolean => {
    const newErrors = { mealName: '', calories: '', protein: '', carbs: '' };
    let hasError = false;

    if (!mealName.trim()) {
      newErrors.mealName = 'Meal name is required';
      hasError = true;
    }

    if (calories) {
      const cal = parseFloat(calories);
      if (isNaN(cal) || cal < 1) {
        newErrors.calories = 'Calories must be at least 1 kcal';
        hasError = true;
      } else if (cal > 5000) {
        newErrors.calories = 'Calories cannot exceed 5,000 kcal';
        hasError = true;
      }
    }

    if (protein) {
      const pro = parseFloat(protein);
      if (isNaN(pro) || pro < 0) {
        newErrors.protein = 'Protein cannot be negative';
        hasError = true;
      } else if (pro > 300) {
        newErrors.protein = 'Protein cannot exceed 300g';
        hasError = true;
      }
    }

    if (carbs) {
      const carb = parseFloat(carbs);
      if (isNaN(carb) || carb < 0) {
        newErrors.carbs = 'Carbs cannot be negative';
        hasError = true;
      } else if (carb > 500) {
        newErrors.carbs = 'Carbs cannot exceed 500g';
        hasError = true;
      }
    }

    // Check if protein + carbs calories exceed total calories
    if (calories && protein && carbs) {
      const cal = parseFloat(calories);
      const pro = parseFloat(protein);
      const carb = parseFloat(carbs);
      if (!isNaN(cal) && !isNaN(pro) && !isNaN(carb)) {
        const minCalories = (pro * 4) + (carb * 4);
        if (cal < minCalories) {
          newErrors.calories = `Calories must be at least ${Math.ceil(minCalories)} kcal to cover your protein and carbs`;
          hasError = true;
        }
      }
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleSave = () => {
    if (!validate()) return;

    const mealTime =
      meal?.time ||
      initialTime ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const mealDate = meal?.date || new Date().toISOString().split("T")[0];

    const mealData: Omit<Meal, "id"> = {
      name: mealName.trim(),
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fats: estimateFats(calories, protein, carbs),
      time: mealTime,
      notes: notes.trim() || undefined,
      date: mealDate,
    };

    if (meal) {
      onSave({ ...meal, ...mealData });
    } else {
      onSave(mealData);
      Alert.alert("Success ✅", "Meal added successfully!");
    }

    onClose();
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
            <Text style={styles.title}>{meal ? "Edit Meal" : "Add Meal"}</Text>

            {/* Meal Name */}
            <Text style={styles.label}>Meal Name *</Text>
            <TextInput
              placeholder="e.g. Grilled Chicken Salad"
              value={mealName}
              onChangeText={v => {
                setMealName(v);
                setErrors(e => ({ ...e, mealName: '' }));
              }}
              style={[styles.input, errors.mealName ? styles.inputError : null]}
            />
            {errors.mealName ? <Text style={styles.errorText}>{errors.mealName}</Text> : null}

            <View style={styles.row}>
              {/* Calories */}
              <View style={styles.column}>
                <Text style={styles.label}>Calories (kcal)</Text>
                <TextInput
                  value={calories}
                  onChangeText={v => {
                    setCalories(v);
                    setErrors(e => ({ ...e, calories: '' }));
                  }}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={[styles.input, errors.calories ? styles.inputError : null]}
                />
                {errors.calories ? <Text style={styles.errorText}>{errors.calories}</Text> : null}
              </View>

              {/* Protein */}
              <View style={styles.column}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  value={protein}
                  onChangeText={v => {
                    setProtein(v);
                    setErrors(e => ({ ...e, protein: '' }));
                  }}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={[styles.input, errors.protein ? styles.inputError : null]}
                />
                {errors.protein ? <Text style={styles.errorText}>{errors.protein}</Text> : null}
              </View>

              {/* Carbs */}
              <View style={styles.column}>
                <Text style={styles.label}>Carbohydrates (g)</Text>
                <TextInput
                  value={carbs}
                  onChangeText={v => {
                    setCarbs(v);
                    setErrors(e => ({ ...e, carbs: '' }));
                  }}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={[styles.input, errors.carbs ? styles.inputError : null]}
                />
                {errors.carbs ? <Text style={styles.errorText}>{errors.carbs}</Text> : null}
              </View>
            </View>

            {/* Fats preview */}
            {estimatedFats !== undefined && (
              <View style={styles.fatsPreview}>
                <Text style={styles.fatsPreviewLabel}>🥑 Estimated Fats</Text>
                <Text style={styles.fatsPreviewValue}>{estimatedFats}g</Text>
                <Text style={styles.fatsPreviewHint}>
                  Auto-calculated from your calories, protein and carbs
                </Text>
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
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.buttonText}>{"Add Meal"}</Text>
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
  label: { fontWeight: "600", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginBottom: 10,
    fontWeight: '500',
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