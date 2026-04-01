import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '../../../constants/api';
import { generateVerificationCode } from '../dummy/dummydata';

export default function useLoginConsts() {
  const { loadUser } = useUser();  // ← use loadUser instead of setUser directly
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
          } else {
            setEmailError(data.detail || 'Something went wrong');
          }
          return;
        }

        const token = data.access_token;

        // Step 2: Store token
        await AsyncStorage.setItem('token', token);

        // Step 3: Load all user data into context via loadUser
        await loadUser();
        
        const code = generateVerificationCode(email);
        router.replace({ pathname: '/verify', params: { email, next: 'dashboard', code }} as any);

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