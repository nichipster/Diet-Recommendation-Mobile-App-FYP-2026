import { Modal } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TouchableOpacity,
    View,
    Alert
} from 'react-native';
import { useUser } from '../../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '@/constants/api';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoals } from '../../../../context/GoalsContext';
import GoalsHeader from '../../../goals/GoalsHeader';
import GoalTypeStep from '../../../goals/GoalTypeStep';
import WeeklyGoalStep from '../../../goals/WeeklyGoalStep';
import ProfileStep from '../../../goals/ProfileStep';
import StepIndicator from '../../../goals/StepIndicator';
import TargetsStep from '../../../goals/TargetsStep';

interface Props {
  visible: boolean;
  onClose: () => void;
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
    sedentary: 1.0, lightly_active: 1.1, active: 1.2, very_active: 1.3,
  };
  ml *= activityMultiplier[activity] || 1.0;
  if (goalType === 'lose' || goalType === 'gain') ml += 200;
  ml = Math.round(ml / 50) * 50;
  const glasses = Math.round(ml / 250);
  return { ml, glasses };
}

export default function GoalsScreen({ visible, onClose }: Props) {
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

  useEffect(() => {
    if (user.weight)        setWeight(user.weight);
    if (user.activityLevel) setActivity(user.activityLevel);
  }, [user]);

  useEffect(() => {
    if (visible) {
      loadUser().then(() => {
        setStep(0);
        setDesiredWeight('');
        setGoalType('maintain');
        setWeeklyGoal('moderate');
        setProjectedGoalDate('');
      });
    }
  }, [visible]);

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

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      if (weight !== user.weight) {
        await fetch(`${API_URL}/profile/update-weight-log`, {
          method: 'POST',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ weight: Number(weight) }),
        });
      }

      if (activity !== user.activityLevel) {
        await fetch(`${API_URL}/profile/update-profile`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ activity_level: activity }),
        });
      }

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

      const viewRes = await fetch(`${API_URL}/dietary-goal/view-dietary-goal`, {
        headers: getAuthHeaders(token),
      });
      if (viewRes.ok) {
        const viewData = await viewRes.json();
        setProjectedGoalDate(viewData.projected_goal_date ?? '');
      }

      saveToContext(newTargets);
      setGoalsSaved(true);
      setSavedGoalType(goalType);
      setSavedActivity(activity);
      const water = calculateWater(weight, user.gender.toLowerCase(), activity, goalType);
      setWaterGoalMl(water.ml);
      setWaterGoalGlasses(water.glasses);

      await loadUser();
      setStep(3);

    } catch (e) {
      console.log('Goal confirm error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const backLabel = step === 0 ? 'Profile' : getBackLabel();
  const backHandler = step === 0 ? onClose : handleBack;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* ↓ SafeAreaView is now the root, green background so inset area matches header */}
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <GoalsHeader onBack={backHandler} backLabel={backLabel} />
          <View style={styles.content}>
            <StepIndicator currentStep={step} />

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
            {step === 1 && (
              <WeeklyGoalStep
                weeklyGoal={weeklyGoal}
                setWeeklyGoal={setWeeklyGoal}
                onNext={() => setStep(2)}
              />
            )}
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
            {step === 3 && (
              <TargetsStep
                targets={targets}
                goalType={goalType}
                activity={activity}
                projectedGoalDate={projectedGoalDate}
                onDone={onClose}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#10b981', // green so status bar inset area matches header
  },
  scroll: {
    backgroundColor: '#f9fafb', // grey for the scrollable content area
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -52,
    paddingBottom: 24,
    backgroundColor: '#f9fafb',
  },
});