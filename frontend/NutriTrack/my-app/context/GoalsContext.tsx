import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '@/constants/api';

type Targets = {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
};

export type Meal = {
  id: string;
  name: string;
  foodName?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  amount?: number;
  time: string;
  notes?: string;
  date: string;
};

type GoalsContextType = {
  targets: Targets;
  setTargets: (t: Targets) => void;
  goalsSaved: boolean;
  setGoalsSaved: (v: boolean) => void;
  waterGoalMl: number;
  setWaterGoalMl: (v: number) => void;
  waterGoalGlasses: number;
  setWaterGoalGlasses: (v: number) => void;
  meals: Meal[];
  setMeals: (m: Meal[]) => void;
  savedGoalType: string;
  setSavedGoalType: (v: string) => void;
  savedActivity: string;
  setSavedActivity: (v: string) => void;
  projectedGoalDate: string;
  setProjectedGoalDate: (date: string) => void;
};

const GoalsContext = createContext<GoalsContextType>({
  targets: { calories: 2000, protein: 150, fats: 65, carbs: 275 },
  setTargets: () => {},
  goalsSaved: false,
  setGoalsSaved: () => {},
  waterGoalMl: 2000,
  setWaterGoalMl: () => {},
  waterGoalGlasses: 8,
  setWaterGoalGlasses: () => {},
  meals: [],
  setMeals: () => {},
  savedGoalType: '',
  setSavedGoalType: () => {},
  savedActivity: '',
  setSavedActivity: () => {},
  projectedGoalDate: '',
  setProjectedGoalDate: () => {},
});

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [targets, setTargets] = useState<Targets>({
    calories: 2000,
    protein: 150,
    fats: 65,
    carbs: 275,
  });
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [waterGoalGlasses, setWaterGoalGlasses] = useState(8);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedGoalType, setSavedGoalType] = useState('');
  const [savedActivity, setSavedActivity] = useState('');
  const [projectedGoalDate, setProjectedGoalDate] = useState('');
  useEffect(() => {
    const loadTodayMeals = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const today = new Date().toISOString().split('T')[0];
      try {
        const res = await fetch(`${API_URL}/meal/?entry_date=${today}`, {
          headers: getAuthHeaders(token),
        });
        if (!res.ok) return;
        const data = await res.json();

        setMeals(data.map((m: any) => ({
          id: String(m.meal_id),
          name: m.meal_name,
          foodName: m.items?.[0]?.food_name ?? '',
          calories: m.total_calories,
          protein: m.total_protein_g,
          carbs: m.total_carb_g,
          fats: m.total_fat_g,
          amount: m.items?.[0]?.amount,
          time: new Date(m.consumed_at).toLocaleTimeString('en-SG', {
            hour: '2-digit', minute: '2-digit', hour12: false,
            timeZone: 'Asia/Singapore',
          }),
          date: today,
        })));
      } catch (e) {
        console.log('Failed to load meals:', e);
      }
    };

    loadTodayMeals();
  }, []);

  useEffect(() => {
    const loadSavedGoal = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/dietary-goal/view-dietary-goal`, {
          headers: getAuthHeaders(token),
        });

        // 404 just means no goal set yet — not an error
        if (res.status === 404) return;
        if (!res.ok) return;

        const data = await res.json();

        setTargets({
          calories: data.daily_calorie_target,
          protein:  data.daily_protein_g,
          fats:     data.daily_fat_g,
          carbs:    data.daily_carb_g,
        });
        setGoalsSaved(true);
        setSavedGoalType(data.goal_type);           // 'lose' | 'maintain' | 'gain'
        setProjectedGoalDate(data.projected_goal_date ?? '');

        const profileRes = await fetch(`${API_URL}/profile/view-profile`, {
          headers: getAuthHeaders(token),
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setSavedActivity(profileData.activity_level ?? '');
        }

      } catch (e) {
        console.log('Failed to load saved goal:', e);
      }
    };

    loadSavedGoal();
  }, []);


  return (
    <GoalsContext.Provider value={{
      targets, setTargets,
      goalsSaved, setGoalsSaved,
      waterGoalMl, setWaterGoalMl,
      waterGoalGlasses, setWaterGoalGlasses,
      meals, setMeals,
      savedGoalType, setSavedGoalType,
      savedActivity, setSavedActivity,
      projectedGoalDate, setProjectedGoalDate,
    }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  return useContext(GoalsContext);
}