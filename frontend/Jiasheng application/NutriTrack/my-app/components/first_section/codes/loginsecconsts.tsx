import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { DUMMY_USERS, generateVerificationCode } from '../dummy/dummydata';

export default function useLoginConsts() {

  const { setUser } = useUser();

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

      // ── ADMIN CHECK ──
      // If the user has role 'admin', skip verification
      // and go directly to the admin dashboard
      if (user.role === 'admin') {
        setUser({
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
          goal: user.goal,
          goalWeight: user.goalWeight,
          activityLevel: user.activityLevel,
          cardioPerWeek: user.cardioPerWeek,
          isVegan: user.isVegan,
          allergies: user.allergies,
        });
        router.replace('/admin' as any);
        return;
      }

      // ── NORMAL USER ──
      // Regular users go through email verification as before
      setUser({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        gender: user.gender,
        age: user.age,
        height: user.height,
        weight: user.weight,
        goal: user.goal,
        goalWeight: user.goalWeight,
        activityLevel: user.activityLevel,
        cardioPerWeek: user.cardioPerWeek,
        isVegan: user.isVegan,
        allergies: user.allergies,
      });

      generateVerificationCode(email);
      router.replace({ pathname: '/verify', params: { email, next: '/(tabs)/dashboard' } } as any);
    }
  };

  return {
    email, password, emailError, passwordError,
    setEmail, setPassword, setEmailError, setPasswordError,
    handleSubmit,
  };
}