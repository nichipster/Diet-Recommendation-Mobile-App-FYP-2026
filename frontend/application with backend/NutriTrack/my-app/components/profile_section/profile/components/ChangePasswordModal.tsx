import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../../../context/UserContext';
import { API_URL } from '../../../../constants/api';
import ModalNavbar from '../../../ui/Navbar';
import ModalFormField from '../cards/FormField';

type Props = { visible: boolean; onClose: () => void; };

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({ current: '', newPass: '', confirm: '' });
  const { user } = useUser();

  const handleSave = async () => {
    let hasError = false;
    const newErrors = { current: '', newPass: '', confirm: '' };

    if (!current) {
      newErrors.current = 'Current password is required';
      hasError = true;
    }
    if (newPass.length < 8) {
      newErrors.newPass = 'Password must be at least 8 characters';
      hasError = true;
    }
    if (new Blob([newPass]).size > 72) {
      newErrors.newPass = 'Password is too long (max 72 characters)';
      hasError = true;
    }
    if (newPass !== confirm) {
      newErrors.confirm = 'Passwords do not match';
      hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ current_password: current, new_password: newPass }),
      });

      if (response.status === 204) {
        Alert.alert('Success', 'Password changed successfully.');
        setCurrent(''); setNewPass(''); setConfirm('');
        onClose();
        return;
      }

      const data = await response.json();
      if (response.status === 401) {
        setErrors(e => ({ ...e, current: 'Current password is incorrect' }));
      } else if (response.status === 400) {
        setErrors(e => ({ ...e, newPass: data.detail || 'Something went wrong' }));
      } else {
        Alert.alert('Error', data.detail || 'Something went wrong');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <ModalNavbar title="Change Password" onClose={onClose} />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.card}>
              <ModalFormField
                label="Current Password"
                value={current}
                onChangeText={v => { setCurrent(v); setErrors(e => ({ ...e, current: '' })); }}
                placeholder="Enter current password"
                error={errors.current}
                secureTextEntry
              />
              <ModalFormField
                label="New Password"
                value={newPass}
                onChangeText={v => { setNewPass(v); setErrors(e => ({ ...e, newPass: '' })); }}
                placeholder="At least 8 characters"
                error={errors.newPass}
                secureTextEntry
              />
              <ModalFormField
                label="Confirm New Password"
                value={confirm}
                onChangeText={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })); }}
                placeholder="Re-enter new password"
                error={errors.confirm}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});