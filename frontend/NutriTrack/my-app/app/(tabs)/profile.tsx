import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import ProfileHeader from '../../components/profile_section/profile/ProfileHeader';
import StatsBar from '../../components/profile_section/profile/StatsBar';
import ProfileMenu from '../../components/profile_section/profile/ProfileMenu';
import MyGoalsModal from '../../components/profile_section/profile/MyGoalsModal';
import SubscriptionModal from '../../components/profile_section/profile/components/SubscriptionModal';
import EditProfileModal from '../../components/profile_section/profile/components/EditProfileModal';
import ChangePasswordModal from '../../components/profile_section/profile/components/ChangePasswordModal';
import DeleteAccountModal from '../../components/profile_section/profile/components/DeleteAccountModal';
import ProgressReport from '../../components/profile_section/progress/ProgressReport';
import NotificationsModal from '../../components/profile_section/profile/components/NotificationModal';
import FaqModal from '../../components/profile_section/profile/components/FaqModal';
import SupportTicketScreen from '../../components/support_section/SupportTicketScreen';
import { useUpgradePrompt } from '@/components/upgrade_lock/UpgradePrompt';
import UpgradePromptModal from '@/components/upgrade_lock/UpgradePromptModal';
import GoalsScreen from '@/components/profile_section/profile/components/goals';

export default function ProfileScreen() {
  const [showSetGoals, setShowSetGoals] = useState(false);
  const [showMyGoals, setShowMyGoals] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showSupportTicket, setShowSupportTicket] = useState(false);

  const {
    showPrompt, promptFeature,
    checkSessionPrompt, promptForFeature,
    hidePrompt,
  } = useUpgradePrompt();

  const handleUpgradePress = () => {
    hidePrompt();
    setShowSubscription(true);
  };

  
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader />
        <ProfileMenu
          onPressSetGoals={() => setShowSetGoals(true)}
          onPressMyGoals={() => setShowMyGoals(true)}
          onPressSubscription={() => setShowSubscription(true)}
          onPressEdit={() => setShowEdit(true)}
          onPressChangePassword={() => setShowChangePassword(true)}
          onPressDeleteAccount={() => setShowDeleteAccount(true)}
          onPressProgressReport={() => setShowProgress(true)}
          onPressNotifications={() => setShowNotifications(true)}
          onPressFaq={() => setShowFaq(true)}
          onPressSupportTicket={() => setShowSupportTicket(true)}
        />
      </ScrollView>

      {showSetGoals && (
        <GoalsScreen visible={showSetGoals} onClose={() => setShowSetGoals(false)} />
      )}
      {showMyGoals && (
        <MyGoalsModal visible={showMyGoals} onClose={() => setShowMyGoals(false)} />
      )}
      {showSubscription && (
        <SubscriptionModal visible={showSubscription} onClose={() => setShowSubscription(false)} />
      )}
      {showEdit && (
        <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} />
      )}
      {showChangePassword && (
        <ChangePasswordModal visible={showChangePassword} onClose={() => setShowChangePassword(false)} />
      )}
      {showDeleteAccount && (
        <DeleteAccountModal visible={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} />
      )}
      {showProgress && (
        <ProgressReport visible={showProgress} onClose={() => setShowProgress(false)} />
      )}
      {showNotifications && (
        <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />
      )}
      {showFaq && (
        <FaqModal visible={showFaq} onClose={() => setShowFaq(false)} />
      )}
      {showSupportTicket && (
        <SupportTicketScreen visible={showSupportTicket} onClose={() => setShowSupportTicket(false)} />
      )}
      {showPrompt && (
        <UpgradePromptModal visible={showPrompt} onClose={hidePrompt} onUpgrade={handleUpgradePress} feature={promptFeature} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  safeArea: {
    backgroundColor: '#10b981',
  },
});
