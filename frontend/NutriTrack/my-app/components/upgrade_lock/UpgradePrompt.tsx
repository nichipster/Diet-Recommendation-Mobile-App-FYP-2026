import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../context/UserContext';

const PROMPT_INTERVAL = 3; // show every 3 sessions

export function useUpgradePrompt() {
  const { isPremium } = useUser();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<string | undefined>(undefined);

  // ── Check if prompt should show this session ──────────────────────────
  const checkSessionPrompt = async () => {
    if (isPremium) return; // don't show for premium users

    try {
      const countStr = await AsyncStorage.getItem('session_count');
      const count = parseInt(countStr ?? '0') + 1;
      await AsyncStorage.setItem('session_count', String(count));

      if (count % PROMPT_INTERVAL === 0) {
        setShowPrompt(true);
      }
    } catch (e) {
      console.log('Session prompt error:', e);
    }
  };

  // ── Show prompt when user tries a premium feature ─────────────────────
  const promptForFeature = (featureName: string) => {
    if (isPremium) return false; // feature is allowed
    setPromptFeature(featureName);
    setShowPrompt(true);
    return true; // feature is blocked
  };

  const hidePrompt = () => {
    setShowPrompt(false);
    setPromptFeature(undefined);
  };

  return {
    showPrompt,
    promptFeature,
    checkSessionPrompt,
    promptForFeature,
    hidePrompt,
  };
}