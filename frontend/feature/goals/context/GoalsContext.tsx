import React, { createContext, useContext, useState } from 'react';

type Targets = {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
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

  return (
    <GoalsContext.Provider value={{
      targets, setTargets,
      goalsSaved, setGoalsSaved,
      waterGoalMl, setWaterGoalMl,
      waterGoalGlasses, setWaterGoalGlasses,
    }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  return useContext(GoalsContext);
}