import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { useUser } from '../../../../context/UserContext';
import { DUMMY_USERS } from '../../../../components/first_section/dummy/dummydata';

type Props = { visible: boolean; onClose: () => void; };

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({ current: '', newPass: '', confirm: '' });
  const { user } = useUser();

  const handleSave = () => {
    let hasError = false;
    const newErrors = { current: '', newPass: '', confirm: '' };

    if (!current) {
      newErrors.current = 'Current password is required';
      hasError = true;
    } else {
      // check current password against dummy data
      const matchedUser = DUMMY_USERS.find(
        u => u.email === user.email && u.hashed_password === current
      );
      if (!matchedUser) {
        newErrors.current = 'Current password is incorrect';
        hasError = true;
      }
    }

    if (newPass.length < 8) {
      newErrors.newPass = 'Password must be at least 8 characters';
      hasError = true;
    }

    if (newPass !== confirm) {
      newErrors.confirm = 'Passwords do not match';
      hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    // update password in dummy data
    const userIndex = DUMMY_USERS.findIndex(u => u.email === user.email);
    if (userIndex !== -1) {
      DUMMY_USERS[userIndex].hashed_password = newPass;
    }

    Alert.alert('Success', 'Password changed successfully.');
    setCurrent(''); setNewPass(''); setConfirm('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeArrow}>‹</Text>
            <Text style={styles.closeText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Change Password</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={[styles.input, errors.current ? styles.inputError : null]}
                value={current}
                onChangeText={v => { setCurrent(v); setErrors(e => ({ ...e, current: '' })); }}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#9ca3af"
              />
              {errors.current ? <Text style={styles.errorText}>{errors.current}</Text> : null}

              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={[styles.input, errors.newPass ? styles.inputError : null]}
                value={newPass}
                onChangeText={v => { setNewPass(v); setErrors(e => ({ ...e, newPass: '' })); }}
                secureTextEntry
                placeholder="At least 8 characters"
                placeholderTextColor="#9ca3af"
              />
              {errors.newPass ? <Text style={styles.errorText}>{errors.newPass}</Text> : null}

              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={[styles.input, errors.confirm ? styles.inputError : null]}
                value={confirm}
                onChangeText={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })); }}
                secureTextEntry
                placeholder="Re-enter new password"
                placeholderTextColor="#9ca3af"
              />
              {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
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
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  closeText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60 },
  navSpacer: { width: 60 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});