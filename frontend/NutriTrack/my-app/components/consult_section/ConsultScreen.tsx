import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { useBookings } from '../../context/BookingContext';
import NutritionContentFreemium from './NutritionistContentFreemium';
import NutritionContentPremium from './NutritionistContentPremium';
import { ViewNutritionistProfile } from '../consult_section/ViewNutritionistProfile';
import ViewNutritionistSchedule from '../consult_section/ViewNutritionistSchedule';

const FILTERS = ['All', 'Weight Loss', 'Sports', 'Vegan', 'Diabetes'];

// ─── Tag colours ──────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Weight Loss':      { bg: '#d1fae5', text: '#065f46' },
  'Sports Nutrition': { bg: '#dbeafe', text: '#1e40af' },
  'Meal Planning':    { bg: '#ede9fe', text: '#5b21b6' },
  'Vegan':            { bg: '#d1fae5', text: '#065f46' },
  'Plant-Based':      { bg: '#dbeafe', text: '#1e40af' },
  'Diabetes':         { bg: '#fef3c7', text: '#92400e' },
  'Low GI':           { bg: '#dbeafe', text: '#1e40af' },
  'Metabolic Health': { bg: '#ede9fe', text: '#5b21b6' },
};

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
    bio: 'Helping athletes and fitness enthusiasts recover and reach their weight goals with science-backed meal plans.',
    tags: ['Weight Loss', 'Sports Nutrition', 'Meal Planning'],
    tip: 'Eating protein within 30 minutes after a workout helps muscle recovery. Aim for 20–30g per session...',
    diaryFeedback: 'Your protein intake has been low this week. Try adding eggs or Greek yoghurt at breakfast.',
    review: { stars: 5, text: 'Very helpful session. Dr. Sarah gave me a clear meal plan that actually worked.' },
    filters: ['Weight Loss', 'Sports'],
    testimonial: 'Very helpful session. Dr. Sarah gave me a clear meal plan that actually worked.',
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
    bio: 'Guiding clients to thrive on vegan and plant-based diets with practical, balanced nutrition advice.',
    tags: ['Vegan', 'Plant-Based'],
    tip: 'Combining rice and lentils gives you a complete protein profile — great for plant-based eaters...',
    diaryFeedback: null,
    review: { stars: 5, text: 'Very helpful session. Marcus gave practical advice for my vegan diet.' },
    filters: ['Vegan'],
    testimonial: 'Very helpful session. Marcus gave practical advice for my vegan diet.',
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
    bio: 'Supporting diabetes and metabolic health through low-GI foods and personalised dietary strategies.',
    tags: ['Diabetes', 'Low GI', 'Metabolic Health'],
    tip: 'Choosing low GI foods helps stabilise blood sugar. Swap white rice for brown rice or quinoa...',
    diaryFeedback: null,
    review: null,
    filters: ['Diabetes'],
    testimonial: 'Her guidance on low-GI foods helped me better manage my blood sugar levels.',
  },
];
// ─── Star row ─────────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(s => (
        <Text key={s} style={[styles.star, s <= count && styles.starFilled]}>★</Text>
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConsultScreen() {

 const { getSlots } = useBookings();
 const nutritionistsWithSlots = NUTRITIONISTS.map(n => ({
  ...n,
  availableSlots: getSlots(n.id),
}));

  const { user, isPremium } = useUser();
  const { bookings, submitReview } = useBookings();
  const router = useRouter();

  const [viewingNutritionist, setViewingNutritionist] = useState<number | null>(null);
  const [bookingNutritionist, setBookingNutritionist] = useState<typeof NUTRITIONISTS[0] | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'consult' | 'content'>('consult');

  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const filtered = nutritionistsWithSlots.filter(n => {
    const matchesFilter = activeFilter === 'All' || n.filters.includes(activeFilter);
    const matchesSearch =
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.specialisation.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ── Early returns ────────────────────────────────────────────────────────

  if (bookingNutritionist !== null) {
    return (
      <ViewNutritionistSchedule
        onBack={() => setBookingNutritionist(null)}
        nutritionist={bookingNutritionist}
      />
    );
  }

  if (viewingNutritionist !== null) {
    return (
      <ViewNutritionistProfile
        id={viewingNutritionist}
        onBack={() => setViewingNutritionist(null)}
      />
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isChatUnlocked = (nutritionistName: string) => {
    const todayKey = new Date().toISOString().split('T')[0];
    return isPremium && bookings.some(
      b => b.nutritionist === nutritionistName &&
           b.status === "confirmed" &&
           b.date <= todayKey
    );
  };

  const getReviewableBooking = (nutritionistName: string) => {
    const todayKey = new Date().toISOString().split('T')[0];
    return bookings.find(
      b => b.nutritionist === nutritionistName &&
           b.status === "confirmed" &&
           b.date <= todayKey &&
           b.rating === null &&
           b.user === `${user.firstName} ${user.lastName}`
    ) ?? null;
  };

  const getSubmittedReview = (nutritionistName: string) => {
    return bookings.find(
      b => b.nutritionist === nutritionistName &&
           b.rating !== null &&
           b.user === `${user.firstName} ${user.lastName}` 
    ) ?? null;
  };

  const handleSubmitReview = (bookingId: number) => {
    if (reviewRating === 0) return;
    submitReview(bookingId, reviewRating, reviewText);
    setReviewingId(null);
    setReviewRating(0);
    setReviewText('');
  };
  
  const getAnalysisId = (nutritionistId: number) => {
  const fullName = `${user.firstName}${user.lastName}`.replace(/\s+/g, '').toLowerCase();
  return `${nutritionistId}_${fullName}`;
};

  const renderNutritionContent = () =>
    isPremium
      ? <NutritionContentPremium onBack={() => setActiveTab('consult')} />
      : <NutritionContentFreemium onBack={() => setActiveTab('consult')} />;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>

      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>NutriTrack</Text>
        </View>
        <Text style={styles.headerTitle}>Consult</Text>
        <Text style={styles.headerSub}>
          {isPremium ? 'Your certified nutrition team' : 'Discover verified nutritionists'}
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

      {activeTab === 'content' ? renderNutritionContent() : (
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
            {filtered.map(n => {
              const chatUnlocked = isChatUnlocked(n.name);
              return (
                <View key={n.id} style={styles.nutCard}>
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

                  <View style={styles.tagRow}>
                    {n.tags.map(tag => (
                      <View key={tag} style={[styles.tag, { backgroundColor: TAG_COLORS[tag]?.bg || '#f3f4f6' }]}>
                        <Text style={[styles.tagText, { color: TAG_COLORS[tag]?.text || '#374151' }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.tipBox}>
                    <Text style={styles.tipLabel}>💡 Tip from {n.name.split(' ')[1]}</Text>
                    <Text style={styles.tipText}>{n.tip}</Text>
                    <Text style={styles.tipMore}>Read more →</Text>
                  </View>

                  {isPremium && n.diaryFeedback && (
                    <View style={styles.feedbackBox}>
                      <Text style={styles.feedbackLabel}>📝 Feedback on your diary — Yesterday</Text>
                      <Text style={styles.feedbackText}>{n.diaryFeedback}</Text>
                    </View>
                  )}

                  {(() => {
                    const reviewableBooking = getReviewableBooking(n.name);
                    const submittedReview = getSubmittedReview(n.name);
                    return (
                      <>
                        {/* Already reviewed */}
                        {isPremium && submittedReview && (
                          <View style={styles.reviewBox}>
                            <Text style={styles.reviewLabel}>Your review</Text>
                            <StarRow count={submittedReview.rating!} />
                            <Text style={styles.reviewText}>{submittedReview.reviewText}</Text>
                          </View>
                        )}

                        {/* Can review — not yet reviewed */}
                        {isPremium && reviewableBooking && reviewingId !== reviewableBooking.id && (
                          <TouchableOpacity
                            style={styles.reviewPrompt}
                            onPress={() => setReviewingId(reviewableBooking.id)}
                          >
                            <Text style={styles.reviewPromptText}>⭐ Rate your session with {n.name.split(' ')[1]}</Text>
                            <Text style={styles.reviewPromptSub}>Tap to leave a review</Text>
                          </TouchableOpacity>
                        )}

                        {/* Review form — expanded */}
                        {isPremium && reviewableBooking && reviewingId === reviewableBooking.id && (
                          <View style={styles.reviewForm}>
                            <Text style={styles.reviewFormTitle}>Rate your session</Text>
                            <View style={styles.reviewStarRow}>
                              {[1, 2, 3, 4, 5].map(s => (
                                <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                                  <Text style={[styles.reviewStar, s <= reviewRating && styles.reviewStarFilled]}>★</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TextInput
                              style={styles.reviewInput}
                              placeholder="Share your experience (optional)"
                              placeholderTextColor="#9ca3af"
                              value={reviewText}
                              onChangeText={setReviewText}
                              multiline
                              numberOfLines={3}
                            />
                            <View style={styles.reviewActions}>
                              <TouchableOpacity
                                style={styles.btnSecondary}
                                onPress={() => { setReviewingId(null); setReviewRating(0); setReviewText(''); }}
                              >
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.btnSubmitReview, reviewRating === 0 && { opacity: 0.4 }]}
                                onPress={() => handleSubmitReview(reviewableBooking.id)}
                                disabled={reviewRating === 0}
                              >
                                <Text style={styles.btnSubmitReviewText}>Submit review</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                        </>
                          );
                       })()}

                           {/* View Report prompt — shows after session date passes */}
                            {isPremium && (() => {
                              const todayKey = new Date().toISOString().split('T')[0];
                              const hasCompletedSession = bookings.some(
                              b => b.nutritionist === n.name &&
                              b.status === "confirmed" &&
                              b.date <= todayKey &&
                              b.user === "Sarah Gan"
                             );
                            if (!hasCompletedSession) return null;
                            return (
                           <TouchableOpacity
                            style={styles.reportPrompt}
                            onPress={() => router.push({
                            pathname: `/analysis/${getAnalysisId(n.id)}`,
                            params: { nutritionistName: n.name },
                           })}
                           >
                           <Text style={styles.reportPromptText}>📄 View your nutrition report</Text>
                           <Text style={styles.reportPromptSub}>Written by {n.name}</Text>
                          </TouchableOpacity>
                    );
                  })()}

                  {/* Buttons: View profile · Book session · Chat */}
                  <View style={styles.nutBottom}>
                    <TouchableOpacity
                      style={styles.btnOutline}
                      onPress={() => setViewingNutritionist(n.id)}
                    >
                      <Text style={styles.btnOutlineText}>View profile</Text>
                    </TouchableOpacity>

                    {isPremium ? (
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => setBookingNutritionist(n)}
                      >
                        <Text style={styles.btnPrimaryText}>Book session</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.btnLocked}>
                        <Text style={styles.btnLockedText}>🔒 Book session</Text>
                      </View>
                    )}

                    {chatUnlocked ? (
                      <TouchableOpacity
                        style={styles.btnChat}
                        onPress={() => router.push({
                          pathname: `/chat/${n.id}`,
                          params: { name: n.name },
                        })}
                      >
                        <Text style={styles.btnChatText}>💬</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.btnChatLocked}>
                        <Text style={styles.btnChatLockedText}>🔒</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

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
                      <View key={slot} style={[styles.slot, i < 3 && styles.slotLocked]}>
                        <Text style={[styles.slotText, i < 3 && styles.slotTextLocked]}>{slot}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.bookingUpgrade}>
                    <Text style={styles.bookingUpgradeText}>💎 Upgrade to Premium to book sessions</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  safeArea: { backgroundColor: '#10b981' },
  header: { backgroundColor: '#10b981', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, alignItems: 'center', position: 'relative' },
  headerBadge: { position: 'absolute', top: 16, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  headerBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  content: { padding: 16, paddingBottom: 40 },
  upgradeBanner: { backgroundColor: '#10b981', borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  upgradeBannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  upgradeBannerIconText: { fontSize: 18 },
  upgradeBannerText: { flex: 1 },
  upgradeBannerTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  upgradeBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  upgradeBannerBtn: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  upgradeBannerBtnText: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  toggleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 0.5, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleIcon: { fontSize: 20 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#6b7280' },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb', padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#10b981' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  pillsScroll: { marginBottom: 14 },
  pillsRow: { gap: 8, paddingVertical: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  nutCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  nutTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  nutAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
  tipBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#10b981', marginBottom: 10 },
  tipLabel: { fontSize: 10, fontWeight: '700', color: '#10b981', marginBottom: 3 },
  tipText: { fontSize: 12, color: '#374151', lineHeight: 18 },
  tipMore: { fontSize: 10, color: '#10b981', fontWeight: '600', marginTop: 3 },
  feedbackBox: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#10b981', marginBottom: 10 },
  feedbackLabel: { fontSize: 10, fontWeight: '700', color: '#065f46', marginBottom: 3 },
  feedbackText: { fontSize: 12, color: '#374151', lineHeight: 18 },
  reviewBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: '#e5e7eb', marginBottom: 10 },
  reviewLabel: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 },
  starRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  star: { fontSize: 14, color: '#e5e7eb' },
  starFilled: { color: '#fbbf24' },
  reviewText: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  reviewPrompt: {
    backgroundColor: '#fef9c3', borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: '#fde68a', marginBottom: 10,
  },
  reviewPromptText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  reviewPromptSub: { fontSize: 11, color: '#b45309', marginTop: 2 },

  reviewForm: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    borderWidth: 0.5, borderColor: '#e5e7eb', marginBottom: 10,
  },
  reviewFormTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 10 },
  reviewStarRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  reviewStar: { fontSize: 28, color: '#e5e7eb' },
  reviewStarFilled: { color: '#fbbf24' },
  reviewInput: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 0.5,
    borderColor: '#e5e7eb', padding: 10, fontSize: 13,
    color: '#111827', marginBottom: 12, minHeight: 70,
    textAlignVertical: 'top',
  },
  reviewActions: { flexDirection: 'row', gap: 8 },
  btnSecondary: {
    flex: 1, borderWidth: 0.5, borderColor: '#d1d5db',
    borderRadius: 8, paddingVertical: 9, alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  btnSubmitReview: {
    flex: 1, backgroundColor: '#10b981',
    borderRadius: 8, paddingVertical: 9, alignItems: 'center',
  },
  btnSubmitReviewText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  nutBottom: { flexDirection: 'row', gap: 8 },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: '#10b981', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: '#10b981' },
  btnPrimary: { flex: 1, backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  btnLocked: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnLockedText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  btnChat: { width: 40, backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  btnChatText: { fontSize: 16 },
  btnChatLocked: { width: 40, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  btnChatLockedText: { fontSize: 14 },
  bookingPreview: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#10b981', borderStyle: 'dashed', padding: 14, marginBottom: 14 },
  bookingTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  bookingSub: { fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 16 },
  slotsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  slot: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  slotLocked: { borderColor: '#d1fae5', backgroundColor: '#f0fdf4' },
  slotText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  slotTextLocked: { color: '#10b981' },
  bookingUpgrade: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#d1fae5', alignItems: 'center' },
  bookingUpgradeText: { fontSize: 12, color: '#065f46', fontWeight: '600' },
  topTabs: { flexDirection: 'row', justifyContent: 'center', gap: 20, backgroundColor: '#10b981', paddingBottom: 10 },
  topTabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  topTabActive: { color: '#fff', fontWeight: '800' },

  reportPrompt: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: '#bfdbfe', marginBottom: 10,
  },
  reportPromptText: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  reportPromptSub: { fontSize: 11, color: '#3b82f6', marginTop: 2 },
});