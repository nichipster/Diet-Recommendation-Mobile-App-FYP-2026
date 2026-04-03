import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationsScreen from '../../profile/NotificationScreen';
import ModalNavbar from '../../../ui/Navbar';

type Props = { visible: boolean; onClose: () => void; };

export default function NotificationsModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ModalNavbar title="Notifications" onClose={onClose} />
        <NotificationsScreen />
      </SafeAreaView>
    </Modal>
  );
}