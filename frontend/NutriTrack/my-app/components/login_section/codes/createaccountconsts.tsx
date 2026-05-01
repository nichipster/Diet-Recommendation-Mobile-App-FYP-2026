import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { API_URL } from '../../../constants/api';

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

  const handleSubmit = async () => {
    let hasError = false;

    if (firstName.length === 0) {
      setFirstNameError('First name is required');
      hasError = true;
    } else if (!nameRegex.test(firstName)) {
      setFirstNameError('Invalid name');
      hasError = true;
    } else setFirstNameError('');

    if (lastName.length === 0) {
      setLastNameError('Last name is required');
      hasError = true;
    } else if (!nameRegex.test(lastName)) {
      setLastNameError('Invalid name');
      hasError = true;
    } else setLastNameError('');

    if (!email.includes('@') || !email.endsWith('.com')) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    } else setEmailError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    } else setPasswordError('');

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    } else setConfirmPasswordError('');

    if (!agreed) {
      setTermsError('You must agree to the Terms of Service');
      hasError = true;
    } else setTermsError('');

    if (!hasError) {
      try {
        const response = await fetch(`${API_URL}/auth/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            role: 'user',
          }),
        });

        const data = await response.json();
        console.log('Register status:', response.status, data);

        if (!response.ok) {
          if (response.status === 409) {
            setEmailError('This email is already in use');
          } else {
            setEmailError(data.detail || 'Something went wrong');
          }
          return;
        }

        setUser({
          firstName,
          lastName,
          email,
          token: '',
          role: 'user',
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
          hasPeanutAllergy: false,
          hasTreeNutAllergy: false,
          hasMilkAllergy: false,
          hasEggAllergy: false,
          hasFishAllergy: false,
          hasShellfishAllergy: false,
          hasSoyAllergy: false,
          hasWheatAllergy: false,
          hasSesameAllergy: false,
          hasSulfiteAllergy: false,
          allergyNotes: '',
          tdee: '',
        });

        router.replace({
          pathname: '/verify',
          params: { email, password, next: 'survey' },
        } as any);

      } catch (e) {
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
    validateName, validateEmail, validatePassword,
    handleSubmit,
  };
}
