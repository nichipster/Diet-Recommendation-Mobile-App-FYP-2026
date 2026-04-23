import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookings } from '../../context/BookingContext';
import { useContent } from '../../context/ContentContext';

// ─── Dummy extra bookings to flesh out the chart ─────────────────────────────
// Remove these when real API data is available
// THIS IS FOR BOOKING HISTORY AND CONSULTATIONS
const EXTRA_DUMMY_BOOKINGS = [
  { id: 901, user: 'Alice Tan',   initials: 'AT', date: '2026-01-05', time: '10:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 902, user: 'Ben Lim',     initials: 'BL', date: '2026-01-14', time: '11:00', status: 'confirmed', topic: 'Muscle gain',     nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 903, user: 'Clara Ng',    initials: 'CN', date: '2026-01-20', time: '14:00', status: 'confirmed', topic: 'Diabetes',        nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 904, user: 'David Koh',   initials: 'DK', date: '2026-02-03', time: '09:00', status: 'confirmed', topic: 'Sports nutrition',nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 905, user: 'Eva Goh',     initials: 'EG', date: '2026-02-10', time: '10:00', status: 'confirmed', topic: 'Meal planning',   nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 906, user: 'Frank Yeo',   initials: 'FY', date: '2026-02-18', time: '13:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 907, user: 'Grace Tan',   initials: 'GT', date: '2026-02-25', time: '15:00', status: 'confirmed', topic: 'Vegan diet',      nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 908, user: 'Henry Lim',   initials: 'HL', date: '2026-03-04', time: '10:00', status: 'confirmed', topic: 'Gut health',      nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 909, user: 'Iris Ng',     initials: 'IN', date: '2026-03-11', time: '11:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 910, user: 'Jack Koh',    initials: 'JK', date: '2026-03-15', time: '14:00', status: 'confirmed', topic: 'Sports nutrition',nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 911, user: 'Karen Goh',   initials: 'KG', date: '2026-03-22', time: '09:00', status: 'confirmed', topic: 'Diabetes',        nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 912, user: 'Leon Tan',    initials: 'LT', date: '2026-03-28', time: '10:00', status: 'confirmed', topic: 'Meal planning',   nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 913, user: 'Mia Lim',     initials: 'ML', date: '2026-04-02', time: '13:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 914, user: 'Nathan Yeo',  initials: 'NY', date: '2026-04-08', time: '15:00', status: 'confirmed', topic: 'Vegan diet',      nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 915, user: 'Olivia Tan',  initials: 'OT', date: '2026-04-15', time: '10:00', status: 'confirmed', topic: 'Muscle gain',     nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Dummy client meal data for adherence ─────────────────────────────────────
// Replace with real API data later — GET /nutritionist/clients/{id}/meals
import { MOCK_CLIENT_DATA } from './ViewProgressReport';

const TOTAL_DAYS = 30;

const GOAL_LABELS: Record<string, string> = {
  lose: 'Weight Loss', gain: 'Muscle Gain', maintain: 'Maintenance'
};

export default function ClientEngagementAnalysis({ onBack }: { onBack?: () => void }) {
  const { bookings } = useBookings();

  // Merge real + dummy bookings
  const allBookings = useMemo(() => [...bookings, ...EXTRA_DUMMY_BOOKINGS], [bookings]);

  const confirmedBookings = useMemo(
    () => allBookings.filter(b => b.status === 'confirmed'),
    [allBookings]
  );

  // ── Stat calculations ────────────────────────────────────────────────────

  const totalClients = useMemo(
    () => new Set(confirmedBookings.map(b => b.user)).size,
    [confirmedBookings]
  );

  const totalConsultations = confirmedBookings.length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthConsultations = useMemo(
    () => confirmedBookings.filter(b => {
      const d = new Date(b.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length,
    [confirmedBookings, currentMonth, currentYear]
  );

  const thisMonthClients = useMemo(
    () => new Set(
      confirmedBookings
        .filter(b => {
          const d = new Date(b.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .map(b => b.user)
    ).size,
    [confirmedBookings, currentMonth, currentYear]
  );

  // ── Monthly bar chart data (last 6 months) ───────────────────────────────

  const monthlyData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const count = confirmedBookings.filter(b => {
        const bd = new Date(b.date);
        return bd.getMonth() === m && bd.getFullYear() === y;
      }).length;
      result.push({ label: MONTH_LABELS[m], count });
    }
    return result;
  }, [confirmedBookings, currentMonth, currentYear]);

  const maxCount = Math.max(...monthlyData.map(d => d.count), 1);

  // ── Pending & declined ───────────────────────────────────────────────────

  const pendingCount = allBookings.filter(b => b.status === 'pending').length;
  const declinedCount = allBookings.filter(b => b.status === 'declined').length;

  // ── Adherence calculations ────────────────────────────────────────────────

  const clientAdherenceList = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastWeekStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
      .toISOString().split('T')[0];
    const prevWeekStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14)
      .toISOString().split('T')[0];

    return Object.entries(MOCK_CLIENT_DATA).map(([id, client]) => {
      const monthMeals = client.meals.filter(
        m => new Date(m.date).getMonth() === currentMonth
      );
      const daysLoggedThisMonth = new Set(monthMeals.map(m => m.date)).size;

      const lastWeekDays = new Set(
        client.meals.filter(m => m.date > lastWeekStr && m.date <= todayStr).map(m => m.date)
      ).size;
      const prevWeekDays = new Set(
        client.meals.filter(m => m.date > prevWeekStr && m.date <= lastWeekStr).map(m => m.date)
      ).size;

      const adherencePct = Math.round((daysLoggedThisMonth / TOTAL_DAYS) * 100);
      const lastWeekPct = Math.round((lastWeekDays / 7) * 100);
      const prevWeekPct = Math.round((prevWeekDays / 7) * 100);
      const delta = lastWeekPct - prevWeekPct;

      return {
        id,
        name: client.name,
        goal: GOAL_LABELS[client.goal] ?? client.goal,
        daysLoggedThisMonth,
        adherencePct,
        delta,
      };
    });
  }, [currentMonth]);

  const avgAdherence = useMemo(() => {
    const total = clientAdherenceList.reduce((sum, c) => sum + c.adherencePct, 0);
    return Math.round(total / clientAdherenceList.length);
  }, [clientAdherenceList]);

  const avgDelta = useMemo(() => {
    const total = clientAdherenceList.reduce((sum, c) => sum + c.delta, 0);
    return Math.round(total / clientAdherenceList.length);
  }, [clientAdherenceList]);

  // ── Content engagement ────────────────────────────────────────────────────
  const { articles, tips, advice } = useContent();

  const totalContentViews = useMemo(() =>
    [...articles, ...tips, ...advice].reduce((sum, item) => sum + item.views, 0),
  [articles, tips, advice]);

  const topArticles = useMemo(() =>
    [...articles].sort((a, b) => b.views - a.views).slice(0, 3),
  [articles]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Client Engagement</Text>
          <Text style={s.headerSub}>Consultation analytics overview</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── STAT CARDS ── */}
        <Text style={s.sectionLabel}>OVERVIEW</Text>
        <View style={s.statsGrid}>
          <View style={[s.statCard, { borderTopColor: '#10b981' }]}>
            <Text style={s.statValue}>{totalClients}</Text>
            <Text style={s.statLabel}>Total Clients</Text>
            <Text style={s.statSub}>All time</Text>
          </View>
          <View style={[s.statCard, { borderTopColor: '#3b82f6' }]}>
            <Text style={s.statValue}>{totalConsultations}</Text>
            <Text style={s.statLabel}>Confirmed Sessions</Text>
            <Text style={s.statSub}>All time</Text>
          </View>
          <View style={[s.statCard, { borderTopColor: '#f59e0b' }]}>
            <Text style={s.statValue}>{thisMonthClients}</Text>
            <Text style={s.statLabel}>Active Clients</Text>
            <Text style={s.statSub}>This month</Text>
          </View>
          <View style={[s.statCard, { borderTopColor: '#8b5cf6' }]}>
            <Text style={s.statValue}>{thisMonthConsultations}</Text>
            <Text style={s.statLabel}>Sessions</Text>
            <Text style={s.statSub}>This month</Text>
          </View>
        </View>

        {/* ── STATUS BREAKDOWN ── */}
        <Text style={s.sectionLabel}>BOOKING STATUS</Text>
        <View style={s.sectionCard}>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: '#10b981' }]} />
            <Text style={s.statusText}>Confirmed</Text>
            <Text style={s.statusCount}>{totalConsultations}</Text>
          </View>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={s.statusText}>Pending</Text>
            <Text style={s.statusCount}>{pendingCount}</Text>
          </View>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: '#ef4444' }]} />
            <Text style={s.statusText}>Declined / Cancelled</Text>
            <Text style={s.statusCount}>{declinedCount}</Text>
          </View>
        </View>

        {/* ── MONTHLY BAR CHART ── */}
        <Text style={s.sectionLabel}>CONSULTATIONS PER MONTH</Text>
        <View style={s.sectionCard}>
          <Text style={s.chartTitle}>Last 6 months · confirmed sessions</Text>
          <View style={s.chartArea}>
            {monthlyData.map((item, index) => {
              const barHeight = Math.max((item.count / maxCount) * 120, 4);
              const isCurrentMonth = index === monthlyData.length - 1;
              return (
                <View key={item.label} style={s.barCol}>
                  <Text style={s.barValue}>{item.count}</Text>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.bar,
                        { height: barHeight },
                        isCurrentMonth ? s.barActive : s.barInactive
                      ]}
                    />
                  </View>
                  <Text style={[s.barLabel, isCurrentMonth && s.barLabelActive]}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── CUMULATIVE GROWTH ── */}
        <Text style={s.sectionLabel}>CUMULATIVE CLIENT GROWTH</Text>
        <View style={s.sectionCard}>
          <Text style={s.chartTitle}>Unique clients over last 6 months</Text>
          <View style={s.chartArea}>
            {useMemo(() => {
              const result = [];
              let cumulative = new Set<string>();
              for (let i = 5; i >= 0; i--) {
                const d = new Date(currentYear, currentMonth - i, 1);
                const m = d.getMonth();
                const y = d.getFullYear();
                confirmedBookings
                  .filter(b => {
                    const bd = new Date(b.date);
                    return bd.getMonth() === m && bd.getFullYear() === y;
                  })
                  .forEach(b => cumulative.add(b.user));
                result.push({ label: MONTH_LABELS[m], count: cumulative.size });
              }
              return result;
            }, [confirmedBookings, currentMonth, currentYear]).map((item, index, arr) => {
              const barHeight = Math.max((item.count / Math.max(...arr.map(a => a.count), 1)) * 120, 4);
              const isCurrentMonth = index === arr.length - 1;
              return (
                <View key={item.label} style={s.barCol}>
                  <Text style={s.barValue}>{item.count}</Text>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.bar,
                        { height: barHeight },
                        isCurrentMonth ? s.barActive : s.barInactive
                      ]}
                    />
                  </View>
                  <Text style={[s.barLabel, isCurrentMonth && s.barLabelActive]}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── GOAL ADHERENCE ── */}
        <Text style={s.sectionLabel}>GOAL ADHERENCE</Text>
        <View style={s.adherenceSummaryCard}>
          <View style={s.adherenceSummaryLeft}>
            <Text style={s.adherenceSummaryValue}>{avgAdherence}%</Text>
            <Text style={s.adherenceSummaryLabel}>Avg adherence this month</Text>
          </View>
          <View style={[
            s.adherenceDeltaBadge,
            { backgroundColor: avgDelta >= 0 ? '#d1fae5' : '#fee2e2' }
          ]}>
            <Text style={[
              s.adherenceDeltaText,
              { color: avgDelta >= 0 ? '#059669' : '#dc2626' }
            ]}>
              {avgDelta >= 0 ? '▲' : '▼'} {Math.abs(avgDelta)}% vs last week
            </Text>
          </View>
        </View>

        <View style={s.sectionCard}>
          {clientAdherenceList.map((client, index) => (
            <View
              key={client.id}
              style={[
                s.adherenceRow,
                index < clientAdherenceList.length - 1 && s.adherenceRowBorder
              ]}
            >
              <View style={s.adherenceRowTop}>
                <View>
                  <Text style={s.adherenceClientName}>{client.name}</Text>
                  <Text style={s.adherenceClientGoal}>{client.goal}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.adherencePct}>{client.adherencePct}%</Text>
                  <Text style={[
                    s.adherenceDelta,
                    { color: client.delta >= 0 ? '#059669' : '#dc2626' }
                  ]}>
                    {client.delta >= 0 ? '▲' : '▼'} {Math.abs(client.delta)}% vs last week
                  </Text>
                </View>
              </View>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressBar,
                    { width: `${client.adherencePct}%` as any },
                    client.adherencePct >= 70
                      ? s.progressGreen
                      : client.adherencePct >= 40
                      ? s.progressAmber
                      : s.progressRed
                  ]}
                />
              </View>
              <Text style={s.adherenceDaysText}>
                {client.daysLoggedThisMonth} / {TOTAL_DAYS} days logged this month
              </Text>
            </View>
          ))}
        </View>

            {/* ── CONTENT ENGAGEMENT ── */}
<Text style={s.sectionLabel}>CONTENT ENGAGEMENT</Text>
<View style={[s.adherenceSummaryCard, { marginBottom: 10 }]}>
  <View style={s.adherenceSummaryLeft}>
    <Text style={s.adherenceSummaryValue}>{totalContentViews}</Text>
    <Text style={s.adherenceSummaryLabel}>Total content views</Text>
  </View>
</View>

<View style={s.sectionCard}>
  <Text style={s.chartTitle}>Top articles by views</Text>
  {topArticles.length === 0 ? (
    <Text style={{ color: '#9ca3af', fontSize: 13 }}>No views yet</Text>
  ) : (
    topArticles.map((article, index) => (
      <View
        key={article.id}
        style={[
          s.adherenceRow,
          index < topArticles.length - 1 && s.adherenceRowBorder
        ]}
      >
        <View style={s.adherenceRowTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.adherenceClientName}>{article.title}</Text>
            <Text style={s.adherenceClientGoal}>{article.category}</Text>
          </View>
          <Text style={s.adherencePct}>{article.views} views</Text>
        </View>
      </View>
    ))
  )}
</View>

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

  scroll: { paddingHorizontal: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#9ca3af',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 16, marginBottom: 8,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },

  statCard: {
    width: '47%', backgroundColor: '#fff',
    borderRadius: 12, padding: 14,
    borderTopWidth: 3,
    borderWidth: 0.5, borderColor: '#e5e7eb',
  },

  statValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 },
  statSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, borderWidth: 0.5, borderColor: '#e5e7eb',
  },

  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
  statusCount: { fontSize: 14, fontWeight: '700', color: '#111827' },

  chartTitle: { fontSize: 12, color: '#6b7280', marginBottom: 16 },

  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
  },

  barCol: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end',
  },

  barValue: {
    fontSize: 10, fontWeight: '700', color: '#374151', marginBottom: 4,
  },

  barTrack: {
    width: 28, backgroundColor: '#f3f4f6',
    borderRadius: 6, height: 120,
    justifyContent: 'flex-end', overflow: 'hidden',
  },

  bar: { width: '100%', borderRadius: 6 },
  barActive: { backgroundColor: '#10b981' },
  barInactive: { backgroundColor: '#d1fae5' },

  barLabel: {
    fontSize: 10, color: '#9ca3af',
    marginTop: 4, fontWeight: '500',
  },
  barLabelActive: { color: '#10b981', fontWeight: '700' },

  adherenceSummaryCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, borderWidth: 0.5, borderColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  adherenceSummaryLeft: { flex: 1 },
  adherenceSummaryValue: { fontSize: 32, fontWeight: '800', color: '#111827' },
  adherenceSummaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  adherenceDeltaBadge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  adherenceDeltaText: { fontSize: 12, fontWeight: '700' },

  adherenceRow: { paddingVertical: 14 },
  adherenceRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  adherenceRowTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  adherenceClientName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  adherenceClientGoal: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  adherencePct: { fontSize: 16, fontWeight: '800', color: '#111827' },
  adherenceDelta: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  progressTrack: {
    height: 8, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  progressBar: { height: '100%', borderRadius: 4 },
  progressGreen: { backgroundColor: '#10b981' },
  progressAmber: { backgroundColor: '#f59e0b' },
  progressRed: { backgroundColor: '#ef4444' },

  adherenceDaysText: { fontSize: 11, color: '#9ca3af' },
});
