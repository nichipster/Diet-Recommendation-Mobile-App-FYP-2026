import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../ui/Navbar';
import FormField from '../profile_section/profile/cards/FormField';

// ── DUMMY DATA ──
// TODO (Backend): Replace DUMMY_RECIPES with real API call
// Endpoint: GET /admin/recipes
// Returns: array of recipe objects matching the Recipe type below
const DUMMY_RECIPES = [
  {
    id: '1',
    name: 'Creamy Pasta Carbonara',
    emoji: '🍝',
    emoji_bg: '#fef3c7',
    submitted_by: 'Sarah Tang',
    user_role: 'premium',
    category: 'Dinner',
    category_emoji: '🍽️',
    status: 'pending',
    submitted_at: '2026-03-25T07:00:00',
    serving_size: '1 plate (350g)',
    servings: 1,
    calories: 720,
    protein: 28,
    carbs: 85,
    fats: 32,
    ingredients: [
      { name: 'Spaghetti', amount: '100g' },
      { name: 'Eggs', amount: '2 whole' },
      { name: 'Parmesan cheese', amount: '50g' },
      { name: 'Bacon / pancetta', amount: '80g' },
      { name: 'Black pepper', amount: 'to taste' },
      { name: 'Salt', amount: 'to taste' },
    ],
    admin_note: null,
  },
  {
    id: '2',
    name: 'Vegan Quinoa Bowl',
    emoji: '🥗',
    emoji_bg: '#d1fae5',
    submitted_by: 'John Doe',
    user_role: 'freemium',
    category: 'Lunch',
    category_emoji: '🥗',
    status: 'pending',
    submitted_at: '2026-03-25T04:00:00',
    serving_size: '1 bowl (300g)',
    servings: 1,
    calories: 410,
    protein: 18,
    carbs: 52,
    fats: 14,
    ingredients: [
      { name: 'Quinoa', amount: '80g' },
      { name: 'Cherry tomatoes', amount: '50g' },
      { name: 'Cucumber', amount: '50g' },
      { name: 'Avocado', amount: '60g' },
      { name: 'Olive oil', amount: '10ml' },
      { name: 'Lemon juice', amount: '1 tbsp' },
    ],
    admin_note: null,
  },
  {
    id: '3',
    name: 'Egg & Veggie Omelette',
    emoji: '🥚',
    emoji_bg: '#dbeafe',
    submitted_by: 'Alex Tan',
    user_role: 'premium',
    category: 'Breakfast',
    category_emoji: '☀️',
    status: 'approved',
    submitted_at: '2026-03-24T08:00:00',
    serving_size: '1 omelette (200g)',
    servings: 1,
    calories: 310,
    protein: 24,
    carbs: 8,
    fats: 20,
    ingredients: [
      { name: 'Eggs', amount: '3 whole' },
      { name: 'Spinach', amount: '30g' },
      { name: 'Bell pepper', amount: '40g' },
      { name: 'Olive oil', amount: '5ml' },
      { name: 'Salt & pepper', amount: 'to taste' },
    ],
    admin_note: null,
  },
  {
    id: '4',
    name: 'Grilled Salmon Rice Bowl',
    emoji: '🐟',
    emoji_bg: '#ede9fe',
    submitted_by: 'Priya Nair',
    user_role: 'premium',
    category: 'Dinner',
    category_emoji: '🍽️',
    status: 'changes_requested',
    submitted_at: '2026-03-23T10:00:00',
    serving_size: '1 bowl (400g)',
    servings: 1,
    calories: 520,
    protein: 38,
    carbs: 55,
    fats: 12,
    ingredients: [
      { name: 'Salmon fillet', amount: '150g' },
      { name: 'Brown rice', amount: '100g' },
      { name: 'Edamame', amount: '50g' },
      { name: 'Soy sauce', amount: '1 tbsp' },
    ],
    admin_note: 'Please add the full ingredients list including the sauce components and update the serving size to be more specific.',
  },
  {
    id: '5',
    name: 'Chocolate Protein Shake',
    emoji: '🍫',
    emoji_bg: '#fee2e2',
    submitted_by: 'Mark Lim',
    user_role: 'freemium',
    category: 'Snack',
    category_emoji: '🍪',
    status: 'rejected',
    submitted_at: '2026-03-22T12:00:00',
    serving_size: '1 glass (300ml)',
    servings: 1,
    calories: 850,
    protein: 60,
    carbs: 20,
    fats: 5,
    ingredients: [
      { name: 'Protein powder', amount: '2 scoops' },
      { name: 'Milk', amount: '250ml' },
      { name: 'Cocoa powder', amount: '1 tbsp' },
    ],
    admin_note: 'Calorie and protein values are inaccurate for the listed ingredients. Please recheck and resubmit with correct nutritional values from a verified source.',
  },
];

type Ingredient = { name: string; amount: string };

type Recipe = {
  id: string;
  name: string;
  emoji: string;
  emoji_bg: string;
  submitted_by: string;
  user_role: string;
  category: string;
  category_emoji: string;
  status: string;
  submitted_at: string;
  serving_size: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: Ingredient[];
  admin_note: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FILTERS = ['Pending', 'Approved', 'Rejected', 'Changes', 'All'];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:           { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  approved:          { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  rejected:          { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
  changes_requested: { bg: '#dbeafe', text: '#1e40af', label: 'Changes Requested' },
};

// ── NUTRITION ACCURACY FLAG ──
// Calculates expected calories from macros and flags if difference > 50 kcal
// Formula: (protein × 4) + (carbs × 4) + (fats × 9)
const checkNutritionFlag = (calories: number, protein: number, carbs: number, fats: number) => {
  const calculated = (protein * 4) + (carbs * 4) + (fats * 9);
  const diff = Math.abs(calories - calculated);
  if (diff > 50) {
    return {
      flagged: true,
      message: `Calculated macros yield approx ${calculated} kcal but submitted value is ${calories} kcal. Please verify before approving.`,
    };
  }
  return { flagged: false, message: '' };
};

export default function ModerationScreen({ visible, onClose }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>(DUMMY_RECIPES);
  const [activeFilter, setActiveFilter] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // action modal state
  const [actionType, setActionType] = useState<'reject' | 'changes' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionNoteError, setActionNoteError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── FETCH ALL RECIPES ──
  // TODO (Backend): Uncomment and use when backend is ready
  // Endpoint: GET /admin/recipes
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: array of Recipe objects
  // const fetchRecipes = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/recipes`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setRecipes(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchRecipes error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment this useEffect when backend is ready
  // useEffect(() => {
  //   if (visible) fetchRecipes();
  // }, [visible]);

  // ── APPROVE RECIPE ──
  // TODO (Backend): Uncomment API call and remove local state update when backend is ready
  // Endpoint: PUT /admin/recipes/{id}/approve
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: none
  // Returns: updated recipe object with status: 'approved'
  // On success: recipe is added to the main food database automatically by backend
  const handleApprove = (recipe: Recipe) => {
    Alert.alert(
      'Approve Recipe',
      `Approve "${recipe.name}" and add it to the food database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            // TODO (Backend): Replace below with API call
            // const res = await fetch(`${API_URL}/admin/recipes/${recipe.id}/approve`, {
            //   method: 'PUT',
            //   headers: { 'Authorization': `Bearer ${adminToken}` },
            // });
            // if (res.ok) { const updated = await res.json(); updateRecipe(updated); }

            // Temporary local update — remove when backend is ready
            updateRecipeStatus(recipe.id, 'approved', null);
            setSelectedRecipe(null);
            Alert.alert('Approved ✅', `"${recipe.name}" has been added to the food database.`);
          },
        },
      ]
    );
  };

  // ── REJECT RECIPE ──
  // TODO (Backend): Uncomment API call and remove local state update when backend is ready
  // Endpoint: PUT /admin/recipes/{id}/reject
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: { reason: string }
  // Returns: updated recipe object with status: 'rejected' and admin_note set
  // The reason is sent back to the user so they know why it was rejected
  const handleRejectSubmit = async () => {
    if (!actionNote.trim()) {
      setActionNoteError('Please provide a reason for rejection');
      return;
    }
    setActionNoteError('');
    setSubmitting(true);

    try {
      // TODO (Backend): Replace below with API call
      // const res = await fetch(`${API_URL}/admin/recipes/${selectedRecipe?.id}/reject`, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${adminToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ reason: actionNote.trim() }),
      // });
      // if (res.ok) { const updated = await res.json(); updateRecipe(updated); }

      // Temporary local update — remove when backend is ready
      updateRecipeStatus(selectedRecipe!.id, 'rejected', actionNote.trim());
      closeActionModal();
      setSelectedRecipe(null);
      Alert.alert('Rejected', 'The user has been notified with your reason.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── REQUEST CHANGES ──
  // TODO (Backend): Uncomment API call and remove local state update when backend is ready
  // Endpoint: PUT /admin/recipes/{id}/changes
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: { note: string }
  // Returns: updated recipe object with status: 'changes_requested' and admin_note set
  // The note is sent back to the user so they know what to fix before resubmitting
  const handleChangesSubmit = async () => {
    if (!actionNote.trim()) {
      setActionNoteError('Please describe what changes are needed');
      return;
    }
    setActionNoteError('');
    setSubmitting(true);

    try {
      // TODO (Backend): Replace below with API call
      // const res = await fetch(`${API_URL}/admin/recipes/${selectedRecipe?.id}/changes`, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${adminToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ note: actionNote.trim() }),
      // });
      // if (res.ok) { const updated = await res.json(); updateRecipe(updated); }

      // Temporary local update — remove when backend is ready
      updateRecipeStatus(selectedRecipe!.id, 'changes_requested', actionNote.trim());
      closeActionModal();
      setSelectedRecipe(null);
      Alert.alert('Changes Requested', 'The user has been notified with your feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── HELPERS ──
  const updateRecipeStatus = (id: string, status: string, note: string | null) => {
    setRecipes(prev =>
      prev.map(r => r.id === id ? { ...r, status, admin_note: note } : r)
    );
    if (selectedRecipe?.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, status, admin_note: note } : null);
    }
  };

  const closeActionModal = () => {
    setActionType(null);
    setActionNote('');
    setActionNoteError('');
  };

  const filtered = recipes.filter(r => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Pending' && r.status === 'pending') ||
      (activeFilter === 'Approved' && r.status === 'approved') ||
      (activeFilter === 'Rejected' && r.status === 'rejected') ||
      (activeFilter === 'Changes' && r.status === 'changes_requested');
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.submitted_by.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount = recipes.filter(r => r.status === 'pending').length;
  const approvedCount = recipes.filter(r => r.status === 'approved').length;
  const rejectedCount = recipes.filter(r => r.status === 'rejected').length;
  const changesCount = recipes.filter(r => r.status === 'changes_requested').length;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Pending', value: pendingCount, color: '#d97706' },
            { label: 'Approved', value: approvedCount, color: '#10b981' },
            { label: 'Rejected', value: rejectedCount, color: '#dc2626' },
            { label: 'Changes', value: changesCount, color: '#3b82f6' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes or users..."
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

        {/* Recipe list */}
        <View>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No recipes found</Text>
            </View>
          ) : (
            filtered.map(recipe => {
              const flag = checkNutritionFlag(
                recipe.calories, recipe.protein, recipe.carbs, recipe.fats
              );
              const statusStyle = STATUS_COLORS[recipe.status] || STATUS_COLORS.pending;
              const isPending = recipe.status === 'pending';

              return (
                <View key={recipe.id} style={styles.recipeCard}>

                  {/* Top row */}
                  <View style={styles.recipeTop}>
                    <View style={[styles.recipeEmoji, { backgroundColor: recipe.emoji_bg }]}>
                      <Text style={styles.recipeEmojiText}>{recipe.emoji}</Text>
                    </View>
                    <View style={styles.recipeInfo}>
                      <Text style={styles.recipeName}>{recipe.name}</Text>
                      <Text style={styles.recipeBy}>
                        by {recipe.submitted_by} · {timeAgo(recipe.submitted_at)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  {/* Meta badges */}
                  <View style={styles.metaRow}>
                    <View style={[
                      styles.planBadge,
                      recipe.user_role === 'premium' ? styles.planPremium : styles.planFreemium
                    ]}>
                      <Text style={[
                        styles.planText,
                        recipe.user_role === 'premium'
                          ? styles.planTextPremium
                          : styles.planTextFreemium
                      ]}>
                        {recipe.user_role === 'premium' ? 'Premium' : 'Freemium'}
                      </Text>
                    </View>
                    <View style={styles.catBadge}>
                      <Text style={styles.catText}>
                        {recipe.category_emoji} {recipe.category}
                      </Text>
                    </View>
                    {flag.flagged && (
                      <View style={styles.flagBadge}>
                        <Text style={styles.flagBadgeText}>⚠️ Flagged</Text>
                      </View>
                    )}
                  </View>

                  {/* Macros */}
                  <View style={styles.macroRow}>
                    {[
                      { val: recipe.calories, lbl: 'kcal' },
                      { val: `${recipe.protein}g`, lbl: 'protein' },
                      { val: `${recipe.carbs}g`, lbl: 'carbs' },
                      { val: `${recipe.fats}g`, lbl: 'fats' },
                    ].map(m => (
                      <View key={m.lbl} style={styles.macroBox}>
                        <Text style={styles.macroVal}>{m.val}</Text>
                        <Text style={styles.macroLbl}>{m.lbl}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Flag warning */}
                  {flag.flagged && (
                    <View style={styles.flagBox}>
                      <Text style={styles.flagText}>
                        ⚠️ Macros may not add up — please verify
                      </Text>
                    </View>
                  )}

                  {/* Admin note if exists */}
                  {recipe.admin_note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>
                        {recipe.status === 'rejected' ? '❌ Rejection reason' : '📝 Changes requested'}
                      </Text>
                      <Text style={styles.noteText}>{recipe.admin_note}</Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnView]}
                      onPress={() => setSelectedRecipe(recipe)}
                    >
                      <Text style={styles.btnViewText}>View</Text>
                    </TouchableOpacity>
                    {isPending && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.btnApprove]}
                          onPress={() => handleApprove(recipe)}
                        >
                          <Text style={styles.btnApproveText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.btnChanges]}
                          onPress={() => {
                            setSelectedRecipe(recipe);
                            setActionType('changes');
                          }}
                        >
                          <Text style={styles.btnChangesText}>Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.btnReject]}
                          onPress={() => {
                            setSelectedRecipe(recipe);
                            setActionType('reject');
                          }}
                        >
                          <Text style={styles.btnRejectText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── RECIPE DETAIL MODAL ── */}
      <Modal
        visible={!!selectedRecipe && !actionType}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.safe}>
          <Navbar
            title="Recipe Detail"
            backLabel="Moderation"
            onClose={() => setSelectedRecipe(null)}
          />
          {selectedRecipe && (
            <ScrollView>
              <View style={styles.detailContent}>
                <View style={styles.detailCard}>

                  {/* Recipe title */}
                  <Text style={styles.detailTitle}>{selectedRecipe.name}</Text>
                  <Text style={styles.detailSub}>
                    Submitted by {selectedRecipe.submitted_by} · {formatDate(selectedRecipe.submitted_at)}
                  </Text>

                  {/* Badges */}
                  <View style={styles.detailBadges}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_COLORS[selectedRecipe.status]?.bg || '#f3f4f6' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: STATUS_COLORS[selectedRecipe.status]?.text || '#374151' }
                      ]}>
                        {STATUS_COLORS[selectedRecipe.status]?.label}
                      </Text>
                    </View>
                    <View style={[
                      styles.planBadge,
                      selectedRecipe.user_role === 'premium'
                        ? styles.planPremium
                        : styles.planFreemium
                    ]}>
                      <Text style={[
                        styles.planText,
                        selectedRecipe.user_role === 'premium'
                          ? styles.planTextPremium
                          : styles.planTextFreemium
                      ]}>
                        {selectedRecipe.user_role === 'premium' ? 'Premium' : 'Freemium'}
                      </Text>
                    </View>
                    <View style={styles.catBadge}>
                      <Text style={styles.catText}>
                        {selectedRecipe.category_emoji} {selectedRecipe.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Nutritional info */}
                  <Text style={styles.sectionLabel}>NUTRITIONAL INFO (PER SERVING)</Text>
                  <View style={styles.macroGrid}>
                    {[
                      { val: selectedRecipe.calories, lbl: 'kcal' },
                      { val: `${selectedRecipe.protein}g`, lbl: 'protein' },
                      { val: `${selectedRecipe.carbs}g`, lbl: 'carbs' },
                      { val: `${selectedRecipe.fats}g`, lbl: 'fats' },
                    ].map(m => (
                      <View key={m.lbl} style={styles.macroGridBox}>
                        <Text style={styles.macroGridVal}>{m.val}</Text>
                        <Text style={styles.macroGridLbl}>{m.lbl}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.servingText}>
                    Serving size: {selectedRecipe.serving_size} · {selectedRecipe.servings} serving
                  </Text>

                  <View style={styles.divider} />

                  {/* Ingredients */}
                  <Text style={styles.sectionLabel}>INGREDIENTS</Text>
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <View
                      key={i}
                      style={[
                        styles.ingRow,
                        i < selectedRecipe.ingredients.length - 1 && styles.ingRowBorder
                      ]}
                    >
                      <Text style={styles.ingName}>{ing.name}</Text>
                      <Text style={styles.ingAmt}>{ing.amount}</Text>
                    </View>
                  ))}

                  {/* Nutrition flag */}
                  {(() => {
                    const flag = checkNutritionFlag(
                      selectedRecipe.calories,
                      selectedRecipe.protein,
                      selectedRecipe.carbs,
                      selectedRecipe.fats
                    );
                    return flag.flagged ? (
                      <>
                        <View style={styles.divider} />
                        <View style={styles.flagBoxBig}>
                          <Text style={styles.flagBoxTitle}>⚠️ Nutrition accuracy flag</Text>
                          <Text style={styles.flagBoxText}>{flag.message}</Text>
                        </View>
                      </>
                    ) : null;
                  })()}

                  {/* Admin note if exists */}
                  {selectedRecipe.admin_note && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.noteBoxBig}>
                        <Text style={styles.noteBoxTitle}>
                          {selectedRecipe.status === 'rejected'
                            ? '❌ Rejection reason'
                            : '📝 Changes requested'}
                        </Text>
                        <Text style={styles.noteBoxText}>{selectedRecipe.admin_note}</Text>
                      </View>
                    </>
                  )}

                  {/* Actions — only show for pending */}
                  {selectedRecipe.status === 'pending' && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.sectionLabel}>ADMIN ACTION</Text>
                      <View style={styles.actionBigRow}>
                        <TouchableOpacity
                          style={[styles.actionBigBtn, styles.btnBigApprove]}
                          onPress={() => handleApprove(selectedRecipe)}
                        >
                          <Text style={styles.btnBigApproveText}>✅ Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBigBtn, styles.btnBigChanges]}
                          onPress={() => setActionType('changes')}
                        >
                          <Text style={styles.btnBigChangesText}>📝 Request Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBigBtn, styles.btnBigReject]}
                          onPress={() => setActionType('reject')}
                        >
                          <Text style={styles.btnBigRejectText}>❌ Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── ACTION MODAL (Reject / Request Changes) ── */}
      <Modal
        visible={!!actionType}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.safe}>
          <Navbar
            title={actionType === 'reject' ? 'Reject Recipe' : 'Request Changes'}
            backLabel="Recipe"
            onClose={closeActionModal}
          />
          <ScrollView>
            <View style={styles.detailContent}>
              <View style={styles.detailCard}>

                {/* Recipe summary */}
                {selectedRecipe && (
                  <View style={styles.actionRecipeSummary}>
                    <View style={[
                      styles.recipeEmoji,
                      { backgroundColor: selectedRecipe.emoji_bg }
                    ]}>
                      <Text style={styles.recipeEmojiText}>{selectedRecipe.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipeName}>{selectedRecipe.name}</Text>
                      <Text style={styles.recipeBy}>by {selectedRecipe.submitted_by}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                {/* Note label and description */}
                <Text style={styles.actionLabel}>
                  {actionType === 'reject'
                    ? '❌ Reason for rejection *'
                    : '📝 What changes are needed? *'}
                </Text>
                <Text style={styles.actionSubLabel}>
                  {actionType === 'reject'
                    ? 'This message will be sent to the user so they understand why their recipe was declined.'
                    : 'This message will be sent to the user so they know exactly what to fix before resubmitting.'}
                </Text>

                <FormField
                  label=""
                  value={actionNote}
                  onChangeText={v => { setActionNote(v); setActionNoteError(''); }}
                  placeholder={
                    actionType === 'reject'
                      ? 'e.g. Calorie values are inaccurate for the listed ingredients...'
                      : 'e.g. Please add the full ingredients list and update the serving size...'
                  }
                  error={actionNoteError}
                />

                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeActionModal}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      actionType === 'reject' ? styles.confirmReject : styles.confirmChanges,
                      submitting && styles.confirmDisabled,
                    ]}
                    onPress={actionType === 'reject' ? handleRejectSubmit : handleChangesSubmit}
                    disabled={submitting}
                  >
                    <Text style={styles.confirmBtnText}>
                      {submitting
                        ? 'Sending...'
                        : actionType === 'reject'
                        ? 'Send Rejection'
                        : 'Send Feedback'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
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
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981',
    alignItems: 'center',
  },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
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

  recipeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  recipeTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 8,
  },
  recipeEmoji: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  recipeEmojiText: { fontSize: 18 },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  recipeBy: { fontSize: 10, color: '#6b7280' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },

  metaRow: { flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  planBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  planPremium: { backgroundColor: '#ede9fe' },
  planFreemium: { backgroundColor: '#f3f4f6' },
  planText: { fontSize: 10, fontWeight: '700' },
  planTextPremium: { color: '#5b21b6' },
  planTextFreemium: { color: '#4b5563' },
  catBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catText: { fontSize: 10, fontWeight: '600', color: '#065f46' },
  flagBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  flagBadgeText: { fontSize: 10, fontWeight: '600', color: '#991b1b' },

  macroRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  macroBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 7,
    padding: 6, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  macroVal: { fontSize: 11, fontWeight: '700', color: '#111827' },
  macroLbl: { fontSize: 8, color: '#9ca3af', marginTop: 1 },

  flagBox: {
    backgroundColor: '#fef2f2', borderRadius: 8,
    padding: 8, borderLeftWidth: 3, borderLeftColor: '#ef4444', marginBottom: 8,
  },
  flagText: { fontSize: 10, color: '#991b1b', fontWeight: '600' },

  noteBox: {
    backgroundColor: '#f0fdf4', borderRadius: 8,
    padding: 8, borderLeftWidth: 3, borderLeftColor: '#10b981', marginBottom: 8,
  },
  noteLabel: { fontSize: 10, fontWeight: '700', color: '#065f46', marginBottom: 3 },
  noteText: { fontSize: 11, color: '#374151', lineHeight: 16 },

  actionRow: { flexDirection: 'row', gap: 5 },
  actionBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    alignItems: 'center', borderWidth: 1,
  },
  btnView: { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' },
  btnViewText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
  btnApprove: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  btnApproveText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
  btnChanges: { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' },
  btnChangesText: { fontSize: 10, fontWeight: '700', color: '#1e40af' },
  btnReject: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  btnRejectText: { fontSize: 10, fontWeight: '700', color: '#991b1b' },

  detailContent: { padding: 16, paddingBottom: 40 },
  detailCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  detailSub: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  detailBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 0.8, marginBottom: 10,
  },

  macroGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  macroGridBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  macroGridVal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  macroGridLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  servingText: { fontSize: 12, color: '#9ca3af' },

  ingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  ingRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  ingName: { fontSize: 13, color: '#374151' },
  ingAmt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },

  flagBoxBig: {
    backgroundColor: '#fef2f2', borderRadius: 12,
    padding: 14, borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  flagBoxTitle: { fontSize: 13, fontWeight: '700', color: '#991b1b', marginBottom: 6 },
  flagBoxText: { fontSize: 12, color: '#991b1b', lineHeight: 18 },

  noteBoxBig: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    padding: 14, borderLeftWidth: 3, borderLeftColor: '#10b981',
  },
  noteBoxTitle: { fontSize: 13, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  noteBoxText: { fontSize: 13, color: '#374151', lineHeight: 18 },

  actionBigRow: { gap: 8 },
  actionBigBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  btnBigApprove: { backgroundColor: '#10b981' },
  btnBigApproveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnBigChanges: { backgroundColor: '#3b82f6' },
  btnBigChangesText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnBigReject: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  btnBigRejectText: { fontSize: 14, fontWeight: '700', color: '#991b1b' },

  actionRecipeSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  actionSubLabel: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 12 },

  actionBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  confirmBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  confirmReject: { backgroundColor: '#ef4444' },
  confirmChanges: { backgroundColor: '#3b82f6' },
  confirmDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});