import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert, TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from '../../../ui/Navbar';
import PaymentModal from '@/components/Payment/PaymentModal';
import { useUser } from '@/context/UserContext';
import { API_URL, getAuthHeaders } from '@/constants/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  promoCode?: string;
  promoDiscount?: number;
};

type SubInfo = {
  subscription_id: number;
  plan: string;
  status: string;
  price: number;
  currency: string;
  start_at: string;
  end_at: string;
  cancelled_at: string | null;
};

const PLANS = [
  {
    id: 'freemium',
    name: 'Freemium',
    priceRaw: 0,
    period: 'forever',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    features: [
      'Basic meal logging up to 3 meals/day',
      'Manual calorie and nutrition tracking',
      'Daily calorie and nutrition summary',
      'Food database search',
      'Basic recipe search',
      'Barcode scanning',
      'Water intake tracking',
      'Weight goal setting and tracking',
      'Progress reports',
      'Limited meal recommendations (2 days/week)',
      'General healthy eating tips',
      'Edit profile, change password',
      'Log out and delete account',
    ],
    missing: [
      'AI photo meal recognition',
      'Unlimited meal recommendations',
      'Meal plan with grocery lists',
      'Advanced food filtering',
      'Macro adjustment to the gram',
      'Certified nutritionist tips',
      'Save favourite meals',
      'No ads',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceRaw: 9.90,
    period: 'per month',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#7c3aed',
    popular: true,
    features: [
      'Everything in Freemium',
      'AI photo meal recognition',
      'Unlimited personalized meal recommendations',
      'Meal plan creation with grocery lists',
      'Advanced food filtering',
      'Macro adjustment to the gram',
      'Certified nutritionist tips',
      'Save favourite meals',
      'Dietary reports with visualizations',
      'No ads',
      'Priority customer support',
      'Cancel anytime',
    ],
    missing: [],
  },
  {
    id: 'premium_annual',
    name: 'Premium Annual',
    priceRaw: 99.00,
    period: 'per year',
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#10b981',
    tag: 'Save 28%',
    features: [
      'Everything in Premium',
      'Best value plan',
      'Priority customer support',
      'Early access to new features',
      'Cancel anytime',
    ],
    missing: [],
  },
];

function applyDiscount(priceRaw: number, discountPercent: number): string {
  const discounted = priceRaw * (1 - discountPercent / 100);
  return `S$${discounted.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function SubscriptionModal({ visible, onClose, promoCode, promoDiscount }: Props) {
  const { user, setUser } = useUser();
  const [selected, setSelected] = useState('freemium');
  const [codeInput, setCodeInput] = useState(promoCode ?? '');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(promoDiscount ?? 0);
  const [codeApplied, setCodeApplied] = useState(!!promoCode);
  const [showPayment, setShowPayment] = useState(false);
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch active subscription info whenever modal opens
  useEffect(() => {
    if (!visible) return;
    (async () => {
      setSubLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/subscriptions/my`, {
          headers: getAuthHeaders(token),
        });
        if (!res.ok) return;
        const data: SubInfo = await res.json();
        if (data.status === 'active' || data.status === 'cancelling') {
          setSubInfo(data);
        } else {
          setSubInfo(null);
        }
      } catch (e) {
        console.error('Failed to fetch subscription info:', e);
      } finally {
        setSubLoading(false);
      }
    })();
  }, [visible]);

  useEffect(() => {
    if (promoCode) {
      setCodeInput(promoCode);
      setAppliedDiscount(promoDiscount ?? 0);
      setCodeApplied(true);
    }
  }, [promoCode, promoDiscount]);

  function handleApplyCode() {
    if (promoCode && codeInput.trim().toUpperCase() === promoCode.toUpperCase()) {
      setAppliedDiscount(promoDiscount ?? 0);
      setCodeApplied(true);
      Alert.alert('Code Applied!', `${promoDiscount}% discount has been applied to all paid plans.`);
    } else {
      setCodeApplied(false);
      setAppliedDiscount(0);
      Alert.alert('Invalid Code', 'The promo code you entered is not valid.');
    }
  }

  function getDisplayPrice(plan: typeof PLANS[0]): { current: string; original: string | null } {
    if (plan.priceRaw === 0) return { current: 'S$0', original: null };
    if (codeApplied && appliedDiscount > 0) {
      return {
        current: applyDiscount(plan.priceRaw, appliedDiscount),
        original: `S$${plan.priceRaw.toFixed(2)}`,
      };
    }
    return { current: `S$${plan.priceRaw.toFixed(2)}`, original: null };
  }

  function isCurrentPlan(planId: string): boolean {
    if (user.role === 'premium' && planId === 'premium') return true;
    if (user.role === 'premium_annual' && planId === 'premium_annual') return true;
    if ((user.role === 'freemium' || user.role === '') && planId === 'freemium') return true;
    return false;
  }

  function isLocked(planId: string): boolean {
    if (user.role === 'premium_annual' && planId === 'premium') return true;
    return isCurrentPlan(planId);
  }

  async function handleCancelSubscription() {
    Alert.alert(
      'Cancel Subscription',
      'Your subscription will remain active until the end of the billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Anyway',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;
              const res = await fetch(`${API_URL}/subscriptions/cancel`, {
                method: 'POST',
                headers: getAuthHeaders(token),
              });
              if (res.ok) {
                Alert.alert('Cancelled', 'Your subscription has been scheduled for cancellation.');
                setSubInfo(prev => prev ? { ...prev, status: 'cancelling' } : prev);
              } else {
                const data = await res.json().catch(() => ({}));
                Alert.alert('Error', data.detail || 'Failed to cancel. Please try again.');
              }
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <Navbar title="Subscription" onClose={onClose} />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.heroBox}>
              <Text style={styles.heroTitle}>Choose Your Plan</Text>
              <Text style={styles.heroSub}>
                Upgrade anytime to unlock the full NutriTrack experience
              </Text>
            </View>

            {/* ── Active Subscription Card ── */}
            {subLoading && (
              <View style={styles.activeSubCard}>
                <ActivityIndicator color="#7c3aed" />
              </View>
            )}

            {!subLoading && subInfo && (
              <View style={styles.activeSubCard}>
                <Text style={styles.activeSubTitle}>📋 Your Active Subscription</Text>

                <View style={styles.activeSubRow}>
                  <Text style={styles.activeSubLabel}>Plan</Text>
                  <Text style={styles.activeSubValue}>
                    {subInfo.plan === 'monthly' ? 'Premium Monthly' : 'Premium Annual'}
                  </Text>
                </View>

                <View style={styles.activeSubDivider} />

                <View style={styles.activeSubRow}>
                  <Text style={styles.activeSubLabel}>Start Date</Text>
                  <Text style={styles.activeSubValue}>{formatDate(subInfo.start_at)}</Text>
                </View>

                <View style={styles.activeSubDivider} />

                <View style={styles.activeSubRow}>
                  <Text style={styles.activeSubLabel}>End Date</Text>
                  <Text style={styles.activeSubValue}>{formatDate(subInfo.end_at)}</Text>
                </View>

                {subInfo.status === 'cancelling' ? (
                  <View style={styles.cancellingBadge}>
                    <Text style={styles.cancellingText}>
                      ⚠️ Cancels on {formatDate(subInfo.end_at)} — access remains until then
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
                    onPress={handleCancelSubscription}
                    disabled={cancelling}
                  >
                    {cancelling
                      ? <ActivityIndicator color="#ef4444" />
                      : <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Promo code banner */}
            <View style={styles.promoBox}>
              <Text style={styles.promoLabel}>🎟️ Have a promo code?</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={[styles.promoInput, codeApplied && styles.promoInputApplied]}
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder="Enter code"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  editable={!codeApplied}
                />
                {codeApplied ? (
                  <TouchableOpacity
                    style={[styles.promoBtn, styles.promoBtnRemove]}
                    onPress={() => {
                      setCodeInput('');
                      setAppliedDiscount(0);
                      setCodeApplied(false);
                    }}
                  >
                    <Text style={styles.promoBtnRemoveText}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.promoBtn} onPress={handleApplyCode}>
                    <Text style={styles.promoBtnText}>Apply</Text>
                  </TouchableOpacity>
                )}
              </View>
              {codeApplied && (
                <Text style={styles.promoSuccess}>
                  ✓ {appliedDiscount}% discount applied to all paid plans!
                </Text>
              )}
            </View>

            {PLANS.map(plan => {
              const { current, original } = getDisplayPrice(plan);
              const locked = isLocked(plan.id);
              const current_plan = isCurrentPlan(plan.id);

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { backgroundColor: plan.bg, borderColor: plan.border },
                    selected === plan.id && styles.planCardSelected,
                    locked && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (locked) {
                      Alert.alert(
                        'Already Subscribed',
                        current_plan
                          ? `You are already on the ${plan.name} plan.`
                          : 'You cannot downgrade to this plan.'
                      );
                      return;
                    }
                    setSelected(plan.id);
                  }}
                  activeOpacity={locked ? 1 : 0.85}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                      {current_plan && (
                        <View style={[styles.popularBadge, { backgroundColor: '#d1fae5' }]}>
                          <Text style={[styles.popularText, { color: '#059669' }]}>Current Plan</Text>
                        </View>
                      )}
                      {!current_plan && plan.popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>Most Popular</Text>
                        </View>
                      )}
                      {plan.tag && (
                        <View style={[styles.popularBadge, { backgroundColor: '#d1fae5' }]}>
                          <Text style={[styles.popularText, { color: '#059669' }]}>{plan.tag}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.priceRow}>
                      {original && (
                        <Text style={styles.originalPrice}>{original}</Text>
                      )}
                      <Text style={[styles.price, { color: plan.color }]}>{current}</Text>
                      <Text style={styles.period}> / {plan.period}</Text>
                    </View>
                    {original && (
                      <View style={styles.discountTag}>
                        <Text style={styles.discountTagText}>{appliedDiscount}% OFF with code</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.featureList}>
                    {plan.features.map(f => (
                      <View key={f} style={styles.featureRow}>
                        <Text style={[styles.featureIcon, { color: plan.color }]}>✓</Text>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                    {plan.missing.map(f => (
                      <View key={f} style={styles.featureRow}>
                        <Text style={styles.missingIcon}>✕</Text>
                        <Text style={styles.missingText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[
                    styles.selectIndicator,
                    selected === plan.id && { backgroundColor: plan.color }
                  ]}>
                    {selected === plan.id && (
                      <Text style={styles.selectCheck}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.ctaBtn,
                {
                  backgroundColor:
                    selected === 'freemium' ? '#6b7280' :
                    selected === 'premium'  ? '#7c3aed' : '#10b981'
                }
              ]}
              onPress={() => {
                if (selected === 'freemium') {
                  Alert.alert('Freemium Plan', 'You are already on the Freemium plan.');
                  return;
                }
                if (isLocked(selected)) {
                  Alert.alert('Already Subscribed', 'You already have an active subscription for this plan.');
                  return;
                }
                setShowPayment(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>
                {selected === 'freemium'
                  ? 'Continue with Freemium'
                  : `Upgrade to ${selected === 'premium' ? 'Premium' : 'Premium Annual'}`}
              </Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Payments are processed securely. You can cancel your Premium subscription at any time.
            </Text>
          </View>
        </ScrollView>

        <PaymentModal
          visible={showPayment}
          onClose={() => setShowPayment(false)}
          planId={selected as 'premium' | 'premium_annual'}
          planName={PLANS.find(p => p.id === selected)!.name}
          amountDue={(() => {
            const plan = PLANS.find(p => p.id === selected)!;
            return codeApplied && appliedDiscount > 0
              ? parseFloat((plan.priceRaw * (1 - appliedDiscount / 100)).toFixed(2))
              : plan.priceRaw;
          })()}
          originalAmount={PLANS.find(p => p.id === selected)!.priceRaw}
          promoCode={codeApplied ? codeInput : null}
          discountPercent={appliedDiscount}
          onSuccess={(newRole) => {
            setShowPayment(false);
            const resolvedRole = selected === 'premium_annual' ? 'premium_annual' : newRole;
            setUser({ ...user, role: resolvedRole });
            Alert.alert('🎉 Subscribed!', `You are now on ${newRole}!`);
            onClose();
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },

  // ── Active Subscription Card ──
  activeSubCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activeSubTitle: {
    fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12,
  },
  activeSubRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
  },
  activeSubDivider: { height: 1, backgroundColor: '#f3f4f6' },
  activeSubLabel: { fontSize: 13, color: '#6b7280' },
  activeSubValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  cancelBtn: {
    marginTop: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  cancelBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  cancellingBadge: {
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  cancellingText: { color: '#92400e', fontWeight: '600', fontSize: 13, textAlign: 'center' },

  // ── Promo ──
  promoBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  promoLabel: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  promoRow: { flexDirection: 'row', gap: 8 },
  promoInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#111827',
  },
  promoInputApplied: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  promoBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  promoBtnRemove: { backgroundColor: '#fee2e2' },
  promoBtnRemoveText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  promoSuccess: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 8 },

  // ── Hero ──
  heroBox: { alignItems: 'center', marginBottom: 20, paddingVertical: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  heroSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  // ── Plan cards ──
  planCard: {
    borderRadius: 20, borderWidth: 2, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  planCardSelected: { shadowOpacity: 0.12, elevation: 6 },
  planHeader: { marginBottom: 14 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planName: { fontSize: 18, fontWeight: '800' },
  popularBadge: { backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  popularText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  originalPrice: { fontSize: 16, color: '#9ca3af', textDecorationLine: 'line-through' },
  price: { fontSize: 28, fontWeight: '800' },
  period: { fontSize: 13, color: '#6b7280' },
  discountTag: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#dcfce7', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  discountTagText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureIcon: { fontSize: 14, fontWeight: '700', width: 16 },
  featureText: { fontSize: 13, color: '#374151', flex: 1 },
  missingIcon: { fontSize: 13, color: '#d1d5db', width: 16 },
  missingText: { fontSize: 13, color: '#9ca3af', flex: 1 },
  selectIndicator: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#d1d5db',
    alignSelf: 'flex-end', marginTop: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  selectCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── CTA ──
  ctaBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 4, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', lineHeight: 18 },
});
