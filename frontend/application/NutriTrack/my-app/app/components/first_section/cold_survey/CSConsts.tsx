import { router } from 'expo-router';
import { useState } from 'react';

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
    if (step === 1) {
      if (!data.gender) newErrors.gender = 'Please select your gender';
      if (!data.age || isNaN(Number(data.age))) newErrors.age = 'Please enter a valid age';
      if (!data.height || isNaN(Number(data.height))) newErrors.height = 'Please enter a valid height';
      if (!data.weight || isNaN(Number(data.weight))) newErrors.weight = 'Please enter a valid weight';
    }
    if (step === 2) {
      if (!data.goal) newErrors.goal = 'Please select your goal';
    }
    if (step === 3) {
      if (!data.goalWeight || isNaN(Number(data.goalWeight))) {
        newErrors.goalWeight = 'Please enter a valid goal weight';
      } else if (data.goal === 'Lose' && Number(data.goalWeight) >= Number(data.weight)) {
        newErrors.goalWeight = 'Goal weight must be lower than your current weight';
      } else if (data.goal === 'Gain' && Number(data.goalWeight) <= Number(data.weight)) {
        newErrors.goalWeight = 'Goal weight must be higher than your current weight';
      }
    }
    if (step === 4) {
      if (!data.weeklyGoal) newErrors.weeklyGoal = 'Please select a weekly goal';
    }
    if (step === 5) {
      if (!data.activityLevel) newErrors.activityLevel = 'Please select your activity level';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step >= 7) {
      router.replace('/(tabs)/dashboard' as any);
      return;
    }
    setStep(getNextStep());
  };

  const handleBack = () => {
    if (step === 1) { router.back(); return; }
    setStep(getPrevStep());
  };

  const progressSteps = data.goal === 'Maintain' ? 5 : 7;
  const currentProgress = data.goal === 'Maintain' && step >= 5 ? step - 2 : step;

  return {
    step, data, errors,
    update, toggleAllergy,
    handleNext, handleBack,
    progressSteps, currentProgress,
  };
}