import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { API_URL } from '../../../constants/api';

type Step = 'email' | 'code' | 'password';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('email');

  // Step 1
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState('');

  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef<(TextInput | null)[]>([]);

  // Step 3
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passErrors, setPassErrors] = useState({ newPass: '', confirmPass: '' });

  const [loading, setLoading] = useState(false);

  // ── Resend cooldown timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Step 1: Send reset email ───────────────────────────────────────────────
  const handleSendCode = async () => {
    setEmailError('');
    const trimmed = email.trim();
    if (!trimmed) { setEmailError('Email is required'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { setEmailError('Enter a valid email address'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.status === 204 || res.status === 200) {
        setResendCooldown(60);
        setStep('code');
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailError(data.detail || 'Failed to send code. Try again.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Just validate locally, no API call yet ────────────────────────
  const handleVerifyCode = () => {
    const fullCode = code.join('');
    setCodeError('');
    if (fullCode.length < 6) { setCodeError('Enter the full 6-digit code'); return; }
    setStep('password');
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      setCodeError('');
      codeRefs.current[0]?.focus();
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // OTP digit input handler
  const handleCodeChange = (val: string, index: number) => {
    if (!/^\d*$/.test(val)) return; // digits only
    const next = [...code];
    next[index] = val.slice(-1); // one char max
    setCode(next);
    setCodeError('');
    if (val && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  // ── Step 3: Reset password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    let hasError = false;
    const errs = { newPass: '', confirmPass: '' };

    if (newPass.length < 8) {
      errs.newPass = 'Password must be at least 8 characters';
      hasError = true;
    }
    if (new Blob([newPass]).size > 72) {
      errs.newPass = 'Password is too long (max 72 bytes)';
      hasError = true;
    }
    if (newPass !== confirmPass) {
      errs.confirmPass = 'Passwords do not match';
      hasError = true;
    }

    setPassErrors(errs);
    if (hasError) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.join(''), new_password: newPass }),
      });

      if (res.status === 204 || res.status === 200) {
        Alert.alert('Success', 'Password reset successfully. Please log in.', [
          { text: 'OK', onPress: () => router.replace('/loginmain') },
        ]);
      } else {
        const data = await res.json().catch(() => ({}));
        // If code was wrong/expired, send user back to code step
        if (res.status === 400 && data.detail?.toLowerCase().includes('code')) {
          setStep('code');
          setCodeError(data.detail);
        } else {
          Alert.alert('Error', data.detail || 'Something went wrong');
        }
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared back logic ──────────────────────────────────────────────────────
  const handleBack = () => {
    if (step === 'email') router.back();
    else if (step === 'code') setStep('email');
    else setStep('code');
  };

  // ── Progress indicator ─────────────────────────────────────────────────────
  const stepIndex = step === 'email' ? 0 : step === 'code' ? 1 : 2;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* ── Step dots ── */}
          <View style={styles.stepRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.stepDot, i <= stepIndex && styles.stepDotActive]} />
            ))}
          </View>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <View style={styles.form}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your account email and we'll send you a verification code.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={[styles.input, !!emailError && styles.inputError]}
                  placeholder="email@example.com"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={v => { setEmail(v); setEmailError(''); }}
                  onSubmitEditing={handleSendCode}
                  returnKeyType="done"
                />
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                activeOpacity={0.85}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Get Verification Code</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: Code ── */}
          {step === 'code' && (
            <View style={styles.form}>
              <Text style={styles.title}>Enter Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              <View style={styles.otpRow}>
                {code.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => { codeRefs.current[i] = r; }}
                    style={[styles.otpBox, !!digit && styles.otpBoxFilled, !!codeError && styles.otpBoxError]}
                    value={digit}
                    onChangeText={v => handleCodeChange(v, i)}
                    onKeyPress={e => handleCodeKeyPress(e, i)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    textAlign="center"
                  />
                ))}
              </View>
              {!!codeError && <Text style={styles.errorTextCenter}>{codeError}</Text>}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                activeOpacity={0.85}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Verify Code</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendCode}
                disabled={resendCooldown > 0 || loading}
              >
                <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get it? Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'password' && (
            <View style={styles.form}>
              <Text style={styles.title}>New Password</Text>
              <Text style={styles.subtitle}>
                Choose a strong password for your account.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={[styles.input, !!passErrors.newPass && styles.inputError]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry
                  value={newPass}
                  onChangeText={v => { setNewPass(v); setPassErrors(e => ({ ...e, newPass: '' })); }}
                />
                {!!passErrors.newPass && <Text style={styles.errorText}>{passErrors.newPass}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={[styles.input, !!passErrors.confirmPass && styles.inputError]}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry
                  value={confirmPass}
                  onChangeText={v => { setConfirmPass(v); setPassErrors(e => ({ ...e, confirmPass: '' })); }}
                  onSubmitEditing={handleResetPassword}
                  returnKeyType="done"
                />
                {!!passErrors.confirmPass && <Text style={styles.errorText}>{passErrors.confirmPass}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                activeOpacity={0.85}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Reset Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: { marginTop: 8, marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  backArrow: { fontSize: 20, color: '#374151', marginRight: 6 },
  backText: { fontSize: 15, color: '#374151', fontWeight: '500' },

  stepRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  stepDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db',
  },
  stepDotActive: { backgroundColor: '#10b981', width: 24 },

  form: { gap: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginTop: -8 },
  emailHighlight: { color: '#111827', fontWeight: '600' },

  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 2 },
  errorTextCenter: { fontSize: 12, color: '#ef4444', textAlign: 'center' },

  // OTP
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 8 },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    fontSize: 22, fontWeight: '700', color: '#111827',
  },
  otpBoxFilled: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  otpBoxError: { borderColor: '#ef4444' },

  resendBtn: { alignItems: 'center', marginTop: 4 },
  resendText: { fontSize: 14, color: '#10b981', fontWeight: '600' },
  resendDisabled: { color: '#9ca3af' },

  btnPrimary: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
