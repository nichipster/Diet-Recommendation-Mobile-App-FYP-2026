import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from '../../../ui/Navbar';
import { API_URL, getAuthHeaders } from '@/constants/api';

type Transaction = {
  id: number;
  type: string;
  status: string;
  plan: string | null;
  amount: number;
  currency: string;
  created_at: string;
  message: string | null;
};

type Props = { visible: boolean; onClose: () => void };

const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  checkout: { label: 'Payment',      color: '#059669', bg: '#f0fdf4' },
  cancel:   { label: 'Cancellation', color: '#dc2626', bg: '#fef2f2' },
  refund:   { label: 'Refund',       color: '#7c3aed', bg: '#f5f3ff' },
};

export default function TransactionHistoryModal({ visible, onClose }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/subscriptions/transactions`, {
          headers: getAuthHeaders(token),
        });
        if (res.ok) setTransactions(await res.json());
      } catch (e) {
        console.error('Failed to fetch transactions:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <Navbar title="Transaction History" onClose={onClose} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {loading && <ActivityIndicator color="#7c3aed" style={{ marginTop: 40 }} />}

            {!loading && transactions.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🧾</Text>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySub}>Your billing history will appear here.</Text>
              </View>
            )}

            {!loading && transactions.map(tx => {
              const typeStyle = TYPE_STYLES[tx.type] ?? { label: tx.type, color: '#6b7280', bg: '#f9fafb' };
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txRow}>
                    <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                      <Text style={[styles.typeText, { color: typeStyle.color }]}>{typeStyle.label}</Text>
                    </View>
                    <Text style={styles.txAmount}>
                      {tx.amount === 0 ? '—' : `${tx.currency} ${tx.amount.toFixed(2)}`}
                    </Text>
                  </View>
                  {tx.plan && (
                    <Text style={styles.txPlan}>
                      {tx.plan === 'monthly' ? 'Premium Monthly' : 'Premium Annual'}
                    </Text>
                  )}
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                  {tx.message && <Text style={styles.txMessage}>{tx.message}</Text>}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32,
    alignItems: 'center', marginTop: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  txCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700' },
  txAmount: { fontSize: 16, fontWeight: '800', color: '#111827' },
  txPlan: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 4 },
  txDate: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  txMessage: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
});