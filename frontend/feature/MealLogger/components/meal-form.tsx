import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

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

interface MealFormProps {
  onAddMeal: (meal: Omit<Meal, "id">) => void;
  initialTime?: string;
  onCancel?: () => void;
}

export default function MealForm({
  onAddMeal,
  initialTime = "",
  onCancel,
}: MealFormProps) {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [notes, setNotes] = useState("");

 const handleSubmit = () => {
  if (!mealName) return;

  const mealTime = initialTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const meal: Omit<Meal, "id"> = {
    name: mealName,
    calories: calories ? parseInt(calories) : undefined,
    protein: protein ? parseInt(protein) : undefined,
    carbs: carbs ? parseInt(carbs) : undefined,
    time: mealTime,
    notes: notes || undefined,
    date: new Date().toISOString().split("T")[0],
  };

  onAddMeal(meal);

  setMealName("");
  setCalories("");
  setProtein("");
  setCarbs("");
  setNotes("");

  if (onCancel) onCancel();
};

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Manual Logging</Text>

      {/* Meal Name */}
      <Text style={styles.label}>Meal Name *</Text>
      <TextInput
        placeholder="Grilled Chicken Salad"
        value={mealName}
        onChangeText={setMealName}
        style={styles.input}
      />

      {/* Macros */}
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Calories</Text>
          <TextInput
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
            placeholder="Optional"
            style={styles.input}
          />
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
            placeholder="Optional"
            style={styles.input}
          />
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
            placeholder="Optional"
            style={styles.input}
          />
        </View>
      </View>

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        multiline
        numberOfLines={3}
        placeholder="Add notes about your meal..."
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.textArea]}
      />

      {/* Log Meal */}
      <TouchableOpacity style={styles.logButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Log Meal</Text>
      </TouchableOpacity>

      {/* Cancel */}
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },

  label: {
    fontWeight: "600",
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },

  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  column: {
    flex: 1,
  },

  logButton: {
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  cancelButton: {
    backgroundColor: "#6b7280",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});