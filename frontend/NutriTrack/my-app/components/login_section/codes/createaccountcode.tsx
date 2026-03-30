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
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;
  firstNameError: string;
  lastNameError: string;
  emailError: string;
  passwordError: string;
  confirmPasswordError: string;
  termsError: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  setAgreed: (v: boolean) => void;
  setFirstNameError: (v: string) => void;
  setLastNameError: (v: string) => void;
  setEmailError: (v: string) => void;
  setPasswordError: (v: string) => void;
  setConfirmPasswordError: (v: string) => void;
  setTermsError: (v: string) => void;
  validateName: (value: string, field: 'first' | 'last') => void;
  validateEmail: (value: string) => void;
  validatePassword: (value: string) => void;
  handleSubmit: () => void;
};

export default function CreateAccountCode({
  firstName, lastName, email, password, confirmPassword, agreed,
  firstNameError, lastNameError, emailError, passwordError,
  confirmPasswordError, termsError,
  setFirstName, setLastName, setEmail, setPassword,
  setConfirmPassword, setAgreed,
  setFirstNameError, setLastNameError, setEmailError,
  setPasswordError, setConfirmPasswordError, setTermsError,
  validateName, validateEmail, validatePassword, handleSubmit,
}: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'android' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Create account</Text>
          </View>

          <View style={styles.form}>
            <FormField
              label="First Name"
              placeholder="Enter your first name"
              value={firstName}
              error={firstNameError}
              onChangeText={(value) => { setFirstName(value); setFirstNameError(''); }}
              onBlur={() => validateName(firstName, 'first')}
            />
            <FormField
              label="Last Name"
              placeholder="Enter your last name"
              value={lastName}
              error={lastNameError}
              onChangeText={(value) => { setLastName(value); setLastNameError(''); }}
              onBlur={() => validateName(lastName, 'last')}
            />
            <FormField
              label="Email address"
              placeholder="Email@example.com"
              value={email}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(value) => { setEmail(value); setEmailError(''); }}
              onBlur={() => validateEmail(email)}
            />
            <FormField
              label="Password"
              placeholder="Create a password"
              value={password}
              error={passwordError}
              secureTextEntry={true}
              onChangeText={(value) => { setPassword(value); validatePassword(value); }}
            />
            <FormField
              label="Confirm password"
              placeholder="Repeat your password"
              value={confirmPassword}
              error={confirmPasswordError}
              secureTextEntry={true}
              onChangeText={(value) => { setConfirmPassword(value); setConfirmPasswordError(''); }}
            />
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => { setAgreed(!agreed); setTermsError(''); }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {termsError ? <Text style={styles.errorText}>{termsError}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={handleSubmit}>
            <Text style={styles.btnPrimaryText}>Continue  →</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/loginsec')}>
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