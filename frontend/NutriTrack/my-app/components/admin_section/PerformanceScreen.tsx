import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/api';

type OverviewData = {
  dau_mau_ratio: number;
  avg_daily_usage_mins: number;
};

type FeatureItem = {
  feature: string;
  usage_pct: number;
};

type MealTimeItem = {
  hour: string;
  pct: number;
};

type FunnelItem = {
  step: string;
  count: number;
  pct: number;
  drop: number | null;
};

type TopFoodItem = {
  rank: number;
  name: string;
  emoji: string;
  emoji_bg: string;
  logs: number;
};

type InsightItem = {
  type: 'success' | 'warning' | 'danger';
  title: string;
  text: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FALLBACK_OVERVIEW: OverviewData = { dau_mau_ratio: 0, avg_daily_usage_mins: 0 };
const FALLBACK_FEATURES: FeatureItem[] = [];
const FALLBACK_MEAL_TIMES: MealTimeItem[] = [];
const FALLBACK_FUNNEL: FunnelItem[] = [];
const FALLBACK_TOP_FOODS: TopFoodItem[] = [];
const FALLBACK_INSIGHTS: InsightItem[] = [];

const getBarColor = (pct: number): string => {
  if (pct >= 70) return '#10b981';
  if (pct >= 40) return '#6ee7b7';
  return '#d1d5db';
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
  const [overview, setOverview]   = useState<OverviewData>(FALLBACK_OVERVIEW);
  const [features, setFeatures]   = useState<FeatureItem[]>(FALLBACK_FEATURES);
  const [mealTimes, setMealTimes] = useState<MealTimeItem[]>(FALLBACK_MEAL_TIMES);
  const [funnel, setFunnel]       = useState<FunnelItem[]>(FALLBACK_FUNNEL);
  const [topFoods, setTopFoods]   = useState<TopFoodItem[]>(FALLBACK_TOP_FOODS);
  const [insights, setInsights]   = useState<InsightItem[]>(FALLBACK_INSIGHTS);
  const [loading, setLoading]     = useState(false);

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH OVERVIEW ──
  // Endpoint: GET /admin/stats/performance/overview
  // Returns: { dau_mau_ratio: float, avg_daily_usage_mins: float }
  const fetchOverview = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats/performance/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      } else {
        console.log('fetchOverview failed:', res.status);
      }
    } catch (e) {
      console.log('fetchOverview error:', e);
    }
  };

  // ── FETCH FEATURE USAGE ──
  // Endpoint: GET /admin/stats/performance/features?days=30
  // Returns: [{ feature: string, usage_pct: float }]
  // feature values match AppFeature enum values e.g. 'meal_logger'
  const fetchFeatures = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats/performance/features?days=30`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      } else {
        console.log('fetchFeatures failed:', res.status);
      }
    } catch (e) {
      console.log('fetchFeatures error:', e);
    }
  };

  // ── FETCH MEAL TIMES ──
  // Endpoint: GET /admin/stats/performance/meal-times
  // Returns: [{ hour: string, pct: float }]
  const fetchMealTimes = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats/performance/meal-times`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMealTimes(data);
      } else {
        console.log('fetchMealTimes failed:', res.status);
      }
    } catch (e) {
      console.log('fetchMealTimes error:', e);
    }
  };

  // ── FETCH FUNNEL ──
  // Endpoint: GET /admin/stats/performance/funnel
  // Returns: [{ step, count, pct, drop }]
  const fetchFunnel = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats/performance/funnel`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFunnel(data);
      } else {
        console.log('fetchFunnel failed:', res.status);
      }
    } catch (e) {
      console.log('fetchFunnel error:', e);
    }
  };

  // ── FETCH TOP FOODS ──
  // Endpoint: GET /admin/stats/performance/top-foods
  // Returns: [{ rank, name, emoji, emoji_bg, logs }]
  const fetchTopFoods = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats/performance/top-foods`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTopFoods(data);
      } else {
        console.log('fetchTopFoods failed:', res.status);
      }
    } catch (e) {
      console.log('fetchTopFoods error:', e);
    }
  };

  // ── FETCH INSIGHTS ──
  // Endpoint: GET /admin/stats/performance/insights
  // Returns: [{ type: 'success'|'warning'|'danger', title, text }]
  // Backend auto-generates based on threshold rules
  const fetchInsights = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats/performance/insights`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      } else {
        console.log('fetchInsights failed:', res.status);
      }
    } catch (e) {
      console.log('fetchInsights error:', e);
    }
  };

  // ── FETCH ALL ON VISIBLE ──
  useEffect(() => {
    if (!visible) return;
    const loadAll = async () => {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      await Promise.all([
        fetchOverview(token),
        fetchFeatures(token),
        fetchMealTimes(token),
        fetchFunnel(token),
        fetchTopFoods(token),
        fetchInsights(token),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [visible]);

  const maxMealTimePct = mealTimes.length > 0
    ? Math.max(...mealTimes.map(m => m.pct))
    : 1;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── LOADING STATE ── */}
        {loading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading performance data...</Text>
          </View>
        )}

        {/* ── MINI STATS ROW ── */}
        {/* Endpoint: GET /admin/stats/performance/overview */}
        <View style={styles.miniStatsRow}>
          {[
            { value: `${overview.dau_mau_ratio}%`,          label: 'DAU/MAU ratio'   },
            { value: `${overview.avg_daily_usage_mins} min`, label: 'Avg daily usage' },
          ].map(s => (
            <View key={s.label} style={styles.miniStat}>
              <Text style={styles.miniVal}>{s.value}</Text>
              <Text style={styles.miniLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── FEATURE USAGE ── */}
        {/* Endpoint: GET /admin/stats/performance/features?days=30 */}
        {/* Backend returns feature as AppFeature enum value e.g. 'meal_logger' */}
        {/* Display label maps enum to readable name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feature usage (last 30 days)</Text>
          <Text style={styles.cardSub}>% of active users who used each feature</Text>
          {features.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No feature data yet</Text>
          ) : (
            features.map(f => {
              const label = f.feature
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
              return (
                <View key={f.feature} style={styles.featRow}>
                  <Text style={styles.featName}>{label}</Text>
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
              );
            })
          )}
        </View>

        {/* ── MEAL LOGGING BY TIME OF DAY ── */}
        {/* Endpoint: GET /admin/stats/performance/meal-times */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal logging by time of day</Text>
          <Text style={styles.cardSub}>Average meals logged per hour</Text>
          {mealTimes.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No meal time data yet</Text>
          ) : (
            <>
              <View style={styles.timeChartRow}>
                {mealTimes.map(t => (
                  <View key={t.hour} style={styles.timeCol}>
                    <Text style={styles.timeVal}>{t.pct}%</Text>
                    <View style={[
                      styles.timeBar,
                      {
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
            </>
          )}
        </View>

        {/* ── USER ONBOARDING DROP-OFF FUNNEL ── */}
        {/* Endpoint: GET /admin/stats/performance/funnel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User onboarding drop-off</Text>
          <Text style={styles.cardSub}>Where new users stop in the signup flow</Text>
          {funnel.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No funnel data yet</Text>
          ) : (
            funnel.map(f => (
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
            ))
          )}
        </View>

        {/* ── TOP 10 MOST LOGGED FOODS ── */}
        {/* Endpoint: GET /admin/stats/performance/top-foods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top 10 most logged foods</Text>
          <Text style={styles.cardSub}>Most frequently added to meal logs this month</Text>
          {topFoods.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No meal logs this month yet</Text>
          ) : (
            (() => {
              const maxLogs = topFoods.length > 0 ? topFoods[0].logs : 1;
              const getRankLabel = (rank: number): string => {
                if (rank === 1) return '🥇';
                if (rank === 2) return '🥈';
                if (rank === 3) return '🥉';
                return String(rank);
              };
              const getFoodBarColor = (rank: number): string => {
                if (rank <= 2) return '#10b981';
                if (rank <= 5) return '#6ee7b7';
                if (rank <= 7) return '#d1fae5';
                return '#e5e7eb';
              };
              return topFoods.map(food => (
                <View key={`top-food-${food.rank}`} style={styles.foodRow}>
                  <Text style={[
                    styles.foodRank,
                    food.rank <= 3 ? styles.foodRankMedal : styles.foodRankOther
                  ]}>
                    {getRankLabel(food.rank)}
                  </Text>
                  <View style={[styles.foodEmoji, { backgroundColor: food.emoji_bg }]}>
                    <Text style={styles.foodEmojiText}>{food.emoji}</Text>
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
                    <View style={styles.foodBarWrap}>
                      <View style={[
                        styles.foodBar,
                        {
                          width: `${Math.round((food.logs / maxLogs) * 100)}%`,
                          backgroundColor: getFoodBarColor(food.rank),
                        }
                      ]} />
                    </View>
                  </View>
                  <View style={styles.foodCountWrap}>
                    <Text style={styles.foodCount}>{food.logs.toLocaleString()}</Text>
                    <Text style={styles.foodUnit}>logs</Text>
                  </View>
                </View>
              ));
            })()
          )}
        </View>

        {/* ── KEY INSIGHTS ── */}
        {/* Endpoint: GET /admin/stats/performance/insights */}
        {/* Backend auto-generates insights based on threshold rules */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Key insights</Text>
          {insights.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No insights yet — data will appear as users engage</Text>
          ) : (
            insights.map((ins, index) => {
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
                    <Text style={[styles.insightTitle, { color: style.titleColor }]}>
                      {ins.title}
                    </Text>
                    <Text style={styles.insightText}>{ins.text}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },

  loadingBox: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#9ca3af' },
  emptyText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },

  miniStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  miniStat: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981', alignItems: 'center',
  },
  miniVal: { fontSize: 16, fontWeight: '700', color: '#111827' },
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

  featRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  featName: { fontSize: 11, color: '#374151', width: 110, flexShrink: 0 },
  featBarWrap: {
    flex: 1, height: 8, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden',
  },
  featBar: { height: '100%', borderRadius: 4 },
  featPct: {
    fontSize: 11, fontWeight: '700', color: '#111827',
    width: 34, textAlign: 'right', flexShrink: 0,
  },

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
  timeHint: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4 },

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

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, padding: 12,
    borderLeftWidth: 3, marginBottom: 8,
  },
  insightIcon: { fontSize: 16, flexShrink: 0 },
  insightTitle: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  insightText: { fontSize: 11, color: '#374151', lineHeight: 16 },

  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  foodRank: { width: 22, textAlign: 'center', flexShrink: 0 },
  foodRankMedal: { fontSize: 14 },
  foodRankOther: { fontSize: 12, fontWeight: '700', color: '#d1d5db' },
  foodEmoji: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  foodEmojiText: { fontSize: 16 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 11, fontWeight: '700', color: '#111827', marginBottom: 4 },
  foodBarWrap: {
    height: 6, backgroundColor: '#f3f4f6',
    borderRadius: 3, overflow: 'hidden',
  },
  foodBar: { height: '100%', borderRadius: 3 },
  foodCountWrap: { alignItems: 'flex-end', flexShrink: 0, width: 36 },
  foodCount: { fontSize: 11, fontWeight: '700', color: '#111827' },
  foodUnit: { fontSize: 9, color: '#9ca3af', marginTop: 1 },
});