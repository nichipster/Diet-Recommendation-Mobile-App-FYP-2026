import React, { createContext, useContext, useState } from 'react';

type UserData = {
  // signup
  firstName: string;
  lastName: string;
  email: string;
  // health from survey
  gender: string;
  age: string;
  height: string;
  weight: string;
  goal: string;
  goalWeight: string;
  activityLevel: string;
  cardioPerWeek: string;
  // dietary from survey
  isVegan: boolean;
  allergies: string[];
};

type UserContextType = {
  user: UserData;
  setUser: (u: UserData) => void;
};

const UserContext = createContext<UserContextType>({
  user: {
    firstName: '', lastName: '', email: '',
    gender: '', age: '', height: '', weight: '',
    goal: '', goalWeight: '', activityLevel: '',
    cardioPerWeek: '', isVegan: false, allergies: [],
  },
  setUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData>({
    firstName: '', lastName: '', email: '',
    gender: '', age: '', height: '', weight: '',
    goal: '', goalWeight: '', activityLevel: '',
    cardioPerWeek: '', isVegan: false, allergies: [],
  });
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}