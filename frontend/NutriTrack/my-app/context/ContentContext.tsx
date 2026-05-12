import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Article = {
  id: string;
  title: string;
  preview: string;
  content: string;
  date: string;
  author: string;
  category: string;
  views: number;
};

export type Tip = {
  id: string;
  text: string;
  author: string;
  views: number;
};

export type Advice = {
  id: string;
  title: string;
  desc: string;
  author: string;
  views: number;
};

type ContentContextType = {
  articles: Article[];
  tips: Tip[];
  advice: Advice[];
  incrementArticleView: (id: string) => void;
  incrementTipView: (id: string) => void;
  incrementAdviceView: (id: string) => void;
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  setTips: React.Dispatch<React.SetStateAction<Tip[]>>;
  setAdvice: React.Dispatch<React.SetStateAction<Advice[]>>;
  fetchContent: () => Promise<void>;
};

// FALLBACK DATA — shown while backend is not yet connected.
// TODO (Backend): Replace with:
//   GET /content/articles — Returns: array of {
//     id: string, title: string, preview: string, content: string,
//     date: string, author: string, category: string, views: number
//   }
//   GET /content/tips — Returns: array of {
//     id: string, text: string, author: string, views: number
//   }
//   GET /content/advice — Returns: array of {
//     id: string, title: string, desc: string, author: string, views: number
//   }

const INITIAL_ARTICLES: Article[] = [
  
];

const INITIAL_TIPS: Tip[] = [
  
];

const INITIAL_ADVICE: Advice[] = [
  
];

// ─── Context ──────────────────────────────────────────────────────────────────

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [tips, setTips]         = useState<Tip[]>(INITIAL_TIPS);
  const [advice, setAdvice]     = useState<Advice[]>(INITIAL_ADVICE);

  // TODO (Backend): Uncomment when backend is ready
 const fetchContent = async () => {
   try {
     const token = await AsyncStorage.getItem('token');
     const headers = getAuthHeadersWithToken(token);
     const [articlesRes, tipsRes, adviceRes] = await Promise.all([
       fetch(`${API_URL}/content/articles`, { headers }),
       fetch(`${API_URL}/content/tips`, { headers }),
       fetch(`${API_URL}/content/advice`, { headers }),
     ]);
     if (articlesRes.ok) setArticles(await articlesRes.json());
     if (tipsRes.ok)     setTips(await tipsRes.json());
     if (adviceRes.ok)   setAdvice(await adviceRes.json());
   } catch (e) {
     console.log('fetchContent error:', e);
   }
 };

// TODO (Backend): Uncomment when backend is ready
 useEffect(() => {
   fetchContent();
 }, [fetchContent]);

  const incrementArticleView = async (id: string) => {
  setArticles(prev =>
    prev.map(a => a.id === id ? { ...a, views: a.views + 1 } : a)
  );
  try {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API_URL}/content/articles/${id}/view`, {
      method: 'PATCH',
      headers: getAuthHeadersWithToken(token),
    });
  } catch (e) {
    console.log('incrementArticleView error:', e);
  }
};

  const incrementTipView = async (id: string) => {
    setTips(prev =>
      prev.map(t => t.id === id ? { ...t, views: t.views + 1 } : t)
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/content/tips/${id}/view`, {
        method: 'PATCH',
        headers: getAuthHeadersWithToken(token),
      });
    } catch (e) {
      console.log('incrementTipView error:', e);
    }
  };

  const incrementAdviceView = async (id: string) => {
    setAdvice(prev =>
      prev.map(a => a.id === id ? { ...a, views: a.views + 1 } : a)
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/content/advice/${id}/view`, {
        method: 'PATCH',
        headers: getAuthHeadersWithToken(token),
      });
    } catch (e) {
      console.log('incrementAdviceView error:', e);
    }
  };

  return (
    <ContentContext.Provider value={{
      articles, tips, advice,
      incrementArticleView, incrementTipView, incrementAdviceView,
      setArticles, setTips, setAdvice, fetchContent,
    }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within a ContentProvider');
  return ctx;
}
