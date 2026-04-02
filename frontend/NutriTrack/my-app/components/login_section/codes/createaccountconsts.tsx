import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { generateVerificationCode } from '../dummy/dummydata';
import { API_URL } from '../../../constants/api';
import AsyncStorage  from '@react-native-async-storage/async-storage';

export default function CreateAccountConsts() {
  const { setUser } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');

  const nameRegex = /^[a-zA-Z\s'-]+$/;

  const validateName = (value: string, field: 'first' | 'last') => {
    if (!nameRegex.test(value) && value.length > 0) {
      const error = 'Name cannot contain numbers or special characters';
      field === 'first' ? setFirstNameError(error) : setLastNameError(error);
    } else {
      field === 'first' ? setFirstNameError('') : setLastNameError('');
    }
  };

  const validatePassword = (value: string) => {
    if (value.length < 8 && value.length > 0) {
      setPasswordError('Password must be at least 8 characters');
    } else {
      setPasswordError('');
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.includes('@') || !value.endsWith('.com')) {
      setEmailError('Please enter a valid email address');
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // ← changed to async
  const handleSubmit = async () => {
    let hasError = false;

    if (firstName.length === 0) {
      setFirstNameError('First name is required');
      hasError = true;
    } else if (!nameRegex.test(firstName)) {
      setFirstNameError('Name cannot contain numbers or special characters');
      hasError = true;
    } else {
      setFirstNameError('');
    }

    if (lastName.length === 0) {
      setLastNameError('Last name is required');
      hasError = true;
    } else if (!nameRegex.test(lastName)) {
      setLastNameError('Name cannot contain numbers or special characters');
      hasError = true;
    } else {
      setLastNameError('');
    }

    if (!email.includes('@') || !email.endsWith('.com')) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }

    if (!agreed) {
      setTermsError('You must agree to the Terms of Service');
      hasError = true;
    } else {
      setTermsError('');
    }

    if (!hasError) {
      try {
        // ← call backend to create account
        const response = await fetch(`${API_URL}/auth/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // ← backend returned an error
          if (response.status === 409) {
            setEmailError('This email is already in use');
          } else {
            setEmailError(data.detail || 'Something went wrong');
          }
          return;
        }


        let accessToken = '';
        const tokenRes = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
          await AsyncStorage.setItem('token', accessToken); // ← token now available for survey
        }
        // ← signup successful, save to user context
        setUser({
          firstName,
          lastName,
          email,
          token: '',
          role :'',
          gender: '',
          dob: '',
          height: '',
          weight: '',
          goal: '',
          goalWeight: '',
          activityLevel: '',
          cardioPerWeek: '',
          isVegan: false,
          isVegetarian: false,
          isHalal: false,
          isGlutenFree: false,
          allergies: [],
        });

        // ← still using dummy verification for now
        const code = generateVerificationCode(email);
        router.replace({ pathname: '/verify', params: { email, next: 'survey', code }} as any);

      } catch (e) {
        // ← network error (backend not running, wrong IP etc)
        setEmailError('Network error. Please try again.');
      }
    }
  };

  return {
    firstName, lastName, email, password, confirmPassword, agreed,
    firstNameError, lastNameError, emailError, passwordError,
    confirmPasswordError, termsError,
    setFirstName, setLastName, setEmail, setPassword,
    setConfirmPassword, setAgreed,
    setFirstNameError, setLastNameError, setEmailError,
    setPasswordError, setConfirmPasswordError, setTermsError,
    validateName, validateEmail, validatePassword, handleSubmit,
  };
}