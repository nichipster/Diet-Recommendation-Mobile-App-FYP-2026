import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
    KeyboardAvoidingView, Platform, ScrollView,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateVerificationCode, verifyCode } from '../dummy/dummydata';
import { styles } from '../styles/verifystyles';

export default function VerifyCode() {
  const { email, next } = useLocalSearchParams<{ email: string; next: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputs = useRef<TextInput[]>([]);
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (email && !hasGenerated.current) {
      hasGenerated.current = true;
      const newCode = generateVerificationCode(email);
      console.log(`Code for ${email}: ${newCode}`);
    }
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // numbers only

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // auto advance to next input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // go back on backspace if empty
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const enteredCode = code.join('');

    if (enteredCode.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    if (!verifyCode(email, enteredCode)) {
      setError('Incorrect code. Please try again.');
      return;
    }

    // verified — go to next screen
    if (next === 'survey') {
      router.replace('/survey' as any);
    } else {
      router.replace('/(tabs)/dashboard' as any);
    }
  };

  const handleResend = () => {
    // in real app this would call your API
    // with dummy data just log a new code
    const newCode = generateVerificationCode(email);
    setCode(['', '', '', '', '', '']);
    setError('');
    inputs.current[0]?.focus();
    console.log(`New code for ${email}: ${newCode}`);
  };

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
          </View>

          <Text style={styles.heading}>Check your email</Text>
          <Text style={styles.subheading}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* 6-digit code inputs */}
          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { if (ref) inputs.current[index] = ref; }}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null, error ? styles.codeInputError : null]}
                value={digit}
                onChangeText={v => handleChange(v, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={handleVerify}>
            <Text style={styles.btnPrimaryText}>Verify  →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} activeOpacity={0.7} onPress={handleResend}>
            <Text style={styles.resendText}>
              Didn't receive a code?{' '}
              <Text style={styles.resendLink}>Resend</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}