import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { GoalsProvider } from '../context/GoalsContext';
import { UserProvider } from '../context/UserContext';
import { ChatProvider } from '../context/ChatContext';
import { BookingProvider } from '../context/BookingContext';
import { AnalysisProvider } from '../context/AnalysisContext';
import { ContentProvider } from '../context/ContentContext';

export const unstable_settings = {
  initialRouteName: 'loginmain',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
   <ContentProvider>
    <UserProvider>
      <BookingProvider>
       <GoalsProvider>
        <ChatProvider>
          <AnalysisProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack initialRouteName='loginmain'>
            <Stack.Screen name="loginmain" options={{ headerShown: false }} />
            <Stack.Screen name="loginsec" options={{ headerShown: false }} />
            <Stack.Screen name="ca" options={{ headerShown: false }} />
            <Stack.Screen name="fp" options={{ headerShown: false }} />
            <Stack.Screen name="survey" options={{ headerShown: false }} />
            <Stack.Screen name="verify" options={{ headerShown: false }} />
            <Stack.Screen name="nutritionist" options={{ headerShown: false }} />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#ffffff' },
              }}
            />
            <Stack.Screen name="recommendmeal" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        </AnalysisProvider>
       </ChatProvider>
      </GoalsProvider>
      </BookingProvider>
    </UserProvider>
   </ContentProvider>
  );
}