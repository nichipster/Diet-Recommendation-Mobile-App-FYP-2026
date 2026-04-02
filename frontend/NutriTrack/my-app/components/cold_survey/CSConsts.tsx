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
  dobDay: string;    // ← replaced age with these three
  dobMonth: string;
  dobYear: string;
  height: string;
  weight: string;
  goal: Goal;
  goalWeight: string;
  weeklyGoal: WeeklyGoal;
  activityLevel: ActivityLevel;
  cardioPerWeek: string;
  isVegan: boolean;
  isVegetarian: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  allergies: string[];
}

// ← helper to calculate age from dob parts
export const calculateAge = (day: string, month: string, year: string): number => {
  const birth = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// ← helper to format dob as YYYY-MM-DD for backend
export const formatDob = (day: string, month: string, year: string): string => {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export default function useCSConsts() {
  const { user, setUser } = useUser();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<data>({
    gender: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    height: '',
    weight: '',
    goal: '',
    goalWeight: '',
    weeklyGoal: '',
    activityLevel: '',
    cardioPerWeek: '0×',
    isVegan: false,
    isVegetarian: false,
    isHalal: false,
    isGlutenFree: false,
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

      // ← validate dob parts
      const day = Number(data.dobDay);
      const month = Number(data.dobMonth);
      const year = Number(data.dobYear);
      const currentYear = new Date().getFullYear();

      if (!data.dobDay || !data.dobMonth || !data.dobYear) {
        newErrors.dobDay = 'Please enter your date of birth';
      } else if (
        isNaN(day) || isNaN(month) || isNaN(year) ||
        day < 1 || day > 31 ||
        month < 1 || month > 12 ||
        year < 1900 || year > currentYear
      ) {
        newErrors.dobDay = 'Please enter a valid date of birth';
      } else {
        const age = calculateAge(data.dobDay, data.dobMonth, data.dobYear);
        if (age < 13) {
          newErrors.dobDay = 'You must be at least 13 years old';
        } else if (age > 100) {
          newErrors.dobDay = 'Please enter a valid date of birth';
        }
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

    const handleNext = async () => {
      if (!validate()) return;
      if (step >= 6) {
        try {
          const token = await AsyncStorage.getItem('token');

          if (token) {
            const activityMap: Record<string, string> = {
              'Sedentary':      'sedentary',
              'Lightly Active': 'lightly_active',
              'Active':         'active',
              'Very Active':    'very_active',
            };

            const dob = formatDob(data.dobDay, data.dobMonth, data.dobYear);

            // Step 1: Create profile
            const profileRes = await fetch(`${API_URL}/profile/create-profile`, {
              method: 'POST',
              headers: getAuthHeaders(token),
              body: JSON.stringify({
                gender:         data.gender.toLowerCase(),
                dob:            dob,
                height_cm:      Number(data.height),
                weight_kg:      Number(data.weight),
                activity_level: activityMap[data.activityLevel],
              }),
            });

            if (!profileRes.ok) {
              const err = await profileRes.json();
              console.log('Profile creation failed:', err.detail);
            }

            // Step 2: Create preferences
            const prefRes = await fetch(`${API_URL}/preferences/create-preferences`, {
              method: 'POST',
              headers: getAuthHeaders(token),
              body: JSON.stringify({
                is_vegan:              data.isVegan,
                is_vegetarian:         data.isVegetarian,
                is_halal:              data.isHalal,
                is_gluten_free:        data.isGlutenFree,
                has_milk_allergy:      data.allergies.includes('Milk'),
                has_egg_allergy:       data.allergies.includes('Egg'),
                has_fish_allergy:      data.allergies.includes('Fish'),
                has_shellfish_allergy: data.allergies.includes('Shellfish'),
                has_tree_nut_allergy:  data.allergies.includes('Tree Nuts'),
                has_peanut_allergy:    data.allergies.includes('Peanuts'),
                has_wheat_allergy:     data.allergies.includes('Wheat'),
                has_soy_allergy:       data.allergies.includes('Soy'),
                has_sesame_allergy:    data.allergies.includes('Sesame'),
                has_sulfite_allergy:   data.allergies.includes('Sulfite'),
              }),
            });

            if (!prefRes.ok) {
              const err = await prefRes.json();
              console.log('Preferences creation failed:', err.detail);
            }
          }
        } catch (e) {
          console.log('Survey save error:', e);
        }

        // Update context with all survey data
        setUser({
          ...user,
          gender:        data.gender,
          dob:           formatDob(data.dobDay, data.dobMonth, data.dobYear).split('-').reverse().join('-'),
          height:        data.height,
          weight:        data.weight,
          goal:          data.goal,
          goalWeight:    data.goalWeight,
          activityLevel: data.activityLevel,
          cardioPerWeek: data.cardioPerWeek,
          isVegan:       data.isVegan,
          isVegetarian:  data.isVegetarian,   // ← was missing
          isHalal:       data.isHalal,         // ← was missing
          isGlutenFree:  data.isGlutenFree,    // ← was missing
          allergies:     data.allergies,
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