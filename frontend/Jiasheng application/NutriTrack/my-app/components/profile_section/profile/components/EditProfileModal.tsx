import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import { useUser } from '../../../../context/UserContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const ALLERGY_OPTIONS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame'];

export default function EditProfileModal({ visible, onClose }: Props) {
  const { user, setUser } = useUser();

// change all useState initialisations to use user data
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [age, setAge] = useState(user.age);
  const [weight, setWeight] = useState(user.weight);
  const [height, setHeight] = useState(user.height);
  const [gender, setGender] = useState(user.gender);
  const [isVegan, setIsVegan] = useState(user.isVegan);
  const [allergies, setAllergies] = useState<string[]>(user.allergies);
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [weightError, setWeightError] = useState('');
  const [heightError, setHeightError] = useState('');

  const toggleAllergy = (a: string) => {
    setAllergies(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const nameRegex = /^[a-zA-Z\s'-]+$/;

  const validateFirstName = (value: string) => {
    if (value.length === 0) {
      setFirstNameError('First name is required');
    } else if (!nameRegex.test(value)) {
      setFirstNameError('Name can only contain letters');
    } else {
      setFirstNameError('');
    }
  };

  const validateLastName = (value: string) => {
    if (value.length === 0) {
      setLastNameError('Last name is required');
    } else if (!nameRegex.test(value)) {
      setLastNameError('Name can only contain letters');
    } else {
      setLastNameError('');
    }
  };

  const validateAge = (value: string) => {
    const age = Number(value);
    if (!value || isNaN(age)) {
      setAgeError('Please enter a valid age');
    } else if (age < 13) {
      setAgeError('You must be at least 13 years old');
    } else if (age > 100) {
      setAgeError('Please enter a valid age');
    } else {
      setAgeError('');
    }
  };

  const validateWeight = (value: string) => {
    const weight = Number(value);
    if (!value || isNaN(weight)) {
      setWeightError('Please enter a valid weight');
    } else if (weight < 30) {
      setWeightError('Weight must be at least 30kg');
    } else if (weight > 150) {
      setWeightError('Please enter a valid weight');
    } else {
      setWeightError('');
    }
  };

  const validateHeight = (value: string) => {
    const height = Number(value);
    if (!value || isNaN(height)) {
      setHeightError('Please enter a valid height');
    } else if (height < 100) {
      setHeightError('Height must be at least 100cm');
    } else if (height > 230) {
      setHeightError('Please enter a valid height');
    } else {
      setHeightError('');
    }
  };

  const handleSave = () => {
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

    setUser({
      ...user,
      firstName, lastName, email,
      age, weight, height, gender,
      isVegan, allergies,
    });
    Alert.alert('Saved', 'Your profile has been updated.');
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setAge(user.age);
      setWeight(user.weight);
      setHeight(user.height);
      setGender(user.gender);
      setIsVegan(user.isVegan);
      setAllergies(user.allergies);
      setFirstNameError('');
      setLastNameError('');  
      setAgeError('');
      setWeightError('');
      setHeightError('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeArrow}>‹</Text>
            <Text style={styles.closeText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Edit Profile</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* Personal Info */}
            <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={[styles.input, firstNameError ? styles.inputError : null]}
                value={firstName}
                onChangeText={(v) => {setFirstName(v); validateFirstName(v)}}
                placeholder="First name"
                placeholderTextColor="#9ca3af"
              />
              {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}

              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                style={[styles.input, lastNameError ? styles.inputError : null]}
                value={lastName}
                onChangeText={(v) => {setLastName(v); validateLastName(v);}}
                placeholder="Last name"
                placeholderTextColor="#9ca3af"
              />
              {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Health Data */}
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
                  { label: 'Age', unit: 'yrs', val: age, set: setAge, error: ageError, validate: validateAge },
                  { label: 'Weight', unit: 'kg', val: weight, set: setWeight, error: weightError, validate: validateWeight },
                  { label: 'Height', unit: 'cm', val: height, set: setHeight, error: heightError, validate: validateHeight },
                ].map(f => (
                  <View key={f.label} style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <View style={[styles.inputBox, f.error ? styles.inputError : null]}>
                      <TextInput
                        style={styles.inputInline}
                        value={f.val}
                        onChangeText={f.set}
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

            {/* Dietary Restrictions */}
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

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  closeText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  navTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  navSpacer: { width: 60 },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1, marginBottom: 8, marginLeft: 4, marginTop: 8,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginBottom: 4,
  },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 12,
    borderWidth: 2, borderColor: '#f3f4f6', backgroundColor: '#fafafa',
  },
  genderSelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  genderEmoji: { fontSize: 20 },
  genderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  genderLabelActive: { color: '#10b981' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  inputInline: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  inputUnit: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  veganRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 4,
  },
  veganText: { flex: 1 },
  veganLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  veganSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: '#10b981' },
  toggleThumb: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  allergiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  allergyChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  allergyChipSelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  allergyText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  allergyTextSelected: { color: '#10b981' },
  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});