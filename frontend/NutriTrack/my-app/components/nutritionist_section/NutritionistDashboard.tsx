import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Dimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActiveClients from './ActiveClients';
import Consultations from './Consultations';
import NutritionistContent from './NutritionistContent';
import NutritionistProfile from './NutritionistProfile';
import CreateSchedule from './CreateSchedule';
import WriteAnalysis from './WriteAnalysis';
import ClientEngagementAnalysis from './ClientEngagementAnalysis';
import { useBookings } from '../../context/BookingContext';
import { MOCK_CLIENT_DATA } from './ViewProgressReport';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

type NavItem = {
  id: string;
  title: string;
  badge?: number;
  alert?: boolean;
};

//MODAL !!
const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'dashboard', title: 'Dashboard' },
      { id: 'clients', title: 'My Clients' }
    ]
  },
  {
    label: 'CLIENT MANAGEMENT',
    items: [
      { id: 'schedule', title: 'Schedule' }, 
      { id: 'writeAnalysis', title: 'Write Analysis' }, 
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { id: 'consultationsComm', title: 'Consultations'},
    ]
  },
  {
    label: 'OTHERS',
    items: [
      { id: 'nutritionContent', title: 'Nutrition Content' },
      { id: 'publicProfile', title: 'Public Profile' },
      { id: 'clientEngagementAnalysis', title: 'Client Engagement Analysis' }
    ]
  }
];

export default function NutritionistDashboard() {
  const router = useRouter();

// The Four Boxes In The Dashboard
const { bookings } = useBookings();
const { user } = useUser();

const nutritionistName = 'Dr. Sarah Lim';
// const nutritionistName = `${user.firstName} ${user.lastName}`;
const myBookings = bookings.filter(b => b.nutritionist === nutritionistName);

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const thisMonthClients = useMemo(() =>
  new Set(
    myBookings
      .filter(b => b.status === 'confirmed')
      .map(b => b.user)
  ).size,
[myBookings]);

const thisMonthConsultations = useMemo(() =>
  myBookings.filter(b => {
    const d = new Date(b.date);
    return b.status === 'confirmed' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length,
[myBookings, currentMonth, currentYear]);

const todayKey = new Date().toISOString().split('T')[0];
const pendingCount = useMemo(() =>
  myBookings.filter(b => b.status === 'confirmed' && b.date >= todayKey).length,
[myBookings]);

const clientAdherenceList = useMemo(() => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lastWeekStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
    .toISOString().split('T')[0];
  const prevWeekStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14)
    .toISOString().split('T')[0];

  return Object.entries(MOCK_CLIENT_DATA).map(([id, client]) => {
    const monthMeals = client.meals.filter(
      (m: any) => new Date(m.date).getMonth() === currentMonth
    );
    const daysLoggedThisMonth = new Set(monthMeals.map((m: any) => m.date)).size;
    const lastWeekDays = new Set(
      client.meals.filter((m: any) => m.date > lastWeekStr && m.date <= todayStr).map((m: any) => m.date)
    ).size;
    const prevWeekDays = new Set(
      client.meals.filter((m: any) => m.date > prevWeekStr && m.date <= lastWeekStr).map((m: any) => m.date)
    ).size;
    const adherencePct = Math.round((daysLoggedThisMonth / 30) * 100);
    const delta = Math.round((lastWeekDays / 7) * 100) - Math.round((prevWeekDays / 7) * 100);
    return { adherencePct, delta };
  });
}, [currentMonth]);

const avgAdherence = Math.round(
  clientAdherenceList.reduce((sum, c) => sum + c.adherencePct, 0) / clientAdherenceList.length
);
const avgDelta = Math.round(
  clientAdherenceList.reduce((sum, c) => sum + c.delta, 0) / clientAdherenceList.length
);

const METRICS = [
  { label: 'Active clients', value: String(thisMonthClients), delta: 'Total active', up: true },
  { label: 'Consultations', value: String(thisMonthConsultations), delta: 'This month',   up: true  },
  { label: 'New Upcoming Sessions', value: String(pendingCount), delta: 'Number of New Clients', up: true },
  { label: 'Avg adherence', value: `${avgAdherence}%`, delta: `${avgDelta >= 0 ? '+' : ''}${avgDelta}% vs last week`, up: avgDelta >= 0 },
];

// Linked Active Clients
const GOAL_LABELS: Record<string, string> = {
  lose: 'Weight Loss',
  gain: 'Muscle Gain',
  maintain: 'Maintenance',
};

const CLIENTS = Object.entries(MOCK_CLIENT_DATA).map(([id, client]) => ({
  id,
  name: client.name,
  goal: GOAL_LABELS[client.goal] ?? client.goal,
}));

const CONSULTS = bookings
  .filter(b => b.status === 'confirmed' && b.date === todayKey)
  .map(b => ({ name: b.user, time: b.time }));

  const [activeNav, setActiveNav] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);


  const handleNavPress = (id: string) => {
    setActiveNav(id);
    setDrawerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* ───────── DRAWER ───────── */}
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

          <SafeAreaView style={styles.drawer} edges={['top', 'bottom']}>
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
                      <Text
                        style={[
                          styles.navText,
                          activeNav === item.id && styles.navTextActive
                        ]}
                      >
                        {item.title}
                      </Text>

                      {item.badge && (
                        <View
                          style={[
                            styles.badge,
                            item.alert && styles.badgeAlert
                          ]}
                        >
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
                    <Text style={styles.adminName}>Dummy Nutritionist</Text>
                    <Text style={styles.adminRole}>Nutritionist</Text>
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
          </SafeAreaView>
        </View>
      </Modal>

      {/* ───────── MAIN ───────── */}
      {activeNav === "clients" ? (
       <ActiveClients
       onSelectClient={(client) => setSelectedClient(client)}
       onBack={() => setActiveNav("dashboard")} 
       />
       ) : activeNav === "consultationsComm" ? (
        <Consultations onBack={() => setActiveNav("dashboard")} />
       ) : activeNav === "nutritionContent" ?(
        <NutritionistContent onBack={() => setActiveNav("dashboard")} />
       ) : activeNav === "publicProfile" ?(
        <NutritionistProfile onBack={() => setActiveNav("dashboard")} />
       ) : activeNav === "schedule" ?(
        <CreateSchedule onBack={() => setActiveNav("dashboard")} />
       ) : activeNav === "writeAnalysis" ?(        
        <WriteAnalysis onBack={() => setActiveNav("dashboard")} /> 
       ) : activeNav === "clientEngagementAnalysis" ? (
        <ClientEngagementAnalysis onBack={() => setActiveNav("dashboard")} />
       ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.main}>

        {/* TOP BAR */}
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
              <Text
                style={[
                  styles.delta,
                  { color: m.up ? '#059669' : '#dc2626' }
                ]}
              >
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
            </View>
          ))}
        </View>

        {/* CONSULTS */}
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
      </ScrollView> )}
    </SafeAreaView>
  );
}

/* ───────── STYLES ───────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },

  main: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8
  },

  menuBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },

  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#fff',
    marginVertical: 2
  },

  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 11, color: '#6b7280' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },

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

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },

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

  drawerOverlay: {
    flex: 1,
    flexDirection: 'row-reverse'
  },

  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },

  drawer: {
    width: width * 0.7,
    backgroundColor: '#10b981',
    padding: 16
  },

  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center'
  },

  drawerLogoTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },

  drawerLogoSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11
  },

  drawerCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 6
  },

  drawerCloseText: {
    color: '#fff'
  },

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

  drawerFooter: {
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#fff',
    paddingTop: 10
  },

  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },

  adminAvatar: {
    width: 36,
    height: 36,
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