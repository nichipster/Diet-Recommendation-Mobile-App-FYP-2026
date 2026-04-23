import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Modal
} from 'react-native';

type TabType = 'articles' | 'tips' | 'advice';

import { useContent } from '../../context/ContentContext';

export default function NutritionContentPremium({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const { articles, tips, advice, incrementArticleView, incrementTipView } = useContent();

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
        {(['articles', 'tips', 'advice'] as TabType[]).map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
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
            {sorted.map(item => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.preview}>{item.preview}</Text>
                <TouchableOpacity 
                onPress={() => {
                 incrementArticleView(item.id);
                 setSelectedArticle(item);
                }}>
                  <Text style={{ color: '#10b981', marginTop: 8 }}>Read more</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {activeTab === 'tips' && tips.map(item => (
          <View key={item.id} style={styles.tipCard}>
            <Text style={styles.tipHeading}>Nutritional Tip</Text>
            <Text style={styles.tipText}>{item.text}</Text>
            <Text style={styles.authorSmall}>By {item.author}</Text>
          </View>
        ))}

        {activeTab === 'advice' && advice.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={{ color: '#6b7280' }}>{item.desc}</Text>
            <Text style={styles.authorSmall}>By {item.author}</Text>
          </View>
        ))}
      </ScrollView>

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
});