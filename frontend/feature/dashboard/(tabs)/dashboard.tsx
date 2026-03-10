import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, StatusBar, View } from 'react-native';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import CalorieCard from '@/components/dashboard/CalorieCard';
import QuickActions from '@/components/dashboard/QuickActions';
import MealTimeline from '@/components/dashboard/MealTimeline';
import WaterIntake from '@/components/dashboard/WaterIntake';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <DashboardHeader />
        <View style={styles.contentWrapper}>
          <CalorieCard />
          <QuickActions />
          <MealTimeline />
          <WaterIntake />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginTop: -64,
  },
});