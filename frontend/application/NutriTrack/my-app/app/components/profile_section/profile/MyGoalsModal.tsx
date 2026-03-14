import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView
} from 'react-native';
import { useGoals } from '../../../context/GoalsContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const GOAL_LABELS: Record<string, string> = {
  lose: '🔥 Lose Weight',
  maintain: '⚖️ Maintain Weight',
  gain: '💪 Gain Muscle',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary — little or no exercise',
  light: 'Light — 1 to 3 days/week',
  moderate: 'Moderate — 3 to 5 days/week',
  active: 'Very Active — 6 to 7 days/week',
};

const MACROS = [
  { key: 'calories', label: 'Daily Calories', unit: 'kcal', emoji: '🔥', color: '#10b981', bg: '#f0fdf4' },
  { key: 'carbs',    label: 'Carbohydrates',  unit: 'g',    emoji: '🌾', color: '#f97316', bg: '#fff7ed' },
  { key: 'protein',  label: 'Protein',         unit: 'g',    emoji: '🥩', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'fats',     label: 'Fats',            unit: 'g',    emoji: '🥑', color: '#eab308', bg: '#fefce8' },
];

export default function MyGoalsModal({ visible, onClose }: Props) {
  const { targets, goalsSaved } = useGoals();

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeArrow}>‹</Text>
            <Text style={styles.closeText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>My Goals</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {!goalsSaved && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🎯</Text>
                <Text style={styles.emptyTitle}>No goals set yet</Text>
                <Text style={styles.emptySub}>
                  Go to the Goals tab to set up your personalised nutrition targets.
                </Text>
              </View>
            )}

            {goalsSaved && (
              <>
                {/* Macro targets */}
                <Text style={styles.sectionLabel}>DAILY TARGETS</Text>
                <View style={styles.macroGrid}>
                  {MACROS.map(m => (
                    <View key={m.key} style={[styles.macroCard, { backgroundColor: m.bg }]}>
                      <Text style={styles.macroEmoji}>{m.emoji}</Text>
                      <Text style={[styles.macroValue, { color: m.color }]}>
                        {targets[m.key as keyof typeof targets]}
                        <Text style={styles.macroUnit}> {m.unit}</Text>
                      </Text>
                      <Text style={styles.macroLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Goal info */}
                <Text style={styles.sectionLabel}>GOAL DETAILS</Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🎯</Text>
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Goal Type</Text>
                      <Text style={styles.infoValue}>
                        {GOAL_LABELS['lose']}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRowBorder} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🏃</Text>
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Activity Level</Text>
                      <Text style={styles.infoValue}>
                        {ACTIVITY_LABELS['moderate']}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>
                    To update your targets, go to the Goals tab to update your personalised nutrition targets.
                  </Text>
                </View>
              </>
            )}

          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  closeText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  navTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  navSpacer: { width: 60 },

  content: { padding: 16, paddingBottom: 40 },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1, marginBottom: 10, marginLeft: 4, marginTop: 8,
  },

  macroGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  macroCard: {
    width: '47%', borderRadius: 16, padding: 16, alignItems: 'center',
  },
  macroEmoji: { fontSize: 24, marginBottom: 6 },
  macroValue: { fontSize: 26, fontWeight: '800' },
  macroUnit: { fontSize: 14, fontWeight: '400' },
  macroLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: '600' },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoRowBorder: { height: 1, backgroundColor: '#f3f4f6' },
  infoIcon: { fontSize: 22 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  hintBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#d1fae5',
  },
  hintText: { fontSize: 13, color: '#059669', textAlign: 'center', lineHeight: 18 },
});