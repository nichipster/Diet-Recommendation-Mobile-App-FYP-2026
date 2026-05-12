import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Alert
} from 'react-native';
import CreateContentScreen, { CreateType } from './CreateContentScreen';
import { useContent, Article, Tip, Advice } from '../../context/ContentContext';
import { useUser } from '@/context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '../../constants/api';

type TabType = 'articles' | 'tips' | 'advice';
type ScreenType = 'main' | 'create';

type Props = {
  onBack: () => void;
};

export default function NutritionistContent({ onBack }: Props) {
  const { user } = useUser();
  const nutritionistName = `${user.firstName} ${user.lastName}`;

  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [modalVisible, setModalVisible] = useState(false);

  const [screen, setScreen] = useState<ScreenType>('main');
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  
  const { articles, tips, advice, setArticles, setTips, setAdvice } = useContent();

  const myArticles = articles.filter(a => a.author.includes(nutritionistName));
  const myTips = tips.filter(t => t.author.includes(nutritionistName));
  const myAdvice = advice.filter(a => a.author.includes(nutritionistName));

// DELETE — removes from local state and calls backend DELETE /content/{id}
const handleDelete = (id: string, type: CreateType) => {
  Alert.alert('Delete Item', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        // Optimistic local removal
        if (type === 'article') setArticles(p => p.filter(i => i.id !== id));
        if (type === 'tip') setTips(p => p.filter(i => i.id !== id));
        if (type === 'advice') setAdvice(p => p.filter(i => i.id !== id));
        // Persist to backend
        try {
          const token = await AsyncStorage.getItem('token');
          await fetch(`${API_URL}/content/${id}`, {
            method: 'DELETE',
            headers: getAuthHeadersWithToken(token),
          });
        } catch (e) {
          console.log('handleDelete error:', e);
        }
      }
    }
  ]);
};

// EDIT
const handleEdit = (item: any, type: CreateType) => {
  setEditingItem(item);
  setCreateType(type);
  setScreen('create');
};

// CREATE
const handleCreate = async (item: any, type: CreateType) => {
  if (type === 'article') {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/content/articles`, {
        method: 'POST',
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({
          title: item.title,
          preview: item.preview,
          content: item.content,
          category: item.category,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(p => [data as Article, ...p]);
      }
    } catch (e) {
      console.log('createArticle error:', e);
    }
  }
  if (type === 'tip') {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/content/tips`, {
        method: 'POST',
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({ text: item.text }),
      });
      if (res.ok) {
        const data = await res.json();
        setTips(p => [data as Tip, ...p]);
      }
    } catch (e) {
      console.log('createTip error:', e);
    }
  }
  if (type === 'advice') {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/content/advice`, {
        method: 'POST',
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({ title: item.title, desc: item.desc }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdvice(p => [data as Advice, ...p]);
      }
    } catch (e) {
      console.log('createAdvice error:', e);
    }
  }
};

// FILTER & SORT ARTICLES
const filteredArticles = myArticles.filter(item => {
  const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
  return matchesSearch && matchesCategory;
});

const sortedArticles = [...filteredArticles].sort((a, b) => {
  if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
  if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
  return 0;
});

// CREATE SCREEN
if (screen === 'create' && createType) {
  return (
    <CreateContentScreen
      type={createType}
      existingItem={editingItem}
      onBack={() => {
        setScreen('main');
        setEditingItem(null);
      }}
      onCreate={(item) => {
        if (editingItem) {
          if (createType === 'article') setArticles (p => p.map(i => i.id === item.id ? item as Article : i));
          if (createType === 'tip') setTips(p => p.map(i => i.id === item.id ? item as Tip : i));
          if (createType === 'advice') setAdvice(p => p.map(i => i.id === item.id ? item as Advice : i));
        } else {
          handleCreate(item, createType);
        }
        setEditingItem(null);
      }}
    />
  );
}

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nutrition Content</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {['articles', 'tips', 'advice'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab as TabType)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* ARTICLES */}
        {activeTab === 'articles' && (
          <>
            {/* SEARCH */}
            <TextInput
              placeholder="Search articles..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />

            {/* CATEGORY CHIPS */}
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

            {/* SORT */}
            <View style={{ flexDirection: 'row', marginBottom: 24, marginTop: 24 }}>
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

            {/* ARTICLES LIST */}
            {sortedArticles.map(item => (
              <View key={item.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.titleText}>{item.title}</Text>
                  <View style={styles.actions}>
                    <Text onPress={() => handleEdit(item, 'article')}>✏️</Text>
                    <Text onPress={() => handleDelete(item.id, 'article')}>🗑️</Text>
                  </View>
                </View>
                <Text style={styles.preview}>{item.preview}</Text>
                <TouchableOpacity onPress={() => setSelectedArticle(item)}>
                  <Text style={{ color: '#10b981', marginTop: 8 }}>Read more</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* TIPS */}
        {activeTab === 'tips' && myTips.map(item => (
          <View key={item.id} style={styles.tipCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.tipHeading}>Nutritional Tip</Text>
              <View style={styles.actions}>
                <Text onPress={() => handleEdit(item, 'tip')}>✏️</Text>
                <Text onPress={() => handleDelete(item.id, 'tip')}>🗑️</Text>
              </View>
            </View>
            <Text style={styles.tipText}>{item.text}</Text>
            <Text style={styles.authorSmall}>By {item.author}</Text>
          </View>
        ))}

        {/* ADVICE */}
        {activeTab === 'advice' && myAdvice.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.titleText}>{item.title}</Text>
              <View style={styles.actions}>
                <Text onPress={() => handleEdit(item, 'advice')}>✏️</Text>
                <Text onPress={() => handleDelete(item.id, 'advice')}>🗑️</Text>
              </View>
            </View>
            <Text style={{ color: '#6b7280' }}>{item.desc}</Text>
            <Text style={styles.authorSmall}>By {item.author}</Text>
          </View>
        ))}

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={{ color: '#fff', fontSize: 24 }}>＋</Text>
      </TouchableOpacity>

      {/* ADD MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Which content do you want to add?</Text>
            {['article', 'tip', 'advice'].map(type => (
              <TouchableOpacity
                key={type}
                style={styles.modalBtn}
                onPress={() => {
                  setEditingItem(null);
                  setCreateType(type as CreateType);
                  setScreen('create');
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalText}>{type.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ARTICLE DETAIL MODAL */}
      <Modal visible={!!selectedArticle} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ flex: 1 }} />
          <View style={{
            height: '80%',
            backgroundColor: '#f9fafb',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden'
          }}>
            <View style={{ padding: 16, backgroundColor: '#fff' }}>
              <TouchableOpacity onPress={() => setSelectedArticle(null)}>
                <Text style={{ color: '#10b981', fontWeight: '600' }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>
                {selectedArticle?.title}
              </Text>
              <Text style={{ color: '#6b7280', marginTop: 4 }}>
                {selectedArticle?.date}
              </Text>
            </View>
            <View style={{ flex: 1, padding: 16 }}>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ fontSize: 16, lineHeight: 22 }}>
                    {selectedArticle?.content}
                  </Text>
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

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6'
  },

  tipCard: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981'
  },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 12 },

  titleText: { fontWeight: '700', flex: 1, marginRight: 8 },
  preview: { color: '#6b7280', marginTop: 4 },
  authorSmall: { fontSize: 11, color: '#6b7280', marginTop: 4 },

  tipHeading: { fontWeight: '700', marginBottom: 6 },
  tipText: { color: '#065f46' },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '80%' },
  modalTitle: { fontWeight: '700', marginBottom: 12, fontSize: 16 },
  modalBtn: { paddingVertical: 12 },
  modalText: { fontSize: 16 },

  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    marginRight: 8
  },
  chipActive: { backgroundColor: '#10b981' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginRight: 8
  },
  sortBtnActive: { backgroundColor: '#3b82f6' },
  sortText: { color: '#374151', fontSize: 12 },
  sortTextActive: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
