import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { NUTRITIONISTS } from '../consult_section/ConsultScreen';

// DUMMY DATA IS IMPORTED FROM CONSULTSCREEN FOR DEMO PURPOSES.
// IN REAL APP, THIS WOULD BE FETCHED FROM BACKEND BASED ON NUTRITIONIST ID PASSED AS PARAMETER.

type EditableField = 'bio' | 'specialisation' | 'credentials' | 'tip' | 'testimonial';

export const NutritionistProfile = ({ onBack }: any) => {
  const router = useRouter();
  const nutritionist = NUTRITIONISTS[0]; // For demo, we take the first nutritionist

  // Saved (committed) values
  const [saved, setSaved] = useState({
    bio: nutritionist.bio || '',
    specialisation: nutritionist.specialisation || '',
    credentials: nutritionist.credentials || '',
    tip: nutritionist.tip || '',
    testimonial: nutritionist.testimonial || '',
  });

  // Draft values (in-progress edits, per field)
  const [drafts, setDrafts] = useState({ ...saved });

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

  const startEdit = (field: EditableField) => {
    setDrafts(prev => ({ ...prev, [field]: saved[field] })); // reset draft to last saved
    setEditing(prev => ({ ...prev, [field]: true }));
  };

  const cancelEdit = (field: EditableField) => {
    setDrafts(prev => ({ ...prev, [field]: saved[field] }));
    setEditing(prev => ({ ...prev, [field]: false }));
  };

  const saveField = (field: EditableField) => {
    const trimmed = drafts[field].trim();

    if (!trimmed) {
      Alert.alert('Cannot save', 'This field cannot be empty.');
      return;
    }

    setSaved(prev => ({ ...prev, [field]: trimmed }));
    setEditing(prev => ({ ...prev, [field]: false }));

    // Show "Saved!" flash for 2 seconds
    setSavedFlash(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setSavedFlash(prev => ({ ...prev, [field]: false }));
    }, 2000);

    // TODO: persist to backend here
    // e.g. await updateNutritionistField(nutritionist.id, field, trimmed);
  };

  const renderEditableSection = (
    field: EditableField,
    label: string,
    placeholder: string,
    multiline = true
  ) => {
    const isEditing = editing[field];
    const showSaved = savedFlash[field];

    return (
      <View style={styles.card}>
        {/* Section header row */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{label}</Text>

          <View style={styles.sectionActions}>
            {showSaved && (
              <Text style={styles.savedBadge}>Saved ✓</Text>
            )}

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
            multiline={multiline}
            autoFocus
          />
        ) : (
          <Text style={saved[field] ? styles.fieldValue : styles.fieldPlaceholder}>
            {saved[field] || placeholder}
          </Text>
        )}
      </View>
    );
  };

  return (
  <View style={{ flex: 1, backgroundColor: '#f9fafb', }}>
    <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

      {/* AVATAR + NAME */}
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: nutritionist.avatarColor }]}>
          <Text style={styles.avatarText}>{nutritionist.initials}</Text>
        </View>
        <Text style={styles.name}>{nutritionist.name}</Text>
        <Text style={styles.spec}>{saved.specialisation || nutritionist.specialisation}</Text>
        <Text style={styles.cred}>{saved.credentials || nutritionist.credentials}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    paddingHorizontal: 16,
  },
  backText: {
  fontSize: 14,
  color: '#10b981',
  fontWeight: '600',
  },
  backButton: {
    marginBottom: 10,
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

  // CARD
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

  // SECTION HEADER
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

  // EDIT BUTTON (pencil-style)
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

  // EDITING ACTIONS (cancel + save)
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

  // SAVED FLASH
  savedBadge: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },

  // READ-ONLY TEXT
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

  // EDITABLE INPUT
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
