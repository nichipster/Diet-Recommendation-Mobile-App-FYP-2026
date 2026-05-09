import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RecommendMeal from '../../components/recommend_section/RecommendMeal';
import MyMealsScreen from '../../components/recommend_section/CustomMealsScreen';

interface Props {
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function RecommendMealPage({ showBackButton = false, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'recommend' | 'mymeals'>('recommend');
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* Green header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {showBackButton && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>Home</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>What should I eat?</Text>
        </View>
        <Text style={styles.headerSub}>
          Personalise your daily meal suggestions
        </Text>

        {/* Tab switcher inside header */}
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
      </View>

      {/* Page content */}
      <View style={styles.pageContent}>
        {activeTab === 'recommend' ? (
          <RecommendMeal
            hideHeader
            disclaimerVisible={showDisclaimer}
            onDismissDisclaimer={() => setShowDisclaimer(false)}
          />
        ) : (
          <MyMealsScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  backArrow: { fontSize: 30, color: '#fff', fontWeight: '300', lineHeight: 32 },
  backText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  tabTextActive: { color: '#10b981' },
  pageContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
