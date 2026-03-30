import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '../../../constants/api';

export default function useLoginConsts() {
  const { setUser } = useUser();
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

        // Step 3: Fetch profile using correct endpoint
        let profileData = null;
        try {
          const profileRes = await fetch(`${API_URL}/profile/me`, {
            method: 'GET',
            headers: getAuthHeaders(token),
          });
          if (profileRes.ok) {
            profileData = await profileRes.json();
          }
        } catch (e) {
          console.log('Profile fetch error:', e);
        }

        // Step 4: Set user context mapping backend fields correctly
        setUser({
          firstName:     '',   // ← not in profile table, comes from user table
          lastName:      '',   // ← not in profile table, comes from user table
          email:         email,
          token:         token,
          gender:        profileData?.gender         || '',
          age:           profileData?.dob            ? String(profileData.dob)              : '',
          height:        profileData?.height_cm      ? String(profileData.height_cm)        : '',
          weight:        profileData?.weight_kg      ? String(profileData.weight_kg)        : '',
          goal:          '',   // ← not in profile table
          goalWeight:    '',   // ← not in profile table
          activityLevel: profileData?.activity_level || '',
          cardioPerWeek: '',   // ← not in profile table
          isVegan:       profileData?.preferences?.is_vegan       || false,
          allergies:     profileData?.preferences?.allergies
                           ? profileData.preferences.allergies.split(',').filter(Boolean)
                           : [],
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