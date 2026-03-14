import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet } from 'react-native';
import ProfileHeader from '../components/profile_section/profile/ProfileHeader';
import StatsBar from '../components/profile_section/profile/StatsBar';
import ProfileMenu from '../components/profile_section/profile/ProfileMenu';
import MyGoalsModal from '../components/profile_section/profile/MyGoalsModal';
import SubscriptionModal from '../components/profile_section/profile/SubscriptionModal';

export default function ProfileScreen() {
  const [showGoals, setShowGoals] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader />
        <StatsBar />
        <ProfileMenu
          onPressGoals={() => setShowGoals(true)}
          onPressSubscription={() => setShowSubscription(true)}
        />
      </ScrollView>

      <MyGoalsModal visible={showGoals} onClose={() => setShowGoals(false)} />
      <SubscriptionModal visible={showSubscription} onClose={() => setShowSubscription(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10b981' },
});