import React from "react";
import {
  View,
  Text,
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
  time: string;
  notes?: string;
  date: string;
}

interface MealListProps {
  meals: Meal[];
  onDeleteMeal: (id: string) => void;
  onEditMeal: (id: string) => void;
}

export default function MealList({
  meals,
  onDeleteMeal,
  onEditMeal,
}: MealListProps) {
  const groupedMeals = meals.reduce((acc: Record<string, Meal[]>, meal) => {
    if (!acc[meal.date]) acc[meal.date] = [];
    acc[meal.date].push(meal);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedMeals).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const sum = (meals: Meal[], key: "calories" | "protein" | "carbs") =>
    meals.reduce((s, m) => s + (m[key] || 0), 0);

  if (meals.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>
          No meals logged yet. Start by adding your first meal above!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView>
      {sortedDates.map((date) => {
        const dailyMeals = groupedMeals[date];
        const calories = sum(dailyMeals, "calories");
        const protein = sum(dailyMeals, "protein");
        const carbs = sum(dailyMeals, "carbs");

        return (
          <View key={date} style={styles.card}>
            {/* Date Header */}
            <View style={styles.headerRow}>
              <Text style={styles.dateTitle}>{formatDate(date)}</Text>

              <View style={styles.badgeRow}>
                {calories > 0 && (
                  <View style={styles.badge}>
                    <Text>{calories} cal</Text>
                  </View>
                )}

                {protein > 0 && (
                  <View style={[styles.badge, styles.proteinBadge]}>
                    <Text style={styles.proteinText}>{protein}g protein</Text>
                  </View>
                )}

                {carbs > 0 && (
                  <View style={[styles.badge, styles.carbsBadge]}>
                    <Text style={styles.carbsText}>{carbs}g carbs</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Meal Items */}
            {dailyMeals
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((meal) => (
                <View key={meal.id} style={styles.mealCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealName}>{meal.name}</Text>

                    <Text style={styles.time}>{meal.time}</Text>

                    <View style={styles.badgeRow}>
                      {meal.calories && (
                        <View style={styles.smallBadge}>
                          <Text>{meal.calories} cal</Text>
                        </View>
                      )}

                      {meal.protein && (
                        <View style={[styles.smallBadge, styles.proteinBadge]}>
                          <Text style={styles.proteinText}>
                            {meal.protein}g protein
                          </Text>
                        </View>
                      )}

                      {meal.carbs && (
                        <View style={[styles.smallBadge, styles.carbsBadge]}>
                          <Text style={styles.carbsText}>
                            {meal.carbs}g carbs
                          </Text>
                        </View>
                      )}
                    </View>

                    {meal.notes && (
                      <Text style={styles.notes}>{meal.notes}</Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => onEditMeal(meal.id)}
                    >
                      <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => onDeleteMeal(meal.id)}
                    >
                      <Text style={styles.btnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
    width: "60%",  
    alignSelf: "center", // center it horizontally
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    padding: 20,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
  },

  dateTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  badge: {
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  smallBadge: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  proteinBadge: {
    backgroundColor: "#dbeafe",
  },

  carbsBadge: {
    backgroundColor: "#fef3c7",
  },

  proteinText: {
    color: "#1d4ed8",
  },

  carbsText: {
    color: "#b45309",
  },

  mealCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    flexDirection: "row",
  },

  mealName: {
    fontWeight: "600",
    fontSize: 16,
  },

  time: {
    color: "#777",
    fontSize: 12,
    marginVertical: 3,
  },

  notes: {
    marginTop: 5,
    color: "#666",
  },

  actions: {
    justifyContent: "center",
    gap: 6,
  },

  editBtn: {
    backgroundColor: "#6366f1",
    padding: 6,
    borderRadius: 6,
  },

  deleteBtn: {
    backgroundColor: "#ef4444",
    padding: 6,
    borderRadius: 6,
  },

  btnText: {
    color: "#fff",
    fontSize: 12,
  },
});