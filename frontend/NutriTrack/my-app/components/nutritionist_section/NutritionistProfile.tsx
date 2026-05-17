import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useUser } from '../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '../../constants/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableField = 'bio' | 'specialisation' | 'credentials' | 'tip' | 'testimonial';

interface NutritionistData {
  id: number;
  initials: string;
  avatarColor: string;
  name: string;
  specialisation: string;
  credentials: string;
  rating: number;
  reviews: number;
  bio: string;
  tags: string[];
  tip: string;
  testimonial: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NutritionistProfile = ({ onBack }: { onBack: () => void }) => {
  const { user } = useUser();

  const scrollRef = useRef<ScrollView>(null);
  const cardRefs = useRef<Record<EditableField, View | null>>({} as any);

  // Loading / remote profile state
  const [loading, setLoading] = useState(true);
  const [nutritionist, setNutritionist] = useState<NutritionistData | null>(null);

  // Saved (committed) values – populated once fetch succeeds
  const [saved, setSaved] = useState<Record<EditableField, string>>({
    bio: '',
    specialisation: '',
    credentials: '',
    tip: '',
    testimonial: '',
  });

  // Draft values (in-progress edits, per field)
  const [drafts, setDrafts] = useState<Record<EditableField, string>>({ ...saved });

  // Which fields are currently being edited
  const [editing, setEditing] = useState<Record<EditableField, boolean>>({
    bio: false,
    specialisation: false,
    credentials: false,
    tip: false,
    testimonial: false,
  });

  // Which fields are showing the saved flash
  const [savedFlash, setSavedFlash] = useState<Record<EditableField, boolean>>({
    bio: false,
    specialisation: false,
    credentials: false,
    tip: false,
    testimonial: false,
  });

  // ── Fetch own profile from backend ───────────────────────────────────────

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_URL}/nutritionists`, {
          headers: getAuthHeadersWithToken(token),
        });
        if (res.ok) {
          const data: NutritionistData[] = await res.json();
          const mine = data.find(n => n.id === Number(user.id)) ?? data[0];
          if (mine) {
            setNutritionist(mine);
            const initial = {
              bio: mine.bio || '',
              specialisation: mine.specialisation || '',
              credentials: mine.credentials || '',
              tip: mine.tip || '',
              testimonial: mine.testimonial || '',
            };
            setSaved(initial);
            setDrafts(initial);
          }
        }
      } catch (e) {
        console.log('NutritionistProfile fetchProfile error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user.id]);

  // ── Keyboard hide listener ────────────────────────────────────────────────

  useEffect(() => {
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      const activeField = (Object.keys(editing) as EditableField[]).find(f => editing[f]);
      if (activeField && cardRefs.current[activeField]) {
        cardRefs.current[activeField]?.measureLayout(
          scrollRef.current as any,
          (x, y) => {
            scrollRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      } else {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    });
    return () => hide.remove();
  }, [editing]);

  // ── Edit field helpers ────────────────────────────────────────────────────

  const startEdit = (field: EditableField) => {
    setDrafts(prev => ({ ...prev, [field]: saved[field] }));
    setEditing(prev => ({ ...prev, [field]: true }));
  };

  const cancelEdit = (field: EditableField) => {
    setDrafts(prev => ({ ...prev, [field]: saved[field] }));
    setEditing(prev => ({ ...prev, [field]: false }));
  };

  const saveField = async (field: EditableField) => {
    const trimmed = drafts[field].trim();
    if (!trimmed) {
      Alert.alert('Cannot save', 'This field cannot be empty.');
      return;
    }

    // Optimistic update
    setSaved(prev => ({ ...prev, [field]: trimmed }));
    setEditing(prev => ({ ...prev, [field]: false }));
    setSavedFlash(prev => ({ ...prev, [field]: true }));
    setTimeout(() => setSavedFlash(prev => ({ ...prev, [field]: false })), 2000);

    // Persist to backend: PATCH /nutritionists/{id}/profile
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/nutritionists/${user.id}/profile`, {
        method: 'PATCH',
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({ [field]: trimmed }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.log('saveField error:', errText);
        Alert.alert('Save failed', 'Could not save changes. Please try again.');
        setSaved(prev => ({ ...prev, [field]: saved[field] }));
      } else {
        const updated: NutritionistData = await res.json();
        setNutritionist(updated);
      }
    } catch (e) {
      console.log('saveField network error:', e);
      Alert.alert('Network error', 'Please check your connection and try again.');
      setSaved(prev => ({ ...prev, [field]: saved[field] }));
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderEditableSection = (
    field: EditableField,
    label: string,
    placeholder: string,
    multiline = true
  ) => {
    const isEditing = editing[field];
    const showSaved = savedFlash[field];

    return (
      <View
        style={styles.card}
        key={field}
        ref={(r) => { cardRefs.current[field] = r; }}
      >
        {/* Section header row */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{label}</Text>

          <View style={styles.sectionActions}>
            {showSaved && <Text style={styles.savedBadge}>Saved ✓</Text>}

            {!isEditing ? (
              <TouchableOpacity onPress={() => startEdit(field)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editingActions}>
                <TouchableOpacity onPress={() => cancelEdit(field)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveField(field)} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Content: read-only text OR editable input */}
        {isEditing ? (
          <TextInput
            style={[styles.textInput, multiline && styles.textInputMulti]}
            value={drafts[field]}
            onChangeText={val => setDrafts(prev => ({ ...prev, [field]: val }))}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            multiline={multiline}
            autoFocus
            onFocus={() => {
              setTimeout(() => {
                cardRefs.current[field]?.measureLayout(
                  scrollRef.current as any,
                  (x, y) => {
                    scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                  },
                  () => {}
                );
              }, 150);
            }}
          />
        ) : (
          <Text style={saved[field] ? styles.fieldValue : styles.fieldPlaceholder}>
            {saved[field] || placeholder}
          </Text>
        )}
      </View>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // ── Fallback display values ───────────────────────────────────────────────
  const displayInitials = nutritionist?.initials
    ?? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const displayAvatarColor = nutritionist?.avatarColor ?? '#10b981';
  const displayName = nutritionist?.name ?? `${user.firstName} ${user.lastName}`;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* AVATAR + NAME */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: displayAvatarColor }]}>
            <Text style={styles.avatarText}>{displayInitials}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.spec}>{saved.specialisation || 'No specialisation yet'}</Text>
          <Text style={styles.cred}>{saved.credentials || 'No credentials yet'}</Text>
          {nutritionist && nutritionist.reviews > 0 && (
            <Text style={styles.rating}>★ {nutritionist.rating} · {nutritionist.reviews} reviews</Text>
          )}
        </View>

        {/* EDITABLE SECTIONS */}
        {renderEditableSection('bio', 'About', 'Write your bio...')}
        {renderEditableSection('specialisation', 'Specialisation', 'Write your specialisation...')}
        {renderEditableSection('credentials', 'Credentials', 'Write your credentials...')}
        {renderEditableSection('tip', '💡 Sample Tip', 'Add a sample tip...')}
        {renderEditableSection('testimonial', '💬 Testimonials', 'Add a testimonial...')}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 24,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  spec: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  cred: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 2,
  },
  rating: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  editBtnText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  editingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelBtnText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  savedBadge: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  fieldPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  textInput: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  textInputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default NutritionistProfile;