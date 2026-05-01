import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/api';

type StatusData = {
  connected: boolean;
  last_checked: string;
  error_message: string | null;
};

type UsageDayItem = {
  day: string;
  calls: number;
};

type UsageData = {
  daily_limit: number;
  daily_calls: UsageDayItem[];
};

type FoodItem = {
  rank: number;
  name: string;
  calls: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FALLBACK_STATUS: StatusData = {
  connected: false,
  last_checked: new Date().toISOString(),
  error_message: null,
};

const FALLBACK_USAGE: UsageData = {
  daily_limit: 150,
  daily_calls: [],
};

const FALLBACK_TOP_FOODS: FoodItem[] = [];

// ── BAR COLOUR based on calls vs daily limit ──
const getBarColor = (calls: number, limit: number): string => {
  const pct = calls / limit;
  if (pct >= 1)    return '#ef4444';
  if (pct >= 0.85) return '#f59e0b';
  return '#10b981';
};

// ── FOOD BAR COLOUR based on rank ──
const getFoodBarColor = (rank: number): string => {
  if (rank <= 2) return '#10b981';
  if (rank <= 5) return '#6ee7b7';
  if (rank <= 7) return '#d1fae5';
  return '#e5e7eb';
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
};

export default function APIIntegrationsScreen({ visible, onClose }: Props) {
  const [status, setStatus]     = useState<StatusData>(FALLBACK_STATUS);
  const [usage, setUsage]       = useState<UsageData>(FALLBACK_USAGE);
  const [topFoods, setTopFoods] = useState<FoodItem[]>(FALLBACK_TOP_FOODS);
  const [loading, setLoading]   = useState(false);
  const [testing, setTesting]   = useState(false);

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH STATUS ──
  // Endpoint: GET /admin/integrations/spoonacular/status
  // Returns: { connected, last_checked, error_message }
  // Reads the most recent spoonacular_api_log entry to determine connection state
  const fetchStatus = async (token: string) => {
    try {
      const res = await fetch(
        `${API_URL}/admin/integrations/spoonacular/status`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        console.log('fetchStatus failed:', res.status);
      }
    } catch (e) {
      console.log('fetchStatus error:', e);
    }
  };

  // ── FETCH USAGE ──
  // Endpoint: GET /admin/integrations/spoonacular/usage
  // Returns: { daily_limit: 150, daily_calls: [{ day, calls }] }
  // daily_calls covers the last 7 days using SG timezone
  const fetchUsage = async (token: string) => {
    try {
      const res = await fetch(
        `${API_URL}/admin/integrations/spoonacular/usage`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      } else {
        console.log('fetchUsage failed:', res.status);
      }
    } catch (e) {
      console.log('fetchUsage error:', e);
    }
  };

  // ── FETCH TOP FOODS ──
  // Endpoint: GET /admin/integrations/spoonacular/top-foods
  // Returns: [{ rank, name, calls }] top 10 sorted by call count descending
  // Backend counts calls per food_name in spoonacular_api_log table
  const fetchTopFoods = async (token: string) => {
    try {
      const res = await fetch(
        `${API_URL}/admin/integrations/spoonacular/top-foods`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
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
        fetchStatus(token),
        fetchUsage(token),
        fetchTopFoods(token),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [visible]);

  // ── TEST CONNECTION ──
  // Endpoint: POST /admin/integrations/spoonacular/test
  // Backend pings Spoonacular with search_ingredients("apple", number=1)
  // Returns: { success: boolean, response_time_ms: number, error: string | null }
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${API_URL}/admin/integrations/spoonacular/test`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatus(prev => ({
            ...prev,
            connected: true,
            last_checked: new Date().toISOString(),
            error_message: null,
          }));
          Alert.alert(
            'Connection Successful ✅',
            `Spoonacular API responded in ${data.response_time_ms}ms`
          );
        } else {
          setStatus(prev => ({
            ...prev,
            connected: false,
            error_message: data.error,
          }));
          Alert.alert(
            'Connection Failed ❌',
            data.error || 'Could not reach Spoonacular API'
          );
        }
      } else {
        Alert.alert('Error', 'Test request failed. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not complete the connection test. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const maxCalls     = Math.max(...usage.daily_calls.map(d => d.calls), usage.daily_limit, 1);
  const maxFoodCalls = topFoods.length > 0 ? topFoods[0].calls : 1;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── LOADING STATE ── */}
        {loading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading integration data...</Text>
          </View>
        )}

        {/* ── STATUS BANNER ── */}
        {/* Endpoint: GET /admin/integrations/spoonacular/status */}
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
        {/* Endpoint: GET /admin/integrations/spoonacular/usage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily API calls (last 7 days)</Text>
          <Text style={styles.cardSub}>
            Daily limit: {usage.daily_limit} calls — dashed line shows limit
          </Text>

          {usage.daily_calls.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No API calls logged yet</Text>
          ) : (
            <>
              <View style={styles.chartWrap}>
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
                <View style={styles.barChart}>
                  {usage.daily_calls.map(d => {
                    const barH = Math.round((d.calls / maxCalls) * CHART_HEIGHT);
                    const color = getBarColor(d.calls, usage.daily_limit);
                    return (
                      <View key={d.day} style={styles.barCol}>
                        <Text style={styles.barVal}>{d.calls}</Text>
                        <View style={[
                          styles.barFill,
                          { height: Math.max(barH, 3), backgroundColor: color }
                        ]} />
                        <Text style={styles.barLbl}>{d.day}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.legendRow}>
                {[
                  { color: '#10b981', label: 'Normal'    },
                  { color: '#f59e0b', label: 'Near limit' },
                  { color: '#ef4444', label: 'Hit limit'  },
                ].map(l => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.legendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── TOP 10 MOST REQUESTED FOODS ── */}
        {/* Endpoint: GET /admin/integrations/spoonacular/top-foods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top 10 most requested foods</Text>
          <Text style={styles.cardSub}>
            Most frequently fetched from Spoonacular this month
          </Text>
          {topFoods.length === 0 && !loading ? (
            <Text style={styles.emptyText}>
              No Spoonacular food searches yet
            </Text>
          ) : (
            topFoods.map(food => (
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
            ))
          )}
        </View>

        {/* ── TEST CONNECTION BUTTON ── */}
        {/* Endpoint: POST /admin/integrations/spoonacular/test */}
        {/* Backend pings Spoonacular and returns success + response_time_ms */}
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

  loadingBox: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#9ca3af' },
  emptyText: {
    fontSize: 12, color: '#9ca3af',
    textAlign: 'center', paddingVertical: 12,
  },

  statusBanner: {
    borderRadius: 14, padding: 12, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1,
  },
  statusBannerGreen: { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' },
  statusBannerRed:   { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  statusTitle: { fontSize: 13, fontWeight: '700' },
  statusSub:   { fontSize: 10, color: '#6b7280', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, flexShrink: 0,
  },
  statusBadgeGreen: { backgroundColor: '#d1fae5' },
  statusBadgeRed:   { backgroundColor: '#fee2e2' },
  statusBadgeText:  { fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSub:   { fontSize: 11, color: '#6b7280', marginBottom: 14 },

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

  legendRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 9, color: '#6b7280' },

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

  testBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: '#10b981', backgroundColor: '#f0fdf4',
  },
  testBtnDisabled: { opacity: 0.6 },
  testBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testBtnText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
});