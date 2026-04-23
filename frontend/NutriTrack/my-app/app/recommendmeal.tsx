import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import RecommendMeal from '../components/recommend_section/RecommendMeal';
import MyMealsScreen from '../components/recommend_section/CustomMealsScreen';

export default function RecommendMealPage() {
  const [activeTab, setActiveTab] = useState<'recommend' | 'mymeals'>('recommend');

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meals</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {/* Top tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommend' && styles.tabActive]}
          onPress={() => setActiveTab('recommend')}
        >
          <Text style={[styles.tabText, activeTab === 'recommend' && styles.tabTextActive]}>
            Recommend Meal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mymeals' && styles.tabActive]}
          onPress={() => setActiveTab('mymeals')}
        >
          <Text style={[styles.tabText, activeTab === 'mymeals' && styles.tabTextActive]}>
            Custom Meals
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pageContent}>
        {activeTab === 'recommend' ? (
          <RecommendMeal />
        ) : (
          <MyMealsScreen />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  safeArea: { backgroundColor: '#10b981' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#10b981',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backArrow: { fontSize: 30, color: '#fff', fontWeight: '300', lineHeight: 32 },
  backText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '700', color: '#fff', marginRight: 60,
  },
  headerSpacer: { width: 60 },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#10b981' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#10b981' },
  pageContent: { flex: 1 },
});