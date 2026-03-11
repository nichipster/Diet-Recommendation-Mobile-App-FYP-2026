import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'loginmain',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName='loginmain'>
        <Stack.Screen name="loginmain" options={{ headerShown: false }} />
        <Stack.Screen name="loginsec" options={{ headerShown: false }} />
        <Stack.Screen name="ca" options={{ headerShown: false }} />
        <Stack.Screen name="fp" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}