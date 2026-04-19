import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert
} from 'react-native';
import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';
import { API_URL } from '../../constants/api';

// ── CATEGORIES ──
const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

const CATEGORY_EMOJIS: Record<string, string> = {
  Breakfast: '☀️', Lunch: '🥗',
  Dinner: '🍽️', Snack: '🍪', Dessert: '🍰',
};

// ── DUMMY PERSONAL MEALS ──
// TODO (Backend): Replace with real data from GET /meals/personal
// Returns: array of PersonalMeal objects belonging to the logged-in user only
// These meals are private — no other user can see them
const DUMMY_PERSONAL_MEALS = [
  {
    id: '1',
    name: "Mum's Chicken Rice",
    emoji: '🥗',
    emoji_bg: '#d1fae5',
    category: 'Lunch',
    serving_size: '1 plate (350g)',
    calories: 520,
    protein: 32,
    carbs: 65,
    fats: 14,
    notes: '',
    created_at: '2026-03-20T00:00:00',
  },
  {
    id: '2',
    name: 'My Protein Breakfast',
    emoji: '🍳',
    emoji_bg: '#fef3c7',
    category: 'Breakfast',
    serving_size: '1 serving (250g)',
    calories: 380,
    protein: 36,
    carbs: 22,
    fats: 18,
    notes: 'Extra eggs for more protein',
    created_at: '2026-03-21T00:00:00',
  },
  {
    id: '3',
    name: "Dad's Laksa Recipe",
    emoji: '🍜',
    emoji_bg: '#dbeafe',
    category: 'Dinner',
    serving_size: '1 bowl (400g)',
    calories: 640,
    protein: 28,
    carbs: 72,
    fats: 24,
    notes: 'Less coconut milk version',
    created_at: '2026-03-22T00:00:00',
  },
];

type PersonalMeal = typeof DUMMY_PERSONAL_MEALS[0];

// ── AUTO CALCULATE FATS ──
// Formula: fats = (calories - protein*4 - carbs*4) / 9
const calcFats = (cal: string, pro: string, carb: string): string => {
  const c = parseFloat(cal) || 0;
  const p = parseFloat(pro) || 0;
  const cb = parseFloat(carb) || 0;
  const f = (c - p * 4 - cb * 4) / 9;
  return f > 0 ? f.toFixed(1) : '0';
};

const getEmojiBg = (emoji: string): string => {
  const bgs = ['#d1fae5', '#dbeafe', '#ede9fe', '#fef3c7', '#fee2e2', '#f0fdf4'];
  if (!emoji) return '#f3f4f6';
  return bgs[emoji.codePointAt(0)! % bgs.length];
};

const MEAL_EMOJIS = [
  '🍝', '🍛', '🥗', '🍜', '🥩', '🥚',
  '🐟', '🥦', '🍱', '🌮', '🍲', '🥘',
  '🥙', '🍚', '🥣', '🍳', '🥜', '🍖',
  '🍜', '🥑', '🧆', '🫕', '🍇', '🫐',
];

// ── PROPS ──
// onMealsChange: called when meals are added or deleted
// so the parent (recommendmeal.tsx) can refresh the My Meals filter
type Props = {
  onMealsChange?: (meals: PersonalMeal[]) => void;
};

export default function MyMealsScreen({ onMealsChange }: Props) {
  const { user } = useUser();
  const { meals: loggedMeals, setMeals } = useGoals();

  const [activeTab, setActiveTab] = useState<'add' | 'saved'>('add');
  const [personalMeals, setPersonalMeals] = useState<PersonalMeal[]>(DUMMY_PERSONAL_MEALS);
  const [submitting, setSubmitting] = useState(false);

  // ── FORM STATE ──
  const [mealName, setMealName] = useState('');
  const [category, setCategory] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [notes, setNotes] = useState('');

  // ── ERRORS ──
  const [errors, setErrors] = useState<Record<string, string>>({});

  const estimatedFats = calcFats(calories, protein, carbs);

  // ── FETCH PERSONAL MEALS ──
  // TODO (Backend): Uncomment when backend is ready
  // Endpoint: GET /meals/personal
  // Headers: { Authorization: Bearer <token> }
  // Returns: array of PersonalMeal objects for this user only
  // useEffect(() => {
  //   const fetchMeals = async () => {
  //     try {
  //       const res = await fetch(`${API_URL}/meals/personal`, {
  //         headers: { 'Authorization': `Bearer ${user.token}` },
  //       });
  //       if (res.ok) {
  //         const data = await res.json();
  //         setPersonalMeals(data);
  //         onMealsChange?.(data);
  //       }
  //     } catch (e) {
  //       console.log('fetchPersonalMeals error:', e);
  //     }
  //   };
  //   fetchMeals();
  // }, []);

  const resetForm = () => {
    setMealName('');
    setCategory('');
    setSelectedEmoji('');
    setServingSize('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setNotes('');
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!mealName.trim()) newErrors.name = 'Meal name is required';
    if (!category) newErrors.category = 'Please select a category';
    if (!servingSize.trim()) newErrors.serving = 'Serving size is required';
    if (!calories) newErrors.calories = 'Calories is required';
    else if (parseFloat(calories) < 1 || parseFloat(calories) > 5000)
      newErrors.calories = 'Enter a value between 1 and 5000';
    if (!protein) newErrors.protein = 'Protein is required';
    else if (parseFloat(protein) < 0 || parseFloat(protein) > 300)
      newErrors.protein = 'Enter a value between 0 and 300';
    if (!carbs) newErrors.carbs = 'Carbs is required';
    else if (parseFloat(carbs) < 0 || parseFloat(carbs) > 500)
      newErrors.carbs = 'Enter a value between 0 and 500';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── ADD PERSONAL MEAL ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: POST /meals/personal
  // Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  // Body: { name, emoji, category, serving_size, calories, protein, carbs, fats, notes }
  // Returns: created PersonalMeal object with id and created_at set by backend
  // This meal is private — only this user can see or access it
  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const fats = parseFloat(estimatedFats);
    const emoji = selectedEmoji || '🍽️';

    const payload = {
      name: mealName.trim(),
      emoji,
      emoji_bg: getEmojiBg(emoji),
      category,
      serving_size: servingSize.trim(),
      calories: parseFloat(calories),
      protein: parseFloat(protein),
      carbs: parseFloat(carbs),
      fats,
      notes: notes.trim(),
    };

    try {
      // TODO (Backend): Replace below with API call
      // const res = await fetch(`${API_URL}/meals/personal`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${user.token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(payload),
      // });
      // if (res.ok) {
      //   const newMeal = await res.json();
      //   const updated = [newMeal, ...personalMeals];
      //   setPersonalMeals(updated);
      //   onMealsChange?.(updated);
      // }

      // Temporary local update — remove when backend is ready
      const newMeal: PersonalMeal = {
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        ...payload,
      };
      const updated = [newMeal, ...personalMeals];
      setPersonalMeals(updated);
      onMealsChange?.(updated);

      Alert.alert(
        'Meal Saved ✅',
        `"${mealName}" has been added to your personal meals.`,
        [{ text: 'OK', onPress: () => { resetForm(); setActiveTab('saved'); } }]
      );
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DELETE PERSONAL MEAL ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: DELETE /meals/personal/{id}
  // Headers: { Authorization: Bearer <token> }
  // Returns: 204 No Content on success
  const handleDelete = (meal: PersonalMeal) => {
    Alert.alert(
      'Delete Meal',
      `Remove "${meal.name}" from your personal meals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/meals/personal/${meal.id}`, {
              //   method: 'DELETE',
              //   headers: { 'Authorization': `Bearer ${user.token}` },
              // });
              // if (res.status === 204) { ... }

              // Temporary local update — remove when backend is ready
              const updated = personalMeals.filter(m => m.id !== meal.id);
              setPersonalMeals(updated);
              onMealsChange?.(updated);
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── LOG PERSONAL MEAL ──
  // Adds the personal meal to the GoalsContext meal log
  // Same behaviour as logging any other meal in the app
  const handleLog = (meal: PersonalMeal) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const date = now.toISOString().split('T')[0];

    const newMeal = {
      id: `personal_${Date.now()}`,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      time,
      date,
      notes: meal.notes || '',
    };

    setMeals([...loggedMeals, newMeal]);
    Alert.alert(
      'Meal Logged ✅',
      `${meal.name} has been added to your meal log.`
    );
  };

  return (
    <View style={styles.root}>

      {/* Inner tab switcher */}
      <View style={styles.innerTabRow}>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'add' && styles.innerTabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[
            styles.innerTabText,
            activeTab === 'add' && styles.innerTabTextActive
          ]}>
            Add New Meal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'saved' && styles.innerTabActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[
            styles.innerTabText,
            activeTab === 'saved' && styles.innerTabTextActive
          ]}>
            My Saved Meals ({personalMeals.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* ── ADD NEW MEAL FORM ── */}
          {activeTab === 'add' && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add a personalised meal</Text>
              <Text style={styles.formSub}>
                Add meals you eat regularly. Only you can see and log these — completely private.
              </Text>

              {/* Meal name */}
              <Text style={styles.fieldLabel}>Meal name *</Text>
              <TextInput
                style={[styles.fieldInput, errors.name ? styles.inputError : null]}
                placeholder="e.g. Mum's Chicken Rice"
                placeholderTextColor="#9ca3af"
                value={mealName}
                onChangeText={v => { setMealName(v); setErrors(p => ({ ...p, name: '' })); }}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

              {/* Category */}
              <Text style={styles.fieldLabel}>Category *</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, category === cat && styles.catPillActive]}
                    onPress={() => { setCategory(cat); setErrors(p => ({ ...p, category: '' })); }}
                  >
                    <Text style={[
                      styles.catPillText,
                      category === cat && styles.catPillTextActive
                    ]}>
                      {CATEGORY_EMOJIS[cat]} {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

              {/* Emoji picker */}
              <Text style={styles.fieldLabel}>Pick an emoji (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
                style={styles.emojiScroll}
              >
                {/* No emoji option */}
                <TouchableOpacity
                  style={[styles.emojiBtn, selectedEmoji === '' && styles.emojiBtnActive]}
                  onPress={() => setSelectedEmoji('')}
                >
                  <Text style={styles.emojiNoneText}>—</Text>
                </TouchableOpacity>
                {MEAL_EMOJIS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.emojiBtn, selectedEmoji === emoji && styles.emojiBtnActive]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Serving size */}
              <Text style={styles.fieldLabel}>Serving size *</Text>
              <TextInput
                style={[styles.fieldInput, errors.serving ? styles.inputError : null]}
                placeholder="e.g. 1 plate (350g)"
                placeholderTextColor="#9ca3af"
                value={servingSize}
                onChangeText={v => { setServingSize(v); setErrors(p => ({ ...p, serving: '' })); }}
              />
              {errors.serving ? <Text style={styles.errorText}>{errors.serving}</Text> : null}

              {/* Macros */}
              <View style={styles.macroInputRow}>
                {[
                  { key: 'calories', label: 'Calories (kcal) *', state: calories, setState: setCalories },
                  { key: 'protein',  label: 'Protein (g) *',     state: protein,  setState: setProtein  },
                  { key: 'carbs',    label: 'Carbs (g) *',       state: carbs,    setState: setCarbs    },
                ].map(field => (
                  <View key={field.key} style={styles.macroField}>
                    <Text style={styles.macroLabel}>{field.label}</Text>
                    <TextInput
                      style={[styles.macroInput, errors[field.key] ? styles.inputError : null]}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={field.state}
                      onChangeText={v => {
                        field.setState(v);
                        setErrors(p => ({ ...p, [field.key]: '' }));
                      }}
                      textAlign="center"
                    />
                    {errors[field.key]
                      ? <Text style={styles.macroError}>{errors[field.key]}</Text>
                      : null}
                  </View>
                ))}
              </View>

              {/* Auto fats */}
              <View style={styles.fatsBox}>
                <View>
                  <Text style={styles.fatsLabel}>🔥 Estimated Fats</Text>
                  <Text style={styles.fatsHint}>Auto-calculated from your macros</Text>
                </View>
                <Text style={styles.fatsVal}>{estimatedFats}g</Text>
              </View>

              {/* Notes */}
              <Text style={styles.fieldLabel}>
                Notes <Text style={styles.optionalText}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder="e.g. Less rice, extra chicken..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {submitting ? 'Saving...' : 'Save to My Meals'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── MY SAVED MEALS ── */}
          {activeTab === 'saved' && (
            <View>
              {personalMeals.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🍽️</Text>
                  <Text style={styles.emptyTitle}>No personal meals yet</Text>
                  <Text style={styles.emptySub}>
                    Add meals you eat regularly and log them quickly anytime
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => setActiveTab('add')}
                  >
                    <Text style={styles.emptyBtnText}>Add your first meal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                personalMeals.map(meal => (
                  <View key={meal.id} style={styles.mealCard}>

                    {/* Top row */}
                    <View style={styles.mealTop}>
                      <View style={[styles.mealEmoji, { backgroundColor: meal.emoji_bg }]}>
                        <Text style={styles.mealEmojiText}>{meal.emoji || '🍽️'}</Text>
                      </View>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealMeta}>
                          {CATEGORY_EMOJIS[meal.category]} {meal.category} · {meal.serving_size}
                        </Text>
                      </View>
                      <View style={styles.privateBadge}>
                        <Text style={styles.privateBadgeText}>🔒 Private</Text>
                      </View>
                    </View>

                    {/* Macros */}
                    <View style={styles.macroRow}>
                      {[
                        { val: meal.calories, lbl: 'kcal',    color: '#111827' },
                        { val: `${meal.protein}g`, lbl: 'protein', color: '#3b82f6' },
                        { val: `${meal.carbs}g`,   lbl: 'carbs',   color: '#f97316' },
                        { val: `${meal.fats}g`,    lbl: 'fats',    color: '#eab308' },
                      ].map(m => (
                        <View key={m.lbl} style={styles.macroBox}>
                          <Text style={[styles.macroVal, { color: m.color }]}>{m.val}</Text>
                          <Text style={styles.macroLbl}>{m.lbl}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Notes */}
                    {meal.notes ? (
                      <Text style={styles.mealNotes}>📝 {meal.notes}</Text>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.logBtn}
                        onPress={() => handleLog(meal)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.logBtnText}>+ Log this meal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(meal)}
                      >
                        <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                ))
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  innerTabRow: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    margin: 12, borderRadius: 10, padding: 3,
  },
  innerTab: {
    flex: 1, paddingVertical: 8,
    alignItems: 'center', borderRadius: 8,
  },
  innerTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  innerTabText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  innerTabTextActive: { color: '#10b981' },

  content: { paddingHorizontal: 14, paddingBottom: 40 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  formSub: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', marginBottom: 4,
  },
  textArea: { height: 60, textAlignVertical: 'top' },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, marginTop: 2 },
  optionalText: { fontSize: 12, color: '#9ca3af', fontWeight: '400' },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  catPillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catPillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  catPillTextActive: { color: '#fff' },

  emojiScroll: { marginBottom: 12 },
  emojiRow: { gap: 8, paddingVertical: 2 },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emojiBtnActive: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  emojiText: { fontSize: 20 },
  emojiNoneText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  macroInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 10, fontWeight: '600', color: '#6b7280', marginBottom: 5 },
  macroInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 10, fontSize: 15,
    fontWeight: '600', color: '#111827',
  },
  macroError: { fontSize: 10, color: '#ef4444', marginTop: 3, textAlign: 'center' },

  fatsBox: {
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  fatsLabel: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  fatsHint: { fontSize: 10, color: '#92400e', marginTop: 2 },
  fatsVal: { fontSize: 22, fontWeight: '800', color: '#d97706' },

  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#6ee7b7' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptySub: {
    fontSize: 13, color: '#6b7280',
    textAlign: 'center', marginBottom: 16, lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  mealCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mealTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 10,
  },
  mealEmoji: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  mealEmojiText: { fontSize: 20 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  mealMeta: { fontSize: 11, color: '#6b7280' },
  privateBadge: {
    backgroundColor: '#ede9fe', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10, flexShrink: 0,
  },
  privateBadgeText: { fontSize: 10, fontWeight: '600', color: '#5b21b6' },

  macroRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  macroBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 8,
    padding: 7, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  macroVal: { fontSize: 13, fontWeight: '700' },
  macroLbl: { fontSize: 9, color: '#9ca3af', marginTop: 1 },

  mealNotes: {
    fontSize: 12, color: '#6b7280', marginBottom: 8,
    fontStyle: 'italic', lineHeight: 16,
  },

  actionRow: { flexDirection: 'row', gap: 8 },
  logBtn: {
    flex: 2, backgroundColor: '#10b981', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  logBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    flex: 1, backgroundColor: '#fee2e2', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#991b1b' },
});