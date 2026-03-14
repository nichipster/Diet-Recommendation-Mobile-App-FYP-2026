import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface Meal {
  id?: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  time: string;
  notes?: string;
  date: string;
}

interface AiMealFormProps {
  photoDataUrl: string;
  initialTime: string;
  onAddMeal: (meal: Omit<Meal, "id">) => void;
  onCancel: () => void;
}

export function AiMealForm({
  photoDataUrl,
  initialTime,
  onAddMeal,
  onCancel,
}: AiMealFormProps) {
  const [loading, setLoading] = useState(true);

  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    analyzeImage();
  }, []);

  const analyzeImage = async () => {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock AI result
    setMealName("Grilled Chicken Salad");
    setCalories("450");
    setProtein("35");
    setCarbs("25");
    setNotes(
      "AI detected: Mixed greens, grilled chicken breast, cherry tomatoes, cucumber, light vinaigrette dressing"
    );

    setLoading(false);
  };

  const handleSubmit = () => {
    if (!mealName) return;

    const meal: Omit<Meal, "id"> = {
      name: mealName,
      calories: calories ? parseInt(calories) : undefined,
      protein: protein ? parseFloat(protein) : undefined,
      carbs: carbs ? parseFloat(carbs) : undefined,
      time: initialTime,
      notes: notes || undefined,
      date: new Date().toISOString().split("T")[0],
    };

    onAddMeal(meal);
    onCancel();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingTitle}>
          Analyzing your meal with AI...
        </Text>
        <Text style={styles.loadingSubtitle}>
          Identifying food items and estimating nutrition
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>AI Analysis Result</Text>

      <View style={styles.alert}>
        <Feather name="info" size={16} />
        <Text style={styles.alertText}>
          Demo Mode: AI analyzed your photo. In production this would call
          an AI vision API to estimate nutrition.
        </Text>
      </View>

      <Image
        source={{ uri: photoDataUrl }}
        style={styles.image}
      />

      <Text style={styles.label}>Meal Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Grilled Chicken Salad"
        value={mealName}
        onChangeText={setMealName}
      />

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Calories</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
          />
        </View>
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
        <Feather name="plus" size={16} color="white" />
        <Text style={styles.primaryButtonText}>Log Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
        <Text>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  header: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },

  alert: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
  },

  alertText: {
    flex: 1,
    fontSize: 12,
  },

  image: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
  },

  label: {
    fontWeight: "500",
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  inputGroup: {
    flex: 1,
  },

  primaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },

  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },

  secondaryButton: {
    alignItems: "center",
    padding: 14,
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  loadingTitle: {
    marginTop: 16,
    fontWeight: "600",
  },

  loadingSubtitle: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
});