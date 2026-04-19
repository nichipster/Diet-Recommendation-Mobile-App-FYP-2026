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
import WeeklyGoalStep from '../../components/goals/WeeklyGoalStep';
import ProfileStep from '../../components/goals/ProfileStep';
import StepIndicator from '../../components/goals/StepIndicator';
import TargetsStep from '../../components/goals/TargetsStep';

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
    sedentary: 1.0, lightly_active: 1.1, active: 1.2, very_active: 1.3,
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
    projectedGoalDate,
    setProjectedGoalDate,
  } = useGoals();

  // ── Step flow ──────────────────────────────────────────────────────────
  // 0 = GoalTypeStep
  // 1 = WeeklyGoalStep (skip if maintain)
  // 2 = ProfileStep (weight + activity)
  // 3 = TargetsStep (confirmation — auto saved)

  const [step, setStep]                         = useState(0);
  const [goalType, setGoalType]                 = useState('maintain');
  const [weeklyGoal, setWeeklyGoal]             = useState('moderate');
  const [weight, setWeight]                     = useState('');
  const [activity, setActivity]                 = useState('sedentary');
  const [desiredWeight, setDesiredWeight]       = useState('');
  const [targets, setTargets]                   = useState({
    calories: 2000, protein: 150, fats: 65, carbs: 275,
  });
  const [loading, setLoading]                   = useState(false);

  // ── Sync from context when user loads ──────────────────────────────────
  useEffect(() => {
    if (user.weight)        setWeight(user.weight);
    if (user.activityLevel) setActivity(user.activityLevel);
  }, [user]);

  // ── Reload user on screen focus ────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadUser().then(() => {
        setStep(0);
        setDesiredWeight('');
        setGoalType('maintain');
        setWeeklyGoal('moderate');
        setProjectedGoalDate('');
      });
    }, [])
  );

  // ── Navigation ─────────────────────────────────────────────────────────
  const getBackLabel = () => {
    if (step === 1) return 'Goal';
    if (step === 2) return goalType === 'maintain' ? 'Goal' : 'Weekly Goal';
    if (step === 3) return 'Profile';
    return '';
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
    if (step === 2) {
      if (goalType === 'maintain') setStep(0);
      else setStep(1);
    }
    if (step === 3) setStep(2);
  };

  // ── Confirm — generates goal and auto saves ────────────────────────────
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Update weight if changed
      if (weight !== user.weight) {
        await fetch(`${API_URL}/profile/update-weight-log`, {
          method: 'POST',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ weight: Number(weight) }),
        });
      }

      // Update activity level if changed
      if (activity !== user.activityLevel) {
        await fetch(`${API_URL}/profile/update-profile`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ activity_level: activity }),
        });
      }

      // Map weekly goal — stagnant for maintain
      const mappedWeeklyGoal = goalType === 'maintain' ? 'stagnant' : weeklyGoal;

      const res = await fetch(`${API_URL}/dietary-goal/generate-dietary-goal`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          goal_type:        goalType,
          weekly_goal_rate: mappedWeeklyGoal,
          target_weight_kg: Number(desiredWeight) || Number(weight),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Failed to generate goal');
        return;
      }

      const data = await res.json();
      const newTargets = {
        calories: data.daily_calorie_target,
        protein:  data.daily_protein_g,
        fats:     data.daily_fat_g,
        carbs:    data.daily_carb_g,
      };

      setTargets(newTargets);

      // Fetch projected goal date from view endpoint
      const viewRes = await fetch(`${API_URL}/dietary-goal/view-dietary-goal`, {
        headers: getAuthHeaders(token),
      });
      if (viewRes.ok) {
        const viewData = await viewRes.json();
        setProjectedGoalDate(viewData.projected_goal_date ?? '');
      }

      // Auto save to context
      saveToContext(newTargets);
      setGoalsSaved(true);
      setSavedGoalType(goalType);
      setSavedActivity(activity);
      const water = calculateWater(weight, user.gender.toLowerCase(), activity, goalType);
      setWaterGoalMl(water.ml);
      setWaterGoalGlasses(water.glasses);

      // Reload user to sync weight/activity changes
      await loadUser();

      setStep(3);

    } catch (e) {
      console.log('Goal confirm error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>

      {/* Back navbar — only show from step 1 onwards */}
      {step > 0 && (
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>{getBackLabel()}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {step === 1 ? 'Weekly Goal'   :
             step === 2 ? 'Your Profile'  :
             'Your Targets'}
          </Text>
          <View style={styles.navSpacer} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <GoalsHeader />
        <View style={styles.content}>
          <StepIndicator currentStep={step} />

          {/* Step 0 — Goal Type */}
          {step === 0 && (
            <GoalTypeStep
              goalType={goalType}
              setGoalType={setGoalType}
              onNext={() => {
                if (goalType === 'maintain') setStep(2);
                else setStep(1);
              }}
            />
          )}

          {/* Step 1 — Weekly Goal Rate (skip if maintain) */}
          {step === 1 && (
            <WeeklyGoalStep
              weeklyGoal={weeklyGoal}
              setWeeklyGoal={setWeeklyGoal}
              onNext={() => setStep(2)}
            />
          )}

          {/* Step 2 — Weight + Activity */}
          {step === 2 && (
            <ProfileStep
              weight={weight} setWeight={setWeight}
              desiredWeight={desiredWeight}
              setDesiredWeight={setDesiredWeight}
              goalType={goalType}
              activity={activity} setActivity={setActivity}
              onNext={handleConfirm}
            />
          )}

          {/* Step 3 — Confirmation (auto saved) */}
          {step === 3 && (
            <TargetsStep
              targets={targets}
              goalType={goalType}
              activity={activity}
              projectedGoalDate={projectedGoalDate}
            />
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#f9fafb' },
  safeArea: { backgroundColor: '#10b981' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16,
    paddingTop: 15, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, zIndex: 100,
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  backText:  { fontSize: 15, color: '#10b981', fontWeight: '600' },
  navTitle: {
    flex: 1, textAlign: 'center', fontSize: 15,
    fontWeight: '700', color: '#111827', marginRight: 60,
  },
  navSpacer: { width: 60 },
  content:   { paddingHorizontal: 16, marginTop: -52, paddingBottom: 24 },
});