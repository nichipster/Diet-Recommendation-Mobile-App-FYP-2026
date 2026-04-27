import React from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalysis } from '../../context/AnalysisContext';
import { useLocalSearchParams, useRouter } from 'expo-router';

const SECTIONS = [
  { key: 'summary',         label: '📋 Overall Summary',    icon: '#0F6E56' },
  { key: 'wentWell',        label: '✅ What Went Well',      icon: '#059669' },
  { key: 'areasToImprove',  label: '📈 Areas to Improve',   icon: '#d97706' },
  { key: 'recommendations', label: '💡 Recommendations',    icon: '#2563eb' },
  { key: 'nextSteps',       label: '🎯 Next Steps',         icon: '#7c3aed' },
];

export default function ViewAnalysis() {
  const { analysisId, nutritionistName } = useLocalSearchParams<{
    analysisId: string;
    nutritionistName: string;
  }>();

  const router = useRouter();
  const { getAnalysis } = useAnalysis();

  const analysis = getAnalysis(analysisId);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
         <Text style={s.backText}>← Back</Text>
       </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Your Report</Text>
          <Text style={s.headerSub}>From {nutritionistName}</Text>
        </View>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {!analysis ? (
          // No report yet
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📄</Text>
            <Text style={s.emptyTitle}>No report yet</Text>
            <Text style={s.emptySub}>
              Your nutritionist hasn't written a report yet. Check back after your session.
            </Text>
          </View>
        ) : (
          <>
            {/* Last updated badge */}
            <View style={s.updatedBadge}>
              <Text style={s.updatedText}>Last updated · {analysis.lastUpdated}</Text>
            </View>

            {/* Report sections */}
            {SECTIONS.map(section => (
              <View key={section.key} style={s.sectionCard}>
                <Text style={[s.sectionTitle, { color: section.icon }]}>
                  {section.label}
                </Text>
                <Text style={s.sectionContent}>
                  {analysis[section.key as keyof typeof analysis] || '—'}
                </Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 12,
  },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 14, color: '#10b981', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  content: { flex: 1, paddingHorizontal: 16 },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 32, alignItems: 'center', marginTop: 20,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  updatedBadge: {
    backgroundColor: '#E1F5EE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 14, marginTop: 4,
  },
  updatedText: { fontSize: 11, color: '#0F6E56', fontWeight: '600' },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  sectionContent: { fontSize: 13, color: '#374151', lineHeight: 20 },
});