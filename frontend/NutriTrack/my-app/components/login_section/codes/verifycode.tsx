import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { API_URL } from '../../../constants/api';
import { styles } from '../styles/verifystyles';
import Constants from 'expo-constants';
import { useGoals } from '@/context/GoalsContext';

export default function VerifyCode() {
  const { email, next, password } = useLocalSearchParams<{
    email: string;
    next: string;
    password: string;
  }>();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputs = useRef<TextInput[]>([]);
  const { applyToken } = useGoals();

  // ── REGISTER EXPO PUSH TOKEN ──
  // Called after successful verification to register the device push token
  // Endpoint: POST /notifications/register-token
  // Headers: { Authorization: Bearer <token> }
  // Body: { token: string }
  // This allows the backend to send push notifications to this device
  // Only called for freemium and premium users — not admin or nutritionist
  const registerPushToken = async (authToken: string) => {
    try {
      if (!Device.isDevice) return; // skip on emulator/simulator

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return; // user denied permission

      // Android requires a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      const pushToken = expoPushToken.data;

      await fetch(`${API_URL}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: pushToken }),
      });

      console.log('Push token registered:', pushToken);
    } catch (e) {
      // Non-fatal — app still works without push notifications
      console.log('registerPushToken error:', e);
    }
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];

    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      const filled = [...digits];
      pasted.forEach((char, i) => {
        if (index + i < 6) filled[index + i] = char;
      });
      setDigits(filled);
      const nextIndex = Math.min(index + pasted.length, 5);
      inputs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const enteredCode = digits.join('');

    if (enteredCode.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: enteredCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Invalid code. Please try again.');
        return;
      }

      if (next === 'survey') {
        try {
          const loginForm = new URLSearchParams();
          loginForm.append('username', email);
          loginForm.append('password', password);

          const loginRes = await fetch(`${API_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: loginForm.toString(),
          });

          const loginData = await loginRes.json();

          if (!loginRes.ok) {
            setError('Verified but could not log in. Please log in manually.');
            router.replace('/loginmain' as any);
            return;
          }

          const newToken = loginData.access_token;
          await AsyncStorage.setItem('token', newToken);

          // Register push token for new users after signup verification
          // Role will be freemium for new signups
          await registerPushToken(newToken);

        } catch (e) {
          setError('Network error during login.');
          return;
        }

        router.replace('/survey' as any);
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/loginmain' as any);
        return;
      }

      applyToken(token);

      const storedToken = await AsyncStorage.getItem('token');
      const authHeaders = {
        'Authorization': `Bearer ${storedToken}`,
        'Content-Type': 'application/json',
      };

      const [profileRes, userRes] = await Promise.all([
        fetch(`${API_URL}/profile/me`, { headers: authHeaders }),
        fetch(`${API_URL}/user/me`, { headers: authHeaders }),
      ]);

      const userData = await userRes.json();
      const role = userData.role;

      if (profileRes.status === 404 && role !== 'nutritionist' && role !== 'admin') {
        router.replace('/survey' as any);
        return;
      }

      // Register push token after verified login
      // Admin and nutritionist do not need push notifications
      if (role !== 'admin' && role !== 'nutritionist') {
        await registerPushToken(token);
      }

      if (role === 'nutritionist') router.replace('/nutritionist' as any);
      else if (role === 'admin') router.replace('/admin' as any);
      else router.replace('/(tabs)/dashboard' as any);

    } catch (e) {
      setError('Network error. Please try again.');
    }
  };

  const handleResend = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Could not resend code.');
        return;
      }

      setDigits(['', '', '', '', '', '']);
      setError('');
      inputs.current[0]?.focus();

    } catch (err) {
      setError('Network error. Please try again.');
    }
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

          <View style={styles.codeRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { if (ref) inputs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                  error ? styles.codeInputError : null,
                ]}
                value={digit}
                onChangeText={v => handleChange(v, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={handleVerify}
          >
            <Text style={styles.btnPrimaryText}>Verify  →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            activeOpacity={0.7}
            onPress={handleResend}
          >
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