import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/api';
import { useGoals } from '@/context/GoalsContext';

type Props = {
  onPressSetGoals: () => void;
  onPressMyGoals: () => void;
  onPressSubscription: () => void;
  onPressTransactions: () => void;
  onPressEdit: () => void;
  onPressNotifications: () => void;
  onPressChangePassword: () => void;
  onPressDeleteAccount: () => void;
  onPressProgressReport: () => void;
  onPressFaq: () => void;
  onPressSupportTicket: () => void;
};

type MenuRow = {
  emoji: string;
  iconBg: string;
  title: string;
  desc: string;
  onPress: () => void;
};

export default function ProfileMenu({
  onPressSetGoals,
  onPressMyGoals,
  onPressSubscription,
  onPressTransactions,
  onPressEdit,
  onPressNotifications,
  onPressChangePassword,
  onPressDeleteAccount,
  onPressProgressReport,
  onPressFaq,
  onPressSupportTicket,
}: Props) {
  const { resetToken } = useGoals();

  const progressRows: MenuRow[] = [
    {
      emoji: '📈',
      iconBg: '#f0fdf4',
      title: 'Progress Report',
      desc: 'Weekly & monthly stats',
      onPress: onPressProgressReport,
    },
    {
      emoji: '🏆',
      iconBg: '#fffbeb',
      title: 'Goals',
      desc: 'Set your current targets',
      onPress: onPressSetGoals,
    },
    {
      emoji: '🎯',
      iconBg: '#fffbeb',
      title: 'My Goals',
      desc: 'View your current targets',
      onPress: onPressMyGoals,
    },
  ];

  const accountRows: MenuRow[] = [
    {
      emoji: '💎',
      iconBg: '#f5f3ff',
      title: 'Subscription',
      desc: 'Plans & billing',
      onPress: onPressSubscription,
    },
    {
      emoji: '🧾',
      iconBg: '#f5f3ff',
      title: 'Transactions',
      desc: 'Billing History',
      onPress: onPressTransactions,
    },
    {
      emoji: '👤',
      iconBg: '#eff6ff',
      title: 'Edit Profile',
      desc: 'Name, details',
      onPress: onPressEdit,
    },
    {
      emoji: '🔔',
      iconBg: '#f9fafb',
      title: 'Notifications',
      desc: 'Meal & hydration alerts',
      onPress: onPressNotifications,
    },
    {
      emoji: '🔑',
      iconBg: '#fef3c7',
      title: 'Change Password',
      desc: 'Update your password',
      onPress: onPressChangePassword,
    },
  ];

  const supportRows: MenuRow[] = [
    {
      emoji: '🎫',
      iconBg: '#f0fdf4',
      title: 'Support Ticket',
      desc: 'Submit a request to our team',
      onPress: onPressSupportTicket,
    },
    {
      emoji: '❓',
      iconBg: '#f9fafb',
      title: 'Help & FAQ',
      desc: 'Guides and support',
      onPress: onPressFaq,
    },
  ];

  const dangerRows: MenuRow[] = [
    {
      emoji: '🗑️',
      iconBg: '#fef2f2',
      title: 'Delete Account',
      desc: 'Permanently remove your data',
      onPress: onPressDeleteAccount,
    },
  ];

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
              await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch (e) {
            console.log('Logout error:', e);
          } finally {
            await AsyncStorage.removeItem('token');
            resetToken();
            router.replace('/loginmain' as any);
          }
        },
      },
    ]);
  };

  const renderSection = (title: string, rows: MenuRow[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, index) => (
          <TouchableOpacity
            key={row.title}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: row.iconBg }]}>
              <Text style={styles.iconEmoji}>{row.emoji}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowDesc}>{row.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSection('Progress', progressRows)}
      {renderSection('Account', accountRows)}
      {renderSection('Support', supportRows)}
      {renderSection('Danger Zone', dangerRows)}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>NutriTrack v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 10 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 18 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowDesc: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  chevron: { fontSize: 20, color: '#d1d5db', fontWeight: '300' },
  logoutBtn: {
    borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 8, marginBottom: 16, backgroundColor: '#fff',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  version: { textAlign: 'center', fontSize: 12, color: '#d1d5db' },
});
