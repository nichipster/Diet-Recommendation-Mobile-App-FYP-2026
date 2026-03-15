import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, StatusBar,
  View, Text, TouchableOpacity, StyleSheet, Modal
} from 'react-native';
import { useGoals } from '../../../context/GoalsContext';
import MonthSelector from './MonthSelector';
import WeekFilter from './WeekFilter';
import MonthlyOverview from './MonthlyOverview';
import WeeklyBarChart from './WeeklyBarChart';
import MacroDonut from './MacroDonut';
import ConsistencyGrid from './ConsistencyGrid';
import InsightCard from './InsightCard';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProgressReport({ visible, onClose }: Props) {
  const { meals, targets, goalsSaved } = useGoals();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear]  = useState(now.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const calorieGoal = goalsSaved ? targets.calories : 2000;
  const proteinGoal = goalsSaved ? targets.protein  : 150;
  const carbsGoal   = goalsSaved ? targets.carbs    : 275;
  const fatsGoal    = goalsSaved ? targets.fats     : 65;

  const monthMeals = meals.filter(m => {
    const d = new Date(m.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const getWeeksInMonth = () => {
    const weeks: { label: string; start: Date; end: Date }[] = [];
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay  = new Date(selectedYear, selectedMonth + 1, 0);
    let current = new Date(firstDay);
    let weekNum = 1;
    while (current <= lastDay) {
      const start = new Date(current);
      const end   = new Date(current);
      end.setDate(end.getDate() + 6);
      if (end > lastDay) end.setTime(lastDay.getTime());
      weeks.push({ label: `Week ${weekNum}`, start, end });
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
    return weeks;
  };

  const weeks = getWeeksInMonth();

  const weekMeals = selectedWeek !== null
    ? monthMeals.filter(m => {
        const d = new Date(m.date);
        return d >= weeks[selectedWeek].start && d <= weeks[selectedWeek].end;
      })
    : monthMeals;

  const activeMeals   = selectedWeek !== null ? weekMeals : monthMeals;
  const daysWithMeals = [...new Set(activeMeals.map(m => m.date))];
  const daysCount     = daysWithMeals.length || 1;

  const avgCalories = Math.round(activeMeals.reduce((s, m) => s + (m.calories || 0), 0) / daysCount);
  const avgProtein  = Math.round(activeMeals.reduce((s, m) => s + (m.protein  || 0), 0) / daysCount);
  const avgCarbs    = Math.round(activeMeals.reduce((s, m) => s + (m.carbs    || 0), 0) / daysCount);
  const avgFats     = Math.round(activeMeals.reduce((s, m) => s + (m.fats     || 0), 0) / daysCount);

  const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />

        <View style={styles.navbar}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Progress Report</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{monthName} {selectedYear}</Text>
            <Text style={styles.headerSub}>
              {selectedWeek !== null
                ? `${weeks[selectedWeek].label} · ${weeks[selectedWeek].start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weeks[selectedWeek].end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : `${daysWithMeals.length} days logged · ${calorieGoal} kcal goal`}
            </Text>
          </View>

          <View style={styles.content}>
            <MonthSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onSelect={(m) => { setSelectedMonth(m); setSelectedWeek(null); }}
            />

            <WeekFilter
              weeks={weeks}
              selectedWeek={selectedWeek}
              onSelect={setSelectedWeek}
            />

            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Colour guide</Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Within 10% of goal</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>10 to 25% off goal</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#9ca3af' }]} />
                <Text style={styles.legendText}>More than 25% off goal</Text>
              </View>
            </View>

            {selectedWeek === null ? (
              <MonthlyOverview
                avgCalories={avgCalories} calorieGoal={calorieGoal}
                avgProtein={avgProtein}   proteinGoal={proteinGoal}
                avgCarbs={avgCarbs}       carbsGoal={carbsGoal}
                avgFats={avgFats}         fatsGoal={fatsGoal}
              />
            ) : (
              <WeeklyBarChart
                meals={weekMeals}
                weekStart={weeks[selectedWeek].start}
                calorieGoal={calorieGoal}
              />
            )}

            <MacroDonut
              protein={avgProtein}
              carbs={avgCarbs}
              fats={avgFats}
            />

            <ConsistencyGrid
              meals={monthMeals}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />

            <InsightCard
              avgCalories={avgCalories} calorieGoal={calorieGoal}
              avgProtein={avgProtein}   proteinGoal={proteinGoal}
              avgCarbs={avgCarbs}       carbsGoal={carbsGoal}
              avgFats={avgFats}         fatsGoal={fatsGoal}
              daysLogged={daysWithMeals.length}
              totalDays={new Date(selectedYear, selectedMonth + 1, 0).getDate()}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10b981' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  backText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  navTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  navSpacer: { width: 60 },
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  content: {
    backgroundColor: '#f9fafb', marginTop: -44,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40,
  },
  legendCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280' },
});