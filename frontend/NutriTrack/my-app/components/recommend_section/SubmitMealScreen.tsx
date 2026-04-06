import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { API_URL } from '../../constants/api';

// ── EMOJI OPTIONS ──
// User can pick one or select none (empty string means no emoji)
const EMOJI_OPTIONS = [
  '', // no emoji option — renders as a dash
  '🍝', '🍛', '🥗', '🍜', '🥩', '🥚',
  '🐟', '🥦', '🍱', '🌮', '🍲', '🥘',
  '🥙', '🍚', '🥣', '🍳', '🥜', '🫐',
  '🍇', '🥑', '🧆', '🫕', '🍖', '🥗',
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

// ── DUMMY SUBMISSIONS ──
// TODO (Backend): Replace DUMMY_SUBMISSIONS with real API call
// Endpoint: GET /recipes/me
// Returns: array of submission objects matching the Submission type below
const DUMMY_SUBMISSIONS = [
  {
    id: '1',
    name: 'Egg & Veggie Omelette',
    emoji: '🥚',
    emoji_bg: '#dbeafe',
    category: 'Breakfast',
    status: 'approved',
    submitted_at: '2026-03-24T08:00:00',
    admin_note: 'Your recipe has been approved and is now available for all users to discover and log.',
  },
  {
    id: '2',
    name: 'Grilled Salmon Rice Bowl',
    emoji: '🐟',
    emoji_bg: '#ede9fe',
    category: 'Dinner',
    status: 'changes_requested',
    submitted_at: '2026-03-23T10:00:00',
    admin_note: 'Please add the full ingredients list including the sauce components and update the serving size to be more specific.',
  },
  {
    id: '3',
    name: 'Chocolate Protein Shake',
    emoji: '🍫',
    emoji_bg: '#fee2e2',
    category: 'Snack',
    status: 'rejected',
    submitted_at: '2026-03-22T12:00:00',
    admin_note: 'Calorie and protein values are inaccurate for the listed ingredients. Please recheck and resubmit with correct nutritional values.',
  },
];

type Ingredient = { id: string; name: string; amount: string };

type Submission = {
  id: string;
  name: string;
  emoji: string;
  emoji_bg: string;
  category: string;
  status: string;
  submitted_at: string;
  admin_note: string | null;
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending:           { bg: '#fef3c7', text: '#92400e', label: 'Pending Review' },
  approved:          { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  rejected:          { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
  changes_requested: { bg: '#dbeafe', text: '#1e40af', label: 'Changes Needed' },
};

// ── AUTO CALCULATE FATS ──
// Formula: fats = (calories - protein*4 - carbs*4) / 9
// Clamped to 0 if result is negative
const calcFats = (calories: string, protein: string, carbs: string): string => {
  const cal = parseFloat(calories) || 0;
  const pro = parseFloat(protein) || 0;
  const car = parseFloat(carbs) || 0;
  const fats = (cal - pro * 4 - car * 4) / 9;
  return fats > 0 ? fats.toFixed(1) : '0';
};

// ── GET EMOJI BACKGROUND ──
const getEmojiBg = (emoji: string): string => {
  const bgs = ['#d1fae5', '#dbeafe', '#ede9fe', '#fef3c7', '#fee2e2', '#f0fdf4'];
  if (!emoji) return '#f3f4f6';
  const index = emoji.codePointAt(0)! % bgs.length;
  return bgs[index];
};

export default function SubmitMealScreen() {
  const { user } = useUser();

  // ── TAB STATE ──
  const [activeTab, setActiveTab] = useState<'new' | 'submissions'>('new');

  // ── FORM STATE ──
  const [mealName, setMealName] = useState('');
  const [category, setCategory] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [prepNotes, setPrepNotes] = useState('');
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', name: '', amount: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>(DUMMY_SUBMISSIONS);

  // ── ERRORS ──
  const [mealNameError, setMealNameError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [servingError, setServingError] = useState('');
  const [caloriesError, setCaloriesError] = useState('');
  const [proteinError, setProteinError] = useState('');
  const [carbsError, setCarbsError] = useState('');
  const [ingredientsError, setIngredientsError] = useState('');

  // ── RESUBMIT STATE ──
  const [resubmitData, setResubmitData] = useState<Submission | null>(null);

  const estimatedFats = calcFats(calories, protein, carbs);

  // ── FETCH MY SUBMISSIONS ──
  // TODO (Backend): Uncomment when backend is ready
  // Endpoint: GET /recipes/me
  // Headers: { Authorization: Bearer <token> }
  // Returns: array of Submission objects
  // useEffect(() => {
  //   const fetchSubmissions = async () => {
  //     try {
  //       const res = await fetch(`${API_URL}/recipes/me`, {
  //         headers: { 'Authorization': `Bearer ${user.token}` },
  //       });
  //       if (res.ok) {
  //         const data = await res.json();
  //         setSubmissions(data);
  //       }
  //     } catch (e) {
  //       console.log('fetchSubmissions error:', e);
  //     }
  //   };
  //   fetchSubmissions();
  // }, []);

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addIngredient = () => {
    setIngredients(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', amount: '' }
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) return;
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const updateIngredient = (id: string, field: 'name' | 'amount', value: string) => {
    setIngredients(prev =>
      prev.map(i => i.id === id ? { ...i, [field]: value } : i)
    );
    setIngredientsError('');
  };

  const resetForm = () => {
    setMealName('');
    setCategory('');
    setSelectedEmoji('');
    setServingSize('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setPrepNotes('');
    setDietaryTags([]);
    setIngredients([{ id: '1', name: '', amount: '' }]);
    setMealNameError('');
    setCategoryError('');
    setServingError('');
    setCaloriesError('');
    setProteinError('');
    setCarbsError('');
    setIngredientsError('');
  };

  // ── SUBMIT MEAL ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: POST /recipes
  // Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  // Body: {
  //   name, category, emoji, serving_size, calories, protein, carbs,
  //   fats: estimatedFats, ingredients, dietary_tags, prep_notes
  // }
  // Returns: new Submission object with status: 'pending'
  const handleSubmit = async () => {
    let hasError = false;

    if (!mealName.trim()) { setMealNameError('Meal name is required'); hasError = true; }
    else setMealNameError('');

    if (!category) { setCategoryError('Please select a category'); hasError = true; }
    else setCategoryError('');

    if (!servingSize.trim()) { setServingError('Serving size is required'); hasError = true; }
    else setServingError('');

    if (!calories) { setCaloriesError('Calories is required'); hasError = true; }
    else if (parseFloat(calories) < 1 || parseFloat(calories) > 5000) {
      setCaloriesError('Enter a value between 1 and 5000');
      hasError = true;
    } else setCaloriesError('');

    if (!protein) { setProteinError('Protein is required'); hasError = true; }
    else if (parseFloat(protein) < 0 || parseFloat(protein) > 300) {
      setProteinError('Enter a value between 0 and 300');
      hasError = true;
    } else setProteinError('');

    if (!carbs) { setCarbsError('Carbs is required'); hasError = true; }
    else if (parseFloat(carbs) < 0 || parseFloat(carbs) > 500) {
      setCarbsError('Enter a value between 0 and 500');
      hasError = true;
    } else setCarbsError('');

    const filledIngredients = ingredients.filter(i => i.name.trim());
    if (filledIngredients.length === 0) {
      setIngredientsError('Please add at least one ingredient');
      hasError = true;
    } else setIngredientsError('');

    if (hasError) return;

    setSubmitting(true);
    try {
      // TODO (Backend): Replace below with real API call
      // const res = await fetch(`${API_URL}/recipes`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${user.token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     name: mealName.trim(),
      //     category,
      //     emoji: selectedEmoji,
      //     serving_size: servingSize.trim(),
      //     calories: parseFloat(calories),
      //     protein: parseFloat(protein),
      //     carbs: parseFloat(carbs),
      //     fats: parseFloat(estimatedFats),
      //     ingredients: filledIngredients.map(i => ({ name: i.name, amount: i.amount })),
      //     dietary_tags: dietaryTags,
      //     prep_notes: prepNotes.trim(),
      //   }),
      // });
      // if (res.ok) {
      //   const newSubmission = await res.json();
      //   setSubmissions(prev => [newSubmission, ...prev]);
      // }

      // Temporary local dummy submission — remove when backend is ready
      const dummySubmission: Submission = {
        id: Date.now().toString(),
        name: mealName.trim(),
        emoji: selectedEmoji,
        emoji_bg: getEmojiBg(selectedEmoji),
        category,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        admin_note: null,
      };
      setSubmissions(prev => [dummySubmission, ...prev]);

      Alert.alert(
        'Submitted for Review ✅',
        'Your meal has been submitted. Our admin team will review it and get back to you shortly.',
        [{
          text: 'OK',
          onPress: () => { resetForm(); setActiveTab('submissions'); }
        }]
      );
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

  return (
    <View style={styles.root}>

      {/* ── INNER TAB SWITCHER ── */}
      <View style={styles.innerTabRow}>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'new' && styles.innerTabActive]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.innerTabText, activeTab === 'new' && styles.innerTabTextActive]}>
            New Submission
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'submissions' && styles.innerTabActive]}
          onPress={() => setActiveTab('submissions')}
        >
          <Text style={[
            styles.innerTabText,
            activeTab === 'submissions' && styles.innerTabTextActive
          ]}>
            My Submissions ({submissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* ── NEW SUBMISSION FORM ── */}
          {activeTab === 'new' && (
            <>

              {/* Basic Information */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📝 Basic Information</Text>

                <Text style={styles.fieldLabel}>Meal name *</Text>
                <TextInput
                  style={[styles.fieldInput, mealNameError ? styles.inputError : null]}
                  placeholder="e.g. Creamy Pasta Carbonara"
                  placeholderTextColor="#9ca3af"
                  value={mealName}
                  onChangeText={v => { setMealName(v); setMealNameError(''); }}
                />
                {mealNameError ? <Text style={styles.errorText}>{mealNameError}</Text> : null}

                <Text style={styles.fieldLabel}>Category *</Text>
                <View style={styles.catRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, category === cat && styles.catPillActive]}
                      onPress={() => { setCategory(cat); setCategoryError(''); }}
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
                {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}

                <Text style={styles.fieldLabel}>Pick an emoji (optional)</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emojiBtn,
                        selectedEmoji === emoji && styles.emojiBtnActive
                      ]}
                      onPress={() => setSelectedEmoji(emoji)}
                    >
                      {emoji === '' ? (
                        <Text style={styles.emojiNoneText}>—</Text>
                      ) : (
                        <Text style={styles.emojiText}>{emoji}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.emojiHint}>
                  Select — to submit without an emoji
                </Text>
              </View>

              {/* Nutritional Info */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📊 Nutritional Info (per serving)</Text>

                <Text style={styles.fieldLabel}>Serving size *</Text>
                <TextInput
                  style={[styles.fieldInput, servingError ? styles.inputError : null]}
                  placeholder="e.g. 1 bowl (300g)"
                  placeholderTextColor="#9ca3af"
                  value={servingSize}
                  onChangeText={v => { setServingSize(v); setServingError(''); }}
                />
                {servingError ? <Text style={styles.errorText}>{servingError}</Text> : null}

                <View style={styles.macroRow}>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Calories (kcal) *</Text>
                    <TextInput
                      style={[styles.macroInput, caloriesError ? styles.inputError : null]}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={calories}
                      onChangeText={v => { setCalories(v); setCaloriesError(''); }}
                      textAlign="center"
                    />
                    {caloriesError ? (
                      <Text style={styles.macroError}>{caloriesError}</Text>
                    ) : null}
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Protein (g) *</Text>
                    <TextInput
                      style={[styles.macroInput, proteinError ? styles.inputError : null]}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={protein}
                      onChangeText={v => { setProtein(v); setProteinError(''); }}
                      textAlign="center"
                    />
                    {proteinError ? (
                      <Text style={styles.macroError}>{proteinError}</Text>
                    ) : null}
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Carbs (g) *</Text>
                    <TextInput
                      style={[styles.macroInput, carbsError ? styles.inputError : null]}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={carbs}
                      onChangeText={v => { setCarbs(v); setCarbsError(''); }}
                      textAlign="center"
                    />
                    {carbsError ? (
                      <Text style={styles.macroError}>{carbsError}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Auto fats */}
                <View style={styles.fatsBox}>
                  <View>
                    <Text style={styles.fatsLabel}>🔥 Estimated Fats</Text>
                    <Text style={styles.fatsHint}>
                      Auto-calculated from your macros
                    </Text>
                  </View>
                  <Text style={styles.fatsVal}>{estimatedFats}g</Text>
                </View>
              </View>

              {/* Ingredients */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🧂 Ingredients</Text>
                {ingredients.map((ing, index) => (
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
                {ingredientsError ? (
                  <Text style={styles.errorText}>{ingredientsError}</Text>
                ) : null}
                <TouchableOpacity style={styles.addIngBtn} onPress={addIngredient}>
                  <Text style={styles.addIngPlus}>+</Text>
                  <Text style={styles.addIngText}>Add ingredient</Text>
                </TouchableOpacity>
              </View>

              {/* Dietary Tags */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🏷️ Dietary Tags</Text>
                <View style={styles.tagRow}>
                  {DIETARY_TAGS.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPill,
                        dietaryTags.includes(tag) && styles.tagPillActive
                      ]}
                      onPress={() => toggleDietaryTag(tag)}
                    >
                      <View style={[
                        styles.tagCheck,
                        dietaryTags.includes(tag) && styles.tagCheckActive
                      ]} />
                      <Text style={[
                        styles.tagText,
                        dietaryTags.includes(tag) && styles.tagTextActive
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Prep Notes */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  💬 Preparation Notes{' '}
                  <Text style={styles.optionalText}>(optional)</Text>
                </Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  placeholder="e.g. Cook pasta al dente, mix eggs and cheese off heat..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  value={prepNotes}
                  onChangeText={setPrepNotes}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </Text>
              </TouchableOpacity>

            </>
          )}

          {/* ── MY SUBMISSIONS ── */}
          {activeTab === 'submissions' && (
            <View>
              {submissions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🍽️</Text>
                  <Text style={styles.emptyTitle}>No submissions yet</Text>
                  <Text style={styles.emptySub}>
                    Submit your first meal recipe for review
                  </Text>
                </View>
              ) : (
                submissions.map(sub => {
                  const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                  const isPending = sub.status === 'pending';
                  const isChanges = sub.status === 'changes_requested';
                  const isRejected = sub.status === 'rejected';
                  const isApproved = sub.status === 'approved';

                  return (
                    <View key={sub.id} style={styles.subCard}>
                      <View style={styles.subTop}>
                        <View style={[
                          styles.subEmoji,
                          { backgroundColor: sub.emoji_bg }
                        ]}>
                          <Text style={styles.subEmojiText}>
                            {sub.emoji || '🍽️'}
                          </Text>
                        </View>
                        <View style={styles.subInfo}>
                          <Text style={styles.subName}>{sub.name}</Text>
                          <Text style={styles.subDate}>
                            {CATEGORY_EMOJIS[sub.category]} {sub.category} · {formatDate(sub.submitted_at)}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: statusConfig.bg }
                        ]}>
                          <Text style={[styles.statusText, { color: statusConfig.text }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>

                      {/* Approved note */}
                      {isApproved && (
                        <View style={styles.approvedNote}>
                          <Text style={styles.approvedNoteTitle}>
                            ✅ Now in the food database
                          </Text>
                          <Text style={styles.approvedNoteText}>
                            {sub.admin_note ||
                              'Your recipe has been approved and is now available for all users.'}
                          </Text>
                        </View>
                      )}

                      {/* Changes requested note + resubmit */}
                      {isChanges && sub.admin_note && (
                        <>
                          <View style={styles.changesNote}>
                            <Text style={styles.changesNoteTitle}>📝 Admin feedback</Text>
                            <Text style={styles.changesNoteText}>{sub.admin_note}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.resubmitBtn}
                            onPress={() => {
                              // TODO (Backend): When editing, fetch the original
                              // submission data and pre-fill the form
                              // Endpoint: GET /recipes/{id}
                              setActiveTab('new');
                              Alert.alert(
                                'Edit & Resubmit',
                                'Please update your meal based on the admin feedback and resubmit.'
                              );
                            }}
                          >
                            <Text style={styles.resubmitBtnText}>Edit & Resubmit</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Rejected note + resubmit */}
                      {isRejected && sub.admin_note && (
                        <>
                          <View style={styles.rejectedNote}>
                            <Text style={styles.rejectedNoteTitle}>❌ Rejection reason</Text>
                            <Text style={styles.rejectedNoteText}>{sub.admin_note}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.resubmitBtnOutline}
                            onPress={() => {
                              // TODO (Backend): Same as changes — fetch original and pre-fill
                              // Endpoint: GET /recipes/{id}
                              setActiveTab('new');
                              Alert.alert(
                                'Resubmit',
                                'Please fix the issues mentioned and resubmit your meal.'
                              );
                            }}
                          >
                            <Text style={styles.resubmitBtnOutlineText}>
                              Resubmit with fixes
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Pending note */}
                      {isPending && (
                        <View style={styles.pendingNote}>
                          <Text style={styles.pendingNoteText}>
                            ⏳ Your submission is under review. We will notify you once it is processed.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
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
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
  },
  innerTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  innerTabText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  innerTabTextActive: { color: '#10b981' },

  content: { paddingHorizontal: 14, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12,
  },
  optionalText: { fontSize: 12, color: '#9ca3af', fontWeight: '400' },

  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6,
  },
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

  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
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

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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

  submitBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#6ee7b7' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  subCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  subTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  subEmoji: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  subEmojiText: { fontSize: 18 },
  subInfo: { flex: 1 },
  subName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subDate: { fontSize: 11, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },

  approvedNote: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#10b981',
  },
  approvedNoteTitle: { fontSize: 11, fontWeight: '700', color: '#065f46', marginBottom: 3 },
  approvedNoteText: { fontSize: 11, color: '#374151', lineHeight: 16 },

  changesNote: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6', marginBottom: 8,
  },
  changesNoteTitle: { fontSize: 11, fontWeight: '700', color: '#1e40af', marginBottom: 3 },
  changesNoteText: { fontSize: 11, color: '#374151', lineHeight: 16 },

  rejectedNote: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#ef4444', marginBottom: 8,
  },
  rejectedNoteTitle: { fontSize: 11, fontWeight: '700', color: '#991b1b', marginBottom: 3 },
  rejectedNoteText: { fontSize: 11, color: '#374151', lineHeight: 16 },

  pendingNote: {
    backgroundColor: '#fefce8', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#fde68a',
  },
  pendingNoteText: { fontSize: 11, color: '#92400e', lineHeight: 16 },

  resubmitBtn: {
    backgroundColor: '#10b981', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  resubmitBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  resubmitBtnOutline: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff',
  },
  resubmitBtnOutlineText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});