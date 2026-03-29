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
        // ← Step 1: Login and get token
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

        // ← Step 2: Store token
        await AsyncStorage.setItem('token', token);

        // ← Step 3: Fetch profile from backend using token
        let profileData = null;
        try {
          const profileRes = await fetch(`${API_URL}/profile/`, {
            method: 'GET',
            headers: getAuthHeaders(token),
          });
          if (profileRes.ok) {
            profileData = await profileRes.json();
          }
        } catch (e) {
          console.log('Profile fetch error:', e);
        }

        // ← Step 4: Set user context with real profile data if available
        setUser({
          firstName:     profileData?.first_name     || '',
          lastName:      profileData?.last_name      || '',
          email:         email,
          token:         token,
          gender:        profileData?.gender         || '',
          age:           profileData?.age            ? String(profileData.age)        : '',
          height:        profileData?.height_cm      ? String(profileData.height_cm)  : '',
          weight:        profileData?.weight_kg      ? String(profileData.weight_kg)  : '',
          goal:          profileData?.goal           || '',
          goalWeight:    profileData?.goal_weight    ? String(profileData.goal_weight): '',
          activityLevel: profileData?.activity_level || '',
          cardioPerWeek: profileData?.cardio_per_week|| '',
          isVegan:       profileData?.is_vegan       || false,
          allergies:     profileData?.allergies
                           ? profileData.allergies.split(',').filter(Boolean)
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