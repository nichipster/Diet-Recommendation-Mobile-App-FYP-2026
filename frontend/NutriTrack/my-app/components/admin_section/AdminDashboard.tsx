import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Modal, Pressable, Dimensions, Alert
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SupportTicketAdmin from './SupportTicketAdmin';
import UserManagement from './UserManagement';
import FoodDatabase from './FoodDatabase';
import PerformanceScreen from './PerformanceScreen';
import NotificationsScreen from './NotificationsScreen';
import APIIntegrationsScreen from './APIIntegrationsScreen';
import AuditLogsScreen from './AuditLogsScreen';
import DataExportScreen from './DataExportScreen';
import { useUser } from '../../context/UserContext';
import { API_URL } from '../../constants/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type NavItem = {
  id: string;
  title: string;
  badge?: number;
  alert?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'dashboard', title: 'Dashboard' },
      { id: 'users',     title: 'User Management' },
    ]
  },
  {
    label: 'CONTENT',
    items: [
      { id: 'food', title: 'Food Database' },
    ]
  },
  {
    label: 'SUPPORT & COMMS',
    items: [
      { id: 'tickets',       title: 'Support Tickets' },
      { id: 'notifications', title: 'Notifications'   },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'performance',      title: 'Performance'      },
      { id: 'api_integrations', title: 'API Integrations' },
      { id: 'audit',            title: 'Audit Logs'       },
      { id: 'data_export',      title: 'Data Export'      },
    ]
  },
];

// ── FALLBACK DATA ──
// Shown while backend data is loading or if a fetch fails
const FALLBACK_STATS = {
  total_users: 0,
  active_users_30d: 0,
  premium_subscribers: 0,
  meals_logged_today: 0,
  new_users_this_month: 0,
  active_users_change_pct: 0,
  mrr: 0,
  meals_change_pct: 0,
};

const FALLBACK_GROWTH_DATA: { month: string; total: number; premium: number }[] = [];

const FALLBACK_SUB_DATA = {
  freemium: { label: 'Freemium', pct: 0, color: '#d1d5db', count: 0 },
  premium:  { label: 'Premium',  pct: 0, color: '#10b981', count: 0 },
  annual:   { label: 'Annual',   pct: 0, color: '#6ee7b7', count: 0 },
  mrr: 0,
  new_this_month: 0,
  cancellations: 0,
};

// ── REUSABLE MODAL NAVBAR ──
type ModalNavbarProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
};

function ModalNavbar({ title, onBack, backLabel = 'Dashboard' }: ModalNavbarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.modalNavbar, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity style={styles.modalBackBtn} onPress={onBack}>
        <Text style={styles.modalBackArrow}>‹</Text>
        <Text style={styles.modalBackText}>{backLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.modalNavTitle}>{title}</Text>
      <View style={styles.modalNavSpacer} />
    </View>
  );
}

export default function AdminDashboard() {
  const { user } = useUser();

  const [activeNav, setActiveNav]                     = useState('dashboard');
  const [drawerOpen, setDrawerOpen]                   = useState(false);
  const [showTickets, setShowTickets]                 = useState(false);
  const [showUsers, setShowUsers]                     = useState(false);
  const [showFoodDatabase, setShowFoodDatabase]       = useState(false);
  const [showPerformance, setShowPerformance]         = useState(false);
  const [showNotifications, setShowNotifications]     = useState(false);
  const [showAPIIntegrations, setShowAPIIntegrations] = useState(false);
  const [showAuditLogs, setShowAuditLogs]             = useState(false);
  const [showDataExport, setShowDataExport]           = useState(false);

  const [stats, setStats]           = useState(FALLBACK_STATS);
  const [growthData, setGrowthData] = useState(FALLBACK_GROWTH_DATA);
  const [subData, setSubData]       = useState(FALLBACK_SUB_DATA);
  const [loadingStats, setLoadingStats] = useState(false);

  // ── GET TOKEN FROM ASYNCSTORAGE ──
  // Token is saved after login via AsyncStorage.setItem('token', token)
  const getToken = async (): Promise<string | null> => {
    return await AsyncStorage.getItem('token');
  };

  // ── FETCH OVERVIEW STATS ──
  // Endpoint: GET /admin/stats/overview
  // Headers: { Authorization: Bearer <token> }
  // Returns: {
  //   total_users, active_users_30d, premium_subscribers,
  //   meals_logged_today, new_users_this_month,
  //   active_users_change_pct, mrr, meals_change_pct
  // }
  const fetchStats = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/stats/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.log('fetchStats failed:', res.status);
      }
    } catch (e) {
      console.log('fetchStats error:', e);
    }
  };

  // ── FETCH USER GROWTH DATA ──
  // Endpoint: GET /admin/stats/growth?months=6
  // Headers: { Authorization: Bearer <token> }
  // Returns: [{ month: string, total: number, premium: number }]
  const fetchGrowthData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/stats/growth?months=6`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGrowthData(data);
      } else {
        console.log('fetchGrowthData failed:', res.status);
      }
    } catch (e) {
      console.log('fetchGrowthData error:', e);
    }
  };

  // ── FETCH SUBSCRIPTION DATA ──
  // Endpoint: GET /admin/stats/subscriptions
  // Headers: { Authorization: Bearer <token> }
  // Returns: {
  //   freemium: { label, pct, color, count },
  //   premium:  { label, pct, color, count },
  //   annual:   { label, pct, color, count },
  //   mrr, new_this_month, cancellations
  // }
  const fetchSubData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/stats/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubData(data);
      } else {
        console.log('fetchSubData failed:', res.status);
      }
    } catch (e) {
      console.log('fetchSubData error:', e);
    }
  };

  // ── FETCH ALL ON MOUNT ──
  // Calls all three fetch functions when the dashboard loads
  useEffect(() => {
    const loadAll = async () => {
      setLoadingStats(true);
      await Promise.all([
        fetchStats(),
        fetchGrowthData(),
        fetchSubData(),
      ]);
      setLoadingStats(false);
    };
    loadAll();
  }, []);

  // ── MAX TOTAL for bar chart scaling ──
  // Falls back to 1 if growthData is empty to avoid division by zero
  const maxTotal = growthData.length > 0
    ? Math.max(...growthData.map(d => d.total))
    : 1;

  const handleNavPress = (id: string) => {
    setDrawerOpen(false);
    if (id === 'dashboard') {
      setActiveNav('dashboard');
    } else if (id === 'tickets') {
      setActiveNav('tickets');
      setShowTickets(true);
    } else if (id === 'users') {
      setActiveNav('users');
      setShowUsers(true);
    } else if (id === 'food') {
      setActiveNav('food');
      setShowFoodDatabase(true);
    } else if (id === 'performance') {
      setActiveNav('performance');
      setShowPerformance(true);
    } else if (id === 'notifications') {
      setActiveNav('notifications');
      setShowNotifications(true);
    } else if (id === 'api_integrations') {
      setActiveNav('api_integrations');
      setShowAPIIntegrations(true);
    } else if (id === 'audit') {
      setActiveNav('audit');
      setShowAuditLogs(true);
    } else if (id === 'data_export') {
      setActiveNav('data_export');
      setShowDataExport(true);
    } else {
      setActiveNav(id);
      Alert.alert('Coming Soon', 'This page is under construction.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      {/* ── SUPPORT TICKETS MODAL ── */}
      <Modal
        visible={showTickets}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowTickets(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="Support Tickets" onBack={() => setShowTickets(false)} />
          <View style={styles.modalContent}>
            <SupportTicketAdmin visible={showTickets} onClose={() => setShowTickets(false)} />
          </View>
        </View>
      </Modal>

      {/* ── USER MANAGEMENT MODAL ── */}
      <Modal
        visible={showUsers}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowUsers(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="User Management" onBack={() => setShowUsers(false)} />
          <View style={styles.modalContent}>
            <UserManagement visible={showUsers} onClose={() => setShowUsers(false)} />
          </View>
        </View>
      </Modal>

      {/* ── FOOD DATABASE MODAL ── */}
      <Modal
        visible={showFoodDatabase}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFoodDatabase(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="Food Database" onBack={() => setShowFoodDatabase(false)} />
          <View style={styles.modalContent}>
            <FoodDatabase visible={showFoodDatabase} onClose={() => setShowFoodDatabase(false)} />
          </View>
        </View>
      </Modal>

      {/* ── PERFORMANCE MODAL ── */}
      <Modal
        visible={showPerformance}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPerformance(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="Performance" onBack={() => setShowPerformance(false)} />
          <View style={styles.modalContent}>
            <PerformanceScreen visible={showPerformance} onClose={() => setShowPerformance(false)} />
          </View>
        </View>
      </Modal>

      {/* ── NOTIFICATIONS MODAL ── */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="Notifications" onBack={() => setShowNotifications(false)} />
          <View style={styles.modalContent}>
            <NotificationsScreen visible={showNotifications} onClose={() => setShowNotifications(false)} />
          </View>
        </View>
      </Modal>

      {/* ── API INTEGRATIONS MODAL ── */}
      <Modal
        visible={showAPIIntegrations}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAPIIntegrations(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="API Integrations" onBack={() => setShowAPIIntegrations(false)} />
          <View style={styles.modalContent}>
            <APIIntegrationsScreen visible={showAPIIntegrations} onClose={() => setShowAPIIntegrations(false)} />
          </View>
        </View>
      </Modal>

      {/* ── AUDIT LOGS MODAL ── */}
      <Modal
        visible={showAuditLogs}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAuditLogs(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="Audit Logs" onBack={() => setShowAuditLogs(false)} />
          <View style={styles.modalContent}>
            <AuditLogsScreen visible={showAuditLogs} onClose={() => setShowAuditLogs(false)} />
          </View>
        </View>
      </Modal>

      {/* ── DATA EXPORT MODAL ── */}
      <Modal
        visible={showDataExport}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDataExport(false)}
      >
        <View style={styles.modalRoot}>
          <ModalNavbar title="Data Export" onBack={() => setShowDataExport(false)} />
          <View style={styles.modalContent}>
            <DataExportScreen visible={showDataExport} onClose={() => setShowDataExport(false)} />
          </View>
        </View>
      </Modal>

      {/* ── DRAWER OVERLAY ── */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawer}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.drawerLogoTitle}>NutriTrack</Text>
                  <Text style={styles.drawerLogoSub}>Admin Console</Text>
                </View>
                <TouchableOpacity style={styles.drawerCloseBtn} onPress={() => setDrawerOpen(false)}>
                  <Text style={styles.drawerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {NAV_SECTIONS.map((section, sectionIndex) => (
                <View key={`section-${sectionIndex}`}>
                  <Text style={styles.navSection}>{section.label}</Text>
                  {section.items.map(item => (
                    <TouchableOpacity
                      key={`nav-${item.id}`}
                      style={[styles.navItem, activeNav === item.id && styles.navItemActive]}
                      onPress={() => handleNavPress(item.id)}
                    >
                      <Text style={[
                        styles.navItemText,
                        activeNav === item.id && styles.navItemTextActive
                      ]}>
                        {item.title}
                      </Text>
                      {item.badge && (
                        <View style={[styles.navBadge, item.alert && styles.navBadgeAlert]}>
                          <Text style={styles.navBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              <View style={styles.drawerFooter}>
                <View style={styles.adminRow}>
                  <View style={styles.adminAvatar}>
                    <Text style={styles.adminAvatarText}>AD</Text>
                  </View>
                  <View>
                    <Text style={styles.adminName}>Admin</Text>
                    <Text style={styles.adminRole}>Super Admin</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={() => { setDrawerOpen(false); router.replace('/loginmain' as any); }}
                >
                  <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MAIN CONTENT ── */}
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        <View style={styles.topbar}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
          <View style={styles.topbarCenter}>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.pageSub}>
              {loadingStats
                ? 'Loading dashboard data...'
                : 'Welcome back — here is what is happening today'}
            </Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* ── METRIC CARDS ── */}
        {/* Data from GET /admin/stats/overview */}
        <View style={styles.metricsGrid}>
          {[
            {
              label: 'Total users',
              value: stats.total_users.toLocaleString(),
              delta: `+${stats.new_users_this_month} this month`,
              up: true,
            },
            {
              label: 'Active users (30d)',
              value: stats.active_users_30d.toLocaleString(),
              delta: `${stats.active_users_change_pct >= 0 ? '+' : ''}${stats.active_users_change_pct}% vs last month`,
              up: stats.active_users_change_pct >= 0,
            },
            {
              label: 'Premium subscribers',
              value: stats.premium_subscribers.toLocaleString(),
              delta: `S$${stats.mrr.toLocaleString()} MRR`,
              up: true,
            },
            {
              label: 'Meals logged today',
              value: stats.meals_logged_today.toLocaleString(),
              delta: `${stats.meals_change_pct >= 0 ? '+' : ''}${stats.meals_change_pct}% vs yesterday`,
              up: stats.meals_change_pct >= 0,
            },
          ].map(m => (
            <View key={`metric-${m.label}`} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={[styles.metricDelta, m.up ? styles.deltaUp : styles.deltaDown]}>
                {m.delta}
              </Text>
            </View>
          ))}
        </View>

        {/* ── USER GROWTH CHART ── */}
        {/* Data from GET /admin/stats/growth?months=6 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>User growth (last 6 months)</Text>
          </View>
          {growthData.length === 0 ? (
            <Text style={styles.emptyChart}>No growth data available yet</Text>
          ) : (
            <>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Total users</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6ee7b7' }]} />
                  <Text style={styles.legendText}>Premium</Text>
                </View>
              </View>
              <View style={styles.barChartArea}>
                {growthData.map(d => (
                  <View key={`bar-${d.month}`} style={styles.barCol}>
                    <Text style={styles.barTopLabel}>{d.total.toLocaleString()}</Text>
                    <View style={styles.barStack}>
                      <View style={[
                        styles.bar,
                        { height: Math.round((d.total / maxTotal) * 100), backgroundColor: '#10b981' }
                      ]} />
                      <View style={[
                        styles.bar,
                        { height: Math.round((d.premium / maxTotal) * 100), backgroundColor: '#6ee7b7', marginTop: 2 }
                      ]} />
                    </View>
                    <Text style={styles.barLabel}>{d.month}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── SUBSCRIPTION SPLIT ── */}
        {/* Data from GET /admin/stats/subscriptions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription split</Text>
          <View style={styles.donutRow}>
            {[subData.freemium, subData.premium, subData.annual].map(s => (
              <View key={`donut-${s.label}`} style={styles.donutItem}>
                <View style={[styles.donutCircle, { borderColor: s.color }]}>
                  <Text style={[styles.donutPct, { color: s.color }]}>{s.pct}%</Text>
                </View>
                <Text style={styles.donutLabel}>{s.label}</Text>
                <Text style={styles.donutCount}>{s.count.toLocaleString()}</Text>
              </View>
            ))}
          </View>
          <View style={styles.subStatsBox}>
            {[
              { label: 'Monthly MRR',    value: `S$${subData.mrr.toLocaleString()}`,    color: '#059669' },
              { label: 'New this month', value: `+${subData.new_this_month}`,            color: '#111827' },
              { label: 'Cancellations',  value: `${subData.cancellations}`,              color: '#dc2626' },
            ].map(s => (
              <View key={`sub-${s.label}`} style={styles.subStatRow}>
                <Text style={styles.subStatLabel}>{s.label}</Text>
                <Text style={[styles.subStatVal, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },

  modalRoot: { flex: 1, backgroundColor: '#f9fafb' },
  modalNavbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  modalBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  modalBackArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  modalBackText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  modalNavTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  modalNavSpacer: { width: 60 },
  modalContent: { flex: 1, backgroundColor: '#f9fafb' },

  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: width * 0.72, backgroundColor: '#10b981', paddingBottom: 32,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', marginTop: 12,
  },
  drawerLogoTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  drawerLogoSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  drawerCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  drawerCloseText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  navSection: {
    fontSize: 10, color: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, letterSpacing: 0.8,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 16,
    borderLeftWidth: 2, borderLeftColor: 'transparent',
  },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: '#fff' },
  navItemText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', flex: 1 },
  navItemTextActive: { color: '#fff', fontWeight: '600' },
  navBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1,
  },
  navBadgeAlert: { backgroundColor: '#ef4444' },
  navBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  drawerFooter: {
    marginTop: 24, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 16,
  },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  adminAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  adminAvatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  adminName: { fontSize: 14, color: '#fff', fontWeight: '600' },
  adminRole: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  logoutText: { fontSize: 14, color: '#fff', fontWeight: '600' },

  main: { flex: 1, padding: 16 },
  topbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  menuBtn: {
    width: 40, height: 40, backgroundColor: '#10b981',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    gap: 4, paddingVertical: 10, flexShrink: 0,
  },
  menuLine: { width: 18, height: 2, backgroundColor: '#fff', borderRadius: 1 },
  topbarCenter: { flex: 1 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  pageSub: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  dateBadge: {
    backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0,
  },
  dateBadgeText: { fontSize: 11, color: '#6b7280' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981',
  },
  metricLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  metricDelta: { fontSize: 11, marginTop: 3 },
  deltaUp: { color: '#059669' },
  deltaDown: { color: '#dc2626' },

  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb', padding: 16, marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardAction: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  emptyChart: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },

  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#6b7280' },

  barChartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barTopLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 3, textAlign: 'center' },
  barStack: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: 3, minHeight: 3 },
  barLabel: { fontSize: 9, color: '#9ca3af', marginTop: 4 },

  donutRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 14 },
  donutItem: { alignItems: 'center', gap: 6 },
  donutCircle: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 6, alignItems: 'center', justifyContent: 'center',
  },
  donutPct: { fontSize: 15, fontWeight: '700' },
  donutLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
  donutCount: { fontSize: 11, color: '#9ca3af' },

  subStatsBox: { borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 12 },
  subStatRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
  },
  subStatLabel: { fontSize: 13, color: '#6b7280' },
  subStatVal: { fontSize: 13, fontWeight: '700' },

  ticketNavbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  ticketBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ticketBackArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  ticketBackText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  ticketNavTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  ticketNavSpacer: { width: 60 },
});