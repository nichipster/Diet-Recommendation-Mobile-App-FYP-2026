import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useUser } from '../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { API_URL } from '../../../constants/api';
import Constants from 'expo-constants';

export default function useLoginConsts() {
  const { loadUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ── REGISTER EXPO PUSH TOKEN ──
  // Called after successful login to register the device push token
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

  const handleSubmit = async () => {
    let hasError = false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (password.length === 0) {
      setPasswordError('Please enter your password');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (!hasError) {
      try {
        // Step 1: Login and get token
        const response = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setEmailError('Invalid email or password');
          } else if (response.status === 403) {
            // Account exists but not verified — resend code and go to verify
            await fetch(`${API_URL}/auth/resend-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            router.replace({
              pathname: '/verify',
              params: { email, next: 'dashboard' },
            } as any);
          } else {
            setEmailError(data.detail || 'Something went wrong');
          }
          return;
        }

        // Step 2: Store token
        const token = data.access_token;
        await AsyncStorage.setItem('token', token);

        // Step 3: Try to send verification code
        const resendRes = await fetch(`${API_URL}/auth/resend-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (resendRes.status === 400) {
          // Already verified — skip verify, go straight based on role
          await loadUser();
          const userRes = await fetch(`${API_URL}/user/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const userData = await userRes.json();
          const role = userData.role;

          // Register push token after confirmed login
          // Admin and nutritionist do not need push notifications
          if (role !== 'admin' && role !== 'nutritionist') {
            await registerPushToken(token);
          }

          if (role === 'nutritionist') router.replace('/nutritionist' as any);
          else if (role === 'admin') router.replace('/admin' as any);
          else router.replace('/(tabs)/dashboard' as any);
          return;
        }

        // Step 4: Not yet verified — go to verify screen
        await loadUser();
        router.replace({
          pathname: '/verify',
          params: { email, next: 'dashboard' },
        } as any);

      } catch (e) {
        setEmailError('Network error. Please try again.');
      }
    }
  };

  return {
    email, password, emailError, passwordError,
    setEmail, setPassword, setEmailError, setPasswordError,
    handleSubmit,
  };
}