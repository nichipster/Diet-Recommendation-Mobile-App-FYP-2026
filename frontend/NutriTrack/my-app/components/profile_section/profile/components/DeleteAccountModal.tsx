import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { API_URL } from '../../../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../../../context/UserContext';
import Navbar from '../../../ui/Navbar';
import FormField from '../cards/FormField';

type Props = { visible: boolean; onClose: () => void; };

export default function DeleteAccountModal({ visible, onClose }: Props) {
  const [confirmation, setConfirmation] = useState('');
  const { user, setUser } = useUser();

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.status === 204) {
        await AsyncStorage.removeItem('token');
        setUser({
          firstName: '', lastName: '', email: '',
          token: '',
          gender: '', age: '', height: '', weight: '',
          goal: '', goalWeight: '', activityLevel: '',
          cardioPerWeek: '', isVegan: false, allergies: [],
        });
        Alert.alert('Account Deleted', 'Your account has been deleted.', [
          { text: 'OK', onPress: () => router.replace('/loginmain' as any) }
        ]);
        return;
      }

      const data = await response.json();
      if (response.status === 401) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        router.replace('/loginmain' as any);
      } else {
        Alert.alert('Error', data.detail || 'Something went wrong.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <Navbar title="Delete Account" onClose={onClose} />

        <View style={styles.content}>
          <View style={styles.warningBox}>
            <Text style={styles.warningEmoji}>⚠️</Text>
            <Text style={styles.warningTitle}>This action is permanent</Text>
            <Text style={styles.warningSub}>
              Deleting your account will permanently remove all your data including meals, goals, and progress. This cannot be undone.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>
              Type <Text style={styles.deleteWord}>DELETE</Text> to confirm
            </Text>
            <FormField
              label=""
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Type DELETE here"
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteBtn, confirmation !== 'DELETE' && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <Text style={styles.deleteBtnText}>Delete My Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingTop: 24 },
  warningBox: {
    backgroundColor: '#fef2f2', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  warningEmoji: { fontSize: 40, marginBottom: 12 },
  warningTitle: { fontSize: 18, fontWeight: '800', color: '#dc2626', marginBottom: 8 },
  warningSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  deleteWord: { color: '#ef4444', fontWeight: '800' },
  deleteBtn: {
    backgroundColor: '#ef4444', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  deleteBtnDisabled: { backgroundColor: '#fca5a5' },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', backgroundColor: '#fff',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
});