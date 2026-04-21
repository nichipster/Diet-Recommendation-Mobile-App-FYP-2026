import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { API_URL } from '../../constants/api';

// ── FALLBACK DATA ──
// These values show while backend is not yet connected.
// When backend is ready fetch functions will replace these with real data.

// TODO (Backend): Replace with GET /admin/integrations/spoonacular/status
// Returns: {
//   connected: boolean,
//   last_checked: string (ISO date),
//   error_message: string | null
// }
const FALLBACK_STATUS = {
  connected: true,
  last_checked: new Date(Date.now() - 2 * 60000).toISOString(),
  error_message: null,
};

// TODO (Backend): Replace with GET /admin/integrations/spoonacular/usage
// Returns: {
//   daily_limit: number,
//   daily_calls: array of { day: string, calls: number } for last 7 days
// }
const FALLBACK_USAGE = {
  daily_limit: 150,
  daily_calls: [
    { day: 'Mon', calls: 62  },
    { day: 'Tue', calls: 98  },
    { day: 'Wed', calls: 143 },
    { day: 'Thu', calls: 150 },
    { day: 'Fri', calls: 112 },
    { day: 'Sat', calls: 78  },
    { day: 'Today', calls: 87 },
  ],
};

// TODO (Backend): Replace with GET /admin/integrations/spoonacular/top-foods
// Returns: array of { rank: number, name: string, calls: number }
// Top 10 most frequently fetched foods from Spoonacular this month
// Backend tracks this by logging every Spoonacular API call with the food/recipe name
const FALLBACK_TOP_FOODS = [
  { rank: 1,  name: 'Grilled Chicken Salad', calls: 284 },
  { rank: 2,  name: 'Salmon Rice Bowl',       calls: 249 },
  { rank: 3,  name: 'Egg Omelette',           calls: 216 },
  { rank: 4,  name: 'Avocado Toast',          calls: 193 },
  { rank: 5,  name: 'Brown Rice Bowl',        calls: 171 },
  { rank: 6,  name: 'Greek Yoghurt',          calls: 148 },
  { rank: 7,  name: 'Turkey Wrap',            calls: 127 },
  { rank: 8,  name: 'Beef Stir Fry',          calls: 108 },
  { rank: 9,  name: 'Tuna Pasta Salad',       calls: 86  },
  { rank: 10, name: 'Quinoa Bowl',            calls: 62  },
];

type StatusData  = typeof FALLBACK_STATUS;
type UsageData   = typeof FALLBACK_USAGE;
type FoodItem    = typeof FALLBACK_TOP_FOODS[0];

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── BAR COLOUR based on calls vs daily limit ──
const getBarColor = (calls: number, limit: number): string => {
  const pct = calls / limit;
  if (pct >= 1)    return '#ef4444'; // hit limit
  if (pct >= 0.85) return '#f59e0b'; // near limit
  return '#10b981';                  // normal
};

// ── FOOD BAR COLOUR based on rank ──
const getFoodBarColor = (rank: number): string => {
  if (rank <= 2) return '#10b981';
  if (rank <= 5) return '#6ee7b7';
  if (rank <= 7) return '#d1fae5';
  return '#e5e7eb';
};

const timeAgo = (dateStr: string): string => {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(diff / 3600000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
};

export default function APIIntegrationsScreen({ visible, onClose }: Props) {
  const [status, setStatus]     = useState<StatusData>(FALLBACK_STATUS);
  const [usage, setUsage]       = useState<UsageData>(FALLBACK_USAGE);
  const [topFoods, setTopFoods] = useState<FoodItem[]>(FALLBACK_TOP_FOODS);
  const [testing, setTesting]   = useState(false);

  // ── FETCH ALL DATA ──
  // TODO (Backend): Uncomment all fetch functions and useEffect when backend is ready

  // Endpoint: GET /admin/integrations/spoonacular/status
  // const fetchStatus = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/integrations/spoonacular/status`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setStatus(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchStatus error:', e);
  //   }
  // };

  // Endpoint: GET /admin/integrations/spoonacular/usage
  // const fetchUsage = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/integrations/spoonacular/usage`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setUsage(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchUsage error:', e);
  //   }
  // };

  // Endpoint: GET /admin/integrations/spoonacular/top-foods
  // const fetchTopFoods = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/integrations/spoonacular/top-foods`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setTopFoods(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchTopFoods error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment when backend is ready
  // useEffect(() => {
  //   if (visible) {
  //     fetchStatus();
  //     fetchUsage();
  //     fetchTopFoods();
  //   }
  // }, [visible]);

  // ── TEST CONNECTION ──
  // TODO (Backend): Uncomment API call and remove dummy response when backend is ready
  // Endpoint: POST /admin/integrations/spoonacular/test
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: { success: boolean, response_time_ms: number, error: string | null }
  // Backend pings Spoonacular with a lightweight request and returns the result
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // TODO (Backend): Replace below with API call
      // const res = await fetch(`${API_URL}/admin/integrations/spoonacular/test`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${adminToken}` },
      // });
      // if (res.ok) {
      //   const data = await res.json();
      //   if (data.success) {
      //     setStatus(prev => ({ ...prev, connected: true, last_checked: new Date().toISOString(), error_message: null }));
      //     Alert.alert('Connection Successful ✅', `Spoonacular API responded in ${data.response_time_ms}ms`);
      //   } else {
      //     setStatus(prev => ({ ...prev, connected: false, error_message: data.error }));
      //     Alert.alert('Connection Failed ❌', data.error || 'Could not reach Spoonacular API');
      //   }
      // }

      // Temporary dummy response — remove when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus(prev => ({
        ...prev,
        connected: true,
        last_checked: new Date().toISOString(),
        error_message: null,
      }));
      Alert.alert('Connection Successful ✅', 'Spoonacular API is reachable and responding normally.');
    } catch (e) {
      Alert.alert('Error', 'Could not complete the connection test. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  // ── MAX CALLS for bar chart scaling ──
  const maxCalls = Math.max(...usage.daily_calls.map(d => d.calls), usage.daily_limit);

  // ── MAX FOOD CALLS for horizontal bar scaling ──
  const maxFoodCalls = topFoods.length > 0 ? topFoods[0].calls : 1;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── STATUS BANNER ── */}
        {/* TODO (Backend): Data from GET /admin/integrations/spoonacular/status */}
        <View style={[
          styles.statusBanner,
          status.connected ? styles.statusBannerGreen : styles.statusBannerRed,
        ]}>
          <View style={styles.statusLeft}>
            <View style={[
              styles.statusDot,
              { backgroundColor: status.connected ? '#10b981' : '#ef4444' },
            ]} />
            <View>
              <Text style={[
                styles.statusTitle,
                { color: status.connected ? '#065f46' : '#991b1b' }
              ]}>
                Spoonacular API
              </Text>
              <Text style={styles.statusSub}>
                {status.connected
                  ? `Last checked ${timeAgo(status.last_checked)}`
                  : status.error_message || 'Connection failed — check API key'}
              </Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            status.connected ? styles.statusBadgeGreen : styles.statusBadgeRed,
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: status.connected ? '#065f46' : '#991b1b' }
            ]}>
              {status.connected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        {/* ── DAILY API CALLS CHART ── */}
        {/* TODO (Backend): Data from GET /admin/integrations/spoonacular/usage */}
        {/* Returns daily_limit and daily_calls array for last 7 days */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily API calls (last 7 days)</Text>
          <Text style={styles.cardSub}>
            Daily limit: {usage.daily_limit} calls — dashed line shows limit
          </Text>

          <View style={styles.chartWrap}>
            {/* Dashed limit line */}
            <View style={[
              styles.limitLine,
              {
                bottom: Math.round(
                  (usage.daily_limit / maxCalls) * CHART_HEIGHT
                ),
              }
            ]}>
              <Text style={styles.limitLabel}>{usage.daily_limit} limit</Text>
            </View>

            {/* Bars */}
            <View style={styles.barChart}>
              {usage.daily_calls.map(d => {
                const barH = Math.round((d.calls / maxCalls) * CHART_HEIGHT);
                const color = getBarColor(d.calls, usage.daily_limit);
                return (
                  <View key={d.day} style={styles.barCol}>
                    <Text style={styles.barVal}>{d.calls}</Text>
                    <View style={[
                      styles.barFill,
                      { height: barH, backgroundColor: color }
                    ]} />
                    <Text style={styles.barLbl}>{d.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            {[
              { color: '#10b981', label: 'Normal'     },
              { color: '#f59e0b', label: 'Near limit'  },
              { color: '#ef4444', label: 'Hit limit'   },
            ].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── TOP 10 MOST REQUESTED FOODS ── */}
        {/* TODO (Backend): Data from GET /admin/integrations/spoonacular/top-foods */}
        {/* Backend logs every Spoonacular API call with the food/recipe name */}
        {/* Returns top 10 sorted by call count descending */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top 10 most requested foods</Text>
          <Text style={styles.cardSub}>
            Most frequently fetched from Spoonacular this month
          </Text>
          {topFoods.map(food => (
            <View key={food.rank} style={styles.foodRow}>
              <Text style={styles.foodRank}>{food.rank}</Text>
              <Text style={styles.foodName} numberOfLines={1}>
                {food.name}
              </Text>
              <View style={styles.foodBarWrap}>
                <View style={[
                  styles.foodBar,
                  {
                    width: `${Math.round((food.calls / maxFoodCalls) * 100)}%`,
                    backgroundColor: getFoodBarColor(food.rank),
                  }
                ]} />
              </View>
              <Text style={styles.foodCount}>{food.calls}</Text>
            </View>
          ))}
        </View>

        {/* ── TEST CONNECTION BUTTON ── */}
        {/* TODO (Backend): Calls POST /admin/integrations/spoonacular/test */}
        {/* Backend pings Spoonacular with a lightweight request */}
        {/* Returns { success: boolean, response_time_ms: number, error: string | null } */}
        <TouchableOpacity
          style={[styles.testBtn, testing && styles.testBtnDisabled]}
          onPress={handleTestConnection}
          disabled={testing}
          activeOpacity={0.85}
        >
          {testing ? (
            <View style={styles.testBtnInner}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.testBtnText}>Testing connection...</Text>
            </View>
          ) : (
            <Text style={styles.testBtnText}>🔌 Test Connection</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const CHART_HEIGHT = 100;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },

  // ── Status banner ──
  statusBanner: {
    borderRadius: 14, padding: 12, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1,
  },
  statusBannerGreen: { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' },
  statusBannerRed:   { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: {
    width: 10, height: 10, borderRadius: 5, flexShrink: 0,
  },
  statusTitle: { fontSize: 13, fontWeight: '700' },
  statusSub:   { fontSize: 10, color: '#6b7280', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, flexShrink: 0,
  },
  statusBadgeGreen: { backgroundColor: '#d1fae5' },
  statusBadgeRed:   { backgroundColor: '#fee2e2' },
  statusBadgeText:  { fontSize: 11, fontWeight: '700' },

  // ── Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSub:   { fontSize: 11, color: '#6b7280', marginBottom: 14 },

  // ── Bar chart ──
  chartWrap: {
    position: 'relative',
    height: CHART_HEIGHT + 32,
    marginBottom: 10,
  },
  limitLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 1.5, borderTopColor: '#ef4444',
    borderStyle: 'dashed',
  },
  limitLabel: {
    position: 'absolute', right: 0,
    fontSize: 8, color: '#ef4444', fontWeight: '700',
    top: -12,
  },
  barChart: {
    position: 'absolute', bottom: 20,
    left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end',
    height: CHART_HEIGHT, gap: 5,
  },
  barCol: {
    flex: 1, alignItems: 'center',
    justifyContent: 'flex-end', height: '100%',
  },
  barVal: { fontSize: 8, color: '#6b7280', marginBottom: 3 },
  barFill: { width: '100%', borderRadius: 4, minHeight: 3 },
  barLbl: {
    fontSize: 8, color: '#9ca3af',
    position: 'absolute', bottom: -16,
    textAlign: 'center',
  },

  // ── Legend ──
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 9, color: '#6b7280' },

  // ── Top foods ──
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 10,
  },
  foodRank: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    width: 18, textAlign: 'center', flexShrink: 0,
  },
  foodName: {
    fontSize: 11, color: '#374151',
    width: 100, flexShrink: 0,
  },
  foodBarWrap: {
    flex: 1, height: 7, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden',
  },
  foodBar: { height: '100%', borderRadius: 4 },
  foodCount: {
    fontSize: 11, fontWeight: '600', color: '#111827',
    width: 28, textAlign: 'right', flexShrink: 0,
  },

  // ── Test button ──
  testBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: '#10b981', backgroundColor: '#f0fdf4',
  },
  testBtnDisabled: { opacity: 0.6 },
  testBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testBtnText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
});