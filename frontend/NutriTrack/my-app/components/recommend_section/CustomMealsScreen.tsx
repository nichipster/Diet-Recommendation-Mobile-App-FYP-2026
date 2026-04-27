import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';
import { API_URL, getAuthHeaders } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MealFormModal from '../meal_logger/components/meal-form-modal';
import { useRouter } from 'expo-router';

// ── CATEGORIES ──
const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

const CATEGORY_EMOJIS: Record<string, string> = {
  Breakfast: '☀️', Lunch: '🥗',
  Dinner: '🍽️', Snack: '🍪', Dessert: '🍰',
};

// ── TYPES ──
// Matches the backend CustomMealResponse shape (after mapping)
type PersonalMeal = {
  id: string;           // mapped from custom_meal_id
  name: string;
  emoji: string;
  emoji_bg: string;
  category: string;
  serving_size: string; // reconstructed as "${size}${unit}" for display
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes: string;
  created_at: string;
};

// ── HELPERS ──

/**
 * Parse a serving size string like "1 plate (350g)" or "250 ml" into
 * a numeric size and a unit string, as the backend expects separate fields.
 *
 * Examples:
 *   "350g"        → { size: 350, unit: "g" }
 *   "1 plate (350g)" → { size: 350, unit: "g" }  (picks last number+unit pair)
 *   "1 serving"   → { size: 1,   unit: "serving" }
 *   "big bowl"    → { size: 1,   unit: "big bowl" }  (fallback)
 */
const parseServing = (raw: string): { size: number; unit: string } => {
  // Grab all "number + letters" pairs, e.g. ["1plate", "350g"]
  const matches = [...raw.matchAll(/([\d.]+)\s*([a-zA-Z%]+)/g)];
  if (matches.length > 0) {
    // Prefer the last match — usually the gram/ml weight in brackets
    const last = matches[matches.length - 1];
    return { size: parseFloat(last[1]), unit: last[2] };
  }
  // Pure number with no unit
  const bareNum = raw.match(/^[\d.]+$/);
  if (bareNum) return { size: parseFloat(raw), unit: 'serving' };
  // Fallback: treat the whole string as the unit
  return { size: 1, unit: raw.trim() || 'serving' };
};

// ── AUTO CALCULATE FATS ──
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

// ── INGREDIENT BUILDER TYPES ──
interface Ingredient {
  external_id: number;
  source: 'ingredient' | 'product' | 'manual';
  name: string;
  brand?: string;
  baseCal: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  baseServingSize: string;
  qty: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const sumMacros = (ingredients: Ingredient[]) =>
  ingredients.reduce(
    (acc, ing) => {
      const q = parseFloat(ing.qty) || 0;
      return {
        calories: acc.calories + ing.baseCal * q,
        protein:  acc.protein  + ing.baseProtein * q,
        carbs:    acc.carbs    + ing.baseCarbs * q,
        fats:     acc.fats     + ing.baseFat * q,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

// ── PROPS ──
type Props = {
  onMealsChange?: (meals: PersonalMeal[]) => void;
};

export default function MyMealsScreen({ onMealsChange }: Props) {
  const { user } = useUser();
  const { meals: loggedMeals, setMeals } = useGoals();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'add' | 'saved'>('add');
  const [personalMeals, setPersonalMeals] = useState<PersonalMeal[]>([]);
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── INGREDIENT BUILDER STATE ──
  const [useIngredientBuilder, setUseIngredientBuilder] = useState(false);
  const [ingQuery, setIngQuery] = useState('');
  const [ingSearching, setIngSearching] = useState(false);
  const [ingResults, setIngResults] = useState<any[]>([]);
  const [ingHasSearched, setIngHasSearched] = useState(false);
  const [ingLoadingId, setIngLoadingId] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // ── TIME PICKER + LOG FLOW STATE ──
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedMealToLog, setSelectedMealToLog] = useState<PersonalMeal | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // ── LOAD TOKEN + FETCH MEALS ON MOUNT ──
  React.useEffect(() => {
    AsyncStorage.getItem('token').then(setAuthToken);
    loadPersonalMeals();
  }, []);

  // ── FETCH ALL PERSONAL MEALS FROM BACKEND ──
  const loadPersonalMeals = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/custom-meals/`, {
        headers: getAuthHeaders(user.token),
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: any[] = await res.json();
      const mapped: PersonalMeal[] = data.map(m => ({
        id: String(m.custom_meal_id),
        name: m.name,
        emoji: m.emoji,
        emoji_bg: m.emoji_bg,
        category: m.category,
        // Reassemble for display: "350g", "250ml", etc.
        serving_size: `${m.serving_size}${m.serving_unit}`,
        calories: m.calories,
        protein: m.protein,   // backend returns "protein" (mapped from protein_g)
        carbs: m.carbs,       // backend returns "carbs"   (mapped from carb_g)
        fats: m.fats,         // backend returns "fats"    (mapped from fat_g)
        notes: m.notes ?? '',
        created_at: m.created_at,
      }));
      setPersonalMeals(mapped);
      onMealsChange?.(mapped);
    } catch {
      Alert.alert('Error', 'Could not load your saved meals.');
    }
  };

  const estimatedFats = calcFats(calories, protein, carbs);

  // ── INGREDIENT BUILDER: search ──
  const handleIngSearch = async () => {
    if (!ingQuery.trim() || !user?.token) return;
    setIngSearching(true);
    setIngHasSearched(true);
    try {
      const res = await fetch(
        `${API_URL}/food/search?query=${encodeURIComponent(ingQuery)}`,
        { headers: getAuthHeaders(user.token) }
      );
      if (!res.ok) throw new Error();
      setIngResults(await res.json());
    } catch {
      Alert.alert('Error', 'Search failed. Please try again.');
      setIngResults([]);
    } finally {
      setIngSearching(false);
    }
  };

  // ── INGREDIENT BUILDER: fetch detail + add ──
  const handleIngAdd = async (item: any) => {
    if (!user?.token) return;
    setIngLoadingId(item.external_id);
    try {
      const res = await fetch(
        `${API_URL}/food/detail?external_id=${item.external_id}&source=${item.source}`,
        { headers: getAuthHeaders(user.token) }
      );
      if (!res.ok) throw new Error();
      const d = await res.json();
      const newIng: Ingredient = {
        external_id:     item.external_id,
        source:          item.source,
        name:            item.name,
        brand:           item.brand,
        baseCal:         d.calories,
        baseProtein:     d.protein_g,
        baseCarbs:       d.carb_g,
        baseFat:         d.fat_g,
        baseServingSize: `${d.serving_size}${d.serving_unit}`,
        qty: '1',
      };
      const updated = [...ingredients, newIng];
      setIngredients(updated);
      applyIngredientMacros(updated);
      setIngQuery('');
      setIngResults([]);
      setIngHasSearched(false);
    } catch {
      Alert.alert('Error', 'Failed to load food details.');
    } finally {
      setIngLoadingId(null);
    }
  };

  const updateIngQty = (index: number, value: string) => {
    const updated = ingredients.map((ing, i) => i === index ? { ...ing, qty: value } : ing);
    setIngredients(updated);
    applyIngredientMacros(updated);
  };

  const removeIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    setIngredients(updated);
    applyIngredientMacros(updated);
  };

  const applyIngredientMacros = (ings: Ingredient[]) => {
    const totals = sumMacros(ings);
    setCalories(String(Math.round(totals.calories)));
    setProtein(String(Math.round(totals.protein)));
    setCarbs(String(Math.round(totals.carbs)));
  };

  const toggleIngredientBuilder = () => {
    const next = !useIngredientBuilder;
    setUseIngredientBuilder(next);
    if (!next) {
      setIngQuery(''); setIngResults([]); setIngHasSearched(false);
      setIngredients([]); setCalories(''); setProtein(''); setCarbs('');
    }
  };

  const resetForm = () => {
    setMealName(''); setCategory(''); setSelectedEmoji('');
    setServingSize(''); setCalories(''); setProtein('');
    setCarbs(''); setNotes(''); setErrors({});
    setUseIngredientBuilder(false);
    setIngQuery(''); setIngResults([]); setIngHasSearched(false); setIngredients([]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!mealName.trim()) e.name = 'Meal name is required';
    if (!category) e.category = 'Please select a category';
    if (!servingSize.trim()) e.serving = 'Serving size is required';
    if (!calories) e.calories = 'Calories is required';
    else if (parseFloat(calories) < 1 || parseFloat(calories) > 5000)
      e.calories = 'Enter a value between 1 and 5000';
    if (!protein) e.protein = 'Protein is required';
    else if (parseFloat(protein) < 0 || parseFloat(protein) > 300)
      e.protein = 'Enter a value between 0 and 300';
    if (!carbs) e.carbs = 'Carbs is required';
    else if (parseFloat(carbs) < 0 || parseFloat(carbs) > 500)
      e.carbs = 'Enter a value between 0 and 500';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── ADD PERSONAL MEAL ──
  // Splits the free-text serving string into size (float) + unit (string)
  // because the backend expects separate fields.
  const handleSave = async () => {
    if (!validate() || !user?.token) return;
    setSubmitting(true);

    const emoji = selectedEmoji || '🍽️';
    const { size: servingNum, unit: servingUnit } = parseServing(servingSize);

    const payload = {
      name: mealName.trim(),
      emoji,
      emoji_bg: getEmojiBg(emoji),
      category,
      serving_size: servingNum,        // float, e.g. 350
      serving_unit: servingUnit,       // string, e.g. "g"
      calories: parseFloat(calories),
      protein: parseFloat(protein),
      carbs: parseFloat(carbs),
      fats: parseFloat(estimatedFats),
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch(`${API_URL}/custom-meals/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(user.token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Save failed');
      }

      const newMeal: any = await res.json();
      const mapped: PersonalMeal = {
        id: String(newMeal.custom_meal_id),
        name: newMeal.name,
        emoji: newMeal.emoji,
        emoji_bg: newMeal.emoji_bg,
        category: newMeal.category,
        serving_size: `${newMeal.serving_size}${newMeal.serving_unit}`,
        calories: newMeal.calories,
        protein: newMeal.protein,
        carbs: newMeal.carbs,
        fats: newMeal.fats,
        notes: newMeal.notes ?? '',
        created_at: newMeal.created_at,
      };

      const updated = [mapped, ...personalMeals];
      setPersonalMeals(updated);
      onMealsChange?.(updated);

      Alert.alert('Meal Saved ✅', `"${mealName}" has been added to your personal meals.`, [
        { text: 'OK', onPress: () => { resetForm(); setActiveTab('saved'); } },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DELETE PERSONAL MEAL ──
  const handleDelete = (meal: PersonalMeal) => {
    Alert.alert('Delete Meal', `Remove "${meal.name}" from your personal meals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (!user?.token) return;
          try {
            const res = await fetch(`${API_URL}/custom-meals/${meal.id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(user.token),
            });
            // 204 No Content = success
            if (!res.ok && res.status !== 204) throw new Error();
            const updated = personalMeals.filter(m => m.id !== meal.id);
            setPersonalMeals(updated);
            onMealsChange?.(updated);
          } catch {
            Alert.alert('Error', 'Something went wrong. Please try again.');
          }
        },
      },
    ]);
  };

  // ── OPEN TIME PICKER ──
  const handleLogPress = (meal: PersonalMeal) => {
    setSelectedMealToLog(meal);
    setSelectedTime('');
    setLogModalOpen(true);
  };

  // ── AFTER MEAL FORM SAVED — refetch + navigate ──
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
        ...loggedMeals.filter(m => m.date !== today),
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
      console.log('Failed to refresh meals after log:', e);
    } finally {
      setShowFormModal(false);
      setLogModalOpen(false);
      setSelectedMealToLog(null);
      router.push('/(tabs)/meal_logger');
    }
  };

  return (
    <View style={styles.root}>

      {/* ── Inner tab switcher ── */}
      <View style={styles.innerTabRow}>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'add' && styles.innerTabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.innerTabText, activeTab === 'add' && styles.innerTabTextActive]}>
            Add New Meal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'saved' && styles.innerTabActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.innerTabText, activeTab === 'saved' && styles.innerTabTextActive]}>
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
                    <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>
                      {CATEGORY_EMOJIS[cat]} {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

              {/* Emoji picker */}
              <Text style={styles.fieldLabel}>Pick an emoji (optional)</Text>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow} style={styles.emojiScroll}
              >
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

              {/* ── INGREDIENT BUILDER TOGGLE ── */}
              <TouchableOpacity
                style={[styles.toggleRow, useIngredientBuilder && styles.toggleRowActive]}
                onPress={toggleIngredientBuilder}
                activeOpacity={0.85}
              >
                <Text style={styles.toggleIcon}>🧱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Build from ingredients</Text>
                  <Text style={styles.toggleSub}>Search the food database to auto-fill macros</Text>
                </View>
                <Text style={styles.toggleChevron}>{useIngredientBuilder ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* ── INGREDIENT BUILDER PANEL ── */}
              {useIngredientBuilder && (
                <View style={styles.builderPanel}>

                  <View style={styles.ingSearchRow}>
                    <TextInput
                      style={styles.ingSearchInput}
                      placeholder="Search ingredient..."
                      placeholderTextColor="#9ca3af"
                      value={ingQuery}
                      onChangeText={setIngQuery}
                      onSubmitEditing={handleIngSearch}
                      returnKeyType="search"
                      editable={!ingSearching}
                    />
                    <TouchableOpacity style={styles.ingSearchBtn} onPress={handleIngSearch} disabled={ingSearching}>
                      {ingSearching
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.ingSearchBtnText}>Search</Text>}
                    </TouchableOpacity>
                  </View>

                  {ingHasSearched && !ingSearching && ingResults.length === 0 && (
                    <Text style={styles.ingNoResults}>No results for "{ingQuery}"</Text>
                  )}

                  {!ingSearching && ingResults.map((item, i) => (
                    <TouchableOpacity
                      key={i} style={styles.ingResultRow}
                      onPress={() => handleIngAdd(item)}
                      disabled={ingLoadingId === item.external_id}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ingResultName}>{item.name}</Text>
                        {item.brand ? <Text style={styles.ingResultBrand}>{item.brand}</Text> : null}
                        <Text style={styles.ingResultSource}>{item.source}</Text>
                      </View>
                      {ingLoadingId === item.external_id
                        ? <ActivityIndicator size="small" color="#10b981" />
                        : <Text style={styles.ingAddLabel}>+ Add</Text>}
                    </TouchableOpacity>
                  ))}

                  {ingredients.length > 0 && (
                    <View style={styles.ingList}>
                      <Text style={styles.ingListLabel}>Ingredients added</Text>
                      {ingredients.map((ing, i) => (
                        <View key={i} style={styles.ingRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ingName}>{ing.name}</Text>
                            <Text style={styles.ingServingHint}>1 serving = {ing.baseServingSize}</Text>
                          </View>
                          <View style={styles.ingQtyWrap}>
                            <Text style={styles.ingQtyLabel}>× servings</Text>
                            <View style={styles.ingQtyRow}>
                              <TouchableOpacity
                                style={styles.ingQtyBtn}
                                onPress={() => updateIngQty(i, String(Math.max(0.5, (parseFloat(ing.qty) || 1) - 0.5)))}
                              >
                                <Text style={styles.ingQtyBtnText}>−</Text>
                              </TouchableOpacity>
                              <TextInput
                                style={styles.ingQtyInput}
                                value={ing.qty}
                                onChangeText={v => updateIngQty(i, v)}
                                keyboardType="decimal-pad"
                                textAlign="center"
                              />
                              <TouchableOpacity
                                style={styles.ingQtyBtn}
                                onPress={() => updateIngQty(i, String((parseFloat(ing.qty) || 1) + 0.5))}
                              >
                                <Text style={styles.ingQtyBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={styles.ingMacros}>
                            <Text style={styles.ingCalText}>
                              {round1(ing.baseCal * (parseFloat(ing.qty) || 0))} kcal
                            </Text>
                            <Text style={styles.ingMacroDetail}>
                              P {round1(ing.baseProtein * (parseFloat(ing.qty) || 0))}g ·{' '}
                              C {round1(ing.baseCarbs   * (parseFloat(ing.qty) || 0))}g ·{' '}
                              F {round1(ing.baseFat     * (parseFloat(ing.qty) || 0))}g
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.ingRemoveBtn}>
                            <Text style={styles.ingRemoveText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.builderHint}>
                    ✅ Macros below are auto-filled from your ingredients
                  </Text>
                </View>
              )}

              {/* ── MACROS ── */}
              <View style={styles.macroInputRow}>
                {[
                  { key: 'calories', label: 'Calories (kcal) *', state: calories, setState: setCalories },
                  { key: 'protein',  label: 'Protein (g) *',     state: protein,  setState: setProtein  },
                  { key: 'carbs',    label: 'Carbs (g) *',       state: carbs,    setState: setCarbs    },
                ].map(field => (
                  <View key={field.key} style={styles.macroField}>
                    <Text style={styles.macroLabel}>{field.label}</Text>
                    <TextInput
                      style={[
                        styles.macroInput,
                        errors[field.key] ? styles.inputError : null,
                        useIngredientBuilder ? styles.macroInputReadOnly : null,
                      ]}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={field.state}
                      onChangeText={v => {
                        if (useIngredientBuilder) return;
                        field.setState(v);
                        setErrors(p => ({ ...p, [field.key]: '' }));
                      }}
                      editable={!useIngredientBuilder}
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
                multiline numberOfLines={2}
                value={notes} onChangeText={setNotes}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleSave} disabled={submitting} activeOpacity={0.85}
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
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('add')}>
                    <Text style={styles.emptyBtnText}>Add your first meal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                personalMeals.map(meal => (
                  <View key={meal.id} style={styles.mealCard}>

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

                    <View style={styles.macroRow}>
                      {[
                        { val: meal.calories,      lbl: 'kcal',    color: '#111827' },
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

                    {meal.notes ? <Text style={styles.mealNotes}>📝 {meal.notes}</Text> : null}

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.logBtn}
                        onPress={() => handleLogPress(meal)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.logBtnText}>+ Log this meal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(meal)}>
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

      {/* ── TIME PICKER MODAL ── */}
      <Modal
        visible={logModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { setLogModalOpen(false); setSelectedTime(''); }}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerCard}>
            <Text style={styles.timePickerTitle}>When did you eat this?</Text>
            {selectedMealToLog && (
              <Text style={styles.timePickerMealName}>{selectedMealToLog.name}</Text>
            )}

            <Text style={styles.timeGroupLabel}>🌅 Morning</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
              {['06:00','07:00','08:00','09:00','10:00','11:00'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.timeGroupLabel}>☀️ Afternoon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
              {['12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.timeGroupLabel}>🌙 Evening</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
              {['18:00','19:00','20:00','21:00','22:00','23:00'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>{t}</Text>
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

            <TouchableOpacity onPress={() => { setLogModalOpen(false); setSelectedTime(''); }}>
              <Text style={styles.timeCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MEAL FORM MODAL ── */}
      <MealFormModal
        open={showFormModal}
        initialTime={selectedTime}
        onClose={() => {
          setShowFormModal(false);
          setLogModalOpen(false);
          setSelectedMealToLog(null);
          setSelectedTime('');
        }}
        onSave={handleSaveSuccess}
        selectedFood={null}
        meal={selectedMealToLog ? {
          name: selectedMealToLog.name,
          calories: selectedMealToLog.calories,
          protein: selectedMealToLog.protein,
          carbs: selectedMealToLog.carbs,
          fats: selectedMealToLog.fats,
        } : null}
        token={authToken}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  innerTabRow: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    margin: 12, borderRadius: 10, padding: 3,
  },
  innerTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
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

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f3ff', borderRadius: 12,
    padding: 12, marginBottom: 12, gap: 10,
    borderWidth: 1, borderColor: '#ede9fe',
  },
  toggleRowActive: { backgroundColor: '#ede9fe', borderColor: '#a78bfa' },
  toggleIcon: { fontSize: 18 },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: '#5b21b6' },
  toggleSub: { fontSize: 11, color: '#7c3aed', marginTop: 1 },
  toggleChevron: { fontSize: 12, color: '#7c3aed', fontWeight: '700' },

  builderPanel: {
    backgroundColor: '#faf5ff', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#e9d5ff',
  },
  builderHint: { fontSize: 11, color: '#10b981', fontWeight: '600', marginTop: 8, textAlign: 'center' },

  ingSearchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ingSearchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#111827',
  },
  ingSearchBtn: {
    backgroundColor: '#7c3aed', borderRadius: 10,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', minWidth: 70,
  },
  ingSearchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ingNoResults: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 8 },

  ingResultRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#bbf7d0',
  },
  ingResultName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  ingResultBrand: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  ingResultSource: { fontSize: 10, color: '#9ca3af', marginTop: 1, textTransform: 'capitalize' },
  ingAddLabel: { fontSize: 13, fontWeight: '700', color: '#10b981' },

  ingList: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 0.5, borderColor: '#e5e7eb', marginTop: 8,
  },
  ingListLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  ingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 8,
    borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  ingName: { fontSize: 12, fontWeight: '700', color: '#111827' },
  ingServingHint: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  ingQtyWrap: { alignItems: 'center' },
  ingQtyLabel: { fontSize: 9, color: '#9ca3af', marginBottom: 3 },
  ingQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ingQtyBtn: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: '#e9d5ff', alignItems: 'center', justifyContent: 'center',
  },
  ingQtyBtnText: { fontSize: 14, fontWeight: '700', color: '#7c3aed', lineHeight: 18 },
  ingQtyInput: {
    width: 38, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 7, paddingVertical: 4,
    fontSize: 13, fontWeight: '700', color: '#111827', backgroundColor: '#fff',
  },
  ingMacros: { alignItems: 'flex-end' },
  ingCalText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  ingMacroDetail: { fontSize: 9, color: '#9ca3af', marginTop: 1 },
  ingRemoveBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
  ingRemoveText: { fontSize: 10, color: '#ef4444', fontWeight: '700' },

  macroInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 10, fontWeight: '600', color: '#6b7280', marginBottom: 5 },
  macroInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 10, fontSize: 15, fontWeight: '600', color: '#111827',
  },
  macroInputReadOnly: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#6b7280' },
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
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  emptyBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  mealCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mealTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
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
  mealNotes: { fontSize: 12, color: '#6b7280', marginBottom: 8, fontStyle: 'italic', lineHeight: 16 },

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

  timePickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  timePickerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%' },
  timePickerTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    marginBottom: 4, textAlign: 'center',
  },
  timePickerMealName: {
    fontSize: 12, color: '#10b981', fontWeight: '600',
    textAlign: 'center', marginBottom: 16,
  },
  timeGroupLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    marginBottom: 6, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  timeRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, marginBottom: 8 },
  timePill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
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
  timeCancelText: { color: '#6b7280', textAlign: 'center', marginTop: 10, fontSize: 13 },
});
