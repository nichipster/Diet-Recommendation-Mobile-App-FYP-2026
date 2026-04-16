import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'active' | 'archived';

type ChatItem = {
  id: string;
  name: string;
  last: string;
  time: string;
  archived: boolean;
  unreadCount?: number;
};

// Dummy Data
const INITIAL_CHATS: ChatItem[] = [
  {
    id: '1',
    name: 'Sarah Tan',
    last: 'Can we discuss my meal plan?',
    time: '09:02',
    archived: false,
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'John Lee',
    last: 'I want to start a consultation',
    time: '10:01',
    archived: false,
    unreadCount: 3,
  },
  {
    id: '3',
    name: 'Alicia Ng',
    last: 'Appreciate your help',
    time: '12 Apr',
    archived: true,
    unreadCount: 0,
  },
];

export default function Consultations({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('active');
  const [chats, setChats] = useState<ChatItem[]>(INITIAL_CHATS);
  const router = useRouter();

  /** Filter chats */
  const filteredChats = chats.filter(chat =>
    tab === 'active' ? !chat.archived : chat.archived
  );

  const getCount = (type: Tab) => {
    return chats.filter(c =>
      type === 'active' ? !c.archived : c.archived
    ).length;
  };

  /** Mark chat as read */
  const markAsRead = (id: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === id
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );
  };

  const renderRow = (item: ChatItem) => {
    const isUnread = (item.unreadCount ?? 0) > 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.row,
          isUnread && { backgroundColor: '#ecfdf5' }
        ]}
        onPress={() => {
          markAsRead(item.id); // ✅ mark read locally

          router.push({
            pathname: '/chat/[id]',
            params: { id: item.id, name: item.name }
          });
        }}
      >
        {/* LEFT */}
        <View style={styles.rowLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0)}
            </Text>
          </View>

          <View style={{ maxWidth: '75%' }}>
            <Text style={[styles.name, isUnread && { fontWeight: '700' }]}>
              {item.name}
            </Text>

            <Text
              style={[
                styles.sub,
                isUnread && { fontWeight: '600', color: '#111' }
              ]}
              numberOfLines={1}
            >
              {item.last}
            </Text>
          </View>
        </View>

        {/* RIGHT */}
        <View style={styles.rowRight}>
          <Text style={styles.time}>{item.time}</Text>

          {isUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount}
              </Text>
            </View>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color="#9ca3af"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Consultations</Text>
        <Text style={styles.subtitle}>
          Manage client conversations
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {(['active', 'archived'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === t && styles.tabTextActive
              ]}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)} ({getCount(t)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LIST */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {filteredChats.length === 0 ? (
          <Text style={styles.empty}>No conversations</Text>
        ) : (
          filteredChats.map(renderRow)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },

  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb'
  },

  backText: {
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 6
  },

  title: {
    fontSize: 18,
    fontWeight: '700'
  },

  subtitle: {
    fontSize: 12,
    color: '#6b7280'
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8
  },

  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e5e7eb'
  },

  tabActive: {
    backgroundColor: '#10b981'
  },

  tabText: {
    fontSize: 12,
    color: '#374151'
  },

  tabTextActive: {
    color: '#fff',
    fontWeight: '600'
  },

  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center'
  },

  avatarText: {
    color: '#fff',
    fontWeight: '700'
  },

  name: {
    fontSize: 14,
    fontWeight: '600'
  },

  sub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },

  rowRight: {
    alignItems: 'flex-end',
    gap: 6
  },

  time: {
    fontSize: 11,
    color: '#9ca3af'
  },

  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9ca3af'
  },
  
  badge: {
  backgroundColor: '#10b981',
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 6
},

badgeText: {
  color: '#fff',
  fontSize: 11,
  fontWeight: '700'
}
});