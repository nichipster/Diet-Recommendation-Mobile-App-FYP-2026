import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, BackHandler, Alert } from 'react-native';
import { setupNotificationHandler } from '@/components/utils/notification';
import { usePromotion } from '@/hooks/usePromotions';
import PromotionModal from '@/components/promotion/PromotionModal';
import SubsciptionModal from '@/components/profile_section/profile/components/SubscriptionModal';
import { useRouter } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';

setupNotificationHandler;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { activePromotion, showModal, dismissPromotion, claimPromotion } = usePromotion();
  const [showSubscription, setShowSubscription] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // ── Reused from ProfileMenu.tsx ──────────────────────────────────────────
  const handleLogoutAndExit = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.log('Logout error:', e);
    } finally {
      await AsyncStorage.removeItem('token');
      BackHandler.exitApp(); // exit instead of redirecting to login
    }
  };

  // ── Back button interception ──────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Log Out & Exit',
        'Are you sure you want to log out and exit the app?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => null },
          {
            text: 'Log Out & Exit',
            style: 'destructive',
            onPress: handleLogoutAndExit,
          },
        ]
      );
      return true; // prevents default back behavior (going to login screen)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkProfile = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/loginmain');
        return;
      }

      const res = await fetch(`${API_URL}/profile/me`, {
        headers: getAuthHeadersWithToken(token),
      });

      if (!res.ok) {
        router.replace('/survey');
        return;
      }

      setReady(true);
    };

    checkProfile();
  }, []);

  if (!ready) return null;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#10b981',
          tabBarInactiveTintColor: '#9ca3af',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: () => (
            <View style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderTopWidth: 0,
            }} />
          ),
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: 'transparent',
            borderTopWidth: 0,
            paddingTop: 3,
            paddingBottom: 0,
            height: 100,
            elevation: 0,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarHideOnKeyboard: true,
        }}>
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} /> }} />
        <Tabs.Screen name="meal_logger" options={{ title: 'Meal Log', tabBarIcon: ({ color }) => <IconSymbol size={28} name="target" color={color} /> }} />
        <Tabs.Screen name="consult" options={{ title: 'Consult', tabBarIcon: ({ color }) => <IconSymbol size={28} name={"chat.fill" as any} color={color} /> }} />
        <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: ({ color }) => <IconSymbol size={28} name="target" color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} /> }} />
      </Tabs>

      {activePromotion && (
        <PromotionModal
          promotion={activePromotion}
          visible={showModal}
          onDismiss={dismissPromotion}
          onClaim={() => {
            claimPromotion();
            setShowSubscription(true);
          }}
        />
      )}
      <SubsciptionModal
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
        promoCode={activePromotion?.discountCode}
      />
    </>
  );
}