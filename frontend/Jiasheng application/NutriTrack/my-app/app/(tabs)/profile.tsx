import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet } from 'react-native';
import ProfileHeader from '../components/profile_section/profile/ProfileHeader';
import StatsBar from '../components/profile_section/profile/StatsBar';
import ProfileMenu from '../components/profile_section/profile/ProfileMenu';
import MyGoalsModal from '../components/profile_section/profile/MyGoalsModal';
import SubscriptionModal from '../components/profile_section/profile/components/SubscriptionModal';
import EditProfileModal from '../components/profile_section/profile/components/EditProfileModal';
import ChangePasswordModal from '../components/profile_section/profile/components/ChangePasswordModal';
import DeleteAccountModal from '../components/profile_section/profile/components/DeleteAccountModal';
import ProgressReport from '../components/profile_section/progress/ProgressReport';

export default function ProfileScreen() {
  const [showGoals, setShowGoals] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader />
        <StatsBar />
        <ProfileMenu
          onPressGoals={() => setShowGoals(true)}
          onPressSubscription={() => setShowSubscription(true)}
          onPressEdit={() => setShowEdit(true)}
          onPressChangePassword={() => setShowChangePassword(true)}
          onPressDeleteAccount={() => setShowDeleteAccount(true)}
          onPressProgressReport={() => setShowProgress(true)}
        />
      </ScrollView>

      <MyGoalsModal visible={showGoals} onClose={() => setShowGoals(false)} />
      <SubscriptionModal visible={showSubscription} onClose={() => setShowSubscription(false)} />
      <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} />
      <ChangePasswordModal visible={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <DeleteAccountModal visible={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} />
      <ProgressReport visible={showProgress} onClose={() => setShowProgress(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10b981' },
});