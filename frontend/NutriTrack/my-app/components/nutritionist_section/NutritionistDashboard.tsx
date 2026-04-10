import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Modal, Dimensions, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
// added this; can be removed if doesnt work
type NavItem = { id: string; title: string; badge?: number; alert?: boolean };

/* ─────────────────────────────
   NAVIGATION. THIS IS THE POP UP MODAL !!!!!
───────────────────────────── */
// added {---}[]
// can be removed if doesnt work
const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'dashboard', title: 'Dashboard' },
      { id: 'clients', title: 'My Clients' },
    ]
  },
  {
    label: 'CLIENT MANAGEMENT',
    items: [
      { id: 'schedule', title: 'Schedule' },
      { id: 'consultationsMgmt', title: 'Consultations' },
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { id: 'messages', title: 'Messages', badge: 5, alert: true },
      { id: 'consultationsComm', title: 'Consultations', badge: 3 },
    ]
  },
  {
    label: 'OTHERS',
    items: [
      { id: 'nutritionContent', title: 'Nutrition Content' },
      { id: 'publicProfile', title: 'Public Profile' },
      { id: 'clientEngagementAnalysis', title: 'Client Engagement Analysis' },
    ]
  }
];

/* ─────────────────────────────
   DUMMY DATA
───────────────────────────── */
const METRICS = [
  { label: 'Active clients', value: '28', delta: '+3 this month', up: true },
  { label: 'Consultations today', value: '6', delta: '2 upcoming', up: true },
  { label: 'Pending messages', value: '5', delta: 'Needs reply', up: false },
  { label: 'Avg adherence', value: '82%', delta: '+4% this week', up: true },
];

const CLIENTS = [
  { name: 'Sarah Tan', goal: 'Weight Loss', status: 'On Track' },
  { name: 'John Lee', goal: 'Muscle Gain', status: 'Behind' },
  { name: 'Alicia Ng', goal: 'Maintenance', status: 'On Track' },
];

const CONSULTS = [
  { name: 'Sarah Tan', time: '10:00 AM' },
  { name: 'John Lee', time: '1:30 PM' },
  { name: 'Alicia Ng', time: '4:00 PM' },
];

export default function NutritionistDashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavPress = (id: string) => {
    setActiveNav(id);
    setDrawerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      {/* ── DRAWER ── */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() => setDrawerOpen(false)}
          />

          <View style={styles.drawer}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* HEADER */}
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.drawerLogoTitle}>NutriTrack</Text>
                  <Text style={styles.drawerLogoSub}>Nutritionist Panel</Text>
                </View>

                <TouchableOpacity
                  style={styles.drawerCloseBtn}
                  onPress={() => setDrawerOpen(false)}
                >
                  <Text style={styles.drawerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* NAV */}
              {NAV_SECTIONS.map(section => (
                <View key={section.label}>
                  <Text style={styles.navSection}>{section.label}</Text>

                  {section.items.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.navItem,
                        activeNav === item.id && styles.navItemActive
                      ]}
                      onPress={() => handleNavPress(item.id)}
                    >
                      <Text style={[
                        styles.navText,
                        activeNav === item.id && styles.navTextActive
                      ]}>
                        {item.title}
                      </Text>

                      {item.badge && (
                        <View style={[
                          styles.badge,
                          item.alert && styles.badgeAlert
                        ]}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {/* FOOTER */}
              <View style={styles.drawerFooter}>
                <View style={styles.adminRow}>
                  <View style={styles.adminAvatar}>
                    <Text style={styles.adminAvatarText}>NU</Text>
                  </View>
                  <View>
                    <Text style={styles.adminName}>Nutritionist</Text>
                    <Text style={styles.adminRole}>Nutritionist</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={() => {
                    setDrawerOpen(false);
                    // router.replace('/loginmain');
                  }}
                >
                  <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MAIN ── */}
      <ScrollView style={styles.main}>
        <View style={styles.topbar}>
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={styles.menuBtn}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              Welcome Back! Manage your clients efficiently
            </Text>
          </View>
        </View>

        {/* METRICS */}
        <View style={styles.grid}>
          {METRICS.map(m => (
            <View key={m.label} style={styles.card}>
              <Text style={styles.label}>{m.label}</Text>
              <Text style={styles.value}>{m.value}</Text>
              <Text style={[
                styles.delta,
                { color: m.up ? '#059669' : '#dc2626' }
              ]}>
                {m.delta}
              </Text>
            </View>
          ))}
        </View>

        {/* CLIENTS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Active Clients</Text>
          {CLIENTS.map(c => (
            <View key={c.name} style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowSub}>{c.goal}</Text>
              </View>
              <Text style={[
                styles.status,
                { color: c.status === 'On Track' ? '#059669' : '#dc2626' }
              ]}>
                {c.status}
              </Text>
            </View>
          ))}
        </View>

        {/* CONSULTATIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today’s Consultations</Text>
          {CONSULTS.map(c => (
            <View key={c.name} style={styles.row}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.rowSub}>{c.time}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────
   STYLES
───────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  main: { padding: 16 },

  topbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },

  menuBtn: {
    width: 40, height: 40,
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },

  menuLine: { width: 18, height: 2, backgroundColor: '#fff', marginVertical: 2 },

  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 11, color: '#6b7280' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    borderTopColor: '#10b981'
  },

  label: { fontSize: 11, color: '#6b7280' },
  value: { fontSize: 22, fontWeight: '700' },
  delta: { fontSize: 11, marginTop: 4 },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 14
  },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee'
  },

  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, color: '#6b7280' },
  status: { fontSize: 12, fontWeight: '600' },

  drawerOverlay: { flex: 1, flexDirection: 'row-reverse' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },

  drawer: {
    width: width * 0.7,
    backgroundColor: '#10b981',
    padding: 16
  },

  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },

  drawerLogoTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  drawerLogoSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  drawerCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 6
  },

  drawerCloseText: { color: '#fff', fontSize: 14 },

  navSection: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 10
  },

  navItem: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6
  },

  navText: { color: '#fff' },
  navTextActive: { fontWeight: '700' },

  badge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 6
  },

  badgeAlert: { backgroundColor: '#ef4444' },
  badgeText: { fontSize: 10 },

  drawerFooter: { marginTop: 20, borderTopWidth: 0.5, borderTopColor: '#fff', paddingTop: 10 },

  adminRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },

  adminAvatar: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },

  adminAvatarText: { fontWeight: '700' },

  adminName: { color: '#fff', fontWeight: '600' },
  adminRole: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  logoutBtn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8
  },

  logoutText: {
    textAlign: 'center',
    fontWeight: '600'
  }
});