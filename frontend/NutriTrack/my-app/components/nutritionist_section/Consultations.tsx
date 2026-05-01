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
import { useChats } from '../../context/ChatContext';
import { useBookings } from '@/context/BookingContext';
import { useUser } from '@/context/UserContext';

type Tab = 'active' | 'archived';

export default function Consultations({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('active');
  const { chats, markChatAsRead } = useChats();
  const router = useRouter();

  const { bookings } = useBookings();
  const { user } = useUser();

const nutritionistName = user?.firstName && user?.lastName
? `${user.firstName} ${user.lastName}`
: '';

// Get client names who have confirmed bookings with this nutritionist
const myClientNames = new Set(
  bookings
    .filter(b => b.nutritionist.includes(nutritionistName) && b.status === 'confirmed')
    .map(b => b.user)
);

// Only show chats belonging to this nutritionist's clients
const myChats = chats;

console.log('nutritionistName:', nutritionistName);
console.log('myClientNames:', [...myClientNames]);
console.log('chats names:', chats.map(c => c.name));
console.log('myChats:', myChats.length);

  // Map chats to display items
  const chatItems = myChats.map(c => ({
    id: c.id,
    name: c.name,
    last: c.messages[c.messages.length - 1]?.text ?? '',
    time: c.messages[c.messages.length - 1]?.time ?? '',
    archived: c.archived,
    unreadCount: c.messages.filter(m => m.sender === 'client' && !m.read).length,
  }));

  const filteredChats = chatItems.filter(chat =>
    tab === 'active' ? !chat.archived : chat.archived
  );

  const getCount = (type: Tab) =>
    chatItems.filter(c => type === 'active' ? !c.archived : c.archived).length;

  const renderRow = (item: typeof chatItems[0]) => {
    const isUnread = (item.unreadCount ?? 0) > 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.row, isUnread && { backgroundColor: '#ecfdf5' }]}
        onPress={() => {
          markChatAsRead(item.id);
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
              style={[styles.sub, isUnread && { fontWeight: '600', color: '#111' }]}
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
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
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
        <Text style={styles.subtitle}>Manage client conversations</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {(['active', 'archived'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
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