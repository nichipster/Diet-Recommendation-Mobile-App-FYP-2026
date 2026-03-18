import React from 'react';
import { ScrollView, StyleSheet, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DashboardHeader from '../../components/second_section/dashboard/DashboardHeader';
import CalorieCard from '../../components/second_section/dashboard/CalorieCard';
import QuickActions from '../../components/second_section/dashboard/MealTimeline';
import MealTimeline from '../../components/second_section/dashboard/QuickActions';
import WaterIntake from '../../components/second_section/dashboard/WaterIntake';

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