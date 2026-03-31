import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '@/constants/api';

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  token: string;
  gender: string;
  dob: string;        // ← replaces age
  height: string;
  weight: string;
  goal: string;
  goalWeight: string;
  activityLevel: string;
  cardioPerWeek: string;
  isVegan: boolean;
  allergies: string[];
};

type UserContextType = {
  user: UserData;
  setUser: (u: UserData) => void;
  loadUser: () => Promise<void>;
  clearUser: () => void;
};

const defaultUser: UserData = {
  firstName: '', lastName: '', email: '',
  token: '',
  gender: '', dob: '', height: '', weight: '',
  goal: '', goalWeight: '', activityLevel: '',
  cardioPerWeek: '', isVegan: false, allergies: [],
};

const UserContext = createContext<UserContextType>({
  user: defaultUser,
  setUser: () => {},
  loadUser: async () => {},
  clearUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData>(defaultUser);

  const clearUser = () => setUser(defaultUser);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Fetch name + email
      const userRes = await fetch(`${API_URL}/user/me`, {
        headers: getAuthHeaders(token),
      });
      if (!userRes.ok) return;
      const userData = await userRes.json();

      // Fetch health + dietary profile
      let profileData: any = null;
      const profileRes = await fetch(`${API_URL}/profile/me`, {
        headers: getAuthHeaders(token),
      });
      if (profileRes.ok) {
        profileData = await profileRes.json();
        console.log('profileData:', JSON.stringify(profileData, null, 2)); // ← remove after confirming
      }

      setUser(prev => ({
        ...prev,
        token,
        firstName: userData.first_name ?? prev.firstName,
        lastName:  userData.last_name  ?? prev.lastName,
        email:     userData.email      ?? prev.email,
        gender: profileData?.gender
          ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)
          : prev.gender,
        dob: profileData?.dob != null
          ? profileData.dob.split('-').reverse().join('-') // YYYY-MM-DD → DD-MM-YYYY
          : prev.dob,
        weight: profileData?.weight_kg != null ? String(profileData.weight_kg) : prev.weight,
        height: profileData?.height_cm != null ? String(profileData.height_cm) : prev.height,
        isVegan: profileData?.preferences?.is_vegan != null
          ? profileData.preferences.is_vegan
          : prev.isVegan,
        allergies: profileData?.preferences?.allergies
          ? profileData.preferences.allergies.split(',').filter(Boolean)
          : prev.allergies,
      }));

    } catch (e) {
      console.log('loadUser error:', e);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loadUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}