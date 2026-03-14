import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";

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
  // Generate hours 6am → 11pm
  const hours = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return {
      value: `${hour.toString().padStart(2, "0")}:00`,
      label:
        hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`,
    };
  });

  // Filter meals by hour
  const mealsAtHour = (hour: string) =>
    meals.filter((m) => m.time.startsWith(hour.slice(0, 2)));

  const confirmDelete = (mealId: string, mealName: string) => {

  if (Platform.OS === "web") {
    const confirmed = window.confirm(`Delete "${mealName}"?`);
    if (confirmed) {
      onDeleteMeal(mealId);
    }
  } else {
    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete "${mealName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteMeal(mealId),
        },
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
            {/* Hour Row */}
            <View style={styles.row}>
              <Text style={styles.hour}>{hour.label}</Text>
              <View style={styles.line} />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => onTimeSelect(hour.value)}
              >
                <Text style={styles.plus}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Meals in this hour */}
            {slotMeals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                {/* Header: Meal name + buttons */}
                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => onEditMeal(meal)}
                    >
                      <Text style={styles.buttonText}>Edit ✏️ </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDelete(meal.id, meal.name)}
                    >
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Nutrition Info */}
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
                {meal.notes && <Text style={styles.notes}>{meal.notes}</Text>}
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
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#eee",
    width: "60%",
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  slot: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  hour: {
    width: 60,
    fontSize: 14,
    color: "#666",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  plus: {
    fontSize: 18,
    fontWeight: "bold",
  },
  mealCard: {
    marginLeft: 60,
    marginTop: 6,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 8,
  },
  mealHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
},
mealName: {
  flex: 1,
  fontWeight: "600",
  fontSize: 14,
  marginRight: 8,
  flexWrap: "wrap",
},
buttonRow: {
  flexDirection: "row",
  gap: 6,
  marginTop: 4,
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
    fontSize: 12,
    fontWeight: "600",
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#eee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  badgeProtein: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  badgeCarbs: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  notes: {
    marginTop: 4,
    color: "#666",
    fontSize: 12,
  },
});