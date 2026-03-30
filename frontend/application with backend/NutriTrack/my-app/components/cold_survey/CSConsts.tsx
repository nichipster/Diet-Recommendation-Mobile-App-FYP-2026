import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '../../constants/api';

export type Gender = 'Male' | 'Female' | '';
export type Goal = 'Lose' | 'Maintain' | 'Gain' | '';
export type WeeklyGoal = 'Conservative' | 'Moderate' | 'Aggressive' | '';
export type ActivityLevel = 'Sedentary' | 'Lightly Active' | 'Active' | 'Very Active' | '';

export interface data {
  gender: Gender;
  age: string;
  height: string;
  weight: string;
  goal: Goal;
  goalWeight: string;
  weeklyGoal: WeeklyGoal;
  activityLevel: ActivityLevel;
  cardioPerWeek: string;
  isVegan: boolean;
  allergies: string[];
}

export default function useCSConsts() {
  const { user, setUser } = useUser();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<data>({
    gender: '',
    age: '',
    height: '',
    weight: '',
    goal: '',
    goalWeight: '',
    weeklyGoal: '',
    activityLevel: '',
    cardioPerWeek: '0×',
    isVegan: false,
    allergies: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof data, string>>>({});

  const update = (key: keyof data, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const toggleAllergy = (allergy: string) => {
    setData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const getNextStep = () => {
    if (step === 2 && data.goal === 'Maintain') return 5;
    return step + 1;
  };

  const getPrevStep = () => {
    if (step === 5 && data.goal === 'Maintain') return 2;
    return step - 1;
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof data, string>> = {};

    // ── Step 1 ──
    if (step === 1) {
      if (!data.gender) newErrors.gender = 'Please select your gender';

      const age = Number(data.age);
      if (!data.age || isNaN(age)) {
        newErrors.age = 'Please enter a valid age';
      } else if (age < 13) {
        newErrors.age = 'You must be at least 13 years old';
      } else if (age > 100) {
        newErrors.age = 'Please enter a valid age';
      }

      const height = Number(data.height);
      if (!data.height || isNaN(height)) {
        newErrors.height = 'Please enter a valid height';
      } else if (height < 100) {
        newErrors.height = 'Height must be at least 100cm';
      } else if (height > 250) {
        newErrors.height = 'Please enter a valid height';
      }

      const weight = Number(data.weight);
      if (!data.weight || isNaN(weight)) {
        newErrors.weight = 'Please enter a valid weight';
      } else if (weight < 30) {
        newErrors.weight = 'Weight must be at least 30kg';
      } else if (weight > 300) {
        newErrors.weight = 'Please enter a valid weight';
      }
    }

    // ── Step 2 ──
    if (step === 2) {
      if (!data.goal) newErrors.goal = 'Please select your goal';
    }

    // ── Step 3 ──
    if (step === 3) {
      if (!data.goalWeight || isNaN(Number(data.goalWeight))) {
        newErrors.goalWeight = 'Please enter a valid goal weight';
      } else if (data.goal === 'Lose' && Number(data.goalWeight) >= Number(data.weight)) {
        newErrors.goalWeight = 'Goal weight must be lower than your current weight';
      } else if (data.goal === 'Gain' && Number(data.goalWeight) <= Number(data.weight)) {
        newErrors.goalWeight = 'Goal weight must be higher than your current weight';
      }
    }

    // ── Step 4 ──
    if (step === 4) {
      if (!data.weeklyGoal) newErrors.weeklyGoal = 'Please select a weekly goal';
    }

    // ── Step 5 ──
    if (step === 5) {
      if (!data.activityLevel) newErrors.activityLevel = 'Please select your activity level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ← changed to async
  const handleNext = async () => {
    if (!validate()) return;
    if (step >= 6) {
      try {
        const token = await AsyncStorage.getItem('token');

        if (token) {
          const activityMap: Record<string, string> = {
            'Sedentary': 'sedentary',
            'Lightly Active': 'lightly_active',
            'Active': 'active',
            'Very Active': 'very_active',
          };

          // ← save survey data to backend
          await fetch(`${API_URL}/profile/`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({
              gender: data.gender.toLowerCase(),
              height_cm: Number(data.height),
              weight_kg: Number(data.weight),
              activity_level: activityMap[data.activityLevel],
              is_vegan: data.isVegan,
              allergies: data.allergies.join(','),
            }),
          });
        }
      } catch (e) {
        console.log('Profile save error:', e);
      }

      // ← always save to context and navigate regardless of backend result
      setUser({
        ...user,
        gender: data.gender,
        age: data.age,
        height: data.height,
        weight: data.weight,
        goal: data.goal,
        goalWeight: data.goalWeight,
        activityLevel: data.activityLevel,
        cardioPerWeek: data.cardioPerWeek,
        isVegan: data.isVegan,
        allergies: data.allergies,
      });

      router.replace('/(tabs)/dashboard' as any);
      return;
    }
    setStep(getNextStep());
  };

  const handleBack = () => {
    if (step === 1) { router.back(); return; }
    setStep(getPrevStep());
  };

  const progressSteps = data.goal === 'Maintain' ? 4 : 6;
  const currentProgress = data.goal === 'Maintain' && step >= 5 ? step - 2 : step;

  return {
    step, data, errors,
    update, toggleAllergy,
    handleNext, handleBack,
    progressSteps, currentProgress,
  };
}