import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';
// ─── Types ────────────────────────────────────────────────────────────────────

export type Analysis = {
  id: string;              // nutritionistId_userName e.g. "1_sarahgan"
  nutritionistName: string;
  userName: string;
  lastUpdated: string;
  summary: string;
  wentWell: string;
  areasToImprove: string;
  recommendations: string;
  nextSteps: string;
};

type AnalysisContextType = {
  analyses: Analysis[];
  saveAnalysis: (analysis: Omit<Analysis, 'lastUpdated'>) => Promise<void>;
  getAnalysis: (id: string) => Analysis | undefined;
};

// FALLBACK DATA — shown while backend is not yet connected.
// TODO (Backend): Replace with GET /analyses
// Returns: array of {
//   id: string,              // format: "nutritionistId_userName" e.g. "1_sarahgan"
//   nutritionistName: string,
//   userName: string,
//   lastUpdated: string,     // format: "YYYY-MM-DD"
//   summary: string,
//   wentWell: string,
//   areasToImprove: string,
//   recommendations: string,
//   nextSteps: string
// }

const INITIAL_ANALYSES: Analysis[] = [
  {
    id: '1_sarahgan',
    nutritionistName: 'Dr. Sarah Lim',
    userName: 'Sarah Gan',
    lastUpdated: '2026-04-22',
    summary: 'Sarah has been making good progress overall. Consistency in meal timing has improved significantly over the past month.',
    wentWell: 'Protein intake has been consistent. Sleep schedule has improved which is positively affecting energy levels and food choices.',
    areasToImprove: 'Vegetable variety is still limited. Water intake needs to increase especially on workout days.',
    recommendations: 'Aim for at least 3 different vegetables per day. Try meal prepping on Sundays to reduce reliance on takeaways during busy weekdays.',
    nextSteps: 'Review meal log in 2 weeks. Target 2.5L water daily. Introduce one new vegetable per week.',
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analyses, setAnalyses] = useState<Analysis[]>(INITIAL_ANALYSES);
  
  // TODO (Backend): Uncomment when backend is ready
 const fetchAnalyses = async () => {
   try {
     const token = await AsyncStorage.getItem('token');
     const res = await fetch(`${API_URL}/analyses`, {
       headers: getAuthHeadersWithToken(token),
     });
     if (res.ok) {
       const data = await res.json();
       setAnalyses(data);
     }
   } catch (e) {
     console.log('fetchAnalyses error:', e);
   }
 };

// TODO (Backend): Uncomment when backend is ready
 useEffect(() => {
   fetchAnalyses();
 }, []);

  const saveAnalysis = async (analysis: Omit<Analysis, 'lastUpdated'>) => {
  const lastUpdated = new Date().toISOString().split('T')[0];
  setAnalyses(prev => {
    const exists = prev.find(a => a.id === analysis.id);
    if (exists) {
      return prev.map(a => a.id === analysis.id ? { ...analysis, lastUpdated } : a);
    }
    return [...prev, { ...analysis, lastUpdated }];
  });

  // API call
  try {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API_URL}/analyses`, {
      method: 'POST',
      headers: getAuthHeadersWithToken(token),
      body: JSON.stringify({ ...analysis, lastUpdated }),
    });
  } catch (e) {
    console.log('saveAnalysis error:', e);
  }
};

  const getAnalysis = (id: string) => analyses.find(a => a.id === id);

  return (
    <AnalysisContext.Provider value={{ analyses, saveAnalysis, getAnalysis }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within an AnalysisProvider');
  return ctx;
}