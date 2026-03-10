import { useState } from 'react';
import { router } from 'expo-router';
import { DUMMY_USERS } from '../dummy/dummydata';

export default function useLoginConsts() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = () => {
    let hasError = false;

    if (!email.includes('@') || !email.endsWith('.com')) {
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
      const user = DUMMY_USERS.find(
        (u) => u.email === email && u.hashed_password === password
      );

      if (!user) {
        setEmailError('Invalid email or password');
        return;
      }

      if (user.suspended) {
        setEmailError('This account has been suspended');
        return;
      }

      router.replace('/(tabs)');
    }
  };

  return {
    email, password, emailError, passwordError,
    setEmail, setPassword, setEmailError, setPasswordError,
    handleSubmit,
  };
}