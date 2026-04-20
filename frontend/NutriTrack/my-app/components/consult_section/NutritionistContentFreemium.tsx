import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Modal
} from 'react-native';
import UpgradePromptModal from '../upgrade_lock/UpgradePromptModal';

type TabType = 'articles' | 'tips';

export default function NutritionContentFreemium({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [unlockedArticles, setUnlockedArticles] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const triggerUpgrade = (feature?: string) => {
    setUpgradeFeature(feature);
    setShowUpgrade(true);
  };

  const articles = [
    { id: '1', title: 'Understanding Halal Diet', preview: 'Learn what foods are allowed...', content: 'A halal diet follows Islamic dietary laws, ensuring that food is prepared and consumed in a permissible way. This includes avoiding pork, alcohol, and improperly slaughtered animals. Halal food is also associated with cleanliness and ethical sourcing. Many people choose halal not just for religious reasons, but also for quality assurance. Understanding these principles helps individuals make more informed dietary choices.', date: 'Sun, 12 Apr 2026', author: 'Dr. Aisha', category: 'Diet' },
    { id: '2', title: 'Benefits of Drinking Water', preview: 'Why hydration matters daily...', content: 'Staying hydrated is essential for maintaining overall health and energy levels. Water supports digestion, circulation, and temperature regulation. Drinking enough water can also improve focus and reduce fatigue. Many people confuse thirst with hunger, leading to unnecessary snacking. Making hydration a habit can significantly improve daily well-being.', date: 'Mon, 13 Apr 2026', author: 'Dr. Aisha', category: 'Hydration' },
    { id: '3', title: 'Balanced Diet Basics', preview: 'What makes a balanced meal...', content: 'A balanced diet includes a mix of carbohydrates, proteins, fats, vitamins, and minerals. Each nutrient plays a role in keeping the body functioning properly. Portion control is just as important as food choice. Eating a variety of foods ensures you get all essential nutrients. Consistency in balanced eating leads to long-term health benefits.', date: 'Tue, 14 Apr 2026', author: 'Dr. Aisha', category: 'Education' },
    { id: '4', title: 'Healthy Snacking Habits', preview: 'Snack smarter, not more...', content: 'Snacking can be part of a healthy diet if done correctly. Choosing whole foods like fruits, nuts, or yogurt is better than processed snacks. Timing your snacks helps maintain energy throughout the day. Avoid eating out of boredom or stress. Smart snacking can prevent overeating during main meals.', date: 'Wed, 15 Apr 2026', author: 'Dr. Aisha', category: 'Habits' },
    { id: '5', title: 'Understanding Food Labels', preview: 'Learn how to read nutrition labels...', content: 'Food labels provide important information about what you are consuming. Paying attention to serving size helps avoid overeating. Ingredients are listed in order of quantity, so the first few matter most. Watch out for hidden sugars and unhealthy fats. Understanding labels helps you make healthier choices at the store.', date: 'Thu, 16 Apr 2026', author: 'Dr. Aisha', category: 'Education' },
    { id: '6', title: 'Importance of Breakfast', preview: 'Start your day right...', content: 'Breakfast is often called the most important meal of the day. It kickstarts your metabolism and provides energy for daily activities. Skipping breakfast may lead to overeating later. A good breakfast includes protein, fiber, and healthy fats. Building this habit supports better concentration and mood.', date: 'Fri, 17 Apr 2026', author: 'Dr. Aisha', category: 'Education' },
    { id: '7', title: 'Reducing Sugar Intake', preview: 'Cutting sugar for better health...', content: 'Excess sugar consumption is linked to various health issues. Reducing sugary drinks is one of the easiest ways to cut sugar. Natural sugars from fruits are a better alternative. Reading labels helps identify hidden sugars in packaged foods. Gradual reduction is more sustainable than cutting it out completely.', date: 'Sat, 18 Apr 2026', author: 'Dr. Aisha', category: 'Education' },
  ];

  const tips = [
    { id: '1', text: '💡 Drink water before meals to reduce overeating', author: 'Dr. Aisha' },
    { id: '2', text: '💡 Add more vegetables to every meal for better nutrition', author: 'Dr. Aisha' },
    { id: '3', text: '💡 Avoid sugary drinks and switch to water or tea', author: 'Dr. Aisha' },
    { id: '4', text: '💡 Eat slowly to help your body recognize fullness', author: 'Dr. Aisha' },
    { id: '5', text: '💡 Include protein in every meal to stay full longer', author: 'Dr. Aisha' },
    { id: '6', text: '💡 Plan your meals ahead to avoid unhealthy choices', author: 'Dr. Aisha' },
    { id: '7', text: '💡 Choose whole foods over processed snacks whenever possible', author: 'Dr. Aisha' },
  ];

  const filtered = articles.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory === 'All' || item.category === selectedCategory)
  );

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'newest'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nutrition Library</Text>
      </View>

      <View style={styles.tabs}>
        {(['articles', 'tips'] as TabType[]).map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        {/* Advice tab locked */}
        <TouchableOpacity onPress={() => triggerUpgrade('Premium advice')}>
          <Text style={styles.tabText}>ADVICE 🔒</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {activeTab === 'articles' && (
          <>
            <TextInput
              placeholder="Search articles..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.input}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['All', 'Diet', 'Hydration', 'Habits', 'Education'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                >
                  <Text style={selectedCategory === cat ? styles.chipTextActive : styles.chipText}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginBottom: 24 }}>
              {['newest', 'oldest'].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSortBy(s)}
                  style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
                >
                  <Text style={sortBy === s ? styles.sortTextActive : styles.sortText}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {sorted.map(item => {
              const isUnlocked = unlockedArticles.includes(item.id);
              const isLocked = !isUnlocked && unlockedArticles.length >= 2;

              return (
                <View key={item.id} style={[styles.card, isLocked && { opacity: 0.5 }]}>
                  <Text style={styles.titleText}>{item.title} {isLocked && '🔒'}</Text>
                  <Text style={styles.preview}>{item.preview}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (isUnlocked || unlockedArticles.length < 2) {
                        if (!isUnlocked) setUnlockedArticles(prev => [...prev, item.id]);
                        setSelectedArticle(item);
                      } else {
                        triggerUpgrade('Full article access');
                      }
                    }}
                  >
                    <Text style={{ color: '#10b981', marginTop: 8 }}>Read more</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {sorted.length > 2 && (
              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={() => triggerUpgrade('Full article access')}
              >
                <Text style={styles.unlockBtnText}>🔒 Unlock All Articles — Upgrade to Premium</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {activeTab === 'tips' && tips.map(item => (
          <View key={item.id} style={styles.tipCard}>
            <Text style={styles.tipHeading}>Nutritional Tip</Text>
            <Text style={styles.tipText}>{item.text}</Text>
            <Text style={styles.authorSmall}>By {item.author}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Article modal */}
      <Modal visible={!!selectedArticle} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ flex: 1 }} />
          <View style={{ height: '80%', backgroundColor: '#f9fafb', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
            <View style={{ padding: 16, backgroundColor: '#fff' }}>
              <TouchableOpacity onPress={() => setSelectedArticle(null)}>
                <Text style={{ color: '#10b981', fontWeight: '600' }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>{selectedArticle?.title}</Text>
              <Text style={{ color: '#6b7280', marginTop: 4 }}>{selectedArticle?.date}</Text>
            </View>
            <View style={{ flex: 1, padding: 16 }}>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
                <ScrollView>
                  <Text style={{ fontSize: 16, lineHeight: 22 }}>{selectedArticle?.content}</Text>
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <UpgradePromptModal
        visible={showUpgrade}
        feature={upgradeFeature}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => setShowUpgrade(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, paddingTop: 8 },
  back: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  tabText: { color: '#6b7280' },
  tabActive: { color: '#10b981', fontWeight: '700' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  tipCard: { backgroundColor: '#ecfdf5', padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  titleText: { fontWeight: '700' },
  preview: { color: '#6b7280', marginTop: 4 },
  authorSmall: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  tipHeading: { fontWeight: '700', marginBottom: 6 },
  tipText: { color: '#065f46' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e5e7eb', borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: '#10b981' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#e5e7eb', borderRadius: 8, marginRight: 8 },
  sortBtnActive: { backgroundColor: '#3b82f6' },
  sortText: { color: '#374151', fontSize: 12 },
  sortTextActive: { color: '#fff', fontSize: 12, fontWeight: '600' },
  unlockBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  unlockBtnText: { color: '#fff', fontWeight: '700' },
});