import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MealTimeline() {
  return (
    <View style={styles.mealsTimeline}>
      <Text style={styles.sectionTitle}>Meal Timeline</Text>

      {/* Breakfast */}
      <View style={styles.mealEntry}>
        <View style={styles.timelineMarker}>
          <View style={[styles.markerCircle, styles.markerComplete]}>
            <Text style={styles.markerCompleteText}>✓</Text>
          </View>
          <View style={[styles.markerLine, styles.markerLineActive]} />
        </View>
        <View style={styles.mealContent}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName}>Breakfast</Text>
            <Text style={styles.mealTime}>8:30 AM</Text>
          </View>
          <Text style={styles.mealDescription}>Oatmeal with banana and honey</Text>
          <Text style={styles.mealCalories}>420 calories</Text>
        </View>
      </View>

      {/* Lunch */}
      <View style={styles.mealEntry}>
        <View style={styles.timelineMarker}>
          <View style={[styles.markerCircle, styles.markerComplete]}>
            <Text style={styles.markerCompleteText}>✓</Text>
          </View>
          <View style={[styles.markerLine, styles.markerLineInactive]} />
        </View>
        <View style={styles.mealContent}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName}>Lunch</Text>
            <Text style={styles.mealTime}>1:00 PM</Text>
          </View>
          <Text style={styles.mealDescription}>Grilled chicken salad</Text>
          <Text style={styles.mealCalories}>580 calories</Text>
        </View>
      </View>

      {/* Dinner */}
      <View style={[styles.mealEntry, { marginBottom: 0 }]}>
        <View style={styles.timelineMarker}>
          <View style={[styles.markerCircle, styles.markerPending]}>
            <Text style={styles.markerPendingText}>?</Text>
          </View>
        </View>
        <View style={styles.mealContent}>
          <View style={styles.mealHeader}>
            <Text style={[styles.mealName, styles.pendingText]}>Dinner</Text>
            <Text style={[styles.mealTime, styles.pendingText]}>Upcoming</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.logMealBtn}>+ Log meal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mealsTimeline: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  mealEntry: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timelineMarker: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerComplete: {
    backgroundColor: '#10b981',
  },
  markerCompleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  markerPending: {
    backgroundColor: '#e5e7eb',
  },
  markerPendingText: {
    color: '#9ca3af',
    fontWeight: '700',
    fontSize: 14,
  },
  markerLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    minHeight: 20,
  },
  markerLineActive: {
    backgroundColor: '#d1fae5',
  },
  markerLineInactive: {
    backgroundColor: '#e5e7eb',
  },
  mealContent: {
    flex: 1,
    paddingBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  mealTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  mealDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  pendingText: {
    color: '#9ca3af',
  },
  logMealBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
});