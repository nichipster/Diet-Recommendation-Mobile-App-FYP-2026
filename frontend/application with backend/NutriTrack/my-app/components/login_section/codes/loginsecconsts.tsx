import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/api';

export default function useLoginConsts() {
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async () => {
    let hasError = false;

    // ← fix email validation, same as createaccount
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
        const response = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setEmailError('Invalid email or password');
          } else {
            setEmailError(data.detail || 'Something went wrong');
          }
          return;
        }

        // ← store token in AsyncStorage
        await AsyncStorage.setItem('token', data.access_token);

        // ← save user info including token in context
        setUser({
          firstName: '',
          lastName: '',
          email: email,
          token: data.access_token, // ← store token in user context
          gender: '',
          age: '',
          height: '',
          weight: '',
          goal: '',
          goalWeight: '',
          activityLevel: '',
          cardioPerWeek: '',
          isVegan: false,
          allergies: [],
        });

        router.replace({ pathname: '/verify', params: { email, next: 'dashboard' }} as any);

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