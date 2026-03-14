import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>NutriTrack</Text>
      </View>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>JD</Text>
      </View>
      <Text style={styles.name}>John Doe</Text>
      <Text style={styles.email}>john@email.com</Text>
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