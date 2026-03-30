import React from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

interface TimelineViewProps {
  meals: Meal[];
  onTimeSelect: (time: string) => void;
  onEditMeal: (meal: Meal) => void;
  onDeleteMeal: (id: string) => void;
}

export default function TimelineView({
  meals,
  onTimeSelect,
  onEditMeal,
  onDeleteMeal,
}: TimelineViewProps) {
  const hours = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return {
      value: `${hour.toString().padStart(2, "0")}:00`,
      label: hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`,
    };
  });

  const mealsAtHour = (hour: string) =>
    meals.filter((m) => m.time.startsWith(hour.slice(0, 2)));

  const confirmDelete = (mealId: string, mealName: string) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Delete "${mealName}"?`);
      if (confirmed) onDeleteMeal(mealId);
    } else {
      Alert.alert(
        "Delete Meal",
        `Are you sure you want to delete "${mealName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDeleteMeal(mealId) },
        ]
      );
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Daily Timeline</Text>

      {hours.map((hour) => {
        const slotMeals = mealsAtHour(hour.value);

        return (
          <View key={hour.value} style={styles.slot}>
            <View style={styles.hourRow}>
              <Text style={styles.hour}>{hour.label}</Text>
              <View style={styles.line} />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => onTimeSelect(hour.value)}
              >
                <Text style={styles.plus}>+</Text>
              </TouchableOpacity>
            </View>

            {slotMeals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>

                {/* Buttons on top */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => onEditMeal(meal)}
                  >
                    <Text style={styles.buttonText}>Edit ✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(meal.id, meal.name)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Meal name below buttons */}
                <Text style={styles.mealName}>{meal.name}</Text>

                {/* Macro badges */}
                <View style={styles.nutritionRow}>
                  {meal.calories !== undefined && (
                    <Text style={styles.badge}>{meal.calories} Cal</Text>
                  )}
                  {meal.protein !== undefined && (
                    <Text style={styles.badgeProtein}>{meal.protein}g Protein</Text>
                  )}
                  {meal.carbs !== undefined && (
                    <Text style={styles.badgeCarbs}>{meal.carbs}g Carbs</Text>
                  )}
                </View>

                {/* Notes */}
                {meal.notes && (
                  <Text style={styles.notes} numberOfLines={2}>{meal.notes}</Text>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  slot: {
    marginBottom: 4,
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hour: {
    width: 44,
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "600",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#10b981',
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  plus: {
    fontSize: 18,
    fontWeight: "bold",
    color: '#10b981',
  },
  mealCard: {
    marginLeft: 54,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  buttonRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  mealName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    backgroundColor: "#fff7ed",
    color: "#f97316",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  badgeProtein: {
    backgroundColor: "#eff6ff",
    color: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  badgeCarbs: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  notes: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 12,
    fontStyle: "italic",
  },
});