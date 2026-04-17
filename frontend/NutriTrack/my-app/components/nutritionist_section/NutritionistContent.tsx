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

type TabType = 'articles' | 'tips' | 'advice';
type ScreenType = 'main' | 'create';

type Props = {
  onBack: () => void;
  canEdit: boolean;
};

export default function NutritionContent({ onBack, canEdit=true }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [modalVisible, setModalVisible] = useState(false);

  const [screen, setScreen] = useState<ScreenType>('main');
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Dummy DATA (for now, later connect to backend)
 const [articles, setArticles] = useState([
  {
    id: '1',
    title: 'Understanding Halal Diet',
    preview: 'Learn what foods are allowed...',
    content: 'A halal diet follows Islamic dietary laws, ensuring that food is prepared and consumed in a permissible way. This includes avoiding pork, alcohol, and improperly slaughtered animals. Halal food is also associated with cleanliness and ethical sourcing. Many people choose halal not just for religious reasons, but also for quality assurance. Understanding these principles helps individuals make more informed dietary choices.',
    date: 'Sun, 12 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Diet'
  },
  {
    id: '2',
    title: 'Benefits of Drinking Water',
    preview: 'Why hydration matters daily...',
    content: 'Staying hydrated is essential for maintaining overall health and energy levels. Water supports digestion, circulation, and temperature regulation. Drinking enough water can also improve focus and reduce fatigue. Many people confuse thirst with hunger, leading to unnecessary snacking. Making hydration a habit can significantly improve daily well-being.',
    date: 'Mon, 13 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Hydration'
  },
  {
    id: '3',
    title: 'Balanced Diet Basics',
    preview: 'What makes a balanced meal...',
    content: 'A balanced diet includes a mix of carbohydrates, proteins, fats, vitamins, and minerals. Each nutrient plays a role in keeping the body functioning properly. Portion control is just as important as food choice. Eating a variety of foods ensures you get all essential nutrients. Consistency in balanced eating leads to long-term health benefits.',
    date: 'Tue, 14 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Education'
  },
  {
    id: '4',
    title: 'Healthy Snacking Habits',
    preview: 'Snack smarter, not more...',
    content: 'Snacking can be part of a healthy diet if done correctly. Choosing whole foods like fruits, nuts, or yogurt is better than processed snacks. Timing your snacks helps maintain energy throughout the day. Avoid eating out of boredom or stress. Smart snacking can prevent overeating during main meals.',
    date: 'Wed, 15 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Habits'
  },
  {
    id: '5',
    title: 'Understanding Food Labels',
    preview: 'Learn how to read nutrition labels...',
    content: 'Food labels provide important information about what you are consuming. Paying attention to serving size helps avoid overeating. Ingredients are listed in order of quantity, so the first few matter most. Watch out for hidden sugars and unhealthy fats. Understanding labels helps you make healthier choices at the store.',
    date: 'Thu, 16 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Education'
  },
  {
    id: '6',
    title: 'Importance of Breakfast',
    preview: 'Start your day right...',
    content: 'Breakfast is often called the most important meal of the day. It kickstarts your metabolism and provides energy for daily activities. Skipping breakfast may lead to overeating later. A good breakfast includes protein, fiber, and healthy fats. Building this habit supports better concentration and mood.',
    date: 'Fri, 17 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Education'
  },
  {
    id: '7',
    title: 'Reducing Sugar Intake',
    preview: 'Cutting sugar for better health...',
    content: 'Excess sugar consumption is linked to various health issues. Reducing sugary drinks is one of the easiest ways to cut sugar. Natural sugars from fruits are a better alternative. Reading labels helps identify hidden sugars in packaged foods. Gradual reduction is more sustainable than cutting it out completely.',
    date: 'Sat, 18 Apr 2026',
    author: 'Dr. Aisha',
    category: 'Education'
  }
]);

 const [tips, setTips] = useState([
  { id: '1', text: '💡 Drink water before meals to reduce overeating', author: 'Dr. Aisha' },
  { id: '2', text: '💡 Add more vegetables to every meal for better nutrition', author: 'Dr. Aisha' },
  { id: '3', text: '💡 Avoid sugary drinks and switch to water or tea', author: 'Dr. Aisha' },
  { id: '4', text: '💡 Eat slowly to help your body recognize fullness', author: 'Dr. Aisha' },
  { id: '5', text: '💡 Include protein in every meal to stay full longer', author: 'Dr. Aisha' },
  { id: '6', text: '💡 Plan your meals ahead to avoid unhealthy choices', author: 'Dr. Aisha' },
  { id: '7', text: '💡 Choose whole foods over processed snacks whenever possible', author: 'Dr. Aisha' },
]);

  const [advice, setAdvice] = useState([
  { id: '1', title: 'Increase Protein Intake', desc: 'Eat 20–30g protein per meal', author: 'Dr. Aisha' },
  { id: '2', title: 'Stay Hydrated Daily', desc: 'Aim for at least 6–8 glasses of water', author: 'Dr. Aisha' },
  { id: '3', title: 'Control Portion Sizes', desc: 'Use smaller plates to avoid overeating', author: 'Dr. Aisha' },
  { id: '4', title: 'Limit Processed Foods', desc: 'Choose fresh, whole foods when possible', author: 'Dr. Aisha' },
  { id: '5', title: 'Eat More Fiber', desc: 'Include fruits, vegetables, and whole grains', author: 'Dr. Aisha' },
  { id: '6', title: 'Reduce Sugar Intake', desc: 'Cut down on sweets and sugary drinks', author: 'Dr. Aisha' },
  { id: '7', title: 'Maintain Regular Meals', desc: 'Avoid skipping meals to keep energy stable', author: 'Dr. Aisha' },
]);

  // DELETE
  const handleDelete = (id: string, type: CreateType) => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (type === 'article') setArticles(p => p.filter(i => i.id !== id));
          if (type === 'tip') setTips(p => p.filter(i => i.id !== id));
          if (type === 'advice') setAdvice(p => p.filter(i => i.id !== id));
        }
      }
    ]);
  };

  const handleEdit = (item: any, type: CreateType) => {
    setEditingItem(item);
    setCreateType(type);
    setScreen('create');
  };

  const handleCreate = (item: any, type: CreateType) => {
    if (type === 'article') setArticles(p => [item, ...p]);
    if (type === 'tip') setTips(p => [item, ...p]);
    if (type === 'advice') setAdvice(p => [item, ...p]);
  };

  const filteredArticles = articles.filter(item => {
  const matchesSearch =
    item.title.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesCategory =
    selectedCategory === 'All' || item.category === selectedCategory;

  return matchesSearch && matchesCategory;
});

   const sortedArticles = [...filteredArticles].sort((a, b) => {
   if (sortBy === 'newest')
    return new Date(b.date).getTime() - new Date(a.date).getTime();

   if (sortBy === 'oldest')
    return new Date(a.date).getTime() - new Date(b.date).getTime();

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
            if (createType === 'article') setArticles(p => p.map(i => i.id === item.id ? item : i));
            if (createType === 'tip') setTips(p => p.map(i => i.id === item.id ? item : i));
            if (createType === 'advice') setAdvice(p => p.map(i => i.id === item.id ? item : i));
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

      {activeTab === 'articles' && (
  <>
    {/* SEARCH BAR */}
    <TextInput
      placeholder="Search articles..."
      value={searchQuery}
      onChangeText={setSearchQuery}
      style={styles.input}
    />

    {/* CATEGORY FILTER */}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 10 }}
    >
      {['All', 'Diet', 'Hydration', 'Habits', 'Education'].map(cat => (
        <TouchableOpacity
          key={cat}
          onPress={() => setSelectedCategory(cat)}
          style={[
            styles.chip,
            selectedCategory === cat && styles.chipActive
          ]}
        >
          <Text
            style={
              selectedCategory === cat
                ? styles.chipTextActive
                : styles.chipText
            }
          >
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    {/* SORT BUTTONS */}
    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
      {['newest', 'oldest'].map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => setSortBy(s)}
          style={[
            styles.sortBtn,
            sortBy === s && styles.sortBtnActive
          ]}
        >
          <Text
            style={
              sortBy === s
                ? styles.sortTextActive
                : styles.sortText
            }
          >
            {s.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </>
)}

       {/* ARTICLES */} 
          {activeTab === 'articles' && sortedArticles.map(item => (
         <View key={item.id} style={styles.card}>

         {/* TOP ROW (NOT clickable) */}
        <View style={styles.rowBetween}>
          <Text style={styles.titleText}>{item.title}</Text>
        <View style={styles.actions}>
         {canEdit && (
           <>
          <Text onPress={() => handleEdit(item, 'article')}>✏️</Text>
          <Text onPress={() => handleDelete(item.id, 'article')}>🗑️</Text>
          </>
      )}
        </View>
      </View>

        {/* CLICKABLE CONTENT */}
      <TouchableOpacity onPress={() => setSelectedArticle(item)}>
       <Text style={styles.preview}>{item.preview}</Text>
       <Text style={styles.meta}>{item.date}</Text>
       <Text style={styles.author}>By {item.author}</Text>
      </TouchableOpacity>
     </View>
 ))}

        {/* TIPS */}
        {activeTab === 'tips' && tips.map((item, index) => (
          <View key={item.id} style={styles.tipCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.tipHeading}>Nutritional Tip</Text>
              <View style={styles.actions}>
                {canEdit && (
                  <>
                 <Text onPress={() => handleEdit(item, 'tip')}>✏️</Text>
                 <Text onPress={() => handleDelete(item.id, 'tip')}>🗑️</Text>
               </>
            )}
              </View>
            </View>

            <Text style={styles.tipText}>{item.text}</Text>
            <Text style={styles.authorSmall}>By {item.author}</Text>
          </View>
        ))}

        {/* ADVICE */}
        {activeTab === 'advice' && advice.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.titleText}>{item.title}</Text>
              <View style={styles.actions}>
              {canEdit && (
                 <>
               <Text onPress={() => handleEdit(item, 'advice')}>✏️</Text>
               <Text onPress={() => handleDelete(item.id, 'advice')}>🗑️</Text>
              </>
             )}
             </View>
            </View>

            <Text style={styles.preview}>{item.desc}</Text>
            <Text style={styles.author}>By {item.author}</Text>
          </View>
        ))}

      </ScrollView>

      {/* FAB */}
      {canEdit && (
         <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Text style={{ color: '#fff', fontSize: 24 }}>＋</Text>
        </TouchableOpacity>
       )}

      {/* MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Which content do you want to add?
            </Text>

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

      <Modal visible={!!selectedArticle} animationType="slide" transparent>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>

    {/* FAKE TOP SPACE (pushes modal down) */}
    <View style={{ flex: 1 }} />

    {/* SHEET */}
    <View
      style={{
        height: '80%',  
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden'
      }}
    >

      {/* FAKE HEADER */}
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

      {/* CONTENT */}
      <View style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16
          }}
        >
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

  titleText: { fontWeight: '700' },
  preview: { color: '#6b7280', marginTop: 4 },

  meta: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  author: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 4 },
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

chipActive: {
  backgroundColor: '#10b981'
},

chipText: {
  color: '#374151'
},

chipTextActive: {
  color: '#fff',
  fontWeight: '600'
},

sortBtn: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  backgroundColor: '#e5e7eb',
  borderRadius: 8,
  marginRight: 8
},

sortBtnActive: {
  backgroundColor: '#3b82f6'
},

sortText: {
  color: '#374151',
  fontSize: 12
},

sortTextActive: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600'
},
});
