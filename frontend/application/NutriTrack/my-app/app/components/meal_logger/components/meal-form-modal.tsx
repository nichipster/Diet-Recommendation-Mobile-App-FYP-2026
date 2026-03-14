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
  }, [meal, open]);

  // Live fats preview
  const estimatedFats = estimateFats(calories, protein, carbs);

  const handleSave = () => {
    if (!mealName.trim()) return;

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

            <Text style={styles.label}>Meal Name *</Text>
            <TextInput
              placeholder="e.g. Grilled Chicken Salad"
              value={mealName}
              onChangeText={setMealName}
              style={styles.input}
            />

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Calories (kcal)</Text>
                <TextInput
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={styles.input}
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={styles.input}
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  placeholder="Optional"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Live fats estimate preview */}
            {estimatedFats !== undefined && (
              <View style={styles.fatsPreview}>
                <Text style={styles.fatsPreviewLabel}>🥑 Estimated Fats</Text>
                <Text style={styles.fatsPreviewValue}>{estimatedFats}g</Text>
                <Text style={styles.fatsPreviewHint}>
                  Auto-calculated from your calories, protein and carbs
                </Text>
              </View>
            )}

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
                <Text style={styles.buttonText}>{meal ? "Save Changes" : "Add Meal"}</Text>
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
    marginBottom: 15,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  column: { flex: 1, minWidth: 100 },

  // Fats preview box
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