import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Alert
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PLANS = [
  {
    id: 'freemium',
    name: 'Freemium',
    price: 'S$0',
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
    price: 'S$6.99',
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
    price: 'S$59.99',
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

export default function SubscriptionModal({ visible, onClose }: Props) {
  const [selected, setSelected] = useState('freemium');

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeArrow}>‹</Text>
            <Text style={styles.closeText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Subscription</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            <View style={styles.heroBox}>
              <Text style={styles.heroTitle}>Choose Your Plan</Text>
              <Text style={styles.heroSub}>
                Upgrade anytime to unlock the full NutriTrack experience
              </Text>
            </View>

            {PLANS.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: plan.bg, borderColor: plan.border },
                  selected === plan.id && styles.planCardSelected,
                ]}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.85}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planTitleRow}>
                    <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                    {plan.popular && (
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
                    <Text style={[styles.price, { color: plan.color }]}>{plan.price}</Text>
                    <Text style={styles.period}> / {plan.period}</Text>
                  </View>
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
            ))}

            <TouchableOpacity
              style={[
                styles.ctaBtn,
                {
                  backgroundColor:
                    selected === 'freemium'       ? '#6b7280' :
                    selected === 'premium'        ? '#7c3aed' : '#10b981'
                }
              ]}
              onPress={() => {
                if (selected === 'freemium') {
                  Alert.alert('Freemium Plan', 'You are already on the Freemium plan.');
                } else {
                  Alert.alert(
                    'Upgrade',
                    `Upgrade to ${selected === 'premium' ? 'Premium' : 'Premium Annual'} coming soon!`
                  );
                }
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
  navTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  navSpacer: { width: 60 },
  content: { padding: 16, paddingBottom: 40 },
  heroBox: {
    alignItems: 'center', marginBottom: 20, paddingVertical: 16,
  },
  heroEmoji: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  heroSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  planCard: {
    borderRadius: 20, borderWidth: 2,
    padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  planCardSelected: { shadowOpacity: 0.12, elevation: 6 },
  planHeader: { marginBottom: 14 },
  planTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 4,
  },
  planName: { fontSize: 18, fontWeight: '800' },
  popularBadge: {
    backgroundColor: '#ede9fe', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  popularText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 28, fontWeight: '800' },
  period: { fontSize: 13, color: '#6b7280' },
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
  ctaBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    textAlign: 'center', fontSize: 12,
    color: '#9ca3af', lineHeight: 18,
  },
});