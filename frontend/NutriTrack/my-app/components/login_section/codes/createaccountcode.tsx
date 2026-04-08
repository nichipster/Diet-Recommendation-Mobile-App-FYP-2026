import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { styles } from '../styles/createaccountstyles';
import FormField from '../cards/formfield';

type Props = {
  role: 'user' | 'nutritionist';
  setRole: (v: 'user' | 'nutritionist') => void;

  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;

  licenseNumber: string;
  specialisations: string[]; // ✅ CHANGED
  otherSpecialisation: string;
  institution: string;

  firstNameError: string;
  lastNameError: string;
  emailError: string;
  passwordError: string;
  confirmPasswordError: string;
  termsError: string;

  licenseNumberError: string;
  specialisationError: string;
  otherSpecialisationError: string;
  institutionError: string;

  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  setAgreed: (v: boolean) => void;

  setLicenseNumber: (v: string) => void;
  setSpecialisations: (v: string[]) => void; // ✅ CHANGED
  setOtherSpecialisation: (v: string) => void;
  setInstitution: (v: string) => void;

  setFirstNameError: (v: string) => void;
  setLastNameError: (v: string) => void;
  setEmailError: (v: string) => void;
  setPasswordError: (v: string) => void;
  setConfirmPasswordError: (v: string) => void;
  setTermsError: (v: string) => void;

  setLicenseNumberError: (v: string) => void;
  setSpecialisationError: (v: string) => void;
  setOtherSpecialisationError: (v: string) => void;
  setInstitutionError: (v: string) => void;

  validateName: (value: string, field: 'first' | 'last') => void;
  validateEmail: (value: string) => void;
  validatePassword: (value: string) => void;

  handleSubmit: () => void;
};

export default function CreateAccountCode({
  role,
  setRole,

  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  agreed,

  licenseNumber,
  specialisations,
  otherSpecialisation,
  institution,

  firstNameError,
  lastNameError,
  emailError,
  passwordError,
  confirmPasswordError,
  termsError,

  licenseNumberError,
  specialisationError,
  otherSpecialisationError,
  institutionError,

  setFirstName,
  setLastName,
  setEmail,
  setPassword,
  setConfirmPassword,
  setAgreed,

  setLicenseNumber,
  setSpecialisations,
  setOtherSpecialisation,
  setInstitution,

  setFirstNameError,
  setLastNameError,
  setEmailError,
  setPasswordError,
  setConfirmPasswordError,
  setTermsError,

  setLicenseNumberError,
  setSpecialisationError,
  setOtherSpecialisationError,
  setInstitutionError,

  validateName,
  validateEmail,
  validatePassword,
  handleSubmit,
}: Props) {
  const specializationOptions = [
    { label: 'Weight Loss', value: 'weight_loss' },
    { label: 'Sports Nutrition', value: 'sports' },
    { label: 'Clinical Nutrition', value: 'clinical' },
    { label: 'Plant-based Diets', value: 'plant' },
    { label: 'Vegan Diets', value: 'vegan' },
    { label: 'Halal Diets', value: 'halal' },
    { label: 'Child Nutrition', value: 'child' },
    { label: 'Elderly Nutrition', value: 'elderly' },
    { label: 'Others', value: 'others' },
  ];

  const toggleSpecialisation = (value: string) => {
    let updated = [...specialisations];

    if (updated.includes(value)) {
      updated = updated.filter((v) => v !== value);
    } else {
      updated.push(value);
    }

    setSpecialisations(updated);
    setSpecialisationError('');

    if (!updated.includes('others')) {
      setOtherSpecialisation('');
      setOtherSpecialisationError('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Create Account</Text>
          </View>

          <View style={styles.form}>
            {/* Role Selection */}
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              Register As
            </Text>

            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
              {['user', 'nutritionist'].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r as 'user' | 'nutritionist')}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{
                    height: 20,
                    width: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#333',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}>
                    {role === r && (
                      <View style={{
                        height: 10,
                        width: 10,
                        borderRadius: 5,
                        backgroundColor: '#333',
                      }} />
                    )}
                  </View>
                  <Text>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Common Fields */}
            <FormField
              label="First Name"
              placeholder="Enter your first name"
              value={firstName}
              error={firstNameError}
              onChangeText={(v) => {
                setFirstName(v);
                setFirstNameError('');
              }}
              onBlur={() => validateName(firstName, 'first')}
            />

            <FormField
              label="Last Name"
              placeholder="Enter your last name"
              value={lastName}
              error={lastNameError}
              onChangeText={(v) => {
                setLastName(v);
                setLastNameError('');
              }}
              onBlur={() => validateName(lastName, 'last')}
            />

            <FormField
              label="Email"
              placeholder="Email@example.com"
              value={email}
              error={emailError}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError('');
              }}
              onBlur={() => validateEmail(email)}
            />

            <FormField
              label="Password"
              placeholder="Create a password"
              value={password}
              error={passwordError}
              secureTextEntry
              onChangeText={(v) => {
                setPassword(v);
                validatePassword(v);
              }}
            />

            <FormField
              label="Confirm Password"
              placeholder="Repeat your password"
              value={confirmPassword}
              error={confirmPasswordError}
              secureTextEntry
              onChangeText={(v) => {
                setConfirmPassword(v);
                setConfirmPasswordError('');
              }}
            />

            {/* Nutritionist Fields */}
            {role === 'nutritionist' && (
              <>
                <FormField
                  label="License Number"
                  placeholder="Enter your license number"
                  value={licenseNumber}
                  error={licenseNumberError}
                  onChangeText={setLicenseNumber}
                />

                {/* Multi-select Specialisation */}
                <Text style={{ marginBottom: 5 }}>Specialisation</Text>

                {specializationOptions.map((item) => {
                  const isSelected = specialisations.includes(item.value);

                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => toggleSpecialisation(item.value)}
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                    >
                      <View style={{
                        height: 20,
                        width: 20,
                        borderWidth: 2,
                        borderColor: specialisationError ? 'red' : '#333',
                        marginRight: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {isSelected && (
                          <View style={{
                            height: 12,
                            width: 12,
                            backgroundColor: '#333',
                          }} />
                        )}
                      </View>

                      <Text>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                {specialisationError ? (
                  <Text style={styles.errorText}>{specialisationError}</Text>
                ) : null}

                {/* Others input */}
                {specialisations.includes('others') && (
                  <FormField
                    label="Other Specialisation"
                    placeholder="Enter your specialisation"
                    value={otherSpecialisation}
                    error={otherSpecialisationError}
                    onChangeText={(v) => {
                      setOtherSpecialisation(v);
                      setOtherSpecialisationError('');
                    }}
                  />
                )}

                <FormField
                  label="Institution"
                  placeholder="Enter your institution"
                  value={institution}
                  error={institutionError}
                  onChangeText={setInstitution}
                />
              </>
            )}
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => {
              setAgreed(!agreed);
              setTermsError('');
            }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>

            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {termsError ? (
            <Text style={styles.errorText}>{termsError}</Text>
          ) : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit}>
            <Text style={styles.btnPrimaryText}>Continue →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/loginsec')}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}