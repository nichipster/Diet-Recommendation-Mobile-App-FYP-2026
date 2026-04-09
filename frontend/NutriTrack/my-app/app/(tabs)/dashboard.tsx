import React from 'react';
import { ScrollView, StyleSheet, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { scheduleDailyQuoteNotification } from '@/components/utils/notification';

import DashboardHeader from '../../components/dashboard_section/dashboard/DashboardHeader';
import CalorieCard from '../../components/dashboard_section/dashboard/CalorieCard';
import MealTimeLine from '../../components/dashboard_section/dashboard/MealTimeline';
import QuickActions from '../../components/dashboard_section/dashboard/QuickActions';
import WaterIntake from '../../components/dashboard_section/dashboard/WaterIntake';

export default function DashboardScreen() {
  useEffect(() => {
    scheduleDailyQuoteNotification();
  }, []);


  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      </SafeAreaView>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <DashboardHeader />
        <View style={styles.contentWrapper}>
          <CalorieCard />
          <MealTimeLine />
          <QuickActions />
          <WaterIntake />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  safeArea: {
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