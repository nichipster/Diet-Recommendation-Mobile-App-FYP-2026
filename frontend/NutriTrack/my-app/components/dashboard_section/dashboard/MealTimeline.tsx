import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useGoals, getSGTToday } from '../../../context/GoalsContext';

type MealGroup = {
  label: string;
  emoji: string;
  startHour: number;
  endHour: number;
  color: string;
  bg: string;
};

const MEAL_GROUPS: MealGroup[] = [
  { label: 'Breakfast', emoji: '🌅', startHour: 6,  endHour: 11, color: '#f97316', bg: '#fff7ed' },
  { label: 'Lunch',     emoji: '🥪', startHour: 12, endHour: 17, color: '#10b981', bg: '#f0fdf4' },
  { label: 'Dinner',    emoji: '🍽️', startHour: 18, endHour: 23, color: '#3b82f6', bg: '#eff6ff' },
];

function getHourFromTime(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

export default function MealTimeline() {
  const { meals, isReady } = useGoals();

  // Use SGT date — consistent with GoalsContext and CalorieCard
  const today = getSGTToday();
  const todayMeals = meals.filter(m => m.date === today);

  const getMealsForGroup = (group: MealGroup) =>
    todayMeals.filter(m => {
      const hour = getHourFromTime(m.time);
      return hour >= group.startHour && hour <= group.endHour;
    });

  // Wait for context to finish loading before rendering
  if (!isReady) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Today's Meals</Text>

      {todayMeals.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyText}>No meals logged today</Text>
          <Text style={styles.emptySubText}>Go to Meal Log to add your meals</Text>
        </View>
      )}

      {MEAL_GROUPS.map(group => {
        const groupMeals = getMealsForGroup(group);
        if (groupMeals.length === 0) return null;

        const totalCals    = groupMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = groupMeals.reduce((sum, m) => sum + (m.protein  || 0), 0);
        const totalCarbs   = groupMeals.reduce((sum, m) => sum + (m.carbs    || 0), 0);
        const totalFats    = groupMeals.reduce((sum, m) => sum + (m.fats     || 0), 0);

        return (
          <View key={group.label} style={styles.groupBlock}>

            <View style={[styles.groupHeader, { backgroundColor: group.bg }]}>
              <Text style={styles.groupEmoji}>{group.emoji}</Text>
              <Text style={[styles.groupLabel, { color: group.color }]}>{group.label}</Text>
              <Text style={[styles.groupCal, { color: group.color }]}>{totalCals} kcal</Text>
            </View>

            {groupMeals.map((meal, index) => (
              <View
                key={meal.id}
                style={[
                  styles.mealRow,
                  index < groupMeals.length - 1 && styles.mealRowBorder,
                ]}
              >
                <View style={styles.mealLeft}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  <View style={styles.mealDot} />
                </View>

                <View style={styles.mealContent}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <View style={styles.mealMacros}>
                    {meal.calories !== undefined && (
                      <Text style={styles.macroCal}>{meal.calories} kcal</Text>
                    )}
                    {meal.protein !== undefined && (
                      <Text style={styles.macroProtein}>{meal.protein}g protein</Text>
                    )}
                    {meal.carbs !== undefined && (
                      <Text style={styles.macroCarb}>{meal.carbs}g carbs</Text>
                    )}
                    {meal.fats !== undefined && (
                      <Text style={styles.macroFat}>{meal.fats}g fat</Text>
                    )}
                  </View>
                  {meal.notes ? (
                    <Text style={styles.mealNotes} numberOfLines={1}>{meal.notes}</Text>
                  ) : null}
                </View>

                <Text style={styles.checkmark}>✓</Text>
              </View>
            ))}

            <View style={styles.groupFooter}>
              <Text style={styles.groupFooterText}>
                {totalProtein}g protein · {totalCarbs}g carbs · {totalFats}g fat
              </Text>
            </View>

          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptySubText: { fontSize: 13, color: '#9ca3af' },
  groupBlock: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  groupEmoji: { fontSize: 16 },
  groupLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  groupCal: { fontSize: 13, fontWeight: '700' },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 10,
  },
  mealRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  mealLeft: {
    alignItems: 'center',
    width: 42,
    paddingTop: 2,
  },
  mealTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
    marginTop: 4,
  },
  mealContent: { flex: 1 },
  mealName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  mealMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  macroCal: {
    fontSize: 11, fontWeight: '600', color: '#f97316',
    backgroundColor: '#fff7ed', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 6,
  },
  macroProtein: {
    fontSize: 11, fontWeight: '600', color: '#3b82f6',
    backgroundColor: '#eff6ff', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 6,
  },
  macroCarb: {
    fontSize: 11, fontWeight: '600', color: '#8b5cf6',
    backgroundColor: '#f5f3ff', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 6,
  },
  macroFat: {
    fontSize: 11, fontWeight: '600', color: '#f59e0b',
    backgroundColor: '#fffbeb', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 6,
  },
  mealNotes: {
    fontSize: 11, color: '#9ca3af',
    marginTop: 4, fontStyle: 'italic',
  },
  checkmark: {
    fontSize: 14, color: '#10b981',
    fontWeight: '700', paddingTop: 2,
  },
  groupFooter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  groupFooterText: {
    fontSize: 12, color: '#6b7280', fontWeight: '600',
  },
});
