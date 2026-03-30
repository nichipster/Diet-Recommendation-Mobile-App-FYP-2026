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

  const calculateAge = (dob: string): string => {
    if (!dob) return '';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return String(age);
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
          } else {
            setEmailError(data.detail || 'Something went wrong');
          }
          return;
        }

        const token = data.access_token;

        // Step 2: Store token
        await AsyncStorage.setItem('token', token);

        // Step 3: Fetch user info (first_name, last_name, email)
        let userData = null;
        try {
          const userRes = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: getAuthHeaders(token),
          });
          if (userRes.ok) {
            userData = await userRes.json();
          }
        } catch (e) {
          console.log('User fetch error:', e);
        }

        // Step 4: Fetch profile info (gender, height, weight, preferences)
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

        // Step 5: Combine both into context
        setUser({
          firstName:     userData?.first_name      || '',
          lastName:      userData?.last_name       || '',
          email:         userData?.email           || email,
          token:         token,
          gender:        profileData?.gender       || '',
          age:           profileData?.dob          ? calculateAge(profileData.dob) : '',
          height:        profileData?.height_cm    ? String(profileData.height_cm) : '',
          weight:        profileData?.weight_kg    ? String(profileData.weight_kg) : '',
          goal:          '',
          goalWeight:    '',
          activityLevel: profileData?.activity_level || '',
          cardioPerWeek: '',
          isVegan:       profileData?.preferences?.is_vegan || false,
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