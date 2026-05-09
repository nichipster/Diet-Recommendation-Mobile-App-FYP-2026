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
  isReady: boolean;
  resetToken: () => void;
  applyToken: (t: string) => void;
};

const DEFAULT_TARGETS: Targets = { calories: 2000, protein: 150, fats: 65, carbs: 275 };

// Single shared SGT date helper — import this in CalorieCard and MealTimeline
// instead of computing today inline, so all three are always consistent
export function getSGTToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

const GoalsContext = createContext<GoalsContextType>({
  targets: DEFAULT_TARGETS,
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
  isReady: false,
  resetToken: () => {},
  applyToken: () => {},
});

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [waterGoalGlasses, setWaterGoalGlasses] = useState(8);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedGoalType, setSavedGoalType] = useState('');
  const [savedActivity, setSavedActivity] = useState('');
  const [projectedGoalDate, setProjectedGoalDate] = useState('');

  // ── Load token once on mount ───────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      setToken(t);
      setIsReady(true);
    });
  }, []);

  // ── Re-fetch meals whenever token changes ─────────────────────────────────
  useEffect(() => {
    if (!token) {
      setMeals([]);
      return;
    }

    const loadTodayMeals = async () => {
      const today = getSGTToday();
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
          calories: m.calories,
          protein: m.protein_g,
          carbs: m.carb_g,
          fats: m.fat_g,
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
  }, [token]);

  // ── Re-fetch goals whenever token changes ─────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTargets(DEFAULT_TARGETS);
      setGoalsSaved(false);
      setSavedGoalType('');
      setProjectedGoalDate('');
      setSavedActivity('');
      return;
    }

    const loadSavedGoal = async () => {
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
        setSavedGoalType(data.goal_type);
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
  }, [token]);

  // ── Called on logout — wipes all state ───────────────────────────────────
  const resetToken = () => {
    setToken(null);
    setIsReady(false);
  };

  // ── Called on login success — triggers both fetch effects ─────────────────
  const applyToken = (t: string) => {
    setToken(t);
    setIsReady(true);
  };

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
      isReady,
      resetToken,
      applyToken,
    }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  return useContext(GoalsContext);
}
