import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

export interface Meal {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  notes?: string;
}

interface EditMealDialogProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (meal: Meal) => void;
}

export default function EditMealDialog({
  meal,
  open,
  onOpenChange,
  onSave,
}: EditMealDialogProps) {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (meal) {
      setMealName(meal.name);
      setCalories(meal.calories ? meal.calories.toString() : "");
      setProtein(meal.protein ? meal.protein.toString() : "");
      setCarbs(meal.carbs ? meal.carbs.toString() : "");
      setNotes(meal.notes || "");
    }
  }, [meal]);

  const handleSubmit = () => {
    if (!meal || !mealName) return;

    const updatedMeal: Meal = {
      ...meal,
      name: mealName,
      calories: calories ? parseInt(calories) : undefined,
      protein: protein ? parseInt(protein) : undefined,
      carbs: carbs ? parseInt(carbs) : undefined,
      notes: notes || undefined,
    };

    onSave(updatedMeal);
    onOpenChange(false);
  };

  return (
    <Modal visible={open} animationType="slide">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Meal</Text>

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

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onOpenChange(false)}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  label: {
    marginBottom: 5,
    fontWeight: "600",
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

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  cancelButton: {
    backgroundColor: "#6b7280",
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },

  saveButton: {
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});