import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useUser } from '../../../context/UserContext';

export default function ProfileHeader() {
  const { user } = useUser();

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <View style={styles.header}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>NutriTrack</Text>
      </View>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials || '?'}</Text>
      </View>
      <Text style={styles.name}>{fullName || 'Guest'}</Text>
      <Text style={styles.email}>{user.email || 'No email'}</Text>
      <View style={styles.planBadge}>
        <Text style={styles.planText}>Free Plan</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 72,
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  planText: { fontSize: 12, color: '#fff', fontWeight: '600' },
});