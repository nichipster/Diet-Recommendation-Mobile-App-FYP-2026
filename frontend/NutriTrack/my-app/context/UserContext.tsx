import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '@/constants/api';

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  token: string;
  role: string;
  gender: string;
  dob: string;
  height: string;
  weight: string;
  goal: string;
  goalWeight: string;
  activityLevel: string;
  cardioPerWeek: string;
  isVegan: boolean;
  isVegetarian: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  allergies: string[];
};

type UserContextType = {
  user: UserData;
  setUser: (u: UserData) => void;
  loadUser: () => Promise<void>;
  clearUser: () => void;
  isPremium: boolean;
};

const defaultUser: UserData = {
  firstName: '', lastName: '', email: '',
  token: '', role: '',
  gender: '', dob: '', height: '', weight: '',
  goal: '', goalWeight: '', activityLevel: '',
  cardioPerWeek: '', isVegan: false, isVegetarian: false,
  isHalal: false, isGlutenFree: false, allergies: [],
};

const UserContext = createContext<UserContextType>({
  user: defaultUser,
  setUser: () => {},
  loadUser: async () => {},
  clearUser: () => {},
  isPremium: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData>(defaultUser);

  const clearUser = () => setUser(defaultUser);
  const isPremium = user.role === 'premium';

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Fetch basic user info
      const userRes = await fetch(`${API_URL}/user/me`, {
        headers: getAuthHeaders(token),
      });
      if (!userRes.ok) return;
      const userData = await userRes.json();

      // Fetch profile (health data)
      let profileData: any = null;
      const profileRes = await fetch(`${API_URL}/profile/me`, {
        headers: getAuthHeaders(token),
      });
      if (profileRes.ok) {
        profileData = await profileRes.json();
      }

      // Fetch preferences (dietary + allergies) — separate endpoint
      let prefData: any = null;
      const prefRes = await fetch(`${API_URL}/preferences/view-preferences`, {
        headers: getAuthHeaders(token),
      });
      if (prefRes.ok) {
        prefData = await prefRes.json();
      }

      // Build allergies array from individual boolean columns
      const allergies: string[] = [];
      if (prefData?.has_milk_allergy)      allergies.push('Milk');
      if (prefData?.has_egg_allergy)       allergies.push('Egg');
      if (prefData?.has_fish_allergy)      allergies.push('Fish');
      if (prefData?.has_shellfish_allergy) allergies.push('Shellfish');
      if (prefData?.has_tree_nut_allergy)  allergies.push('Tree Nuts');
      if (prefData?.has_peanut_allergy)    allergies.push('Peanuts');
      if (prefData?.has_wheat_allergy)     allergies.push('Wheat');
      if (prefData?.has_soy_allergy)       allergies.push('Soy');
      if (prefData?.has_sesame_allergy)    allergies.push('Sesame');
      if (prefData?.has_sulfite_allergy)   allergies.push('Sulfite');

      setUser(prev => ({
        ...prev,
        token,
        role:      userData.role       ?? prev.role,
        firstName: userData.first_name ?? prev.firstName,
        lastName:  userData.last_name  ?? prev.lastName,
        email:     userData.email      ?? prev.email,
        gender: profileData?.gender
          ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)
          : prev.gender,
        dob: profileData?.dob
          ? profileData.dob.split('-').reverse().join('-') // YYYY-MM-DD → DD-MM-YYYY
          : prev.dob,
        weight: profileData?.weight_kg != null ? String(profileData.weight_kg) : prev.weight,
        height: profileData?.height_cm != null ? String(profileData.height_cm) : prev.height,
        isVegan:      prefData?.is_vegan      ?? prev.isVegan,
        isVegetarian: prefData?.is_vegetarian ?? prev.isVegetarian,
        isHalal:      prefData?.is_halal      ?? prev.isHalal,
        isGlutenFree: prefData?.is_gluten_free ?? prev.isGlutenFree,
        allergies: prefData ? allergies : prev.allergies,
      }));

    } catch (e) {
      console.log('loadUser error:', e);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loadUser, clearUser, isPremium }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}