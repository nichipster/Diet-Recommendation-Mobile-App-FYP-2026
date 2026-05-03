// components/modals/PaymentModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from '../ui/Navbar';
import { checkoutSubscription } from '@/constants/subscriptionService';

type Props = {
  visible: boolean;
  onClose: () => void;
  planId: 'premium' | 'premium_annual';
  planName: string;
  amountDue: number;
  originalAmount: number;
  promoCode: string | null;
  discountPercent: number;
  onSuccess: (role: string) => void;
};

type CardDetails = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

type TxnRecord = {
  transaction_id: string;
  plan_id: string;
  amount_paid: number;
  promo_code: string | null;
  card_last4: string;
  status: 'success' | 'failed';
  created_at: string;
};

function generateTxnId() {
  return 'txn_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

export default function PaymentModal({
  visible, onClose, planId, planName,
  amountDue, originalAmount, promoCode, discountPercent, onSuccess,
}: Props) {
  const [card, setCard] = useState<CardDetails>({ holder: '', number: '', expiry: '', cvv: '' });
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form');
  const [txnRecord, setTxnRecord] = useState<TxnRecord | null>(null);
  const [cardErrors, setCardErrors] = useState<{ holder?: string }>({});

  function validate(): string | null {
    if (!card.holder.trim()) return 'Please enter card holder name.';
    if (cardErrors.holder) return cardErrors.holder;

    const digits = card.number.replace(/\s/g, '');
    if (digits.length !== 16) return 'Card number must be 16 digits.';

    if (card.cvv.length < 3) return 'CVV must be 3–4 digits.';

    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return 'Enter expiry as MM/YY.';

    const [mm, yy] = card.expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) return 'Invalid expiry month.';

    const fullYear = 2000 + yy;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (fullYear < currentYear) return 'Card has expired.';
    if (fullYear === currentYear && mm < currentMonth) return 'Card has expired.';
    if (fullYear > currentYear + 20) return 'Invalid expiry year.';

    return null;
  }

  async function handlePay() {
    const err = validate();
    if (err) { Alert.alert('Invalid Details', err); return; }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Not logged in', 'No token found. Please log in again.');
      return;
    }
    setStep('processing');

    const digits = card.number.replace(/\s/g, '');
    const card_last4 = digits.slice(-4);
    const [expiryMonthStr, expiryYearStr] = card.expiry.split('/');

    const record: TxnRecord = {
      transaction_id: generateTxnId(),
      plan_id: planId,
      amount_paid: amountDue,
      promo_code: promoCode,
      card_last4,
      status: 'failed',
      created_at: new Date().toISOString(),
    };

    try {
      const data = await checkoutSubscription({
        plan: planId === 'premium' ? 'monthly' : 'annual',
        card_holder_name: card.holder,
        card_number: digits,
        expiry_month: parseInt(expiryMonthStr, 10),
        expiry_year: 2000 + parseInt(expiryYearStr, 10),
        cvv: card.cvv,
      });

      record.transaction_id = String(data.subscription_id);
      record.status = 'success';
      setTxnRecord(record);
      setStep('success');
      onSuccess(data.role ?? (planId === 'premium_annual' ? 'premium_annual' : 'premium'));

    } catch (err: any) {
      record.status = 'failed';
      setTxnRecord(record);
      setStep('failed');
      Alert.alert('Payment Failed', err.message ?? 'Something went wrong.');

    } finally {
      try {
        const existing = await AsyncStorage.getItem('transactions');
        const list: TxnRecord[] = existing ? JSON.parse(existing) : [];
        list.unshift(record);
        await AsyncStorage.setItem('transactions', JSON.stringify(list));
      } catch (_) {}
    }
  }

  function handleClose() {
    setStep('form');
    setCard({ holder: '', number: '', expiry: '', cvv: '' });
    setTxnRecord(null);
    setCardErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <Navbar title="Secure Payment" onClose={handleClose} />

        {step === 'form' && (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Order Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plan</Text>
                <Text style={styles.summaryValue}>{planName}</Text>
              </View>
              {promoCode && discountPercent > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Original Price</Text>
                    <Text style={[styles.summaryValue, styles.strikethrough]}>
                      S${originalAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Promo ({promoCode})</Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                      -{discountPercent}%
                    </Text>
                  </View>
                </>
              )}
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total Due</Text>
                <Text style={styles.totalValue}>S${amountDue.toFixed(2)}</Text>
              </View>
            </View>

            {/* Card Form */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>💳 Card Details</Text>

              <Text style={styles.label}>Card Holder Name</Text>
              <TextInput
                style={[styles.input, cardErrors.holder ? styles.inputError : null]}
                placeholder="John Doe"
                placeholderTextColor="#9ca3af"
                value={card.holder}
                onChangeText={t => {
                  setCard(c => ({ ...c, holder: t }));
                  if (/[^a-zA-Z\s'-]/.test(t)) {
                    setCardErrors(e => ({ ...e, holder: 'Name must not contain digits or symbols.' }));
                  } else {
                    setCardErrors(e => ({ ...e, holder: undefined }));
                  }
                }}
                autoCapitalize="words"
              />
              {cardErrors.holder && (
                <Text style={styles.fieldError}>{cardErrors.holder}</Text>
              )}

              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor="#9ca3af"
                value={card.number}
                onChangeText={t => setCard(c => ({ ...c, number: formatCardNumber(t) }))}
                keyboardType="numeric"
                maxLength={19}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Expiry (MM/YY)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor="#9ca3af"
                    value={card.expiry}
                    onChangeText={t => setCard(c => ({ ...c, expiry: formatExpiry(t) }))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="•••"
                    placeholderTextColor="#9ca3af"
                    value={card.cvv}
                    onChangeText={t => setCard(c => ({ ...c, cvv: t.replace(/\D/g, '').slice(0, 4) }))}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>

              <Text style={styles.secureNote}>🔒 Your payment details are encrypted and never stored.</Text>
            </View>

            <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
              <Text style={styles.payBtnText}>Pay S${amountDue.toFixed(2)}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === 'processing' && (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.processingText}>Processing your payment…</Text>
            <Text style={styles.processingSubText}>Please do not close the app</Text>
          </View>
        )}

        {step === 'success' && txnRecord && (
          <View style={styles.centeredState}>
            <Text style={styles.resultIcon}>✅</Text>
            <Text style={styles.resultTitle}>Payment Successful!</Text>
            <Text style={styles.resultSub}>Welcome to {planName}!</Text>

            <View style={styles.receiptBox}>
              <ReceiptRow label="Transaction ID" value={txnRecord.transaction_id} mono />
              <ReceiptRow label="Plan" value={planName} />
              <ReceiptRow label="Amount Paid" value={`S$${txnRecord.amount_paid.toFixed(2)}`} />
              {txnRecord.promo_code && <ReceiptRow label="Promo Code" value={txnRecord.promo_code} />}
              <ReceiptRow label="Card" value={`•••• ${txnRecord.card_last4}`} />
              <ReceiptRow label="Date" value={new Date(txnRecord.created_at).toLocaleString('en-SG')} />
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'failed' && txnRecord && (
          <View style={styles.centeredState}>
            <Text style={styles.resultIcon}>❌</Text>
            <Text style={styles.resultTitle}>Payment Failed</Text>
            <Text style={styles.resultSub}>Please check your card details and try again.</Text>

            <View style={styles.receiptBox}>
              <ReceiptRow label="Transaction ID" value={txnRecord.transaction_id} mono />
              <ReceiptRow label="Status" value="Failed" />
              <ReceiptRow label="Card" value={`•••• ${txnRecord.card_last4}`} />
            </View>

            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#ef4444' }]} onPress={() => setStep('form')}>
              <Text style={styles.doneBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={receiptStyles.row}>
      <Text style={receiptStyles.label}>{label}</Text>
      <Text style={[receiptStyles.value, mono && receiptStyles.mono]}>{value}</Text>
    </View>
  );
}

const receiptStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 13, color: '#6b7280' },
  value: { fontSize: 13, color: '#111827', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  summaryBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 13, color: '#374151', fontWeight: '600' },
  strikethrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#7c3aed' },
  cardBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardBoxTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 14, color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    fontSize: 11, color: '#ef4444', marginTop: 4,
  },
  row: { flexDirection: 'row' },
  secureNote: { fontSize: 11, color: '#9ca3af', marginTop: 12, textAlign: 'center' },
  payBtn: {
    backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#7c3aed', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  processingText: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 20 },
  processingSubText: { fontSize: 13, color: '#9ca3af', marginTop: 6 },
  resultIcon: { fontSize: 56, marginBottom: 16 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  resultSub: { fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  receiptBox: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 40, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelLink: { marginTop: 14 },
  cancelLinkText: { color: '#6b7280', fontSize: 14 },
});
