import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { styles } from './styles/createaccountstyles';
import useCreateAccountConsts from './codes/createaccountconsts';

export default function CreateAccount() {
  const {
    firstName, lastName, email, password, confirmPassword, agreed,
    firstNameError, lastNameError, emailError, passwordError,
    confirmPasswordError, termsError,
    setFirstName, setLastName, setEmail, setPassword,
    setConfirmPassword, setAgreed,
    setFirstNameError, setLastNameError, setEmailError,
    setPasswordError, setConfirmPasswordError, setTermsError,
    validateName, validateEmail, validatePassword, handleSubmit,
  } = useCreateAccountConsts();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ── KeyboardAvoidingView pushes content up when keyboard opens ── */}
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

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Create account</Text>
          </View>

          {/* ── Form Fields ── */}
          <View style={styles.form}>

            {/* First Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, firstNameError ? styles.inputError : null]}
                placeholder="Enter your first name"
                placeholderTextColor="#A0A0A0"
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  setFirstNameError('');
                }}
                onBlur={() => validateName(firstName, 'first')}
              />
              {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
            </View>

            {/* Last Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, lastNameError ? styles.inputError : null]}
                placeholder="Enter your last name"
                placeholderTextColor="#A0A0A0"
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  setLastNameError('');
                }}
                onBlur={() => validateName(lastName, 'last')}
              />
              {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                placeholder="Email@example.com"
                placeholderTextColor="#A0A0A0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setEmailError('');
                }}
                onBlur={() => validateEmail(email)}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passwordError ? styles.inputError : null]}
                placeholder="Create a password"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={true}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  validatePassword(value);
                }}
              />
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                placeholder="Repeat your password"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={true}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setConfirmPasswordError('');
                }}
              />
              {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            </View>

          </View>

          {/* ── Terms & Conditions ── */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => {
              setAgreed(!agreed);
              setTermsError('');
            }}
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

          {/* ── Continue Button ── */}
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={handleSubmit}
          >
            <Text style={styles.btnPrimaryText}>Continue  →</Text>
          </TouchableOpacity>

          {/* ── Login Link ── */}
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

