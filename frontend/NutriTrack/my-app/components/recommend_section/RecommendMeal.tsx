import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text,
  TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useGoals } from '../../context/GoalsContext';
import PremiumOverlay from '../upgrade_lock/PremiumOverlay';
import { useUser } from '@/context/UserContext';
import SubscriptionModal from '../profile_section/profile/components/SubscriptionModal';
import { API_URL, getAuthHeaders } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ──────────────────────────────────────────────────────────────────

type MealType = 'breakfast' | 'lunch' | 'dinner';

// Matches ScoredRecipe from your backend schemas.py
type ScoredRecipe = {
  recipe_id: number;
  spoonacular_id: number | null;
  title: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  content_score: number;
  collab_score: number;
  final_score: number;
};

// Matches RecommendationResponse from your backend schemas.py
type RecommendationResponse = {
  meal_type: MealType;
  recommendations: ScoredRecipe[];
  remaining_budget: {
    user_id: number;
    remaining_calories: number;
    remaining_protein_g: number;
    remaining_carb_g: number;
    remaining_fat_g: number;
    goal_type: string;
  };
};

// Matches RecipeDetailResponse from your backend recipes.py
type RecipeDetail = {
  spoonacular_id: number;
  title: string;
  image: string;
  source_url: string;
  ready_in_minutes: number;
  servings: number;
  summary: string;
  instructions: string;
  ingredients: { name: string; amount: number; unit: string; original: string }[];
};

// Local UI state — saved/rating are client-side only
type MealUI = ScoredRecipe & {
  saved: boolean;
  rating: number;
};

// ── Constants ──────────────────────────────────────────────────────────────

const FILTERS = [
  'Suggested', 'Breakfast', 'Lunch', 'Dinner',
  'Low Carb', 'High Protein', 'My Meals'
] as const;

type Filter = typeof FILTERS[number];

// Maps our UI filter to the MealType the backend expects
const FILTER_TO_MEAL_TYPE: Partial<Record<Filter, MealType>> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function RecommendMeal() {
  const { meals, targets, goalsSaved } = useGoals();
  const { isPremium } = useUser();

  const [activeFilter, setActiveFilter] = useState<Filter>('Suggested');
  const [search, setSearch] = useState('');
  const [mealList, setMealList] = useState<MealUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<RecipeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  // ── Calorie progress (unchanged logic) ──────────────────────────────────

  const calorieGoal = goalsSaved ? targets.calories : 2000;
  const today = new Date().toISOString().split('T')[0];
  const todayCalories = meals
    .filter(m => m.date === today)
    .reduce((s, m) => s + (m.calories || 0), 0);
  const remainingCalories = Math.max(calorieGoal - todayCalories, 0);
  const progressPct = Math.min((todayCalories / calorieGoal) * 100, 100);

  // ── Fetch recommendations from backend ──────────────────────────────────

  const fetchRecommendations = useCallback(async (mealType: MealType) => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = await getAuthHeaders(token ?? '');
      const response = await fetch(`${API_URL}/recommendations/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meal_type: mealType,
          top_n: 10,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Request failed: ${response.status}`);
      }

      const data: RecommendationResponse = await response.json();

      // Merge backend results with local UI state (saved/rating default to false/0)
      setMealList(prev => {
        const prevMap = new Map(prev.map(m => [m.recipe_id, m]));
        return data.recommendations.map(r => ({
          ...r,
          saved: prevMap.get(r.recipe_id)?.saved ?? false,
          rating: prevMap.get(r.recipe_id)?.rating ?? 0,
        }));
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when the active filter changes to a meal-type filter
  useEffect(() => {
    const mealType = FILTER_TO_MEAL_TYPE[activeFilter];
    if (mealType) {
      fetchRecommendations(mealType);
    } else if (activeFilter === 'Suggested') {
      // For 'Suggested', pick meal type based on time of day
      const hour = new Date().getHours();
      const inferred: MealType =
        hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
      fetchRecommendations(inferred);
    }
    // 'Low Carb', 'High Protein', 'My Meals' are client-side filters — no fetch needed
  }, [activeFilter, fetchRecommendations]);

  // ── Fetch recipe detail on tap ───────────────────────────────────────────

  const openRecipeDetail = async (meal: MealUI) => {
    if (!meal.spoonacular_id) {
      Alert.alert('No detail available', 'This recipe has no Spoonacular ID.');
      return;
    }
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = await getAuthHeaders(token ?? '');
      const response = await fetch(
        `${API_URL}/recipes/${meal.spoonacular_id}/detail`,
        { headers }
      );
      if (!response.ok) throw new Error(`Detail fetch failed: ${response.status}`);
      const data: RecipeDetail = await response.json();
      setSelectedDetail(data);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not load recipe detail');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Client-side UI helpers ───────────────────────────────────────────────

  const toggleSave = (id: number) => {
    setMealList(prev => prev.map(m =>
      m.recipe_id === id ? { ...m, saved: !m.saved } : m
    ));
  };

  const setRating = (id: number, rating: number) => {
    setMealList(prev => prev.map(m =>
      m.recipe_id === id ? { ...m, rating } : m
    ));
  };

  const getFilteredMeals = (): MealUI[] => {
    let filtered = mealList;

    if (search.trim()) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // These two are client-side sub-filters on whatever the backend returned
    if (activeFilter === 'Low Carb') {
      filtered = filtered.filter(m => m.carb_g <= 25);
    } else if (activeFilter === 'High Protein') {
      filtered = filtered.filter(m => m.protein_g >= 30);
    } else if (activeFilter === 'My Meals') {
      filtered = [];
    }

    return filtered;
  };

  const filteredMeals = getFilteredMeals();

  // ── Meal card renderer (extracted to avoid duplication) ──────────────────

  const renderMealCard = (meal: MealUI) => (
    <TouchableOpacity
      key={meal.recipe_id}
      style={styles.mealCard}
      activeOpacity={0.92}
      onPress={() => openRecipeDetail(meal)}
    >
      {/* Top row */}
      <View style={styles.mealTop}>
        <View style={styles.mealEmoji}>
          {/* No emoji from backend — use a placeholder based on meal_type */}
          <Text style={styles.mealEmojiText}>
            {meal.meal_type === 'breakfast' ? '🍳'
              : meal.meal_type === 'lunch' ? '🥗'
              : '🍽️'}
          </Text>
        </View>
        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{meal.title}</Text>
          <Text style={styles.mealSub}>
            {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => toggleSave(meal.recipe_id)} style={styles.heartBtn}>
          <Text style={[styles.heart, meal.saved && styles.heartSaved]}>
            {meal.saved ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Macro row */}
      <View style={styles.macroRow}>
        {[
          { val: Math.round(meal.calories), lbl: 'kcal',      color: '#111827' },
          { val: Math.round(meal.carb_g),   lbl: 'g carbs',   color: '#f97316' },
          { val: Math.round(meal.protein_g),lbl: 'g protein',  color: '#3b82f6' },
          { val: Math.round(meal.fat_g),    lbl: 'g fats',     color: '#eab308' },
        ].map(m => (
          <View key={m.lbl} style={styles.macroBox}>
            <Text style={[styles.macroVal, { color: m.color }]}>{m.val}</Text>
            <Text style={styles.macroLbl}>{m.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Star rating */}
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(meal.recipe_id, star)}
          >
            <Text style={[styles.star, star <= meal.rating && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.ratingLabel}>
          {meal.rating > 0 ? `${meal.rating}/5` : 'Rate this meal'}
        </Text>
      </View>

      {/* Log button */}
      <TouchableOpacity
        style={styles.logBtn}
        activeOpacity={0.85}
        onPress={() => Alert.alert('Meal Logged', `${meal.title} has been added to your meal log.`)}
      >
        <Text style={styles.logBtnText}>+ Log this meal</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Green header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>What should I eat?</Text>
          <Text style={styles.headerSub}>
            {goalsSaved
              ? `${remainingCalories} kcal remaining today`
              : 'Set your goals for personalised suggestions'}
          </Text>
        </View>

        <View style={styles.content}>

          {/* Calorie progress */}
          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Calories used today</Text>
              <Text style={styles.goalValue}>{remainingCalories} kcal left</Text>
            </View>
            <View style={styles.progTrack}>
              <View style={[styles.progFill, { width: `${progressPct}%` as any }]} />
            </View>
            <Text style={styles.goalSub}>
              {todayCalories} of {calorieGoal} kcal used
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search meals..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.pill,
                  activeFilter === f && styles.pillActive,
                  f === 'My Meals' && activeFilter !== f && styles.pillMyMeals,
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[
                  styles.pillText,
                  activeFilter === f && styles.pillTextActive,
                  f === 'My Meals' && activeFilter !== f && styles.pillTextMyMeals,
                ]}>
                  {f === 'My Meals' ? '🔒 My Meals' : f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* My Meals banner */}
          {activeFilter === 'My Meals' ? (
            <View style={styles.myMealsBanner}>
              <Text style={styles.myMealsBannerTitle}>🔒 Your personal meals</Text>
              <Text style={styles.myMealsBannerSub}>
                Switch to the My Meals tab at the top to view, add or log your personal meals.
              </Text>
            </View>
          ) : (
            <Text style={styles.sectionTitle}>
              {activeFilter === 'Suggested'
                ? 'Best matches for your goal'
                : `${activeFilter} meals`}
            </Text>
          )}

          {/* Loading state */}
          {loading && (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={[styles.emptySub, { marginTop: 12 }]}>
                Finding the best meals for you...
              </Text>
            </View>
          )}

          {/* Error state */}
          {!loading && error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>⚠️</Text>
              <Text style={styles.emptyText}>Something went wrong</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity
                style={[styles.logBtn, { marginTop: 16, paddingHorizontal: 24 }]}
                onPress={() => {
                  const mealType = FILTER_TO_MEAL_TYPE[activeFilter] ?? 'dinner';
                  fetchRecommendations(mealType);
                }}
              >
                <Text style={styles.logBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Meal cards */}
          {!loading && !error && activeFilter !== 'My Meals' && (
            <>
              {filteredMeals.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🍽️</Text>
                  <Text style={styles.emptyText}>No meals found</Text>
                  <Text style={styles.emptySub}>Try a different filter or search term</Text>
                </View>
              ) : (
                <>
                  {filteredMeals.slice(0, 2).map(renderMealCard)}

                  <SubscriptionModal
                    visible={showSubscription}
                    onClose={() => setShowSubscription(false)}
                  />

                  {filteredMeals.length > 2 && (
                    <PremiumOverlay
                      isPremium={isPremium}
                      onUpgradePress={() => setShowSubscription(true)}
                      blurHeight={filteredMeals.slice(2).length * 260}
                    >
                      <View>
                        {filteredMeals.slice(2).map(renderMealCard)}
                      </View>
                    </PremiumOverlay>
                  )}
                </>
              )}
            </>
          )}

        </View>
      </ScrollView>

      {/* Recipe detail modal */}
      <Modal
        visible={!!selectedDetail || detailLoading}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedDetail(null)}
      >
        <View style={styles.modalContainer}>
          {detailLoading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={[styles.emptySub, { marginTop: 12 }]}>Loading recipe...</Text>
            </View>
          ) : selectedDetail ? (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedDetail(null)}
              >
                <Text style={styles.modalCloseText}>✕ Close</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{selectedDetail.title}</Text>
              <Text style={styles.modalMeta}>
                ⏱ {selectedDetail.ready_in_minutes} min · 🍽 {selectedDetail.servings} servings
              </Text>

              <Text style={styles.modalSectionTitle}>Ingredients</Text>
              {selectedDetail.ingredients.map((ing, i) => (
                <Text key={i} style={styles.modalBodyText}>
                  • {ing.original}
                </Text>
              ))}

              <Text style={styles.modalSectionTitle}>Instructions</Text>
              <Text style={styles.modalBodyText}>{selectedDetail.instructions}</Text>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ── Styles (unchanged from your original + modal additions) ─────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10b981' },
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  content: {
    backgroundColor: '#f9fafb', marginTop: -44,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40,
  },
  goalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalLabel: { fontSize: 12, color: '#6b7280' },
  goalValue: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  progTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  goalSub: { fontSize: 11, color: '#9ca3af' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filterScroll: { marginBottom: 14 },
  filterRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillMyMeals: { backgroundColor: '#ede9fe', borderColor: '#8b5cf6' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
  pillTextMyMeals: { color: '#5b21b6' },
  myMealsBanner: {
    backgroundColor: '#ede9fe', borderRadius: 14, padding: 16, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#8b5cf6', alignItems: 'center',
  },
  myMealsBannerTitle: { fontSize: 14, fontWeight: '700', color: '#5b21b6', marginBottom: 8 },
  myMealsBannerSub: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#9ca3af' },
  mealCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mealTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  mealEmoji: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  mealEmojiText: { fontSize: 26 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  mealSub: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  heartBtn: { paddingLeft: 4 },
  heart: { fontSize: 20, color: '#d1d5db' },
  heartSaved: { color: '#ef4444' },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  macroBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 10,
    padding: 8, alignItems: 'center',
  },
  macroVal: { fontSize: 15, fontWeight: '800' },
  macroLbl: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  star: { fontSize: 18, color: '#e5e7eb' },
  starFilled: { color: '#fbbf24' },
  ratingLabel: { fontSize: 11, color: '#9ca3af', marginLeft: 4 },
  logBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3,
  },
  logBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalScroll: { padding: 24, paddingBottom: 60 },
  modalClose: { alignSelf: 'flex-end', marginBottom: 16 },
  modalCloseText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalMeta: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 8 },
  modalBodyText: { fontSize: 13, color: '#374151', lineHeight: 22 },
});