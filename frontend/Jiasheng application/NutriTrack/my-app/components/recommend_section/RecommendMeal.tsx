import React, { useState } from 'react';
import {
  ScrollView, View, Text,
  TouchableOpacity, TextInput, StyleSheet, StatusBar, Alert
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from 'expo-router';
import { useGoals } from '../../context/GoalsContext';

type Meal = {
  id: number;
  name: string;
  emoji: string;
  category: string;
  prepTime: string;
  calories: number;
  carbs: number;
  protein: number;
  fats: number;
  tags: { label: string; color: string; bg: string }[];
  saved: boolean;
  rating: number;
};

const DUMMY_MEALS: Meal[] = [
  {
    id: 1, name: 'Grilled Chicken Salad', emoji: '🥗',
    category: 'Lunch', prepTime: '15 min',
    calories: 420, carbs: 18, protein: 38, fats: 14,
    tags: [
      { label: 'Low Carb', color: '#065f46', bg: '#d1fae5' },
      { label: 'High Protein', color: '#1e40af', bg: '#dbeafe' },
    ],
    saved: true, rating: 4,
  },
  {
    id: 2, name: 'Egg & Veggie Omelette', emoji: '🍳',
    category: 'Breakfast', prepTime: '10 min',
    calories: 310, carbs: 8, protein: 24, fats: 20,
    tags: [
      { label: 'Breakfast', color: '#c2410c', bg: '#fff7ed' },
      { label: 'Vegetarian', color: '#5b21b6', bg: '#ede9fe' },
    ],
    saved: false, rating: 0,
  },
  {
    id: 3, name: 'Salmon Brown Rice Bowl', emoji: '🍱',
    category: 'Lunch', prepTime: '20 min',
    calories: 520, carbs: 48, protein: 42, fats: 12,
    tags: [
      { label: 'Recommended', color: '#065f46', bg: '#d1fae5' },
      { label: 'High Protein', color: '#1e40af', bg: '#dbeafe' },
    ],
    saved: false, rating: 4,
  },
  {
    id: 4, name: 'Turkey Wrap', emoji: '🥙',
    category: 'Lunch', prepTime: '10 min',
    calories: 450, carbs: 42, protein: 32, fats: 10,
    tags: [
      { label: 'Lunch', color: '#c2410c', bg: '#fff7ed' },
    ],
    saved: true, rating: 3,
  },
  {
    id: 5, name: 'Greek Yoghurt Bowl', emoji: '🥣',
    category: 'Breakfast', prepTime: '5 min',
    calories: 280, carbs: 32, protein: 20, fats: 6,
    tags: [
      { label: 'Breakfast', color: '#c2410c', bg: '#fff7ed' },
      { label: 'Vegetarian', color: '#5b21b6', bg: '#ede9fe' },
    ],
    saved: false, rating: 5,
  },
  {
    id: 6, name: 'Beef Stir Fry with Broccoli', emoji: '🥩',
    category: 'Dinner', prepTime: '25 min',
    calories: 580, carbs: 22, protein: 45, fats: 28,
    tags: [
      { label: 'High Protein', color: '#1e40af', bg: '#dbeafe' },
      { label: 'Dinner', color: '#5b21b6', bg: '#ede9fe' },
    ],
    saved: false, rating: 0,
  },
  {
    id: 7, name: 'Avocado Toast with Eggs', emoji: '🥑',
    category: 'Breakfast', prepTime: '10 min',
    calories: 380, carbs: 28, protein: 18, fats: 22,
    tags: [
      { label: 'Breakfast', color: '#c2410c', bg: '#fff7ed' },
      { label: 'Vegetarian', color: '#5b21b6', bg: '#ede9fe' },
    ],
    saved: false, rating: 0,
  },
  {
    id: 8, name: 'Tuna Pasta Salad', emoji: '🍝',
    category: 'Dinner', prepTime: '20 min',
    calories: 490, carbs: 55, protein: 35, fats: 11,
    tags: [
      { label: 'Dinner', color: '#5b21b6', bg: '#ede9fe' },
    ],
    saved: false, rating: 0,
  },
];

const FILTERS = ['Suggested', 'Breakfast', 'Lunch', 'Dinner', 'Low Carb', 'High Protein', 'Vegetarian'];

export default function RecommendMeal() {
  const { meals, targets, goalsSaved } = useGoals();
  const [activeFilter, setActiveFilter] = useState('Suggested');
  const [search, setSearch] = useState('');
  const [mealList, setMealList] = useState<Meal[]>(DUMMY_MEALS);

  const calorieGoal = goalsSaved ? targets.calories : 2000;

  const today = new Date().toISOString().split('T')[0];
  const todayCalories = meals
    .filter(m => m.date === today)
    .reduce((s, m) => s + (m.calories || 0), 0);
  const remainingCalories = Math.max(calorieGoal - todayCalories, 0);
  const progressPct = Math.min((todayCalories / calorieGoal) * 100, 100);

  const toggleSave = (id: number) => {
    setMealList(prev => prev.map(m =>
      m.id === id ? { ...m, saved: !m.saved } : m
    ));
  };

  const setRating = (id: number, rating: number) => {
    setMealList(prev => prev.map(m =>
      m.id === id ? { ...m, rating } : m
    ));
  };

  const getFilteredMeals = () => {
    let filtered = mealList;

    if (search.trim()) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (activeFilter === 'Suggested') {
      filtered = filtered.filter(m => m.calories <= remainingCalories + 200);
    } else if (activeFilter === 'Low Carb') {
      filtered = filtered.filter(m => m.carbs <= 25);
    } else if (activeFilter === 'High Protein') {
      filtered = filtered.filter(m => m.protein >= 30);
    } else if (activeFilter === 'Vegetarian') {
      filtered = filtered.filter(m => m.tags.some(t => t.label === 'Vegetarian'));
    } else {
      filtered = filtered.filter(m => m.category === activeFilter);
    }

    return filtered;
  };

  const filteredMeals = getFilteredMeals();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      {/* Fixed navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Recommend Meal</Text>
        <View style={styles.navSpacer} />
      </View>

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
                style={[styles.pill, activeFilter === f && styles.pillActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Section title */}
          <Text style={styles.sectionTitle}>
            {activeFilter === 'Suggested'
              ? 'Best matches for your goal'
              : `${activeFilter} meals`}
          </Text>

          {/* Meal cards */}
          {filteredMeals.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No meals found</Text>
              <Text style={styles.emptySub}>Try a different filter or search term</Text>
            </View>
          ) : (
            filteredMeals.map(meal => (
              <View key={meal.id} style={styles.mealCard}>

                {/* Top row */}
                <View style={styles.mealTop}>
                  <View style={styles.mealEmoji}>
                    <Text style={styles.mealEmojiText}>{meal.emoji}</Text>
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealSub}>{meal.category} · {meal.prepTime}</Text>
                    <View style={styles.tagsRow}>
                      {meal.tags.map(tag => (
                        <View key={tag.label} style={[styles.tag, { backgroundColor: tag.bg }]}>
                          <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => toggleSave(meal.id)} style={styles.heartBtn}>
                    <Text style={[styles.heart, meal.saved && styles.heartSaved]}>
                      {meal.saved ? '♥' : '♡'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Macro row */}
                <View style={styles.macroRow}>
                  {[
                    { val: meal.calories, lbl: 'kcal',    color: '#111827' },
                    { val: meal.carbs,    lbl: 'g carbs', color: '#f97316' },
                    { val: meal.protein,  lbl: 'g protein',color: '#3b82f6' },
                    { val: meal.fats,     lbl: 'g fats',  color: '#eab308' },
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
                    <TouchableOpacity key={star} onPress={() => setRating(meal.id, star)}>
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
                  onPress={() => Alert.alert(
                    'Meal Logged',
                    `${meal.name} has been added to your meal log.`
                  )}
                >
                  <Text style={styles.logBtnText}>+ Log this meal</Text>
                </TouchableOpacity>

              </View>
            ))
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10b981' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  backText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  navTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  navSpacer: { width: 60 },

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
  goalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  goalLabel: { fontSize: 12, color: '#6b7280' },
  goalValue: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  progTrack: {
    height: 6, backgroundColor: '#f3f4f6',
    borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  progFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  goalSub: { fontSize: 11, color: '#9ca3af' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
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
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12,
  },

  emptyBox: {
    alignItems: 'center', paddingVertical: 40,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#9ca3af' },

  mealCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mealTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 12,
  },
  mealEmoji: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  mealEmojiText: { fontSize: 26 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  mealSub: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 10, fontWeight: '700' },
  heartBtn: { paddingLeft: 4 },
  heart: { fontSize: 20, color: '#d1d5db' },
  heartSaved: { color: '#ef4444' },

  macroRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  macroBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 10,
    padding: 8, alignItems: 'center',
  },
  macroVal: { fontSize: 15, fontWeight: '800' },
  macroLbl: { fontSize: 9, color: '#6b7280', marginTop: 2 },

  ratingRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 3, marginBottom: 10,
  },
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
});