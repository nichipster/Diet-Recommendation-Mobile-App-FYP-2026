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
  hasPeanutAllergy: boolean;
  hasTreeNutAllergy: boolean;
  hasMilkAllergy: boolean;
  hasEggAllergy: boolean;
  hasFishAllergy: boolean;
  hasShellfishAllergy: boolean;
  hasSoyAllergy: boolean;
  hasWheatAllergy: boolean;
  hasSesameAllergy: boolean;
  hasSulfiteAllergy: boolean;
  allergyNotes: string;
  tdee: string;
  specialisation?: string;
  credentials?: string;
  tags?: string[];
  tip?: string;
  bio?: string;
  diaryFeedback?: string;
  review?: string;
  filters?: Record<string, any>;
  avatarColor?: string;
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
  isHalal: false, isGlutenFree: false, hasPeanutAllergy: false,
  hasTreeNutAllergy: false, hasMilkAllergy: false, hasEggAllergy: false,
  hasFishAllergy: false, hasShellfishAllergy: false, hasSoyAllergy: false,
  hasWheatAllergy: false, hasSesameAllergy: false, hasSulfiteAllergy: false,
  allergyNotes: '', tdee: '', specialisation: '', credentials: '', tags: [], tip: '', bio: '',
  diaryFeedback: '', review: '', filters: {},
  avatarColor: '#10b981',
};

const UserContext = createContext<UserContextType>({
  user: defaultUser,
  setUser: () => {},
  loadUser: async () => {},
  clearUser: () => {},
  isPremium: false, //CHANGE THIS TO false FOR premium, true FOR FREEMIUM
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData>({ ...defaultUser, role: 'premium' });//THIS LINE IS FOR PREMIUM TESTING
 // const [user, setUser] = useState<UserData>(defaultUser); //THIS LINE IS FOR FREEMIUM TESTING

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
        hasPeanutAllergy:    prefData?.has_peanut_allergy    ?? prev.hasPeanutAllergy,
        hasTreeNutAllergy:   prefData?.has_tree_nut_allergy  ?? prev.hasTreeNutAllergy,
        hasMilkAllergy:      prefData?.has_milk_allergy      ?? prev.hasMilkAllergy,
        hasEggAllergy:       prefData?.has_egg_allergy       ?? prev.hasEggAllergy,
        hasFishAllergy:      prefData?.has_fish_allergy      ?? prev.hasFishAllergy,
        hasShellfishAllergy: prefData?.has_shellfish_allergy ?? prev.hasShellfishAllergy,
        hasSoyAllergy:       prefData?.has_soy_allergy       ?? prev.hasSoyAllergy,
        hasWheatAllergy:     prefData?.has_wheat_allergy     ?? prev.hasWheatAllergy,
        hasSesameAllergy:    prefData?.has_sesame_allergy    ?? prev.hasSesameAllergy,
        hasSulfiteAllergy:   prefData?.has_sulfite_allergy   ?? prev.hasSulfiteAllergy,
        allergyNotes:        prefData?.allergy_notes         ?? prev.allergyNotes,
        tdee: profileData?.tdee != null ? String(profileData.tdee) : prev.tdee,
        activityLevel: profileData?.activity_level ?? prev.activityLevel,
        specialisation: userData?.specialisation ?? prev.specialisation,
        credentials: userData?.credentials ?? prev.credentials,
        tags: userData?.tags ?? prev.tags,
        tip: userData?.tip ?? prev.tip,
        bio: userData?.bio ?? prev.bio,
        diaryFeedback: userData?.diaryFeedback ?? prev.diaryFeedback,
        review: userData?.review ?? prev.review,
        filters: userData?.filters ?? prev.filters,
        avatarColor: prev.avatarColor,
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