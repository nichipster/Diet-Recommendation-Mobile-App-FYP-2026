import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../ui/Navbar';

// ── EMOJI OPTIONS ──
const EMOJI_OPTIONS = [
  '',
  '🥗', '🍛', '🍝', '🍜', '🥩', '🥚',
  '🐟', '🥦', '🍱', '🌮', '🍲', '🥘',
  '🥙', '🍚', '🥣', '🍳', '🥜', '🍖',
  '🫐', '🥑', '🧆', '🫕', '🍇', '🍱',
];

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

const CATEGORY_EMOJIS: Record<string, string> = {
  Breakfast: '☀️',
  Lunch: '🥗',
  Dinner: '🍽️',
  Snack: '🍪',
  Dessert: '🍰',
};

const DIETARY_TAGS = ['Vegan', 'Halal', 'Dairy Free', 'Gluten Free'];

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Admin Added', 'User Recipes'];

// ── DUMMY FOOD DATABASE ──
// TODO (Backend): Replace DUMMY_FOODS with real API call
// Endpoint: GET /admin/food-database
// Headers: { Authorization: Bearer <admin_token> }
// Returns: array of FoodItem objects matching the type below
const DUMMY_FOODS = [
  {
    id: '1',
    name: 'Grilled Chicken Salad',
    emoji: '🥗',
    emoji_bg: '#d1fae5',
    category: 'Lunch',
    source: 'admin',
    serving_size: '1 bowl (300g)',
    calories: 420,
    protein: 38,
    carbs: 18,
    fats: 14,
    dietary_tags: ['High Protein', 'Halal'],
    ingredients: [
      { id: '1', name: 'Chicken breast', amount: '120g' },
      { id: '2', name: 'Mixed greens', amount: '80g' },
      { id: '3', name: 'Cherry tomatoes', amount: '40g' },
      { id: '4', name: 'Olive oil', amount: '10ml' },
    ],
    prep_notes: 'Grill chicken until cooked through, toss with greens and dressing.',
    added_at: '2026-03-01T00:00:00',
  },
  {
    id: '2',
    name: 'Egg & Veggie Omelette',
    emoji: '🥚',
    emoji_bg: '#dbeafe',
    category: 'Breakfast',
    source: 'user',
    serving_size: '1 omelette (200g)',
    calories: 310,
    protein: 24,
    carbs: 8,
    fats: 20,
    dietary_tags: ['Gluten Free'],
    ingredients: [
      { id: '1', name: 'Eggs', amount: '3 whole' },
      { id: '2', name: 'Spinach', amount: '30g' },
      { id: '3', name: 'Bell pepper', amount: '40g' },
      { id: '4', name: 'Olive oil', amount: '5ml' },
    ],
    prep_notes: '',
    added_at: '2026-03-10T00:00:00',
  },
  {
    id: '3',
    name: 'Brown Rice Bowl',
    emoji: '🍱',
    emoji_bg: '#fef3c7',
    category: 'Dinner',
    source: 'admin',
    serving_size: '1 bowl (250g)',
    calories: 380,
    protein: 8,
    carbs: 78,
    fats: 4,
    dietary_tags: ['Vegan', 'Halal'],
    ingredients: [
      { id: '1', name: 'Brown rice', amount: '150g' },
      { id: '2', name: 'Soy sauce', amount: '1 tbsp' },
      { id: '3', name: 'Sesame oil', amount: '5ml' },
    ],
    prep_notes: 'Cook rice until soft, season with soy sauce and sesame oil.',
    added_at: '2026-03-05T00:00:00',
  },
  {
    id: '4',
    name: 'Vegan Quinoa Bowl',
    emoji: '🥗',
    emoji_bg: '#f0fdf4',
    category: 'Lunch',
    source: 'user',
    serving_size: '1 bowl (300g)',
    calories: 410,
    protein: 18,
    carbs: 52,
    fats: 14,
    dietary_tags: ['Vegan', 'Gluten Free'],
    ingredients: [
      { id: '1', name: 'Quinoa', amount: '80g' },
      { id: '2', name: 'Avocado', amount: '60g' },
      { id: '3', name: 'Cherry tomatoes', amount: '50g' },
    ],
    prep_notes: '',
    added_at: '2026-03-20T00:00:00',
  },
  {
    id: '5',
    name: 'Greek Yoghurt Parfait',
    emoji: '🥣',
    emoji_bg: '#ede9fe',
    category: 'Snack',
    source: 'admin',
    serving_size: '1 cup (200g)',
    calories: 220,
    protein: 15,
    carbs: 28,
    fats: 5,
    dietary_tags: ['Gluten Free'],
    ingredients: [
      { id: '1', name: 'Greek yoghurt', amount: '150g' },
      { id: '2', name: 'Granola', amount: '30g' },
      { id: '3', name: 'Mixed berries', amount: '40g' },
    ],
    prep_notes: '',
    added_at: '2026-03-12T00:00:00',
  },
];

type Ingredient = { id: string; name: string; amount: string };

type FoodItem = {
  id: string;
  name: string;
  emoji: string;
  emoji_bg: string;
  category: string;
  source: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  dietary_tags: string[];
  ingredients: Ingredient[];
  prep_notes: string;
  added_at: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

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

// ── BLANK FORM STATE ──
const blankForm = {
  name: '',
  emoji: '',
  category: '',
  serving_size: '',
  calories: '',
  protein: '',
  carbs: '',
  dietary_tags: [] as string[],
  ingredients: [{ id: '1', name: '', amount: '' }] as Ingredient[],
  prep_notes: '',
};

export default function FoodDatabase({ visible, onClose }: Props) {
  const [foods, setFoods] = useState<FoodItem[]>(DUMMY_FOODS);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── FORM STATE ──
  const [form, setForm] = useState(blankForm);

  // ── FORM ERRORS ──
  const [errors, setErrors] = useState<Record<string, string>>({});

  const estimatedFats = calcFats(form.calories, form.protein, form.carbs);

  // ── FETCH ALL FOODS ──
  // TODO (Backend): Uncomment when backend is ready
  // Endpoint: GET /admin/food-database
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: array of FoodItem objects
  // const fetchFoods = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/food-database`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setFoods(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchFoods error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment when backend is ready
  // useEffect(() => {
  //   if (visible) fetchFoods();
  // }, [visible]);

  const openAddForm = () => {
    setEditingFood(null);
    setForm(blankForm);
    setErrors({});
    setShowForm(true);
  };

  const openEditForm = (food: FoodItem) => {
    setEditingFood(food);
    setForm({
      name: food.name,
      emoji: food.emoji,
      category: food.category,
      serving_size: food.serving_size,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      dietary_tags: food.dietary_tags,
      ingredients: food.ingredients,
      prep_notes: food.prep_notes,
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Food name is required';
    if (!form.category) newErrors.category = 'Please select a category';
    if (!form.serving_size.trim()) newErrors.serving_size = 'Serving size is required';
    if (!form.calories) newErrors.calories = 'Calories is required';
    else if (parseFloat(form.calories) < 1 || parseFloat(form.calories) > 5000)
      newErrors.calories = 'Enter a value between 1 and 5000';
    if (!form.protein) newErrors.protein = 'Protein is required';
    else if (parseFloat(form.protein) < 0 || parseFloat(form.protein) > 300)
      newErrors.protein = 'Enter a value between 0 and 300';
    if (!form.carbs) newErrors.carbs = 'Carbs is required';
    else if (parseFloat(form.carbs) < 0 || parseFloat(form.carbs) > 500)
      newErrors.carbs = 'Enter a value between 0 and 500';
    const filledIngredients = form.ingredients.filter(i => i.name.trim());
    if (filledIngredients.length === 0)
      newErrors.ingredients = 'Please add at least one ingredient';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── SAVE FOOD (Add or Edit) ──
  // TODO (Backend): Uncomment API calls and remove local updates when backend is ready
  //
  // For ADD new food:
  // Endpoint: POST /admin/food-database
  // Headers: { Authorization: Bearer <admin_token>, Content-Type: application/json }
  // Body: { name, emoji, category, serving_size, calories, protein, carbs,
  //         fats, ingredients, dietary_tags, prep_notes, source: 'admin' }
  // Returns: created FoodItem object with id and added_at set by backend
  //
  // For EDIT existing food:
  // Endpoint: PUT /admin/food-database/{id}
  // Headers: { Authorization: Bearer <admin_token>, Content-Type: application/json }
  // Body: same as POST body above
  // Returns: updated FoodItem object
  const handleSave = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    const filledIngredients = form.ingredients.filter(i => i.name.trim());
    const fats = parseFloat(estimatedFats);

    const payload = {
      name: form.name.trim(),
      emoji: form.emoji,
      emoji_bg: getEmojiBg(form.emoji),
      category: form.category,
      serving_size: form.serving_size.trim(),
      calories: parseFloat(form.calories),
      protein: parseFloat(form.protein),
      carbs: parseFloat(form.carbs),
      fats,
      dietary_tags: form.dietary_tags,
      ingredients: filledIngredients,
      prep_notes: form.prep_notes.trim(),
      source: 'admin',
    };

    try {
      if (editingFood) {
        // ── EDIT EXISTING FOOD ──
        // TODO (Backend): Replace below with API call
        // const res = await fetch(`${API_URL}/admin/food-database/${editingFood.id}`, {
        //   method: 'PUT',
        //   headers: {
        //     'Authorization': `Bearer ${adminToken}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(payload),
        // });
        // if (res.ok) { const updated = await res.json(); setFoods(prev => prev.map(f => f.id === updated.id ? updated : f)); }

        // Temporary local update — remove when backend is ready
        setFoods(prev => prev.map(f =>
          f.id === editingFood.id
            ? { ...f, ...payload }
            : f
        ));
        Alert.alert('Updated ✅', `"${form.name}" has been updated in the database.`);
      } else {
        // ── ADD NEW FOOD ──
        // TODO (Backend): Replace below with API call
        // const res = await fetch(`${API_URL}/admin/food-database`, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${adminToken}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(payload),
        // });
        // if (res.ok) { const created = await res.json(); setFoods(prev => [created, ...prev]); }

        // Temporary local update — remove when backend is ready
        const newFood: FoodItem = {
          id: Date.now().toString(),
          added_at: new Date().toISOString(),
          ...payload,
        };
        setFoods(prev => [newFood, ...prev]);
        Alert.alert('Added ✅', `"${form.name}" has been added to the database.`);
      }

      setShowForm(false);
      setEditingFood(null);
      setForm(blankForm);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DELETE FOOD ──
  // TODO (Backend): Uncomment API call and remove local update when backend is ready
  // Endpoint: DELETE /admin/food-database/{id}
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: 204 No Content on success
  const handleDelete = (food: FoodItem) => {
    Alert.alert(
      'Delete Food',
      `Permanently remove "${food.name}" from the database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/admin/food-database/${food.id}`, {
              //   method: 'DELETE',
              //   headers: { 'Authorization': `Bearer ${adminToken}` },
              // });
              // if (res.status === 204) { setFoods(prev => prev.filter(f => f.id !== food.id)); }

              // Temporary local update — remove when backend is ready
              setFoods(prev => prev.filter(f => f.id !== food.id));
              Alert.alert('Deleted', `"${food.name}" has been removed from the database.`);
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleDietaryTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...prev.dietary_tags, tag],
    }));
  };

  const addIngredient = () => {
    setForm(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { id: Date.now().toString(), name: '', amount: '' }
      ],
    }));
  };

  const removeIngredient = (id: string) => {
    if (form.ingredients.length === 1) return;
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== id),
    }));
  };

  const updateIngredient = (id: string, field: 'name' | 'amount', value: string) => {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(i =>
        i.id === id ? { ...i, [field]: value } : i
      ),
    }));
  };

  const filtered = foods.filter(f => {
    const matchFilter =
      activeFilter === 'All' ||
      f.category === activeFilter ||
      (activeFilter === 'Admin Added' && f.source === 'admin') ||
      (activeFilter === 'User Recipes' && f.source === 'user');
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalCount = foods.length;
  const adminCount = foods.filter(f => f.source === 'admin').length;
  const userCount = foods.filter(f => f.source === 'user').length;
  const thisMonth = foods.filter(f => {
    const added = new Date(f.added_at);
    const now = new Date();
    return added.getMonth() === now.getMonth() &&
      added.getFullYear() === now.getFullYear();
  }).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total foods', value: totalCount, color: '#111827' },
            { label: 'Admin added', value: adminCount, color: '#1e40af' },
            { label: 'User recipes', value: userCount, color: '#10b981' },
            { label: 'This month', value: thisMonth, color: '#d97706' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Add new food button */}
        <TouchableOpacity style={styles.addBtn} onPress={openAddForm}>
          <Text style={styles.addBtnText}>＋  Add New Food</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search food database..."
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

        {/* Food list */}
        <View>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No foods found</Text>
            </View>
          ) : (
            filtered.map(food => (
              <View key={food.id} style={styles.foodCard}>

                {/* Top row */}
                <View style={styles.foodTop}>
                  <View style={[styles.foodEmoji, { backgroundColor: food.emoji_bg }]}>
                    <Text style={styles.foodEmojiText}>
                      {food.emoji || '🍽️'}
                    </Text>
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodServing}>{food.serving_size}</Text>
                  </View>
                  <View style={[
                    styles.sourceBadge,
                    food.source === 'admin' ? styles.sourceAdmin : styles.sourceUser
                  ]}>
                    <Text style={[
                      styles.sourceBadgeText,
                      food.source === 'admin'
                        ? styles.sourceBadgeTextAdmin
                        : styles.sourceBadgeTextUser
                    ]}>
                      {food.source === 'admin' ? 'Admin' : 'User Recipe'}
                    </Text>
                  </View>
                </View>

                {/* Tags */}
                <View style={styles.tagsRow}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>
                      {CATEGORY_EMOJIS[food.category]} {food.category}
                    </Text>
                  </View>
                  {food.dietary_tags.map(tag => (
                    <View key={tag} style={styles.dietaryTag}>
                      <Text style={styles.dietaryTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {/* Macros */}
                <View style={styles.macroRow}>
                  {[
                    { val: food.calories, lbl: 'kcal' },
                    { val: `${food.protein}g`, lbl: 'protein' },
                    { val: `${food.carbs}g`, lbl: 'carbs' },
                    { val: `${food.fats}g`, lbl: 'fats' },
                  ].map(m => (
                    <View key={m.lbl} style={styles.macroBox}>
                      <Text style={styles.macroVal}>{m.val}</Text>
                      <Text style={styles.macroLbl}>{m.lbl}</Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnEdit]}
                    onPress={() => openEditForm(food)}
                  >
                    <Text style={styles.btnEditText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnDelete]}
                    onPress={() => handleDelete(food)}
                  >
                    <Text style={styles.btnDeleteText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>

              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── ADD / EDIT FOOD FORM MODAL ── */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.safe}>
          <Navbar
            title={editingFood ? 'Edit Food' : 'Add New Food'}
            backLabel="Food DB"
            onClose={() => { setShowForm(false); setEditingFood(null); setForm(blankForm); }}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formContent}>

              {/* Basic Information */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📝 Basic Information</Text>

                <Text style={styles.fieldLabel}>Food name *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.name ? styles.inputError : null]}
                  placeholder="e.g. Grilled Chicken Salad"
                  placeholderTextColor="#9ca3af"
                  value={form.name}
                  onChangeText={v => {
                    setForm(prev => ({ ...prev, name: v }));
                    setErrors(prev => ({ ...prev, name: '' }));
                  }}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

                <Text style={styles.fieldLabel}>Category *</Text>
                <View style={styles.catRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, form.category === cat && styles.catPillActive]}
                      onPress={() => {
                        setForm(prev => ({ ...prev, category: cat }));
                        setErrors(prev => ({ ...prev, category: '' }));
                      }}
                    >
                      <Text style={[
                        styles.catPillText,
                        form.category === cat && styles.catPillTextActive
                      ]}>
                        {CATEGORY_EMOJIS[cat]} {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

                <Text style={styles.fieldLabel}>Emoji (optional)</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emojiBtn,
                        form.emoji === emoji && styles.emojiBtnActive
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, emoji }))}
                    >
                      {emoji === '' ? (
                        <Text style={styles.emojiNoneText}>—</Text>
                      ) : (
                        <Text style={styles.emojiText}>{emoji}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.emojiHint}>Select — to add without an emoji</Text>
              </View>

              {/* Nutritional Info */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📊 Nutritional Info (per serving)</Text>

                <Text style={styles.fieldLabel}>Serving size *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.serving_size ? styles.inputError : null]}
                  placeholder="e.g. 1 bowl (300g)"
                  placeholderTextColor="#9ca3af"
                  value={form.serving_size}
                  onChangeText={v => {
                    setForm(prev => ({ ...prev, serving_size: v }));
                    setErrors(prev => ({ ...prev, serving_size: '' }));
                  }}
                />
                {errors.serving_size
                  ? <Text style={styles.errorText}>{errors.serving_size}</Text>
                  : null}

                <View style={styles.macroInputRow}>
                  {[
                    { key: 'calories', label: 'Calories (kcal) *', placeholder: '0' },
                    { key: 'protein', label: 'Protein (g) *', placeholder: '0' },
                    { key: 'carbs', label: 'Carbs (g) *', placeholder: '0' },
                  ].map(field => (
                    <View key={field.key} style={styles.macroField}>
                      <Text style={styles.macroLabel}>{field.label}</Text>
                      <TextInput
                        style={[
                          styles.macroInput,
                          errors[field.key] ? styles.inputError : null
                        ]}
                        placeholder={field.placeholder}
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={(form as any)[field.key]}
                        onChangeText={v => {
                          setForm(prev => ({ ...prev, [field.key]: v }));
                          setErrors(prev => ({ ...prev, [field.key]: '' }));
                        }}
                        textAlign="center"
                      />
                      {errors[field.key]
                        ? <Text style={styles.macroError}>{errors[field.key]}</Text>
                        : null}
                    </View>
                  ))}
                </View>

                <View style={styles.fatsBox}>
                  <View>
                    <Text style={styles.fatsLabel}>🔥 Estimated Fats</Text>
                    <Text style={styles.fatsHint}>Auto-calculated from your macros</Text>
                  </View>
                  <Text style={styles.fatsVal}>{estimatedFats}g</Text>
                </View>
              </View>

              {/* Ingredients */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🧂 Ingredients</Text>
                {form.ingredients.map((ing, index) => (
                  <View key={ing.id} style={styles.ingRow}>
                    <TextInput
                      style={styles.ingName}
                      placeholder={`Ingredient ${index + 1}`}
                      placeholderTextColor="#9ca3af"
                      value={ing.name}
                      onChangeText={v => updateIngredient(ing.id, 'name', v)}
                    />
                    <TextInput
                      style={styles.ingAmt}
                      placeholder="Amount"
                      placeholderTextColor="#9ca3af"
                      value={ing.amount}
                      onChangeText={v => updateIngredient(ing.id, 'amount', v)}
                    />
                    <TouchableOpacity
                      style={styles.ingDel}
                      onPress={() => removeIngredient(ing.id)}
                    >
                      <Text style={styles.ingDelText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {errors.ingredients
                  ? <Text style={styles.errorText}>{errors.ingredients}</Text>
                  : null}
                <TouchableOpacity style={styles.addIngBtn} onPress={addIngredient}>
                  <Text style={styles.addIngPlus}>+</Text>
                  <Text style={styles.addIngText}>Add ingredient</Text>
                </TouchableOpacity>
              </View>

              {/* Dietary Tags + Prep Notes */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🏷️ Dietary Tags</Text>
                <View style={styles.tagRow}>
                  {DIETARY_TAGS.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPill,
                        form.dietary_tags.includes(tag) && styles.tagPillActive
                      ]}
                      onPress={() => toggleDietaryTag(tag)}
                    >
                      <View style={[
                        styles.tagCheck,
                        form.dietary_tags.includes(tag) && styles.tagCheckActive
                      ]} />
                      <Text style={[
                        styles.tagText,
                        form.dietary_tags.includes(tag) && styles.tagTextActive
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>
                  Prep notes{' '}
                  <Text style={styles.optionalText}>(optional)</Text>
                </Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  placeholder="e.g. Grill chicken until cooked through..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  value={form.prep_notes}
                  onChangeText={v => setForm(prev => ({ ...prev, prep_notes: v }))}
                  textAlignVertical="top"
                />
              </View>

              {/* Save and Cancel */}
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {submitting
                    ? 'Saving...'
                    : editingFood
                    ? 'Save Changes'
                    : 'Save to Database'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  setEditingFood(null);
                  setForm(blankForm);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981', alignItems: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '700' },
  statLbl: { fontSize: 9, color: '#6b7280', marginTop: 2, textAlign: 'center' },

  addBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 12,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  pillsScroll: { marginBottom: 14 },
  pillsRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },

  foodCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  foodTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  foodEmoji: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  foodEmojiText: { fontSize: 20 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  foodServing: { fontSize: 11, color: '#9ca3af' },
  sourceBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  sourceAdmin: { backgroundColor: '#dbeafe' },
  sourceUser: { backgroundColor: '#d1fae5' },
  sourceBadgeText: { fontSize: 10, fontWeight: '700' },
  sourceBadgeTextAdmin: { color: '#1e40af' },
  sourceBadgeTextUser: { color: '#065f46' },

  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 8 },
  catBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catBadgeText: { fontSize: 10, fontWeight: '600', color: '#065f46' },
  dietaryTag: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dietaryTagText: { fontSize: 10, fontWeight: '600', color: '#4b5563' },

  macroRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  macroBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 7,
    padding: 6, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  macroVal: { fontSize: 11, fontWeight: '700', color: '#111827' },
  macroLbl: { fontSize: 8, color: '#9ca3af', marginTop: 1 },

  actionRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: 'center', borderWidth: 1,
  },
  btnEdit: { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' },
  btnEditText: { fontSize: 12, fontWeight: '700', color: '#065f46' },
  btnDelete: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  btnDeleteText: { fontSize: 12, fontWeight: '700', color: '#991b1b' },

  formContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, marginTop: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  optionalText: { fontSize: 12, color: '#9ca3af', fontWeight: '400' },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', marginBottom: 4,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, marginTop: 2 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  catPillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catPillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  catPillTextActive: { color: '#fff' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnActive: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  emojiText: { fontSize: 20 },
  emojiNoneText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  emojiHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },

  macroInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 10, fontWeight: '600', color: '#6b7280', marginBottom: 5 },
  macroInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 10, fontSize: 15, fontWeight: '600', color: '#111827',
  },
  macroError: { fontSize: 10, color: '#ef4444', marginTop: 3, textAlign: 'center' },

  fatsBox: {
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fatsLabel: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  fatsHint: { fontSize: 10, color: '#92400e', marginTop: 2 },
  fatsVal: { fontSize: 22, fontWeight: '800', color: '#d97706' },

  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ingName: {
    flex: 2, backgroundColor: '#f9fafb', borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827',
  },
  ingAmt: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, color: '#6b7280',
  },
  ingDel: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ingDelText: { fontSize: 12, color: '#dc2626', fontWeight: '700' },
  addIngBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#10b981', borderStyle: 'dashed',
    backgroundColor: '#f0fdf4', justifyContent: 'center', marginTop: 4,
  },
  addIngPlus: { fontSize: 18, color: '#10b981', fontWeight: '700' },
  addIngText: { fontSize: 13, color: '#10b981', fontWeight: '600' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  tagPillActive: { backgroundColor: '#f0fdf4', borderColor: '#10b981' },
  tagCheck: {
    width: 14, height: 14, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  tagCheckActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  tagText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  tagTextActive: { color: '#065f46' },

  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#6ee7b7' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  cancelBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#fff', marginBottom: 20,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
});