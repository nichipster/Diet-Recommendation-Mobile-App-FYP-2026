import React, { createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Analysis = {
  id: string;
  clientId?: number;
  nutritionistName: string;
  userName: string;
  lastUpdated: string;
  summary: string;
  wentWell: string;
  areasToImprove: string;
  recommendations: string;
  nextSteps: string;
};

type SaveAnalysisParams = {
  clientId: number;
  nutritionistName: string;
  userName: string;
  summary: string;
  wentWell: string;
  areasToImprove: string;
  recommendations: string;
  nextSteps: string;
};

type AnalysisContextType = {
  getAnalysis: (clientId: string) => Promise<Analysis | null>;
  saveAnalysis: (data: SaveAnalysisParams) => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {

  const getAnalysis = async (clientId: string): Promise<Analysis | null> => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/analyses`, {
        headers: getAuthHeadersWithToken(token),
      });
      if (!res.ok) return null;
      const data: Analysis[] = await res.json();
      // Nutritionist: matches by clientId; User: backend already filters to their own, return first
      return data.find(a => String(a.clientId) === clientId) ?? data[0] ?? null;
    } catch (e) {
      console.log('getAnalysis error:', e);
      return null;
    }
  };

  const saveAnalysis = async (data: SaveAnalysisParams): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/analyses`, {
        method: 'POST',
        headers: { ...getAuthHeadersWithToken(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.log('saveAnalysis error:', e);
    }
  };

  return (
    <AnalysisContext.Provider value={{ getAnalysis, saveAnalysis }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within an AnalysisProvider');
  return ctx;
}