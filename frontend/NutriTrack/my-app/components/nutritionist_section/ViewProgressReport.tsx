import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_URL, getAuthHeadersWithToken } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Components
import MonthSelector from '../profile_section/progress/MonthSelector';
import ConsistencyGrid from '../profile_section/progress/ConsistencyGrid';
import MonthlyOverview from '../profile_section/progress/MonthlyOverview';
import MacroDonut from '../profile_section/progress/MacroDonut';
import InsightCard from '../profile_section/progress/InsightCard';
import WeekFilter from '../profile_section/progress/WeekFilter';
import WeeklyBarChart from '../profile_section/progress/WeeklyBarChart';

// Dummy Data !!
export const MOCK_CLIENT_DATA: Record<string, any> = {
  "1": {
    name: "Sarah Gan",
    goal: "lose",
    goals: { calories: 1800, protein: 120, carbs: 200, fats: 60 },
    meals: [
      { id: "m1", date: "2026-04-10", food: "Chicken Salad", calories: 420, protein: 35, carbs: 20, fats: 18 },
      { id: "m2", date: "2026-03-11", food: "Oats + Banana", calories: 310, protein: 12, carbs: 55, fats: 6 },
      { id: "m3", date: "2026-04-12", food: "Salmon + Rice", calories: 520, protein: 45, carbs: 30, fats: 20 },
    ],
  },
  "2": {
    name: "Marcus Gim",
    goal: "gain",
    goals: { calories: 2500, protein: 150, carbs: 300, fats: 80 },
    meals: [
      { id: "m1", date: "2026-01-10", food: "Eggs + Toast", calories: 500, protein: 25, carbs: 45, fats: 20 },
      { id: "m2", date: "2026-02-11", food: "Chicken + Rice", calories: 650, protein: 50, carbs: 60, fats: 25 },
      { id: "m3", date: "2026-03-12", food: "Protein Shake", calories: 300, protein: 30, carbs: 20, fats: 10 },
    ],
  },
  "3": {
    name: "Priya Gair",
    goal: "maintain",
    goals: { calories: 2000, protein: 120, carbs: 220, fats: 70 },
    meals: [
      { id: "m1", date: "2026-02-10", food: "Greek Yogurt + Granola", calories: 350, protein: 20, carbs: 40, fats: 10 },
      { id: "m2", date: "2026-03-11", food: "Salmon Salad", calories: 500, protein: 35, carbs: 25, fats: 18 },
      { id: "m3", date: "2026-04-10", food: "Chicken Wrap", calories: 450, protein: 30, carbs: 50, fats: 15 },
      { id: "m4", date: "2026-04-10", food: "Chicken Nuggets", calories: 400, protein: 35, carbs: 10, fats: 10 },

    ],
  },
  "4": {
  name: "Alice Tan",
  goal: "lose",
  goals: { calories: 1600, protein: 100, carbs: 180, fats: 50 },
  meals: [
    { id: "m1", date: "2026-04-05", food: "Salad Bowl", calories: 350, protein: 20, carbs: 30, fats: 12 },
    { id: "m2", date: "2026-04-08", food: "Grilled Fish", calories: 400, protein: 35, carbs: 20, fats: 15 },
  ],
},
"5": {
  name: "Ben Lim",
  goal: "gain",
  goals: { calories: 2800, protein: 160, carbs: 320, fats: 90 },
  meals: [
    { id: "m1", date: "2026-04-06", food: "Chicken Rice", calories: 600, protein: 45, carbs: 70, fats: 20 },
    { id: "m2", date: "2026-04-09", food: "Protein Shake", calories: 350, protein: 40, carbs: 30, fats: 10 },
  ],
},
"6": {
  name: "Clara Ng",
  goal: "maintain",
  goals: { calories: 1900, protein: 110, carbs: 210, fats: 65 },
  meals: [
    { id: "m1", date: "2026-04-07", food: "Oatmeal", calories: 300, protein: 10, carbs: 55, fats: 8 },
    { id: "m2", date: "2026-04-10", food: "Tuna Sandwich", calories: 420, protein: 30, carbs: 45, fats: 14 },
  ],
},
"7": {
  name: "David Koh",
  goal: "lose",
  goals: { calories: 1700, protein: 110, carbs: 190, fats: 55 },
  meals: [
    { id: "m1", date: "2026-04-04", food: "Brown Rice Bowl", calories: 380, protein: 25, carbs: 50, fats: 10 },
    { id: "m2", date: "2026-04-11", food: "Steamed Chicken", calories: 350, protein: 40, carbs: 10, fats: 12 },
  ],
},
"8": {
  name: "Eva Goh",
  goal: "maintain",
  goals: { calories: 2000, protein: 115, carbs: 220, fats: 68 },
  meals: [
    { id: "m1", date: "2026-04-03", food: "Avocado Toast", calories: 380, protein: 12, carbs: 40, fats: 18 },
    { id: "m2", date: "2026-04-09", food: "Greek Yogurt", calories: 280, protein: 18, carbs: 35, fats: 9 },
  ],
},
"9": {
  name: "Grace Tan",
  goal: "lose",
  goals: { calories: 1600, protein: 100, carbs: 175, fats: 52 },
  meals: [
    { id: "m1", date: "2026-04-06", food: "Soup Noodles", calories: 320, protein: 18, carbs: 45, fats: 8 },
    { id: "m2", date: "2026-04-12", food: "Grilled Salmon", calories: 480, protein: 42, carbs: 15, fats: 22 },
  ],
},
"10": {
  name: "Henry Lim",
  goal: "gain",
  goals: { calories: 2700, protein: 155, carbs: 310, fats: 85 },
  meals: [
    { id: "m1", date: "2026-04-05", food: "Beef Rice", calories: 650, protein: 48, carbs: 65, fats: 22 },
    { id: "m2", date: "2026-04-10", food: "Eggs Benedict", calories: 520, protein: 30, carbs: 35, fats: 28 },
  ],
},
"11": {
  name: "Iris Ng",
  goal: "maintain",
  goals: { calories: 1950, protein: 112, carbs: 215, fats: 66 },
  meals: [
    { id: "m1", date: "2026-04-07", food: "Chicken Salad", calories: 380, protein: 32, carbs: 20, fats: 16 },
    { id: "m2", date: "2026-04-11", food: "Fruit Bowl", calories: 250, protein: 5, carbs: 55, fats: 3 },
  ],
},
"12": {
  name: "Jack Koh",
  goal: "lose",
  goals: { calories: 1750, protein: 115, carbs: 195, fats: 57 },
  meals: [
    { id: "m1", date: "2026-04-04", food: "Wonton Soup", calories: 310, protein: 20, carbs: 38, fats: 9 },
    { id: "m2", date: "2026-04-09", food: "Grilled Chicken", calories: 420, protein: 45, carbs: 10, fats: 14 },
  ],
},
"13": {
  name: "Karen Goh",
  goal: "maintain",
  goals: { calories: 2000, protein: 118, carbs: 220, fats: 67 },
  meals: [
    { id: "m1", date: "2026-04-06", food: "Laksa", calories: 520, protein: 22, carbs: 60, fats: 20 },
    { id: "m2", date: "2026-04-10", food: "Smoothie Bowl", calories: 340, protein: 12, carbs: 58, fats: 8 },
  ],
},
"14": {
  name: "Leon Tan",
  goal: "gain",
  goals: { calories: 2600, protein: 150, carbs: 300, fats: 82 },
  meals: [
    { id: "m1", date: "2026-04-05", food: "Nasi Lemak", calories: 700, protein: 30, carbs: 80, fats: 28 },
    { id: "m2", date: "2026-04-11", food: "Protein Pancakes", calories: 480, protein: 35, carbs: 50, fats: 14 },
  ],
},
"15": {
  name: "Mia Lim",
  goal: "lose",
  goals: { calories: 1650, protein: 105, carbs: 180, fats: 53 },
  meals: [
    { id: "m1", date: "2026-04-04", food: "Caesar Salad", calories: 360, protein: 22, carbs: 25, fats: 18 },
    { id: "m2", date: "2026-04-08", food: "Steamed Fish", calories: 380, protein: 40, carbs: 12, fats: 14 },
  ],
},
"16": {
  name: "Nathan Yeo",
  goal: "maintain",
  goals: { calories: 2100, protein: 120, carbs: 230, fats: 70 },
  meals: [
    { id: "m1", date: "2026-04-06", food: "Fried Rice", calories: 550, protein: 18, carbs: 75, fats: 18 },
    { id: "m2", date: "2026-04-10", food: "Chicken Wrap", calories: 430, protein: 28, carbs: 48, fats: 14 },
  ],
},
"17": {
  name: "Olivia Tan",
  goal: "lose",
  goals: { calories: 1600, protein: 100, carbs: 175, fats: 50 },
  meals: [
    { id: "m1", date: "2026-04-07", food: "Veggie Bowl", calories: 320, protein: 15, carbs: 45, fats: 10 },
    { id: "m2", date: "2026-04-12", food: "Grilled Prawns", calories: 380, protein: 38, carbs: 12, fats: 16 },
  ],
},
};

// Goal & Activity Labels
const GOAL_LABELS: Record<string, string> = { lose: "🔥 Lose Weight", maintain: "⚖️ Maintain Weight", gain: "💪 Gain Muscle" };
const ACTIVITY_LABELS: Record<string, string> = { sedentary: "Sedentary — little or no exercise", light: "Light — 1 to 3 days/week", moderate: "Moderate — 3 to 5 days/week", active: "Very Active — 6 to 7 days/week" };

// Types
type Meal = { id: string; date: string; food: string; calories: number; protein: number; carbs: number; fats: number; };
type Client = { name: string; goal: string; goals: Record<string, number>; meals: Meal[] };

// Helper Functions
const calculateAverages = (meals: Meal[]) => {
  const days = [...new Set(meals.map(m => m.date))];
  const count = days.length || 1;
  return {
    avgCalories: Math.round(meals.reduce((s, m) => s + (m.calories || 0), 0) / count),
    avgProtein: Math.round(meals.reduce((s, m) => s + (m.protein || 0), 0) / count),
    avgCarbs: Math.round(meals.reduce((s, m) => s + (m.carbs || 0), 0) / count),
    avgFats: Math.round(meals.reduce((s, m) => s + (m.fats || 0), 0) / count),
    daysLogged: count,
  };
};

const calculateStats = (meals: Meal[]) => {
  const uniqueDays = [...new Set(meals.map(m => m.date))];
  return { dayStreak: uniqueDays.length, mealsLogged: meals.length };
};

export default function ViewProgressReport() {
  const { clientId } = useLocalSearchParams();
  const router = useRouter();

  const id = Array.isArray(clientId) ? clientId[0] : clientId;

  // FALLBACK DATA — shown while backend is not yet connected.
// TODO (Backend): Replace with GET /clients/:clientId/progress

const [clientData, setClientData] = useState(MOCK_CLIENT_DATA[id ?? '']);

// TODO (Backend): Uncomment when backend is ready
// const fetchClientData = async () => {
//   try {
//     const token = await AsyncStorage.getItem('token');
//     const res = await fetch(`${API_URL}/clients/${id}/progress`, {
//       headers: getAuthHeadersWithToken(token),
//     });
//     if (res.ok) {
//       const data = await res.json();
//       setClientData(data);
//     }
//   } catch (e) {
//     console.log('fetchClientData error:', e);
//   }
// };

// TODO (Backend): Uncomment when backend is ready
// useEffect(() => {
//   fetchClientData();
// }, [id]);

  const client = clientData

if (!client) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'red' }}>Client not found. ID received: "{id}"</Text>
    </View>
  );
}

  const { meals, goals, goal, name } = client;
  
  // State
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Memoized averages & stats
  const { avgCalories, avgProtein, avgCarbs, avgFats, daysLogged } = useMemo(() => calculateAverages(meals), [meals]);
  const { dayStreak, mealsLogged } = useMemo(() => calculateStats(meals), [meals]);

  // Generate weeks for WeekFilter
  const weeks = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), selectedMonth, 1);
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(startOfMonth);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { label: `Week ${i + 1}`, start, end };
    });
  }, [selectedMonth]);

  // Filter meals by selected week or month
  const filteredMeals = useMemo(() => {
    const monthFiltered = meals.filter(m => new Date(m.date).getMonth() === selectedMonth);
    if (selectedWeek === null) return monthFiltered;
    const { start, end } = weeks[selectedWeek];
    return monthFiltered.filter(m => new Date(m.date) >= start && new Date(m.date) <= end);
  }, [meals, selectedMonth, selectedWeek, weeks]);

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={{ color: "#10b981", fontWeight: "600" }}>← Back</Text>
      </TouchableOpacity>

      {/* Name & Goal */}
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.goal}>{GOAL_LABELS[goal] || goal}</Text>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}><Text style={styles.statNumber}>🔥 {dayStreak}</Text><Text style={styles.statLabel}>Day Streak</Text></View>
        <View style={styles.divider} />
        <View style={styles.statItem}><Text style={styles.statNumber}>🍽️ {mealsLogged}</Text><Text style={styles.statLabel}>Meals Logged</Text></View>
      </View>

      {/* Goals */}
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <View style={styles.sectionCard}>
          <View style={styles.goalGrid}>
            {["calories", "carbs", "protein", "fats"].map(k => (
              <View key={k} style={styles.goalCard}>
                <Text style={styles.goalValue}>{goals[k]}g</Text>
                <Text style={styles.goalLabel}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalInfoTitle}>Goal Type</Text>
            <Text style={styles.goalInfoValue}>{GOAL_LABELS[goal] || goal}</Text>
            <Text style={[styles.goalInfoTitle, { marginTop: 10 }]}>Activity Level</Text>
            <Text style={styles.goalInfoValue}>{ACTIVITY_LABELS["moderate"]}</Text>
          </View>
        </View>
      </View>

      {/* Month Selector */}
      <MonthSelector selectedMonth={selectedMonth} selectedYear={new Date().getFullYear()} onSelect={setSelectedMonth} />

      {/* Week Filter & Weekly Bar Chart */}
      <WeekFilter weeks={weeks} selectedWeek={selectedWeek} onSelect={setSelectedWeek} />
      {selectedWeek !== null && (
        <WeeklyBarChart meals={filteredMeals} weekStart={weeks[selectedWeek].start} calorieGoal={goals.calories} />
      )}

      {/* Consistency Grid */}
      <ConsistencyGrid meals={filteredMeals} selectedMonth={selectedMonth} selectedYear={new Date().getFullYear()} />

      {/* Monthly Overview */}
      <MonthlyOverview avgCalories={avgCalories} calorieGoal={goals.calories} avgProtein={avgProtein} proteinGoal={goals.protein} avgCarbs={avgCarbs} carbsGoal={goals.carbs} avgFats={avgFats} fatsGoal={goals.fats} />

      {/* Macro Donut */}
      <MacroDonut protein={avgProtein} carbs={avgCarbs} fats={avgFats} />

      {/* Insights */}
      <InsightCard avgCalories={avgCalories} calorieGoal={goals.calories} avgProtein={avgProtein} proteinGoal={goals.protein} avgCarbs={avgCarbs} carbsGoal={goals.carbs} avgFats={avgFats} fatsGoal={goals.fats} daysLogged={daysLogged} totalDays={30} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  name: { fontSize: 22, fontWeight: "800", color: "#111827" },
  goal: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  statsCard: { backgroundColor: "#fff", borderRadius: 24, marginTop: 12, padding: 20, flexDirection: "row", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6, marginBottom: 16 },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  divider: { width: 1, backgroundColor: "#e5e7eb", height: "100%" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 10 },
  sectionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 16 },
  goalGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  goalCard: { flex: 1, backgroundColor: "#f3f4f6", padding: 12, borderRadius: 8, alignItems: "center" },
  goalValue: { fontSize: 20, fontWeight: "700", color: "#111827" },
  goalLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600", marginTop: 4 },
  goalInfo: { marginTop: 16 },
  goalInfoTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  goalInfoValue: { fontSize: 16, color: "#374151", marginTop: 6 },
});