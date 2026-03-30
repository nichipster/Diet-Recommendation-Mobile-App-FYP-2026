import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../../../context/UserContext';
import ModalNavbar from '../../../ui/Navbar';
import ModalFormField from '../cards/FormField';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '@/constants/api';

type Props = { visible: boolean; onClose: () => void; };

const ALLERGY_OPTIONS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame'];

export default function EditProfileModal({ visible, onClose }: Props) {
  const { user, setUser } = useUser();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName]   = useState(user.lastName);
  const [email, setEmail]         = useState(user.email);
  const [age, setAge]             = useState(user.age);
  const [weight, setWeight]       = useState(user.weight);
  const [height, setHeight]       = useState(user.height);
  const [gender, setGender]       = useState(user.gender);
  const [isVegan, setIsVegan]     = useState(user.isVegan);
  const [allergies, setAllergies] = useState<string[]>(user.allergies);

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError]   = useState('');
  const [ageError, setAgeError]             = useState('');
  const [weightError, setWeightError]       = useState('');
  const [heightError, setHeightError]       = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  // ─── Fetch from backend when modal opens ─────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        
        if (!token) return;

        let res = await fetch(`${API_URL}/profile/me`, {
          method: 'GET',
          headers: getAuthHeaders(token),
        });

        // ✅ profile doesn't exist yet — auto-create it then re-fetch
        if (res.status === 404) {
          const createRes = await fetch(`${API_URL}/profile/`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({}),
          });

          if (!createRes.ok) {
            console.log('Profile creation failed:', createRes.status);
            return;
          }

          // re-fetch after creating
          res = await fetch(`${API_URL}/profile/me`, {
            method: 'GET',
            headers: getAuthHeaders(token),
          });
        }

        if (!res.ok) {
          console.log('Profile fetch failed:', res.status);
          return;
        }

        const data = await res.json();

        const parsed = {
          weight:    String(data.weight_kg ?? ''),
          height:    String(data.height_cm ?? ''),
          gender:    data.gender
            ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1)
            : 'Male',
          isVegan:   data.preferences?.is_vegan ?? false,
          allergies: data.preferences?.allergies
            ? data.preferences.allergies.split(',').filter(Boolean)
            : [],
        };

        setUser({ ...user, ...parsed });

        // keep name/email/age from context since they're not in profile endpoint
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setEmail(user.email);
        setAge(user.age);

        // populate health fields from backend
        setWeight(parsed.weight);
        setHeight(parsed.height);
        setGender(parsed.gender);
        setIsVegan(parsed.isVegan);
        setAllergies(parsed.allergies);

      } catch (e) {
        console.log('Failed to load profile:', e);
        Alert.alert('Error', 'Could not load your profile. Please check your connection.');
      } finally {
        setLoading(false);
        setFirstNameError('');
        setLastNameError('');
        setAgeError('');
        setWeightError('');
        setHeightError('');
      }
    };

    loadProfile();
  }, [visible]);

  // ─── Allergy toggle ───────────────────────────────────────────────────────
  const toggleAllergy = (a: string) => {
    setAllergies(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const nameRegex = /^[a-zA-Z\s'-]+$/;

  const validateFirstName = (value: string) => {
    if (value.length === 0)          setFirstNameError('First name is required');
    else if (!nameRegex.test(value)) setFirstNameError('Name can only contain letters');
    else                             setFirstNameError('');
  };

  const validateLastName = (value: string) => {
    if (value.length === 0)          setLastNameError('Last name is required');
    else if (!nameRegex.test(value)) setLastNameError('Name can only contain letters');
    else                             setLastNameError('');
  };

  const validateAge = (value: string) => {
    const n = Number(value);
    if (!value || isNaN(n)) setAgeError('Please enter a valid age');
    else if (n < 13)        setAgeError('You must be at least 13 years old');
    else if (n > 100)       setAgeError('Please enter a valid age');
    else                    setAgeError('');
  };

  const validateWeight = (value: string) => {
    const n = Number(value);
    if (!value || isNaN(n)) setWeightError('Please enter a valid weight');
    else if (n < 30)        setWeightError('Weight must be at least 30kg');
    else if (n > 300)       setWeightError('Please enter a valid weight');
    else                    setWeightError('');
  };

  const validateHeight = (value: string) => {
    const n = Number(value);
    if (!value || isNaN(n)) setHeightError('Please enter a valid height');
    else if (n < 100)       setHeightError('Height must be at least 100cm');
    else if (n > 230)       setHeightError('Please enter a valid height');
    else                    setHeightError('');
  };

  const isFormValid = () => {
    if (!nameRegex.test(firstName) || firstName.length === 0) return false;
    if (!nameRegex.test(lastName)  || lastName.length  === 0) return false;
    if (Number(age)    < 13  || Number(age)    > 100) return false;
    if (Number(weight) < 30  || Number(weight) > 300) return false;
    if (Number(height) < 100 || Number(height) > 230) return false;
    return true;
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
const handleSave = async () => {
  validateFirstName(firstName);
  validateLastName(lastName);
  validateAge(age);
  validateWeight(weight);
  validateHeight(height);

  if (!nameRegex.test(firstName) || firstName.length === 0) return;
  if (!nameRegex.test(lastName) || lastName.length === 0) return;
  if (ageError || Number(age) < 13 || Number(age) > 100) return;
  if (weightError || Number(weight) < 30 || Number(weight) > 300) return;
  if (heightError || Number(height) < 100 || Number(height) > 250) return;

  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // ← Step 1: Save to backend
      await fetch(`${API_URL}/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          gender:    gender.toLowerCase(),
          height_cm: Number(height),
          weight_kg: Number(weight),
          is_vegan:  isVegan,
          allergies: allergies.join(','),
        }),
      });

      // ← Step 2: Re-fetch updated profile from backend
      const refreshRes = await fetch(`${API_URL}/profile/me`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (refreshRes.ok) {
        const updated = await refreshRes.json();

        // ← Step 3: Update context with latest data from backend
        setUser({
          ...user,
          firstName,
          lastName,
          email,
          age,
          gender:    updated.gender        || gender,
          height:    updated.height_cm     ? String(updated.height_cm)  : height,
          weight:    updated.weight_kg     ? String(updated.weight_kg)  : weight,
          isVegan:   updated.preferences?.is_vegan ?? isVegan,
          allergies: updated.preferences?.allergies
                       ? updated.preferences.allergies.split(',').filter(Boolean)
                       : allergies,
        });
      }
    }
  } catch (e) {
    console.log('Profile save error:', e);
  }

  Alert.alert('Saved', 'Your profile has been updated.');
  onClose();
};

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <ModalNavbar title="Edit Profile" onClose={onClose} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.content}>

              <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
              <View style={styles.card}>
                <ModalFormField
                  label="First Name"
                  value={firstName}
                  onChangeText={v => { setFirstName(v); validateFirstName(v); }}
                  placeholder="First name"
                  error={firstNameError}
                />
                <ModalFormField
                  label="Last Name"
                  value={lastName}
                  onChangeText={v => { setLastName(v); validateLastName(v); }}
                  placeholder="Last name"
                  error={lastNameError}
                />
                <ModalFormField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.sectionLabel}>HEALTH DATA</Text>
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, gender === g && styles.genderSelected]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={styles.genderEmoji}>{g === 'Male' ? '👨' : '👩'}</Text>
                      <Text style={[styles.genderLabel, gender === g && styles.genderLabelActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputRow}>
                  {[
                    { label: 'Age',    unit: 'yrs', val: age,    set: setAge,    error: ageError,    validate: validateAge    },
                    { label: 'Weight', unit: 'kg',  val: weight, set: setWeight, error: weightError, validate: validateWeight },
                    { label: 'Height', unit: 'cm',  val: height, set: setHeight, error: heightError, validate: validateHeight },
                  ].map(f => (
                    <View key={f.label} style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>{f.label}</Text>
                      <View style={[styles.inputBox, f.error ? styles.inputError : null]}>
                        <TextInput
                          style={styles.inputInline}
                          value={f.val}
                          onChangeText={v => { f.set(v); f.validate(v); }}
                          keyboardType="numeric"
                          placeholderTextColor="#9ca3af"
                          placeholder="0"
                        />
                        <Text style={styles.inputUnit}>{f.unit}</Text>
                      </View>
                      {f.error ? <Text style={styles.errorText}>{f.error}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionLabel}>DIETARY RESTRICTIONS</Text>
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.veganRow}
                  onPress={() => setIsVegan(!isVegan)}
                  activeOpacity={0.7}
                >
                  <View style={styles.veganText}>
                    <Text style={styles.veganLabel}>🌱 Vegan</Text>
                    <Text style={styles.veganSub}>No animal products</Text>
                  </View>
                  <View style={[styles.toggle, isVegan && styles.toggleOn]}>
                    <View style={[styles.toggleThumb, isVegan && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Allergies</Text>
                <View style={styles.allergiesGrid}>
                  {ALLERGY_OPTIONS.map(a => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.allergyChip, allergies.includes(a) && styles.allergyChipSelected]}
                      onPress={() => toggleAllergy(a)}
                    >
                      <Text style={[styles.allergyText, allergies.includes(a) && styles.allergyTextSelected]}>
                        {a}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>

            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#f9fafb' },
  content:          { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:      { fontSize: 14, color: '#6b7280' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1, marginBottom: 8, marginLeft: 4, marginTop: 8,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16,
  },
  fieldLabel:        { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
  inputError:        { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText:         { fontSize: 12, color: '#ef4444', marginTop: 4, marginBottom: 4 },
  genderRow:         { flexDirection: 'row', gap: 10, marginBottom: 8 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 12,
    borderWidth: 2, borderColor: '#f3f4f6', backgroundColor: '#fafafa',
  },
  genderSelected:    { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  genderEmoji:       { fontSize: 20 },
  genderLabel:       { fontSize: 14, fontWeight: '600', color: '#374151' },
  genderLabelActive: { color: '#10b981' },
  inputRow:          { flexDirection: 'row', gap: 10 },
  inputGroup:        { flex: 1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  inputInline:       { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  inputUnit:         { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  veganRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 4,
  },
  veganText:         { flex: 1 },
  veganLabel:        { fontSize: 15, fontWeight: '700', color: '#111827' },
  veganSub:          { fontSize: 12, color: '#6b7280', marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', padding: 2, justifyContent: 'center',
  },
  toggleOn:          { backgroundColor: '#10b981' },
  toggleThumb: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignSelf: 'flex-start',
  },
  toggleThumbOn:     { alignSelf: 'flex-end' },
  allergiesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  allergyChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  allergyChipSelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  allergyText:         { fontSize: 13, fontWeight: '600', color: '#374151' },
  allergyTextSelected: { color: '#10b981' },
  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnDisabled:   { backgroundColor: '#6ee7b7', shadowOpacity: 0 },
  saveBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});