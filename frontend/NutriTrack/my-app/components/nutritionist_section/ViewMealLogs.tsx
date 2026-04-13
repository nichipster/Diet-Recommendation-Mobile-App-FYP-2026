import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MonthSelector from '../profile_section/progress/MonthSelector';
import WeekFilter from '../profile_section/progress/WeekFilter';
import { Meal } from '../meal_logger/components/meal-form';

// Dummy client meals !!
const MOCK_MEALS: Record<string, Meal[]> = {
  "1": [
    { id: '1', date: '2026-04-10', name: 'Breakfast', time: '7:00 AM', description: 'Oatmeal with fruits', calories: 300, protein: 12, carbs: 50, fats: 6 },
    { id: '2', date: '2026-04-10', name: 'Lunch', time: '12:30 PM', description: 'Grilled chicken salad', calories: 420, protein: 35, carbs: 20, fats: 18 },
    { id: '3', date: '2026-04-10', name: 'Dinner', time: '7:00 PM', description: 'Salmon with vegetables', calories: 520, protein: 45, carbs: 30, fats: 20 },
    { id: '4', date: '2026-04-11', name: 'Breakfast', time: '7:30 AM', description: 'Eggs and toast', calories: 350, protein: 20, carbs: 30, fats: 12 },
    { id: '5', date: '2026-04-11', name: 'Lunch', time: '12:30 PM', description: 'Chicken wrap', calories: 450, protein: 30, carbs: 40, fats: 15 },
  ],
  "2": [
    { id: '1', date: '2026-04-10', name: 'Breakfast', time: '8:00 AM', description: 'Greek yogurt with granola', calories: 280, protein: 18, carbs: 35, fats: 9 },
    { id: '2', date: '2026-04-10', name: 'Lunch', time: '1:00 PM', description: 'Quinoa bowl with vegetables', calories: 400, protein: 15, carbs: 55, fats: 12 },
    { id: '3', date: '2026-04-10', name: 'Dinner', time: '6:30 PM', description: 'Stir-fried tofu with broccoli', calories: 350, protein: 20, carbs: 40, fats: 15 },
    { id: '4', date: '2026-04-11', name: 'Breakfast', time: '7:45 AM', description: 'Avocado toast with poached egg', calories: 380, protein: 20, carbs: 35, fats: 22 },
    { id: '5', date: '2026-04-11', name: 'Lunch', time: '1:00 PM', description: 'Lentil soup with whole grain bread', calories: 460, protein: 25, carbs: 50, fats: 18 },
  ],
  "3": [
    { id: '1', date: '2026-04-10', name: 'Breakfast', time: '7:15 AM', description: 'Smoothie bowl with berries', calories: 350, protein: 12, carbs: 60, fats: 10 },
    { id: '2', date: '2026-04-10', name: 'Lunch', time: '12:00 PM', description: 'Grilled shrimp with quinoa and veggies', calories: 400, protein: 40, carbs: 30, fats: 14 },
    { id: '3', date: '2026-04-10', name: 'Dinner', time: '7:00 PM', description: 'Steak with sweet potatoes', calories: 500, protein: 50, carbs: 40, fats: 20 },
    { id: '4', date: '2026-04-11', name: 'Breakfast', time: '8:00 AM', description: 'Whole wheat pancakes with syrup', calories: 380, protein: 8, carbs: 70, fats: 10 },
    { id: '5', date: '2026-04-11', name: 'Lunch', time: '1:15 PM', description: 'Chicken Caesar salad', calories: 500, protein: 35, carbs: 20, fats: 25 },
  ],
};

export default function ViewMealLogs() {
  const { clientId, clientName } = useLocalSearchParams();
  const router = useRouter();

  const id = Array.isArray(clientId) ? clientId[0] : clientId;
  const name = Array.isArray(clientName) ? clientName[0] : clientName;

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const meals: Meal[] = MOCK_MEALS[id || "1"] || [];

  // Generate weeks for WeekFilter
  const weeks = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), selectedMonth, 1);
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(startOfMonth);
      start.setDate(startOfMonth.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { label: `Week ${i + 1}`, start, end };
    });
  }, [selectedMonth]);

  // Filter meals by month and optional week
  const filteredMeals = useMemo(() => {
    const monthMeals = meals.filter(m => new Date(m.date).getMonth() === selectedMonth);
    if (selectedWeek === null) return monthMeals;
    const { start, end } = weeks[selectedWeek];
    return monthMeals.filter(m => {
      const mDate = new Date(m.date);
      return mDate >= start && mDate <= end;
    });
  }, [meals, selectedMonth, selectedWeek, weeks]);

  // Calculate basic stats
  const stats = useMemo(() => {
    const daysLogged = new Set(filteredMeals.map(m => m.date)).size;
    const totalMeals = filteredMeals.length;
    const avgCalories = Math.round(filteredMeals.reduce((sum, m) => sum + (m.calories || 0), 0) / (daysLogged || 1));
    const avgProtein = Math.round(filteredMeals.reduce((sum, m) => sum + (m.protein || 0), 0) / (daysLogged || 1));
    return { daysLogged, totalMeals, avgCalories, avgProtein };
  }, [filteredMeals]);

  // Group meals by date
  const mealsByDate = useMemo(() => {
    const grouped: Record<string, Meal[]> = {};
    filteredMeals.forEach(m => {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    });
    return Object.entries(grouped).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [filteredMeals]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "#10b981", fontWeight: "600" }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Meal Logs for {name}</Text>
          <Text style={styles.subtitle}>View meals by week or month</Text>
        </View>

        {/* Month & Week Selectors */}
        <MonthSelector selectedMonth={selectedMonth} selectedYear={new Date().getFullYear()} onSelect={setSelectedMonth} />
        <WeekFilter weeks={weeks} selectedWeek={selectedWeek} onSelect={setSelectedWeek} />

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}><Text style={styles.statNumber}>🍽️ {stats.totalMeals}</Text><Text style={styles.statLabel}>Meals Logged</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><Text style={styles.statNumber}>📅 {stats.daysLogged}</Text><Text style={styles.statLabel}>Days Logged</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><Text style={styles.statNumber}>🔥 {stats.avgCalories}</Text><Text style={styles.statLabel}>Avg Calories</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><Text style={styles.statNumber}>💪 {stats.avgProtein}</Text><Text style={styles.statLabel}>Avg Protein</Text></View>
        </View>

        {/* Meal Logs */}
        {mealsByDate.map(([date, dayMeals]) => (
          <View key={date} style={{ marginBottom: 20 }}>
            <Text style={styles.dateLabel}>{new Date(date).toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            {dayMeals.map(meal => (
              <View key={meal.id} style={styles.mealCard}>
                <Text style={styles.mealName}>{meal.name} — {meal.time}</Text>
                <Text style={styles.mealDesc}>{meal.description}</Text>
                <View style={styles.mealStats}>
                  <Text style={styles.statText}>🔥 {meal.calories} kcal</Text>
                  <Text style={styles.statText}>💪 {meal.protein} g</Text>
                  <Text style={styles.statText}>🍞 {meal.carbs} g</Text>
                  <Text style={styles.statText}>🥑 {meal.fats} g</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 15 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#777' },
  statsCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, flexDirection: "row", justifyContent: "space-between", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, marginVertical: 16 },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#555", marginTop: 2 },
  divider: { width: 1, backgroundColor: "#e5e7eb", height: "100%" },
  dateLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 10 },
  mealCard: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 8 },
  mealName: { fontSize: 14, fontWeight: "600" },
  mealDesc: { fontSize: 12, color: "#555", marginTop: 2 },
  mealStats: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  statText: { fontSize: 12, color: "#555", fontWeight: "500" },
});