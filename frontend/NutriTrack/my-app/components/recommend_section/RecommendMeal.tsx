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
import MealFormModal from '../meal_logger/components/meal-form-modal';
import { FoodData } from '../meal_logger/components/database-search';
import { useRouter } from 'expo-router';

// ── Types ──────────────────────────────────────────────────────────────────

type MealType = 'breakfast' | 'lunch' | 'dinner';

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

const FILTER_TO_MEAL_TYPE: Partial<Record<Filter, MealType>> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function RecommendMeal() {
  const router = useRouter();
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedMealToLog, setSelectedMealToLog] = useState<MealUI | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [lockedHeight, setLockedHeight] = useState(0);

  const { meals, targets, goalsSaved, setMeals } = useGoals();
  const { isPremium } = useUser();

  const [activeFilter, setActiveFilter] = useState<Filter>('Suggested');
  const [search, setSearch] = useState('');
  const [mealList, setMealList] = useState<MealUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<RecipeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [favsLoaded, setFavsLoaded] = useState(false);
  const FAVS_KEY = 'nutritrack_saved_recipes';
  // ── Calorie progress ──────────────────────────────────────────────────────

  const calorieGoal = goalsSaved ? targets.calories : 2000;
  const today = new Date().toISOString().split('T')[0];
  const todayCalories = meals
    .filter(m => m.date === today)
    .reduce((s, m) => s + (m.calories || 0), 0);
  const remainingCalories = Math.max(calorieGoal - todayCalories, 0);
  const progressPct = Math.min((todayCalories / calorieGoal) * 100, 100);

  // ── Fetch recommendations ─────────────────────────────────────────────────

  const fetchRecommendations = useCallback(async (mealType: MealType) => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = await getAuthHeaders(token ?? '');
      const response = await fetch(`${API_URL}/recommendations/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: mealType, top_n: 20 }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Request failed: ${response.status}`);
      }

      const data: RecommendationResponse = await response.json();
      setMealList(prev => {
        const prevMap = new Map(prev.map(m => [m.recipe_id, m]));
        return data.recommendations.map(r => ({
          ...r,
          saved: prevMap.get(r.recipe_id)?.saved ?? savedIds.has(r.recipe_id),
          rating: prevMap.get(r.recipe_id)?.rating ?? 0,
        }));
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [savedIds]);

  useEffect(() => {
    AsyncStorage.getItem('token').then(setAuthToken);

    AsyncStorage.getItem(FAVS_KEY).then(raw => {
      if (raw) setSavedIds(new Set(JSON.parse(raw)));
      setFavsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!favsLoaded) return;
    const mealType = FILTER_TO_MEAL_TYPE[activeFilter];
    if (mealType) {
      fetchRecommendations(mealType);
    } else if (activeFilter === 'Suggested') {
      const hour = new Date().getHours();
      const inferred: MealType =
        hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
      fetchRecommendations(inferred);
    }
  }, [activeFilter, fetchRecommendations, favsLoaded]);

  // ── Recipe detail ─────────────────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleSave = (id: number) => {
    setMealList(prev => {
      const updated = prev.map(m =>
        m.recipe_id === id ? { ...m, saved: !m.saved } : m
      );
      const savedIds = updated.filter(m => m.saved).map(m => m.recipe_id);
      AsyncStorage.setItem(FAVS_KEY, JSON.stringify(savedIds));
      return updated;
    });
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
    if (activeFilter === 'Low Carb') {
      filtered = filtered.filter(m => m.carb_g <= 25);
    } else if (activeFilter === 'High Protein') {
      filtered = filtered.filter(m => m.protein_g >= 30);
    } else if (activeFilter === 'My Meals') {
      filtered = [];
    }
    return [...filtered].sort((a,b) => Number(b.saved) - Number(a.saved));
  };

  const filteredMeals = getFilteredMeals();

  // ── Save success — refetch and navigate ───────────────────────────────────

  const handleSaveSuccess = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/meal/?entry_date=${today}`, {
        headers: getAuthHeaders(token ?? ''),
      });
      if (!res.ok) return;
      const data = await res.json();

      setMeals([
        ...meals.filter(m => m.date !== today),
        ...data.map((m: any) => ({
          id: String(m.meal_id),
          name: m.meal_name,
          foodName: m.items?.[0]?.food_name ?? '',
          calories: m.total_calories,
          protein: m.total_protein_g,
          carbs: m.total_carb_g,
          fats: m.total_fat_g,
          amount: m.items?.[0]?.amount,
          time: new Date(m.consumed_at).toLocaleTimeString('en-SG', {
            hour: '2-digit', minute: '2-digit', hour12: false,
            timeZone: 'Asia/Singapore',
          }),
          date: today,
        })),
      ]);
    } catch (e) {
      console.log('Failed to refresh meals:', e);
    } finally {
      setShowFormModal(false);
      setLogModalOpen(false);
      setSelectedMealToLog(null);
      router.push('/(tabs)/meal_logger'); // ← adjust path to match your tab route
    }
  };

  // ── Meal card ─────────────────────────────────────────────────────────────

  const renderMealCard = (meal: MealUI) => (
    <TouchableOpacity
      key={meal.recipe_id}
      style={styles.mealCard}
      activeOpacity={0.92}
      onPress={() => openRecipeDetail(meal)}
    >
      <View style={styles.mealTop}>
        <View style={styles.mealEmoji}>
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

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(meal.recipe_id, star)}>
            <Text style={[styles.star, star <= meal.rating && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.ratingLabel}>
          {meal.rating > 0 ? `${meal.rating}/5` : 'Rate this meal'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.logBtn}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedMealToLog(meal);
          setLogModalOpen(true);
        }}
      >
        <Text style={styles.logBtnText}>+ Log this meal</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>What should I eat?</Text>
          <Text style={styles.headerSub}>
            {goalsSaved
              ? `${remainingCalories} kcal remaining today`
              : 'Set your goals for personalised suggestions'}
          </Text>
        </View>

        <View style={styles.content}>

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

          {loading && (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={[styles.emptySub, { marginTop: 12 }]}>
                Finding the best meals for you...
              </Text>
            </View>
          )}

          {!loading && error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>⚠️</Text>
              <Text style={styles.emptyText}>Something went wrong</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity
                style={[styles.logBtn, { marginTop: 16, paddingHorizontal: 24 }]}
                onPress={() => {
                  const mealType = FILTER_TO_MEAL_TYPE[activeFilter] ?? 'lunch';
                  fetchRecommendations(mealType);
                }}
              >
                <Text style={styles.logBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

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
                  {filteredMeals.slice(0, 3).map(renderMealCard)}

                  <SubscriptionModal
                    visible={showSubscription}
                    onClose={() => setShowSubscription(false)}
                  />

                  {filteredMeals.length > 3 && (
                    <PremiumOverlay
                      isPremium={isPremium}
                      onUpgradePress={() => setShowSubscription(true)}
                      blurHeight={lockedHeight}
                    >
                      <View onLayout={e => setLockedHeight(e.nativeEvent.layout.height)}>
                        {filteredMeals.slice(3).map(renderMealCard)}
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
                <Text key={i} style={styles.modalBodyText}>• {ing.original}</Text>
              ))}
              <Text style={styles.modalSectionTitle}>Instructions</Text>
              <Text style={styles.modalBodyText}>{selectedDetail.instructions}</Text>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* Time picker modal */}
      {logModalOpen && (
        <Modal
          visible={logModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLogModalOpen(false)}
        >
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerCard}>
              <Text style={styles.timePickerTitle}>When did you eat this?</Text>
              <Text style={styles.timePickerSub}>Select a time slot</Text>

              <Text style={styles.timeGroupLabel}>🌅 Morning</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeRow}>
                {['06:00','07:00','08:00','09:00','10:00','11:00'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.timeGroupLabel}>☀️ Afternoon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeRow}>
                {['12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.timeGroupLabel}>🌙 Evening</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeRow}>
                {['18:00','19:00','20:00','21:00','22:00','23:00'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.timeConfirmBtn, !selectedTime && styles.timeConfirmBtnDisabled]}
                onPress={() => setShowFormModal(true)}
                disabled={!selectedTime}
              >
                <Text style={styles.timeConfirmText}>
                  {selectedTime ? `Confirm ${selectedTime}` : 'Select a time first'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLogModalOpen(false)}>
                <Text style={styles.timeCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Meal form modal */}
      <MealFormModal
        open={showFormModal}
        initialTime={selectedTime}
        onClose={() => { setShowFormModal(false); setLogModalOpen(false); setSelectedMealToLog(null); }}
        onSave={handleSaveSuccess}
        selectedFood={null}
        meal={selectedMealToLog ? {
          name: selectedMealToLog.title,
          calories: selectedMealToLog.calories,
          protein: selectedMealToLog.protein_g,
          carbs: selectedMealToLog.carb_g,
          fats: selectedMealToLog.fat_g,
        } : null}
        token={authToken}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

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
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalScroll: { padding: 24, paddingBottom: 60 },
  modalClose: { alignSelf: 'flex-end', marginBottom: 16 },
  modalCloseText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalMeta: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 8 },
  modalBodyText: { fontSize: 13, color: '#374151', lineHeight: 22 },
  timePickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  timePickerCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, width: '85%',
  },
  timePickerTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    marginBottom: 4, textAlign: 'center',
  },
  timePickerSub: {
    fontSize: 12, color: '#9ca3af',
    textAlign: 'center', marginBottom: 16,
  },
  timeGroupLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    marginBottom: 6, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 4, marginBottom: 8,
  },
  timePill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f3f4f6',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  timePillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  timePillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  timePillTextActive: { color: '#fff' },
  timeConfirmBtn: {
    backgroundColor: '#10b981', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 8,
  },
  timeConfirmBtnDisabled: { backgroundColor: '#d1fae5' },
  timeConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  timeCancelText: {
    color: '#6b7280', textAlign: 'center',
    marginTop: 10, fontSize: 13,
  },
});