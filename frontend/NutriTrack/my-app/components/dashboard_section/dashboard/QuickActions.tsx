import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditProfileModal from '@/components/profile_section/profile/components/EditProfileModal';
import MyGoalsModal from '@/components/profile_section/profile/MyGoalsModal';
import RecommendMealPage from '@/app/(tabs)/recommendmeal';

export default function QuickActions() {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => setShowEditProfile(true)}>
          <Text style={styles.actionEmoji}>👤</Text>
          <Text style={styles.actionLabel}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => setShowRecommend(true)}>
          <Text style={styles.actionEmoji}>🍽️</Text>
          <Text style={styles.actionLabel}>Recommend Meal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => setShowGoals(true)}>
          <Text style={styles.actionEmoji}>🎯</Text>
          <Text style={styles.actionLabel}>My Goals</Text>
        </TouchableOpacity>

      </View>

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        backLabel="Home"
      />

      <MyGoalsModal
        visible={showGoals}
        onClose={() => setShowGoals(false)}
        backLabel="Home"
      />

      {/* Recommend Meal as full screen modal */}
      <Modal
        visible={showRecommend}
        animationType="slide"
        onRequestClose={() => setShowRecommend(false)}
      >
        <RecommendMealPage
          showBackButton
          onBack={() => setShowRecommend(false)}
        />
      </Modal>

      
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
    textAlign: 'center',
  },
  devSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 8,
  },
  devLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 4,
  },
  devBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  devBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});