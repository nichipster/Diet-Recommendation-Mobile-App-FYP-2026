import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet
} from 'react-native';
import { API_URL } from '../../constants/api';

// ── FALLBACK DATA ──
// These values show while backend is not yet connected.
// When backend is ready, the fetch functions will replace these with real data.

// TODO (Backend): Replace with GET /admin/stats/performance/overview
const FALLBACK_OVERVIEW = {
  dau_mau_ratio: 78,
  avg_sessions_per_week: 4.2,
  avg_session_length_mins: 6.8,
};

// TODO (Backend): Replace with GET /admin/stats/performance/features?days=30
// Feature names must match exactly: 'Meal Logger', 'Dashboard', 'Goals',
// 'Recommend Meal', 'Consult', 'Progress Report', 'Submit Meal'
const FALLBACK_FEATURES = [
  { feature: 'Meal Logger',     usage_pct: 92 },
  { feature: 'Dashboard',       usage_pct: 88 },
  { feature: 'Goals',           usage_pct: 64 },
  { feature: 'Recommend Meal',  usage_pct: 58 },
  { feature: 'Consult',         usage_pct: 31 },
  { feature: 'Progress Report', usage_pct: 24 },
  { feature: 'Submit Meal',     usage_pct: 12 },
];

// TODO (Backend): Replace with GET /admin/stats/performance/meal-times
// Returns hours from 6am to 10pm and % of meals logged at each hour
const FALLBACK_MEAL_TIMES = [
  { hour: '6am',  pct: 12 },
  { hour: '8am',  pct: 28 },
  { hour: '10am', pct: 18 },
  { hour: '12pm', pct: 42 },
  { hour: '2pm',  pct: 22 },
  { hour: '6pm',  pct: 35 },
  { hour: '8pm',  pct: 15 },
  { hour: '10pm', pct: 8  },
];

// TODO (Backend): Replace with GET /admin/stats/performance/goals
// Tracks % of active users hitting each weekly target
const FALLBACK_GOALS = [
  { goal: 'Calorie goal', emoji: '🔥', completion_pct: 68 },
  { goal: 'Protein goal', emoji: '💪', completion_pct: 54 },
  { goal: 'Carbs goal',   emoji: '🌾', completion_pct: 61 },
  { goal: 'Water goal',   emoji: '💧', completion_pct: 43 },
  { goal: '7-day streak', emoji: '📅', completion_pct: 29 },
];

// TODO (Backend): Replace with GET /admin/stats/performance/funnel
// Tracks new user drop-off at each onboarding step
// drop is null for the first step, negative number for subsequent steps
const FALLBACK_FUNNEL = [
  { step: 'Signed up',         count: 4821, pct: 100, drop: null  },
  { step: 'Verified email',    count: 4050, pct: 84,  drop: null  },
  { step: 'Completed survey',  count: 3423, pct: 71,  drop: -13   },
  { step: 'Set first goal',    count: 2796, pct: 58,  drop: -13   },
  { step: 'Logged first meal', count: 2121, pct: 44,  drop: -14   },
  { step: 'Active after 7d',   count: 1543, pct: 32,  drop: -12   },
];

// TODO (Backend): Replace with GET /admin/stats/performance/insights
// Backend auto-generates insights based on the data above.
// Rules to implement on backend:
//   - if water_goal completion < 50% → warning insight
//   - if funnel drop at 'Logged first meal' > 10% → danger insight
//   - if Meal Logger usage > 80% → success insight
//   - if Consult usage < 40% → warning insight
//   - if 7-day streak < 35% → warning insight
const FALLBACK_INSIGHTS = [
  {
    type: 'success',
    title: 'Meal Logger is the top feature',
    text: '92% of active users log meals regularly — core feature is working well.',
  },
  {
    type: 'warning',
    title: 'Water goal compliance is low',
    text: 'Only 43% hit their water goal. Consider adding hydration reminders.',
  },
  {
    type: 'danger',
    title: 'High drop-off after signup',
    text: '56% of users never log their first meal. Onboarding may need improvement.',
  },
];

type OverviewData  = typeof FALLBACK_OVERVIEW;
type FeatureItem   = typeof FALLBACK_FEATURES[0];
type MealTimeItem  = typeof FALLBACK_MEAL_TIMES[0];
type GoalItem      = typeof FALLBACK_GOALS[0];
type FunnelItem    = typeof FALLBACK_FUNNEL[0];
type InsightItem   = typeof FALLBACK_INSIGHTS[0];

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── COLOUR HELPERS ──
const getBarColor = (pct: number): string => {
  if (pct >= 70) return '#10b981';
  if (pct >= 40) return '#6ee7b7';
  return '#d1d5db';
};

const getGoalColor = (pct: number): string => {
  if (pct >= 60) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
};

const getFunnelColor = (pct: number): string => {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6ee7b7';
  if (pct >= 40) return '#fde68a';
  return '#fca5a5';
};

const getFunnelTextColor = (pct: number): string => {
  if (pct >= 60) return '#fff';
  return '#92400e';
};

const INSIGHT_STYLES: Record<string, {
  bg: string; border: string; titleColor: string;
}> = {
  success: { bg: '#f0fdf4', border: '#10b981', titleColor: '#065f46' },
  warning: { bg: '#fef3c7', border: '#f59e0b', titleColor: '#92400e' },
  danger:  { bg: '#fef2f2', border: '#ef4444', titleColor: '#991b1b' },
};

const INSIGHT_ICONS: Record<string, string> = {
  success: '✅',
  warning: '⚠️',
  danger:  '❌',
};

export default function PerformanceScreen({ visible, onClose }: Props) {

  // ── STATE ──
  // Initialised with fallback data so numbers always show.
  // When backend is ready, fetch functions will overwrite these with real data.
  const [overview, setOverview]   = useState<OverviewData>(FALLBACK_OVERVIEW);
  const [features, setFeatures]   = useState<FeatureItem[]>(FALLBACK_FEATURES);
  const [mealTimes, setMealTimes] = useState<MealTimeItem[]>(FALLBACK_MEAL_TIMES);
  const [goals, setGoals]         = useState<GoalItem[]>(FALLBACK_GOALS);
  const [funnel, setFunnel]       = useState<FunnelItem[]>(FALLBACK_FUNNEL);
  const [insights, setInsights]   = useState<InsightItem[]>(FALLBACK_INSIGHTS);

  // ── FETCH ALL PERFORMANCE DATA ──
  // TODO (Backend): Uncomment all fetch functions and the useEffect when backend is ready

  // Endpoint: GET /admin/stats/performance/overview
  // const fetchOverview = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/stats/performance/overview`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setOverview(data);
  //       // Falls back to FALLBACK_OVERVIEW if fetch fails
  //     }
  //   } catch (e) { console.log('fetchOverview error:', e); }
  // };

  // Endpoint: GET /admin/stats/performance/features?days=30
  // const fetchFeatures = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/stats/performance/features?days=30`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setFeatures(data);
  //     }
  //   } catch (e) { console.log('fetchFeatures error:', e); }
  // };

  // Endpoint: GET /admin/stats/performance/meal-times
  // const fetchMealTimes = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/stats/performance/meal-times`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setMealTimes(data);
  //     }
  //   } catch (e) { console.log('fetchMealTimes error:', e); }
  // };

  // Endpoint: GET /admin/stats/performance/goals
  // const fetchGoals = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/stats/performance/goals`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setGoals(data);
  //     }
  //   } catch (e) { console.log('fetchGoals error:', e); }
  // };

  // Endpoint: GET /admin/stats/performance/funnel
  // const fetchFunnel = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/stats/performance/funnel`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setFunnel(data);
  //     }
  //   } catch (e) { console.log('fetchFunnel error:', e); }
  // };

  // Endpoint: GET /admin/stats/performance/insights
  // Backend auto-generates insights based on rules described at top of file
  // const fetchInsights = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/stats/performance/insights`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setInsights(data);
  //     }
  //   } catch (e) { console.log('fetchInsights error:', e); }
  // };

  // TODO (Backend): Uncomment when backend is ready
  // Calls all fetch functions when the page loads
  // useEffect(() => {
  //   if (visible) {
  //     fetchOverview();
  //     fetchFeatures();
  //     fetchMealTimes();
  //     fetchGoals();
  //     fetchFunnel();
  //     fetchInsights();
  //   }
  // }, [visible]);

  // ── MAX VALUE for bar chart scaling ──
  const maxMealTimePct = Math.max(...mealTimes.map(m => m.pct));

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── MINI STATS ROW ── */}
        {/* TODO (Backend): Values from GET /admin/stats/performance/overview */}
        <View style={styles.miniStatsRow}>
          {[
            {
              value: `${overview.dau_mau_ratio}%`,
              label: 'DAU/MAU ratio',
            },
            {
              value: overview.avg_sessions_per_week.toFixed(1),
              label: 'Avg sessions/week',
            },
            {
              value: `${overview.avg_session_length_mins}m`,
              label: 'Avg session length',
            },
          ].map(s => (
            <View key={s.label} style={styles.miniStat}>
              <Text style={styles.miniVal}>{s.value}</Text>
              <Text style={styles.miniLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── FEATURE USAGE ── */}
        {/* TODO (Backend): Values from GET /admin/stats/performance/features?days=30 */}
        {/* Consult here refers to the nutritionist consultation page (app/(tabs)/consult) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feature usage (last 30 days)</Text>
          <Text style={styles.cardSub}>
            % of active users who used each feature
          </Text>
          {features.map(f => (
            <View key={f.feature} style={styles.featRow}>
              <Text style={styles.featName}>{f.feature}</Text>
              <View style={styles.featBarWrap}>
                <View style={[
                  styles.featBar,
                  {
                    width: `${f.usage_pct}%`,
                    backgroundColor: getBarColor(f.usage_pct),
                  }
                ]} />
              </View>
              <Text style={styles.featPct}>{f.usage_pct}%</Text>
            </View>
          ))}
        </View>

        {/* ── MEAL LOGGING BY TIME OF DAY ── */}
        {/* TODO (Backend): Values from GET /admin/stats/performance/meal-times */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal logging by time of day</Text>
          <Text style={styles.cardSub}>Average meals logged per hour</Text>
          <View style={styles.timeChartRow}>
            {mealTimes.map(t => (
              <View key={t.hour} style={styles.timeCol}>
                <Text style={styles.timeVal}>{t.pct}%</Text>
                <View style={[
                  styles.timeBar,
                  {
                    // Scale bar height relative to max value
                    height: Math.round((t.pct / maxMealTimePct) * 60),
                    backgroundColor: t.pct >= 35
                      ? '#10b981'
                      : t.pct >= 20
                      ? '#6ee7b7'
                      : t.pct >= 10
                      ? '#d1fae5'
                      : '#f3f4f6',
                  }
                ]} />
                <Text style={styles.timeLbl}>{t.hour}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.timeHint}>
            Peak usage at 12pm and 6pm — lunch and dinner
          </Text>
        </View>

        {/* ── GOAL COMPLETION RATES ── */}
        {/* TODO (Backend): Values from GET /admin/stats/performance/goals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal completion rates</Text>
          <Text style={styles.cardSub}>
            % of users hitting their weekly targets
          </Text>
          {goals.map(g => (
            <View key={g.goal} style={styles.goalRow}>
              <Text style={styles.goalIcon}>{g.emoji}</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{g.goal}</Text>
                <View style={styles.goalBarWrap}>
                  <View style={[
                    styles.goalBar,
                    {
                      width: `${g.completion_pct}%`,
                      backgroundColor: getGoalColor(g.completion_pct),
                    }
                  ]} />
                </View>
              </View>
              <Text style={[
                styles.goalPct,
                { color: getGoalColor(g.completion_pct) }
              ]}>
                {g.completion_pct}%
              </Text>
            </View>
          ))}
        </View>

        {/* ── USER ONBOARDING DROP-OFF FUNNEL ── */}
        {/* TODO (Backend): Values from GET /admin/stats/performance/funnel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User onboarding drop-off</Text>
          <Text style={styles.cardSub}>
            Where new users stop in the signup flow
          </Text>
          {funnel.map((f, index) => (
            <View key={f.step} style={styles.funnelRow}>
              <Text style={styles.funnelStep}>{f.step}</Text>
              <View style={styles.funnelBarWrap}>
                <View style={[
                  styles.funnelBar,
                  {
                    width: `${f.pct}%`,
                    backgroundColor: getFunnelColor(f.pct),
                  }
                ]}>
                  <Text style={[
                    styles.funnelBarText,
                    { color: getFunnelTextColor(f.pct) }
                  ]}>
                    {f.count.toLocaleString()}
                  </Text>
                </View>
              </View>
              {f.drop !== null ? (
                <Text style={styles.funnelDrop}>{f.drop}%</Text>
              ) : (
                <Text style={styles.funnelOk}>{f.pct}%</Text>
              )}
            </View>
          ))}
        </View>

        {/* ── KEY INSIGHTS ── */}
        {/* TODO (Backend): Values from GET /admin/stats/performance/insights */}
        {/* Backend auto-generates these based on threshold rules */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Key insights</Text>
          {insights.map((ins, index) => {
            const style = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.success;
            return (
              <View
                key={index}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: style.bg,
                    borderLeftColor: style.border,
                  }
                ]}
              >
                <Text style={styles.insightIcon}>
                  {INSIGHT_ICONS[ins.type]}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.insightTitle,
                    { color: style.titleColor }
                  ]}>
                    {ins.title}
                  </Text>
                  <Text style={styles.insightText}>{ins.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },

  miniStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  miniStat: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981', alignItems: 'center',
  },
  miniVal: { fontSize: 18, fontWeight: '700', color: '#111827' },
  miniLbl: { fontSize: 9, color: '#6b7280', marginTop: 3, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSub: { fontSize: 11, color: '#6b7280', marginBottom: 12 },

  // ── Feature usage ──
  featRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  featName: { fontSize: 11, color: '#374151', width: 100, flexShrink: 0 },
  featBarWrap: {
    flex: 1, height: 8, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden',
  },
  featBar: { height: '100%', borderRadius: 4 },
  featPct: {
    fontSize: 11, fontWeight: '700', color: '#111827',
    width: 34, textAlign: 'right', flexShrink: 0,
  },

  // ── Meal times ──
  timeChartRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 90, gap: 4, marginBottom: 8,
  },
  timeCol: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%',
  },
  timeVal: { fontSize: 8, color: '#6b7280', marginBottom: 3 },
  timeBar: { width: '100%', borderRadius: 3, minHeight: 3 },
  timeLbl: { fontSize: 8, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  timeHint: {
    fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4,
  },

  // ── Goal completion ──
  goalRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  goalIcon: { fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 11, fontWeight: '600', color: '#111827', marginBottom: 4 },
  goalBarWrap: {
    height: 6, backgroundColor: '#f3f4f6',
    borderRadius: 3, overflow: 'hidden',
  },
  goalBar: { height: '100%', borderRadius: 3 },
  goalPct: {
    fontSize: 11, fontWeight: '700',
    width: 34, textAlign: 'right', flexShrink: 0,
  },

  // ── Funnel ──
  funnelRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 8,
  },
  funnelStep: { fontSize: 11, color: '#374151', width: 100, flexShrink: 0 },
  funnelBarWrap: {
    flex: 1, height: 20, backgroundColor: '#f3f4f6',
    borderRadius: 5, overflow: 'hidden',
  },
  funnelBar: {
    height: '100%', borderRadius: 5,
    justifyContent: 'center', alignItems: 'flex-end',
    paddingRight: 6,
  },
  funnelBarText: { fontSize: 9, fontWeight: '700' },
  funnelDrop: {
    fontSize: 10, fontWeight: '700', color: '#dc2626',
    width: 34, textAlign: 'right', flexShrink: 0,
  },
  funnelOk: {
    fontSize: 10, fontWeight: '700', color: '#10b981',
    width: 34, textAlign: 'right', flexShrink: 0,
  },

  // ── Insights ──
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, padding: 12,
    borderLeftWidth: 3, marginBottom: 8,
  },
  insightIcon: { fontSize: 16, flexShrink: 0 },
  insightTitle: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  insightText: { fontSize: 11, color: '#374151', lineHeight: 16 },
});