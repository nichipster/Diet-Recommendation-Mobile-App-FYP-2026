import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import NutritionContent from '../nutritionist_section/NutritionistContent';

const FILTERS = ['All', 'Weight Loss', 'Sports', 'Vegan', 'Diabetes'];

export const NUTRITIONISTS = [
  {
    id: 1,
    initials: 'SL',
    avatarColor: '#10b981',
    name: 'Dr. Sarah Lim',
    specialisation: 'Sports & Weight Management',
    credentials: 'RD, MSc Nutrition',
    rating: 4.9,
    reviews: 128,
    tags: ['Weight Loss', 'Sports Nutrition', 'Meal Planning'],
    tip: 'Eating protein within 30 minutes after a workout helps muscle recovery. Aim for 20–30g per session...',
    diaryFeedback: 'Your protein intake has been low this week. Try adding eggs or Greek yoghurt at breakfast.',
    review: {
      stars: 5,
      text: 'Very helpful session. Dr. Sarah gave me a clear meal plan that actually worked.',
    },
    filters: ['Weight Loss', 'Sports'],
  },
  {
    id: 2,
    initials: 'MK',
    avatarColor: '#3b82f6',
    name: 'Mr. Marcus Koh',
    specialisation: 'Vegan & Plant-Based Diets',
    credentials: 'RD, Plant-Based Cert.',
    rating: 4.7,
    reviews: 94,
    tags: ['Vegan', 'Plant-Based'],
    tip: 'Combining rice and lentils gives you a complete protein profile — great for plant-based eaters...',
    diaryFeedback: null,
    review: {
      stars: 5,
      text: 'Very helpful session. Marcus gave practical advice for my vegan diet.',
    },
    filters: ['Vegan'],
  },
  {
    id: 3,
    initials: 'PN',
    avatarColor: '#f97316',
    name: 'Ms. Priya Nair',
    specialisation: 'Diabetes & Metabolic Health',
    credentials: 'RD, CDE',
    rating: 4.8,
    reviews: 76,
    tags: ['Diabetes', 'Low GI', 'Metabolic Health'],
    tip: 'Choosing low GI foods helps stabilise blood sugar. Swap white rice for brown rice or quinoa...',
    diaryFeedback: null,
    review: null,
    filters: ['Diabetes'],
  },
];

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Weight Loss':     { bg: '#d1fae5', text: '#065f46' },
  'Sports Nutrition':{ bg: '#dbeafe', text: '#1e40af' },
  'Meal Planning':   { bg: '#ede9fe', text: '#5b21b6' },
  'Vegan':           { bg: '#d1fae5', text: '#065f46' },
  'Plant-Based':     { bg: '#dbeafe', text: '#1e40af' },
  'Diabetes':        { bg: '#fef3c7', text: '#92400e' },
  'Low GI':          { bg: '#dbeafe', text: '#1e40af' },
  'Metabolic Health':{ bg: '#ede9fe', text: '#5b21b6' },
};

function StarRow({ count }: { count: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(s => (
        <Text key={s} style={[styles.star, s <= count && styles.starFilled]}>★</Text>
      ))}
    </View>
  );
}

export default function ConsultScreen() {
  const { user, isPremium } = useUser();
  const role = (user?.role || '').toLowerCase().trim();

  const isNutritionist = role === 'nutritionist';
  const canEdit = isNutritionist; // Only nutritionists can edit content 

  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dataAccessEnabled, setDataAccessEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'consult' | 'content'>('consult');

  const filtered = NUTRITIONISTS.filter(n => {
    const matchesFilter = activeFilter === 'All' || n.filters.includes(activeFilter);
    const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.specialisation.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Consult</Text>
          <Text style={styles.headerSub}>
            {isPremium
              ? 'Your certified nutrition team'
              : 'Discover verified nutritionists'}
          </Text>
        </View>

        <View style={styles.topTabs}>
         <TouchableOpacity onPress={() => setActiveTab('consult')}>
          <Text style={[styles.topTabText, activeTab === 'consult' && styles.topTabActive]}>
            Consult
           </Text>
          </TouchableOpacity>

         <TouchableOpacity onPress={() => setActiveTab('content')}>
          <Text style={[styles.topTabText, activeTab === 'content' && styles.topTabActive]}>
          Nutrition Library
          </Text>
          </TouchableOpacity>
          </View>

        {activeTab === 'consult' ? (
          <ScrollView showsVerticalScrollIndicator={false}>
           <View style={styles.content}>

          {/* Upgrade banner — freemium only */}
          {!isPremium && (
            <View style={styles.upgradeBanner}>
              <View style={styles.upgradeBannerIcon}>
                <Text style={styles.upgradeBannerIconText}>💎</Text>
              </View>
              <View style={styles.upgradeBannerText}>
                <Text style={styles.upgradeBannerTitle}>Unlock live consultations</Text>
                <Text style={styles.upgradeBannerSub}>Book sessions with certified nutritionists</Text>
              </View>
              <TouchableOpacity style={styles.upgradeBannerBtn}>
                <Text style={styles.upgradeBannerBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Data access toggle — premium only */}
          {isPremium && (
            <View style={styles.toggleCard}>
              <Text style={styles.toggleIcon}>🔐</Text>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Nutritionist data access</Text>
                <Text style={styles.toggleSub}>Allow assigned nutritionist to view your logs</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, dataAccessEnabled && styles.toggleOn]}
                onPress={() => setDataAccessEnabled(!dataAccessEnabled)}
              >
                <View style={[styles.toggleThumb, dataAccessEnabled && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Search */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search nutritionists..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
            style={styles.pillsScroll}
          >
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, activeFilter === f && styles.pillActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Verified nutritionists</Text>

          {/* Nutritionist cards */}
          {filtered.map(n => (
            <View key={n.id} style={styles.nutCard}>

              {/* Top row */}
              <View style={styles.nutTop}>
                <View style={[styles.nutAvatar, { backgroundColor: n.avatarColor }]}>
                  <Text style={styles.nutAvatarText}>{n.initials}</Text>
                </View>
                <View style={styles.nutInfo}>
                  <Text style={styles.nutName}>{n.name}</Text>
                  <Text style={styles.nutSpec}>{n.specialisation}</Text>
                  <View style={styles.nutCred}>
                    <View style={styles.verifiedDot} />
                    <Text style={styles.nutCredText}>Verified · {n.credentials}</Text>
                  </View>
                </View>
                <View style={styles.nutRating}>
                  <Text style={styles.nutRatingText}>★ {n.rating}</Text>
                  <Text style={styles.nutReviews}>({n.reviews})</Text>
                </View>
              </View>

              {/* Tags */}
              <View style={styles.tagRow}>
                {n.tags.map(tag => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: TAG_COLORS[tag]?.bg || '#f3f4f6' }]}
                  >
                    <Text style={[styles.tagText, { color: TAG_COLORS[tag]?.text || '#374151' }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Tip preview */}
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>💡 Tip from {n.name.split(' ')[1]}</Text>
                <Text style={styles.tipText}>{n.tip}</Text>
                <Text style={styles.tipMore}>Read more →</Text>
              </View>

              {/* Diary feedback — premium only */}
              {isPremium && n.diaryFeedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>📝 Feedback on your diary — Yesterday</Text>
                  <Text style={styles.feedbackText}>{n.diaryFeedback}</Text>
                </View>
              )}

              {/* Review — premium only, if completed */}
              {isPremium && n.review && (
                <View style={styles.reviewBox}>
                  <Text style={styles.reviewLabel}>Your review</Text>
                  <StarRow count={n.review.stars} />
                  <Text style={styles.reviewText}>{n.review.text}</Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.nutBottom}>
                <TouchableOpacity style={styles.btnOutline}>
                  <Text style={styles.btnOutlineText}>View profile</Text>
                </TouchableOpacity>
                {isPremium ? (
                  <TouchableOpacity style={styles.btnPrimary}>
                    <Text style={styles.btnPrimaryText}>Book session</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.btnLocked}>
                    <Text style={styles.btnLockedText}>🔒 Book session</Text>
                  </View>
                )}
              </View>

            </View>
          ))}

          {/* Booking preview — freemium only */}
          {!isPremium && (
            <View>
              <Text style={styles.sectionLabel}>How booking works</Text>
              <View style={styles.bookingPreview}>
                <Text style={styles.bookingTitle}>📅 Book a live text consultation</Text>
                <Text style={styles.bookingSub}>
                  Choose a time slot that works for you and chat directly with your nutritionist
                </Text>
                <View style={styles.slotsRow}>
                  {['9:00 AM', '10:30 AM', '2:00 PM', '4:30 PM'].map((slot, i) => (
                    <View
                      key={slot}
                      style={[styles.slot, i < 3 && styles.slotLocked]}
                    >
                      <Text style={[styles.slotText, i < 3 && styles.slotTextLocked]}>
                        {slot}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.bookingUpgrade}>
                  <Text style={styles.bookingUpgradeText}>
                    💎 Upgrade to Premium to book sessions
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
      ) : (
      <NutritionContent 
        onBack={() => setActiveTab('consult')} 
        canEdit={canEdit}
        isPremium={isPremium}
       />
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  safeArea: { backgroundColor: '#10b981' },

  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  content: { padding: 16, paddingBottom: 40 },

  /* Upgrade banner */
  upgradeBanner: {
    backgroundColor: '#10b981', borderRadius: 14,
    padding: 14, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  upgradeBannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  upgradeBannerIconText: { fontSize: 18 },
  upgradeBannerText: { flex: 1 },
  upgradeBannerTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  upgradeBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  upgradeBannerBtn: {
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  upgradeBannerBtnText: { fontSize: 12, fontWeight: '700', color: '#10b981' },

  /* Data access toggle */
  toggleCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 0.5, borderColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  toggleIcon: { fontSize: 20 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#6b7280' },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: '#e5e7eb', padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: '#10b981' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  /* Search */
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  /* Pills */
  pillsScroll: { marginBottom: 14 },
  pillsRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12,
  },

  /* Nutritionist card */
  nutCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  nutTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  nutAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nutAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nutInfo: { flex: 1 },
  nutName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  nutSpec: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  nutCred: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  nutCredText: { fontSize: 10, color: '#10b981', fontWeight: '600' },
  nutRating: { alignItems: 'flex-end' },
  nutRatingText: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  nutReviews: { fontSize: 10, color: '#9ca3af' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 10, fontWeight: '700' },

  /* Tip */
  tipBox: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: '#10b981',
    marginBottom: 10,
  },
  tipLabel: { fontSize: 10, fontWeight: '700', color: '#10b981', marginBottom: 3 },
  tipText: { fontSize: 12, color: '#374151', lineHeight: 18 },
  tipMore: { fontSize: 10, color: '#10b981', fontWeight: '600', marginTop: 3 },

  /* Diary feedback */
  feedbackBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: '#10b981',
    marginBottom: 10,
  },
  feedbackLabel: { fontSize: 10, fontWeight: '700', color: '#065f46', marginBottom: 3 },
  feedbackText: { fontSize: 12, color: '#374151', lineHeight: 18 },

  /* Review */
  reviewBox: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    padding: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  reviewLabel: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 },
  starRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  star: { fontSize: 14, color: '#e5e7eb' },
  starFilled: { color: '#fbbf24' },
  reviewText: { fontSize: 11, color: '#6b7280', lineHeight: 16 },

  /* Buttons */
  nutBottom: { flexDirection: 'row', gap: 8 },
  btnOutline: {
    flex: 1, borderWidth: 1, borderColor: '#10b981',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: '#10b981' },
  btnPrimary: {
    flex: 1, backgroundColor: '#10b981',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  btnLocked: {
    flex: 1, backgroundColor: '#f3f4f6',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
  },
  btnLockedText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },

  /* Booking preview */
  bookingPreview: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#10b981',
    borderStyle: 'dashed', padding: 14, marginBottom: 14,
  },
  bookingTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  bookingSub: { fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 16 },
  slotsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  slot: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  slotLocked: { borderColor: '#d1fae5', backgroundColor: '#f0fdf4' },
  slotText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  slotTextLocked: { color: '#10b981' },
  bookingUpgrade: {
    backgroundColor: '#f0fdf4', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: '#d1fae5',
    alignItems: 'center',
  },
  bookingUpgradeText: { fontSize: 12, color: '#065f46', fontWeight: '600' },

  topTabs: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 20,
  backgroundColor: '#10b981',
  paddingBottom: 10,
},

topTabText: {
  color: 'rgba(255,255,255,0.7)',
  fontWeight: '600',
},

topTabActive: {
  color: '#fff',
  fontWeight: '800',
},
});
