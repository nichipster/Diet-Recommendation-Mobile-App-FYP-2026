import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TouchableOpacity,
    View,
    Alert
} from 'react-native';
import { useUser } from '../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '@/constants/api';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoals } from '../../context/GoalsContext';
import GoalsHeader from '../../components/goals/GoalsHeader';
import GoalTypeStep from '../../components/goals/GoalTypeStep';
import ProfileStep from '../../components/goals/ProfileStep';
import StepIndicator from '../../components/goals/StepIndicator';
import TargetsStep from '../../components/goals/TargetsStep';

export function calculateTargets(
  weight: string, height: string, age: string,
  gender: string, activity: string, goalType: string,
  desiredWeight: string
) {
  const w = parseFloat(weight) || 70;
  const h = parseFloat(height) || 170;
  const a = parseFloat(age) || 25;
  const dw = parseFloat(desiredWeight) || w;

  let bmr = gender === 'female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5;

  const activityMap: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
  };
  let tdee = bmr * (activityMap[activity] || 1.2);

  if (goalType === 'lose') {
    const weightDiff = w - dw;
    const deficit = weightDiff > 10 ? 750 : 500;
    tdee -= deficit;
  }
  if (goalType === 'gain') tdee += 300;

  const calories = Math.round(tdee);
  const protein = Math.round(w * 1.8);
  const fats = Math.round((tdee * 0.25) / 9);
  const carbs = Math.round((tdee - protein * 4 - fats * 9) / 4);
  return { calories, protein, fats, carbs };
}

export function calculateWater(
  weight: string,
  gender: string,
  activity: string,
  goalType: string,
): { ml: number; glasses: number } {
  const w = parseFloat(weight) || 70;
  let ml = w * 35;
  if (gender === 'female') ml *= 0.9;
  const activityMultiplier: Record<string, number> = {
    sedentary: 1.0, light: 1.1, moderate: 1.2, active: 1.3,
  };
  ml *= activityMultiplier[activity] || 1.0;
  if (goalType === 'lose' || goalType === 'gain') ml += 200;
  ml = Math.round(ml / 50) * 50;
  const glasses = Math.round(ml / 250);
  return { ml, glasses };
}

export default function GoalsScreen() {
  const { user, loadUser } = useUser();
  const {
    setTargets: saveToContext,
    setGoalsSaved,
    setWaterGoalMl,
    setWaterGoalGlasses,
    setSavedGoalType,
    setSavedActivity,
  } = useGoals();

  const [step, setStep] = useState(0);
  const [gender, setGender]     = useState(user.gender.toLowerCase() || 'male');
  const [dob, setDob]           = useState('');
  const [weight, setWeight]     = useState(user.weight || '');
  const [height, setHeight]     = useState(user.height || '');
  const [activity, setActivity] = useState(user.activityLevel || 'sedentary');
  const [goalType, setGoalType] = useState('maintain');
  const [desiredWeight, setDesiredWeight] = useState('');
  const [targets, setTargets] = useState({
    calories: 2000, protein: 150, fats: 65, carbs: 275,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.gender)        setGender(user.gender.toLowerCase());
    if (user.weight)        setWeight(user.weight);
    if (user.height)        setHeight(user.height);
    if (user.activityLevel) setActivity(user.activityLevel);
    if (user.dob)           setDob(user.dob);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
      setStep(0);
      setSaved(false);
    }, [])
  );

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const weeklyRateMap: Record<string, string> = {
        'lose':     'moderate',
        'maintain': 'stagnant',
        'gain':     'moderate',
      };

      const res = await fetch(`${API_URL}/dietary-goal/generate-dietary-goal`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          goal_type:        goalType,
          weekly_goal_rate: weeklyRateMap[goalType],
          target_weight_kg: Number(desiredWeight) || Number(user.weight),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Failed to generate goal');
        return;
      }

      const data = await res.json();
      setTargets({
        calories: data.daily_calorie_target,
        protein:  data.daily_protein_g,
        fats:     data.daily_fat_g,
        carbs:    data.daily_carb_g,
      });
      setStep(2);

    } catch (e) {
      console.log('Goal generation error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    saveToContext(targets);
    setGoalsSaved(true);
    setSaved(true);
    setSavedGoalType(goalType);
    setSavedActivity(user.activityLevel);
    const water = calculateWater(
      user.weight,
      user.gender.toLowerCase(),
      user.activityLevel,
      goalType
    );
    setWaterGoalMl(water.ml);
    setWaterGoalGlasses(water.glasses);
  };

  const getBackLabel = () => {
    if (step === 1) return 'Goal';
    if (step === 2) return 'Profile';
    return '';
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
    if (step === 2) setStep(1);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>

      {step > 0 && (
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>{getBackLabel()}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {step === 1 ? 'Your Profile' : 'Your Targets'}
          </Text>
          <View style={styles.navSpacer} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <GoalsHeader />
        <View style={styles.content}>
          <StepIndicator currentStep={step} />
          {step === 0 && (
            <GoalTypeStep
              goalType={goalType}
              setGoalType={setGoalType}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <ProfileStep
              gender={gender} setGender={setGender}
              dob={dob} setDob={setDob}
              weight={weight} setWeight={setWeight}
              height={height} setHeight={setHeight}
              desiredWeight={desiredWeight}
              setDesiredWeight={setDesiredWeight}
              goalType={goalType}
              activity={activity} setActivity={setActivity}
              onNext={handleCalculate}
            />
          )}
          {step === 2 && (
            <TargetsStep
              targets={targets}
              setTargets={setTargets}
              goalType={goalType}
              activity={activity}
              saved={saved}
              onSave={handleSave}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  safeArea: {
    backgroundColor: '#10b981',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    zIndex: 100,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backArrow: {
    fontSize: 30,
    color: '#10b981',
    fontWeight: '300',
    lineHeight: 32,
  },
  backText: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '600',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 60,
  },
  navSpacer: { width: 60 },
  content: {
    paddingHorizontal: 16,
    marginTop: -52,
    paddingBottom: 24,
  },
});