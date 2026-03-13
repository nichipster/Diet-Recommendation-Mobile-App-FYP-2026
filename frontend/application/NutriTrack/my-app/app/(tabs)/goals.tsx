import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useGoals } from '../context/GoalsContext';
import GoalsHeader from '../components/third_section/goals/GoalsHeader';
import GoalTypeStep from '../components/third_section/goals/GoalTypeStep';
import ProfileStep from '../components/third_section/goals/ProfileStep';
import StepIndicator from '../components/third_section/goals/StepIndicator';
import TargetsStep from '../components/third_section/goals/TargetsStep';

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

  // Base: 35ml per kg
  let ml = w * 35;

  // Female adjustment
  if (gender === 'female') ml *= 0.9;

  // Activity multiplier
  const activityMultiplier: Record<string, number> = {
    sedentary: 1.0,
    light: 1.1,
    moderate: 1.2,
    active: 1.3,
  };
  ml *= activityMultiplier[activity] || 1.0;

  // Goal adjustment
  if (goalType === 'lose' || goalType === 'gain') ml += 200;

  ml = Math.round(ml / 50) * 50;

  // Convert to glasses (250ml per glass)
  const glasses = Math.round(ml / 250);

  return { ml, glasses };
}

export default function GoalsScreen() {
  const { setTargets: saveToContext, setGoalsSaved, setWaterGoalMl, setWaterGoalGlasses } = useGoals();

  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState('maintain');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [desiredWeight, setDesiredWeight] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [targets, setTargets] = useState({
    calories: 2000, protein: 150, fats: 65, carbs: 275,
  });
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStep(0);
      setSaved(false);
    }, [])
  );

  const handleCalculate = () => {
    const calculated = calculateTargets(
      weight, height, age, gender, activity, goalType, desiredWeight
    );
    setTargets(calculated);
    setStep(2);
  };

  const handleSave = () => {
    saveToContext(targets);
    setGoalsSaved(true);
    setSaved(true);

    // Calculate and save water goal
    const water = calculateWater(weight, gender, activity, goalType);
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

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
              age={age} setAge={setAge}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10b981' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
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