import React, { createContext, useContext, useState } from 'react';

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
  saveAnalysis: (analysis: Omit<Analysis, 'lastUpdated'>) => void;
  getAnalysis: (id: string) => Analysis | undefined;
};

// ─── Dummy data ───────────────────────────────────────────────────────────────
// Replace with API later

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

  const saveAnalysis = (analysis: Omit<Analysis, 'lastUpdated'>) => {
    const lastUpdated = new Date().toISOString().split('T')[0];
    setAnalyses(prev => {
      const exists = prev.find(a => a.id === analysis.id);
      if (exists) {
        // Update existing
        return prev.map(a => a.id === analysis.id ? { ...analysis, lastUpdated } : a);
      }
      // Create new
      return [...prev, { ...analysis, lastUpdated }];
    });
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