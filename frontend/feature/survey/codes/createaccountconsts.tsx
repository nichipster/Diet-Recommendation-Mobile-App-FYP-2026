import { router } from 'expo-router';
import { useState } from 'react';
import { DUMMY_USERS, generateVerificationCode } from '../dummy/dummydata';

export default function CreateAccountConsts() {

  // ── State ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // ── Errors ──
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');

  // ── Validation ──
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

  const handleSubmit = () => {
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
      const existingUser = DUMMY_USERS.find((u) => u.email === email);

      if (existingUser) {
        setEmailError("This email is already in use");
        return;
      }
      
      generateVerificationCode(email);
      router.replace({ pathname: '/verify', params: {email, next: 'survey'}} as any);
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