import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { GoalsProvider } from './context/GoalsContext';
import { UserProvider } from './context/UserContext';

export const unstable_settings = {
  initialRouteName: 'loginmain',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <UserProvider>
      <GoalsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack initialRouteName='loginmain'>
            <Stack.Screen name="loginmain" options={{ headerShown: false }} />
            <Stack.Screen name="loginsec" options={{ headerShown: false }} />
            <Stack.Screen name="ca" options={{ headerShown: false }} />
            <Stack.Screen name="fp" options={{ headerShown: false }} />
            <Stack.Screen name="survey" options={{ headerShown: false }} />
            <Stack.Screen name="verify" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="recommendmeal" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </GoalsProvider>
    </UserProvider>
  );
}