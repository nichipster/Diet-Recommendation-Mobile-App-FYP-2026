// components/IngredientBuilder.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { API_URL, getAuthHeaders } from '@/constants/api';

interface Ingredient {
  external_id: number;
  source: 'ingredient' | 'product' | 'manual';
  name: string;
  brand?: string;
  // per-serving (as fetched)
  baseCal: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  baseServingSize: string;   // e.g. "100g" — display only
  // user-set quantity multiplier (how many servings)
  qty: string;              // string so TextInput works cleanly
}

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Props {
  token: string | null;
  onMacrosChange: (macros: Macros) => void; // called whenever totals change
}

// ── helpers ──
const round1 = (n: number) => Math.round(n * 10) / 10;

const sumMacros = (ingredients: Ingredient[]): Macros =>
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

export default function IngredientBuilder({ token, onMacrosChange }: Props) {
  const [query, setQuery]             = useState('');
  const [searching, setSearching]     = useState(false);
  const [results, setResults]         = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingId, setLoadingId]     = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // ── search ──
  const handleSearch = async () => {
    if (!query.trim() || !token) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `${API_URL}/food/search?query=${encodeURIComponent(query)}`,
        { headers: getAuthHeaders(token) }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data);
    } catch {
      Alert.alert('Error', 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ── fetch detail + add to list ──
  const handleAdd = async (item: any) => {
    if (!token) return;
    setLoadingId(item.external_id);
    try {
      const res = await fetch(
        `${API_URL}/food/detail?external_id=${item.external_id}&source=${item.source}`,
        { headers: getAuthHeaders(token) }
      );
      if (!res.ok) throw new Error();
      const d = await res.json();

      const newIng: Ingredient = {
        external_id:   item.external_id,
        source:        item.source,
        name:          item.name,
        brand:         item.brand,
        baseCal:       d.calories,
        baseProtein:   d.protein_g,
        baseCarbs:     d.carb_g,
        baseFat:       d.fat_g,
        baseServingSize: `${d.serving_size}${d.serving_unit}`,
        qty: '1',
      };

      const updated = [...ingredients, newIng];
      setIngredients(updated);
      onMacrosChange(sumMacros(updated));

      // clear search after adding
      setQuery('');
      setResults([]);
      setHasSearched(false);
    } catch {
      Alert.alert('Error', 'Failed to load food details.');
    } finally {
      setLoadingId(null);
    }
  };

  // ── update qty ──
  const updateQty = (index: number, value: string) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, qty: value } : ing
    );
    setIngredients(updated);
    onMacrosChange(sumMacros(updated));
  };

  // ── remove ──
  const removeIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    setIngredients(updated);
    onMacrosChange(sumMacros(updated));
  };

  const totals = sumMacros(ingredients);

  return (
    <View>

      {/* ── Search bar ── */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search ingredient..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={s.searchBtn}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Search results ── */}
      {hasSearched && !searching && results.length === 0 && (
        <Text style={s.noResults}>No results for "{query}"</Text>
      )}
      {results.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={s.resultRow}
          onPress={() => handleAdd(item)}
          disabled={loadingId === item.external_id}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.resultName}>{item.name}</Text>
            {item.brand && <Text style={s.resultBrand}>{item.brand}</Text>}
          </View>
          {loadingId === item.external_id
            ? <ActivityIndicator size="small" color="#10b981" />
            : <Text style={s.addLabel}>+ Add</Text>}
        </TouchableOpacity>
      ))}

      {/* ── Added ingredients list ── */}
      {ingredients.length > 0 && (
        <View style={s.ingredientList}>
          <Text style={s.sectionLabel}>Ingredients added</Text>
          {ingredients.map((ing, i) => (
            <View key={i} style={s.ingRow}>

              {/* Name + serving hint */}
              <View style={{ flex: 1 }}>
                <Text style={s.ingName}>{ing.name}</Text>
                <Text style={s.ingServing}>1 serving = {ing.baseServingSize}</Text>
              </View>

              {/* Qty input */}
              <View style={s.qtyWrap}>
                <Text style={s.qtyLabel}>× servings</Text>
                <TextInput
                  style={s.qtyInput}
                  value={ing.qty}
                  onChangeText={v => updateQty(i, v)}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
              </View>

              {/* Computed macros for this ingredient */}
              <View style={s.ingMacros}>
                <Text style={s.ingCal}>{round1(ing.baseCal * (parseFloat(ing.qty) || 0))} kcal</Text>
                <Text style={s.ingMacroDetail}>
                  P {round1(ing.baseProtein * (parseFloat(ing.qty)||0))}g ·{' '}
                  C {round1(ing.baseCarbs * (parseFloat(ing.qty)||0))}g ·{' '}
                  F {round1(ing.baseFat * (parseFloat(ing.qty)||0))}g
                </Text>
              </View>

              {/* Remove */}
              <TouchableOpacity onPress={() => removeIngredient(i)} style={s.removeBtn}>
                <Text style={s.removeText}>✕</Text>
              </TouchableOpacity>

            </View>
          ))}

          {/* ── Totals summary bar ── */}
          <View style={s.totalsBar}>
            <Text style={s.totalsTitle}>Total</Text>
            <View style={s.totalsRow}>
              {[
                { val: round1(totals.calories), lbl: 'kcal',    color: '#111827' },
                { val: round1(totals.protein),  lbl: 'protein', color: '#3b82f6' },
                { val: round1(totals.carbs),    lbl: 'carbs',   color: '#f97316' },
                { val: round1(totals.fats),     lbl: 'fats',    color: '#eab308' },
              ].map(m => (
                <View key={m.lbl} style={s.totalBox}>
                  <Text style={[s.totalVal, { color: m.color }]}>{m.val}</Text>
                  <Text style={s.totalLbl}>{m.lbl}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  searchInput: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827',
  },
  searchBtn: {
    backgroundColor: '#7c3aed', borderRadius: 10,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  noResults: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 8 },

  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  resultName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  resultBrand: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  addLabel: { fontSize: 13, fontWeight: '700', color: '#10b981' },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#6b7280',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  ingredientList: {
    backgroundColor: '#f9fafb', borderRadius: 12,
    padding: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
  },

  ingRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 10,
    padding: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  ingName: { fontSize: 12, fontWeight: '700', color: '#111827' },
  ingServing: { fontSize: 10, color: '#9ca3af', marginTop: 1 },

  qtyWrap: { alignItems: 'center' },
  qtyLabel: { fontSize: 9, color: '#9ca3af', marginBottom: 2 },
  qtyInput: {
    width: 48, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 8, paddingVertical: 6,
    fontSize: 14, fontWeight: '700', color: '#111827',
    backgroundColor: '#f9fafb',
  },

  ingMacros: { alignItems: 'flex-end' },
  ingCal: { fontSize: 12, fontWeight: '700', color: '#111827' },
  ingMacroDetail: { fontSize: 9, color: '#9ca3af', marginTop: 1 },

  removeBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
  removeText: { fontSize: 11, color: '#ef4444', fontWeight: '700' },

  totalsBar: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 10, marginTop: 6,
    borderWidth: 1, borderColor: '#d1fae5',
  },
  totalsTitle: {
    fontSize: 11, fontWeight: '700', color: '#10b981',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  totalsRow: { flexDirection: 'row', gap: 6 },
  totalBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 8,
    padding: 6, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  totalVal: { fontSize: 13, fontWeight: '700' },
  totalLbl: { fontSize: 9, color: '#9ca3af', marginTop: 1 },
});