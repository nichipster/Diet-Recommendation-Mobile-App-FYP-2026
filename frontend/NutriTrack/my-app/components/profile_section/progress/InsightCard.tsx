import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  avgCalories: number; calorieGoal: number;
  avgProtein:  number; proteinGoal:  number;
  avgCarbs:    number; carbsGoal:    number;
  avgFats:     number; fatsGoal:     number;
  daysLogged:  number;
  totalDays:   number;
};

export default function InsightCard({
  avgCalories, calorieGoal,
  avgProtein, proteinGoal,
  avgCarbs, carbsGoal,
  avgFats, fatsGoal,
  daysLogged, totalDays,
}: Props) {
  const insights: string[] = [];

  if (daysLogged === 0) {
    insights.push('Recommendation: Start logging your meals to see personalised insights and track your progress towards your goals.');
  } else {
    const logRate = (daysLogged / totalDays) * 100;
    if (logRate < 50) {
      insights.push(`Recommendation: You logged meals on ${daysLogged} out of ${totalDays} days this month. Try to log every day so your progress report reflects your full picture.`);
    } else {
      insights.push(`You logged meals on ${daysLogged} out of ${totalDays} days this month. Great consistency — keep it up to make your data even more accurate.`);
    }

    const calDiff = ((avgCalories - calorieGoal) / calorieGoal) * 100;
    if (calDiff > 10) {
      insights.push(`Recommendation: Your average daily calories are ${Math.round(calDiff)}% above your goal. Consider reducing portion sizes at dinner or cutting back on high-calorie snacks.`);
    } else if (calDiff < -25) {
      insights.push(`Recommendation: Your average daily calories are ${Math.round(Math.abs(calDiff))}% below your goal. Make sure you are eating enough to fuel your body and avoid energy dips throughout the day.`);
    } else {
      insights.push(`Your average calorie intake is within a healthy range of your daily goal. Keep maintaining this balance.`);
    }

    const proteinDiff = ((avgProtein - proteinGoal) / proteinGoal) * 100;
    if (proteinDiff < -25) {
      insights.push(`Recommendation: Your protein intake is averaging ${Math.round(Math.abs(proteinDiff))}% below your target. Try adding a protein source such as eggs, chicken, tofu or Greek yoghurt to at least one meal each day.`);
    } else {
      insights.push(`Your protein intake is close to your daily target. Consistent protein intake supports muscle maintenance and helps you feel fuller for longer.`);
    }

    const carbDiff = ((avgCarbs - carbsGoal) / carbsGoal) * 100;
    if (carbDiff > 25) {
      insights.push(`Recommendation: Your carbohydrate intake is averaging ${Math.round(carbDiff)}% above your goal. Consider swapping refined carbs like white rice or bread for higher-fibre alternatives such as oats, sweet potato or wholegrain options.`);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Insights</Text>
      {insights.map((text, i) => (
        <View key={i} style={[styles.insight, i < insights.length - 1 && styles.insightGap]}>
          <Text style={styles.insightText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  insight: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    padding: 14, borderLeftWidth: 3, borderLeftColor: '#10b981',
  },
  insightGap: { marginBottom: 10 },
  insightText: { fontSize: 13, color: '#065f46', lineHeight: 20 },
});