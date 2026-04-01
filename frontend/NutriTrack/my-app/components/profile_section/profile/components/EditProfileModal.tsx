import React, { useState, useEffect, useRef } from 'react';
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

const ALLERGY_OPTIONS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame', 'Sulfite'];

export default function EditProfileModal({ visible, onClose }: Props) {
  const { user, loadUser } = useUser();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [dob, setDob]             = useState('');
  const [weight, setWeight]       = useState('');
  const [height, setHeight]       = useState('');
  const [gender, setGender]       = useState('Male');
  const [isVegan, setIsVegan]     = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isHalal, setIsHalal]     = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError]   = useState('');
  const [dobError, setDobError]             = useState('');
  const [weightError, setWeightError]       = useState('');
  const [heightError, setHeightError]       = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const monthRef = useRef<TextInput>(null);
  const yearRef  = useRef<TextInput>(null);

  // ─── Load from backend when modal opens ──────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        await loadUser();
      } catch (e) {
        console.log('Failed to load profile:', e);
        Alert.alert('Error', 'Could not load your profile. Please check your connection.');
      } finally {
        setLoading(false);
        setFirstNameError('');
        setLastNameError('');
        setDobError('');
        setWeightError('');
        setHeightError('');
      }
    };

    loadProfile();
  }, [visible]);

  // ─── Sync local state from context once user data is ready ───────────────
  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setDob(user.dob ?? '');
    setWeight(user.weight);
    setHeight(user.height);
    setGender(user.gender || 'Male');
    setIsVegan(user.isVegan);
    setIsVegetarian(user.isVegetarian ?? false);
    setIsHalal(user.isHalal ?? false);
    setIsGlutenFree(user.isGlutenFree ?? false);
    setAllergies(user.allergies);
  }, [user]);

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

  const validateDob = (value: string) => {
    const parts = value.split('-');
    if (parts.length !== 3) { setDobError('Please enter a valid date of birth'); return; }

    const [day, month, year] = parts.map(Number);

    // Only validate once all parts are filled
    if (!parts[0] || !parts[1] || !parts[2]) { setDobError(''); return; }
    if (parts[2].length < 4) { setDobError(''); return; }

    const date = new Date(year, month - 1, day);

    if (
      isNaN(date.getTime()) ||
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) {
      setDobError('Please enter a valid date of birth'); return;
    }

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;

    if (age < 13)       setDobError('You must be at least 13 years old');
    else if (age > 100) setDobError('Please enter a valid date of birth');
    else                setDobError('');
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

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    validateFirstName(firstName);
    validateLastName(lastName);
    validateDob(dob);
    validateWeight(weight);
    validateHeight(height);

    if (!nameRegex.test(firstName) || firstName.length === 0) return;
    if (!nameRegex.test(lastName)  || lastName.length  === 0) return;

    // DOB validation guard
    const dobParts = dob.split('-');
    if (dobParts.length !== 3) return;
    const [d, mo, yr] = dobParts.map(Number);
    const dobDate = new Date(yr, mo - 1, d);
    if (isNaN(dobDate.getTime())) return;
    const today = new Date();
    let computedAge = today.getFullYear() - dobDate.getFullYear();
    const mDiff = today.getMonth() - dobDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) computedAge--;
    if (computedAge < 13 || computedAge > 100) return;

    // Convert DD-MM-YYYY → YYYY-MM-DD for backend
    const isoDate = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (Number(weight) < 30  || Number(weight) > 300) return;
    if (Number(height) < 100 || Number(height) > 230) return;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Step 1: Save name if changed
      if (firstName !== user.firstName || lastName !== user.lastName) {
        const nameRes = await fetch(`${API_URL}/user/change-name`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            new_first_name: firstName,
            new_last_name:  lastName,
          }),
        });
        if (!nameRes.ok && nameRes.status !== 204) {
          const err = await nameRes.json();
          Alert.alert('Error', err.detail || 'Failed to update name');
          return;
        }
      }

      // Step 2: Save email if changed
      if (email !== user.email) {
        const emailRes = await fetch(`${API_URL}/user/change-email`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ new_email: email }),
        });
        if (!emailRes.ok && emailRes.status !== 204) {
          const err = await emailRes.json();
          Alert.alert('Error', err.detail || 'Failed to update email');
          return;
        }
      }

      // Step 3: Try to update profile, create if it doesn't exist yet
      const profilePayload = {
        dob:       isoDate,
        gender:    gender.toLowerCase(),
        height_cm: Number(height),
        weight_kg: Number(weight),
        is_vegan:  isVegan,
        is_vegetarian: isVegetarian,
        is_halal:     isHalal,
        is_gluten_free: isGlutenFree,
        allergies: allergies.join(','),
      };

      const putRes = await fetch(`${API_URL}/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(profilePayload),
      });

      if (putRes.status === 404) {
        const postRes = await fetch(`${API_URL}/profile/`, {
          method: 'POST',
          headers: getAuthHeaders(token),
          body: JSON.stringify(profilePayload),
        });
        if (!postRes.ok) {
          const err = await postRes.json();
          Alert.alert('Error', err.detail || 'Failed to create profile');
          return;
        }
      } else if (!putRes.ok) {
        const err = await putRes.json();
        Alert.alert('Error', err.detail || 'Failed to update profile');
        return;
      }

      // Step 4: Re-fetch everything into context
      await loadUser();

      Alert.alert('Saved', 'Your profile has been updated.');
      onClose();

    } catch (e) {
      console.log('Profile save error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
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

                {/* ─── DOB ─────────────────────────────────────────────── */}
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <View style={styles.dobRow}>
                  <View style={styles.dobGroup}>
                    <TextInput
                      style={[styles.dobInput, dobError ? styles.inputError : null]}
                      value={dob.split('-')[0] ?? ''}
                      onChangeText={v => {
                        const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                        const parts = dob.split('-');
                        const next = `${clean}-${parts[1] ?? ''}-${parts[2] ?? ''}`;
                        setDob(next);
                        validateDob(next);
                        if (clean.length === 2) monthRef.current?.focus();
                      }}
                      keyboardType="number-pad"
                      placeholder="DD"
                      placeholderTextColor="#9ca3af"
                      maxLength={2}
                    />
                    <Text style={styles.dobLabel}>Day</Text>
                  </View>

                  <Text style={styles.dobSeparator}>-</Text>

                  <View style={styles.dobGroup}>
                    <TextInput
                      ref={monthRef}
                      style={[styles.dobInput, dobError ? styles.inputError : null]}
                      value={dob.split('-')[1] ?? ''}
                      onChangeText={v => {
                        const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                        const parts = dob.split('-');
                        const next = `${parts[0] ?? ''}-${clean}-${parts[2] ?? ''}`;
                        setDob(next);
                        validateDob(next);
                        if (clean.length === 2) yearRef.current?.focus();
                      }}
                      keyboardType="number-pad"
                      placeholder="MM"
                      placeholderTextColor="#9ca3af"
                      maxLength={2}
                    />
                    <Text style={styles.dobLabel}>Month</Text>
                  </View>

                  <Text style={styles.dobSeparator}>-</Text>

                  <View style={styles.dobGroup}>
                    <TextInput
                      ref={yearRef}
                      style={[styles.dobInput, dobError ? styles.inputError : null]}
                      value={dob.split('-')[2] ?? ''}
                      onChangeText={v => {
                        const clean = v.replace(/[^0-9]/g, '').slice(0, 4);
                        const parts = dob.split('-');
                        const next = `${parts[0] ?? ''}-${parts[1] ?? ''}-${clean}`;
                        setDob(next);
                        validateDob(next);
                      }}
                      keyboardType="number-pad"
                      placeholder="YYYY"
                      placeholderTextColor="#9ca3af"
                      maxLength={4}
                    />
                    <Text style={styles.dobLabel}>Year</Text>
                  </View>
                </View>
                {dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}

                {/* ─── Weight + Height ──────────────────────────────────── */}
                <View style={styles.inputRow}>
                  {[
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
                {[
                  { label: '🌱 Vegan',        sub: 'No animal products',          val: isVegan,      set: setIsVegan      },
                  { label: '🥗 Vegetarian',   sub: 'No meat or fish',             val: isVegetarian, set: setIsVegetarian },
                  { label: '☪️ Halal',        sub: 'Halal-certified foods only',  val: isHalal,      set: setIsHalal      },
                  { label: '🌾 Gluten-Free',  sub: 'No gluten-containing foods',  val: isGlutenFree, set: setIsGlutenFree },
                ].map((item, index, arr) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.veganRow,
                      index < arr.length - 1 && styles.dietDivider,
                    ]}
                    onPress={() => item.set(!item.val)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.veganText}>
                      <Text style={styles.veganLabel}>{item.label}</Text>
                      <Text style={styles.veganSub}>{item.sub}</Text>
                    </View>
                    <View style={[styles.toggle, item.val && styles.toggleOn]}>
                      <View style={[styles.toggleThumb, item.val && styles.toggleThumbOn]} />
                    </View>
                  </TouchableOpacity>
                ))}

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
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dobGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dobInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dobSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 16,
  },
  dobLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  dietDivider: {borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12, marginBottom: 4,},
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