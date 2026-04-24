import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from '../ui/Navbar';
import { API_URL } from '../../constants/api';

const FILTERS = ['All', 'Admin Added'];

type FoodItem = {
  id: string;
  name: string;
  source: string;
  brand: string | null;
  barcode: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
  sodium_mg: number;
  added_at: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const blankForm = {
  name: '',
  brand: '',
  barcode: '',
  serving_size: '',
  serving_unit: '',
  calories: '',
  protein_g: '',
  carb_g: '',
  fat_g: '',
  sugar_g: '',
  fiber_g: '',
  sodium_mg: '',
};

// ── MAP BACKEND RESPONSE TO FRONTEND TYPE ──
// Backend returns food_id as integer — convert to string
const mapFood = (f: any): FoodItem => ({
  id:           String(f.food_id ?? f.id),
  name:         f.name,
  source:       f.source,
  brand:        f.brand ?? null,
  barcode:      f.barcode ?? null,
  serving_size: f.serving_size,
  serving_unit: f.serving_unit,
  calories:     f.calories,
  protein_g:    f.protein_g,
  carb_g:       f.carb_g,
  fat_g:        f.fat_g,
  sugar_g:      f.sugar_g,
  fiber_g:      f.fiber_g,
  sodium_mg:    f.sodium_mg,
  added_at:     f.created_at ?? f.added_at ?? new Date().toISOString(),
});

export default function FoodDatabase({ visible, onClose }: Props) {
  const [foods, setFoods]               = useState<FoodItem[]>([]);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showForm, setShowForm]         = useState(false);
  const [editingFood, setEditingFood]   = useState<FoodItem | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [form, setForm]                 = useState(blankForm);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH ALL FOODS ──
  // Endpoint: GET /admin/food-database/
  // Headers: { Authorization: Bearer <token> }
  // Returns: array of AdminFoodItemResponse objects
  // Each: { food_id, external_id, name, brand, barcode, source,
  //         serving_size, serving_unit, calories, protein_g,
  //         carb_g, fat_g, sugar_g, fiber_g, sodium_mg }
  const fetchFoods = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/food-database/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFoods(data.map(mapFood));
      } else {
        console.log('fetchFoods failed:', res.status);
      }
    } catch (e) {
      console.log('fetchFoods error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchFoods();
  }, [visible]);

  const openAddForm = () => {
    setEditingFood(null);
    setForm(blankForm);
    setErrors({});
    setShowForm(true);
  };

  const openEditForm = (food: FoodItem) => {
    setEditingFood(food);
    setForm({
      name:         food.name,
      brand:        food.brand ?? '',
      barcode:      food.barcode ?? '',
      serving_size: String(food.serving_size),
      serving_unit: food.serving_unit,
      calories:     String(food.calories),
      protein_g:    String(food.protein_g),
      carb_g:       String(food.carb_g),
      fat_g:        String(food.fat_g),
      sugar_g:      String(food.sugar_g),
      fiber_g:      String(food.fiber_g),
      sodium_mg:    String(food.sodium_mg),
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim())         newErrors.name         = 'Food name is required';
    if (!form.serving_size)        newErrors.serving_size = 'Serving size is required';
    else if (parseFloat(form.serving_size) <= 0)
                                   newErrors.serving_size = 'Must be greater than 0';
    if (!form.serving_unit.trim()) newErrors.serving_unit = 'Serving unit is required';
    if (!form.calories)            newErrors.calories     = 'Calories is required';
    else if (parseFloat(form.calories) < 0)
                                   newErrors.calories     = 'Must be 0 or greater';
    if (!form.protein_g)           newErrors.protein_g    = 'Protein is required';
    else if (parseFloat(form.protein_g) < 0)
                                   newErrors.protein_g    = 'Must be 0 or greater';
    if (!form.carb_g)              newErrors.carb_g       = 'Carbs is required';
    else if (parseFloat(form.carb_g) < 0)
                                   newErrors.carb_g       = 'Must be 0 or greater';
    if (!form.fat_g)               newErrors.fat_g        = 'Fat is required';
    else if (parseFloat(form.fat_g) < 0)
                                   newErrors.fat_g        = 'Must be 0 or greater';
    if (!form.sugar_g)             newErrors.sugar_g      = 'Sugar is required';
    else if (parseFloat(form.sugar_g) < 0)
                                   newErrors.sugar_g      = 'Must be 0 or greater';
    if (!form.fiber_g)             newErrors.fiber_g      = 'Fiber is required';
    else if (parseFloat(form.fiber_g) < 0)
                                   newErrors.fiber_g      = 'Must be 0 or greater';
    if (!form.sodium_mg)           newErrors.sodium_mg    = 'Sodium is required';
    else if (parseFloat(form.sodium_mg) < 0)
                                   newErrors.sodium_mg    = 'Must be 0 or greater';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── BUILD PAYLOAD ──
  // Matches AdminFoodItemRequest in admin_food_database.py exactly
  // source is always 'admin' — backend validates this
  const buildPayload = () => ({
    name:         form.name.trim(),
    source:       'admin',
    brand:        form.brand.trim() || null,
    barcode:      form.barcode.trim() || null,
    serving_size: parseFloat(form.serving_size),
    serving_unit: form.serving_unit.trim(),
    calories:     parseFloat(form.calories),
    protein_g:    parseFloat(form.protein_g),
    carb_g:       parseFloat(form.carb_g),
    fat_g:        parseFloat(form.fat_g),
    sugar_g:      parseFloat(form.sugar_g),
    fiber_g:      parseFloat(form.fiber_g),
    sodium_mg:    parseFloat(form.sodium_mg),
  });

  // ── ADD FOOD ──
  // Endpoint: POST /admin/food-database/
  // Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  // Body: buildPayload()
  // Returns: AdminFoodItemResponse with food_id set by backend
  //
  // ── EDIT FOOD ──
  // Endpoint: PUT /admin/food-database/{food_id}
  // Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  // Body: buildPayload()
  // Returns: updated AdminFoodItemResponse
  // Note: backend only allows editing admin-added foods
  const handleSave = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    const payload = buildPayload();

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      if (editingFood) {
        // ── EDIT EXISTING FOOD ──
        const res = await fetch(
          `${API_URL}/admin/food-database/${editingFood.id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          setFoods(prev => prev.map(f =>
            f.id === String(updated.food_id) ? mapFood(updated) : f
          ));
          Alert.alert('Updated ✅', `"${form.name}" has been updated.`);
        } else {
          const err = await res.json();
          if (res.status === 409) {
            Alert.alert('Error', 'This barcode already exists in the database.');
          } else {
            Alert.alert('Error', err.detail || 'Failed to update food.');
          }
          return;
        }
      } else {
        // ── ADD NEW FOOD ──
        const res = await fetch(`${API_URL}/admin/food-database/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setFoods(prev => [mapFood(created), ...prev]);
          Alert.alert('Added ✅', `"${form.name}" has been added to the database.`);
        } else {
          const err = await res.json();
          if (res.status === 409) {
            Alert.alert('Error', 'This barcode already exists in the database.');
          } else {
            Alert.alert('Error', err.detail || 'Failed to add food.');
          }
          return;
        }
      }

      setShowForm(false);
      setEditingFood(null);
      setForm(blankForm);
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DELETE FOOD ──
  // Endpoint: DELETE /admin/food-database/{food_id}
  // Headers: { Authorization: Bearer <token> }
  // Returns: 204 No Content
  // Note: backend only allows deleting admin-added foods
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
              const token = await getToken();
              if (!token) return;
              const res = await fetch(
                `${API_URL}/admin/food-database/${food.id}`,
                {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
                }
              );
              if (res.status === 204) {
                setFoods(prev => prev.filter(f => f.id !== food.id));
                Alert.alert('Deleted', `"${food.name}" has been removed.`);
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to delete food.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const filtered = foods.filter(f => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Admin Added' && f.source === 'admin');
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalCount = foods.length;
  const adminCount = foods.filter(f => f.source === 'admin').length;

  const MACRO_FIELDS = [
    { key: 'calories',  label: 'Calories (kcal) *', placeholder: '0' },
    { key: 'protein_g', label: 'Protein (g) *',     placeholder: '0' },
    { key: 'carb_g',    label: 'Carbs (g) *',       placeholder: '0' },
    { key: 'fat_g',     label: 'Fat (g) *',         placeholder: '0' },
    { key: 'sugar_g',   label: 'Sugar (g) *',       placeholder: '0' },
    { key: 'fiber_g',   label: 'Fiber (g) *',       placeholder: '0' },
    { key: 'sodium_mg', label: 'Sodium (mg) *',     placeholder: '0' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total foods', value: totalCount, color: '#111827' },
            { label: 'Admin added', value: adminCount, color: '#1e40af' },
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

        {/* Loading state */}
        {loading && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Loading foods...</Text>
          </View>
        )}

        {/* Food list */}
        {!loading && (
          <View>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🍽️</Text>
                <Text style={styles.emptyTitle}>
                  {foods.length === 0 ? 'No foods added yet' : 'No foods found'}
                </Text>
              </View>
            ) : (
              filtered.map(food => (
                <View key={food.id} style={styles.foodCard}>

                  {/* Top row */}
                  <View style={styles.foodTop}>
                    <View style={styles.foodIconBox}>
                      <Text style={styles.foodIconText}>🍽️</Text>
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      {food.brand ? (
                        <Text style={styles.foodBrand}>{food.brand}</Text>
                      ) : null}
                      <Text style={styles.foodServing}>
                        {food.serving_size} {food.serving_unit}
                      </Text>
                    </View>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>Admin</Text>
                    </View>
                  </View>

                  {/* Macros */}
                  <View style={styles.macroRow}>
                    {[
                      { val: `${food.calories}`,    lbl: 'kcal'   },
                      { val: `${food.protein_g}g`,  lbl: 'protein'},
                      { val: `${food.carb_g}g`,     lbl: 'carbs'  },
                      { val: `${food.fat_g}g`,      lbl: 'fat'    },
                      { val: `${food.sugar_g}g`,    lbl: 'sugar'  },
                      { val: `${food.fiber_g}g`,    lbl: 'fiber'  },
                      { val: `${food.sodium_mg}mg`, lbl: 'sodium' },
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
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── ADD / EDIT FOOD FORM MODAL ── */}
      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safe}>
          <Navbar
            title={editingFood ? 'Edit Food' : 'Add New Food'}
            backLabel="Food DB"
            onClose={() => {
              setShowForm(false);
              setEditingFood(null);
              setForm(blankForm);
              setErrors({});
            }}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formContent}>

              {/* ── BASIC INFORMATION ── */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📝 Basic Information</Text>

                <Text style={styles.fieldLabel}>Food name *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.name ? styles.inputError : null]}
                  placeholder="e.g. Grilled Chicken"
                  placeholderTextColor="#9ca3af"
                  value={form.name}
                  onChangeText={v => {
                    setForm(p => ({ ...p, name: v }));
                    setErrors(p => ({ ...p, name: '' }));
                  }}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

                <Text style={styles.fieldLabel}>
                  Brand <Text style={styles.optionalText}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Nestle, Fairprice"
                  placeholderTextColor="#9ca3af"
                  value={form.brand}
                  onChangeText={v => setForm(p => ({ ...p, brand: v }))}
                />

                <Text style={styles.fieldLabel}>
                  Barcode <Text style={styles.optionalText}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 8888888888888"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={form.barcode}
                  onChangeText={v => setForm(p => ({ ...p, barcode: v }))}
                />
              </View>

              {/* ── SERVING SIZE ── */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🍽️ Serving Size</Text>
                <View style={styles.servingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Amount *</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        errors.serving_size ? styles.inputError : null,
                      ]}
                      placeholder="e.g. 100"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={form.serving_size}
                      onChangeText={v => {
                        setForm(p => ({ ...p, serving_size: v }));
                        setErrors(p => ({ ...p, serving_size: '' }));
                      }}
                    />
                    {errors.serving_size
                      ? <Text style={styles.errorText}>{errors.serving_size}</Text>
                      : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Unit *</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        errors.serving_unit ? styles.inputError : null,
                      ]}
                      placeholder="e.g. g, ml, piece"
                      placeholderTextColor="#9ca3af"
                      value={form.serving_unit}
                      onChangeText={v => {
                        setForm(p => ({ ...p, serving_unit: v }));
                        setErrors(p => ({ ...p, serving_unit: '' }));
                      }}
                    />
                    {errors.serving_unit
                      ? <Text style={styles.errorText}>{errors.serving_unit}</Text>
                      : null}
                  </View>
                </View>
              </View>

              {/* ── NUTRITIONAL INFO ── */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📊 Nutritional Info (per serving)</Text>
                <View style={styles.macroInputGrid}>
                  {MACRO_FIELDS.map(field => (
                    <View key={field.key} style={styles.macroField}>
                      <Text style={styles.macroLabel}>{field.label}</Text>
                      <TextInput
                        style={[
                          styles.macroInput,
                          errors[field.key] ? styles.inputError : null,
                        ]}
                        placeholder={field.placeholder}
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={(form as any)[field.key]}
                        onChangeText={v => {
                          setForm(p => ({ ...p, [field.key]: v }));
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
              </View>

              {/* ── SOURCE INFO ── */}
              <View style={styles.sourceBox}>
                <Text style={styles.sourceText}>
                  🔒 Source is always set to{' '}
                  <Text style={{ fontWeight: '700' }}>"admin"</Text>{' '}
                  for foods added through this page.
                </Text>
              </View>

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
                  setErrors({});
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
  foodTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 10,
  },
  foodIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  foodIconText: { fontSize: 20 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  foodBrand: { fontSize: 11, color: '#6b7280', marginBottom: 1 },
  foodServing: { fontSize: 11, color: '#9ca3af' },
  sourceBadge: {
    backgroundColor: '#dbeafe', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 12, flexShrink: 0,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: '#1e40af' },

  macroRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 4, marginBottom: 10,
  },
  macroBox: {
    backgroundColor: '#f9fafb', borderRadius: 7,
    paddingVertical: 5, paddingHorizontal: 6,
    alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb',
    minWidth: 44,
  },
  macroVal: { fontSize: 10, fontWeight: '700', color: '#111827' },
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

  formContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12,
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
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, marginTop: 2 },

  servingRow: { flexDirection: 'row', gap: 10 },

  macroInputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroField: { width: '47%' },
  macroLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 5 },
  macroInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 10, fontSize: 14, fontWeight: '600',
    color: '#111827', marginBottom: 2,
  },
  macroError: { fontSize: 10, color: '#ef4444', marginTop: 2, textAlign: 'center' },

  sourceBox: {
    backgroundColor: '#dbeafe', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
  },
  sourceText: { fontSize: 12, color: '#1e40af', lineHeight: 18 },

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