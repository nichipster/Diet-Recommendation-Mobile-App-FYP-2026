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

/*
const INITIAL_ARTICLES: Article[] = [
  { id: '1', title: 'Understanding Halal Diet',    preview: 'Learn what foods are allowed...',         content: 'A halal diet follows Islamic dietary laws, ensuring that food is prepared and consumed in a permissible way. This includes avoiding pork, alcohol, and improperly slaughtered animals. Halal food is also associated with cleanliness and ethical sourcing. Many people choose halal not just for religious reasons, but also for quality assurance. Understanding these principles helps individuals make more informed dietary choices.', date: 'Sun, 12 Apr 2026', author: 'Dr. Sarah Lim', category: 'Diet', views: 0 },
  { id: '2', title: 'Benefits of Drinking Water',  preview: 'Why hydration matters daily...',          content: 'Staying hydrated is essential for maintaining overall health and energy levels. Water supports digestion, circulation, and temperature regulation. Drinking enough water can also improve focus and reduce fatigue. Many people confuse thirst with hunger, leading to unnecessary snacking. Making hydration a habit can significantly improve daily well-being.', date: 'Mon, 13 Apr 2026', author: 'Mr. Marcus Koh', category: 'Hydration', views: 0 },
  { id: '3', title: 'Balanced Diet Basics',        preview: 'What makes a balanced meal...',           content: 'A balanced diet includes a mix of carbohydrates, proteins, fats, vitamins, and minerals. Each nutrient plays a role in keeping the body functioning properly. Portion control is just as important as food choice. Eating a variety of foods ensures you get all essential nutrients. Consistency in balanced eating leads to long-term health benefits.', date: 'Tue, 14 Apr 2026', author: 'Ms. Priya Nair', category: 'Education', views: 0 },
  { id: '4', title: 'Healthy Snacking Habits',     preview: 'Snack smarter, not more...',              content: 'Snacking can be part of a healthy diet if done correctly. Choosing whole foods like fruits, nuts, or yogurt is better than processed snacks. Timing your snacks helps maintain energy throughout the day. Avoid eating out of boredom or stress. Smart snacking can prevent overeating during main meals.', date: 'Wed, 15 Apr 2026', author: 'Dr. Sarah Lim', category: 'Habits',    views: 0 },
  { id: '5', title: 'Understanding Food Labels',   preview: 'Learn how to read nutrition labels...',   content: 'Food labels provide important information about what you are consuming. Paying attention to serving size helps avoid overeating. Ingredients are listed in order of quantity, so the first few matter most. Watch out for hidden sugars and unhealthy fats. Understanding labels helps you make healthier choices at the store.', date: 'Thu, 16 Apr 2026', author: 'Mr. Marcus Koh', category: 'Education', views: 0 },
  { id: '6', title: 'Importance of Breakfast',     preview: 'Start your day right...',                 content: 'Breakfast is often called the most important meal of the day. It kickstarts your metabolism and provides energy for daily activities. Skipping breakfast may lead to overeating later. A good breakfast includes protein, fiber, and healthy fats. Building this habit supports better concentration and mood.', date: 'Fri, 17 Apr 2026', author: 'Ms. Priya Nair', category: 'Education', views: 0 },
  { id: '7', title: 'Reducing Sugar Intake',       preview: 'Cutting sugar for better health...',      content: 'Excess sugar consumption is linked to various health issues. Reducing sugary drinks is one of the easiest ways to cut sugar. Natural sugars from fruits are a better alternative. Reading labels helps identify hidden sugars in packaged foods. Gradual reduction is more sustainable than cutting it out completely.', date: 'Sat, 18 Apr 2026', author: 'Dr. Sarah Lim', category: 'Education', views: 0 },
];

const INITIAL_TIPS: Tip[] = [
  { id: '1', text: '💡 Drink water before meals to reduce overeating',              author: 'Dr. Sarah Lim', views: 0 },
  { id: '2', text: '💡 Add more vegetables to every meal for better nutrition',     author: 'Mr. Marcus Koh', views: 0 },
  { id: '3', text: '💡 Avoid sugary drinks and switch to water or tea',             author: 'Ms. Priya Nair', views: 0 },
  { id: '4', text: '💡 Eat slowly to help your body recognize fullness',            author: 'Dr. Sarah Lim', views: 0 },
  { id: '5', text: '💡 Include protein in every meal to stay full longer',          author: 'Mr. Marcus Koh', views: 0 },
  { id: '6', text: '💡 Plan your meals ahead to avoid unhealthy choices',           author: 'Ms. Priya Nair', views: 0 },
  { id: '7', text: '💡 Choose whole foods over processed snacks whenever possible', author: 'Dr. Sarah Lim', views: 0 },
];

const INITIAL_ADVICE: Advice[] = [
  { id: '1', title: 'Increase Protein Intake',  desc: 'Eat 20–30g protein per meal',                      author: 'Dr. Sarah Lim', views: 0 },
  { id: '2', title: 'Stay Hydrated Daily',       desc: 'Aim for at least 6–8 glasses of water',            author: 'Mr. Marcus Koh', views: 0 },
  { id: '3', title: 'Control Portion Sizes',     desc: 'Use smaller plates to avoid overeating',           author: 'Ms. Priya Nair', views: 0 },
  { id: '4', title: 'Limit Processed Foods',     desc: 'Choose fresh, whole foods when possible',          author: 'Dr. Sarah Lim', views: 0 },
  { id: '5', title: 'Eat More Fiber',            desc: 'Include fruits, vegetables, and whole grains',     author: 'Mr. Marcus Koh', views: 0 },
  { id: '6', title: 'Reduce Sugar Intake',       desc: 'Cut down on sweets and sugary drinks',             author: 'Ms. Priya Nair', views: 0 },
  { id: '7', title: 'Maintain Regular Meals',    desc: 'Avoid skipping meals to keep energy stable',       author: 'Dr. Sarah Lim', views: 0 },
];
*/

// ─── Context ──────────────────────────────────────────────────────────────────

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tips, setTips]         = useState<Tip[]>([]);
  const [advice, setAdvice]     = useState<Advice[]>([]);

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
 }, []);

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
      setArticles, setTips, setAdvice,
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
