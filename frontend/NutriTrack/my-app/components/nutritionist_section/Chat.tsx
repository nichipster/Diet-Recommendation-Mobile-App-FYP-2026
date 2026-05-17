import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChats } from '../../context/ChatContext';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';

export default function Chat() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();

  const {
    chats,
    sendMessage,
    archiveChat,
    unarchiveChat,
    markChatAsRead,
    reportUser
  } = useChats();

  const chatId = Array.isArray(id) ? id[0] : id;
  const chat = chats.find(c => c.id === chatId);

  const [input, setInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const { user } = useUser();

  /** Track keyboard height — only shifts input bar and FlatList padding, not the whole page */
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /** mark read */
  useEffect(() => {
    if (!chatId) return;
    const timeout = setTimeout(() => {
      markChatAsRead(chatId);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [chatId]);

  if (!chat) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text>Chat not found</Text>
      </SafeAreaView>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(chatId, input);
    setInput('');
  };

  const handleArchiveToggle = () => {
    chat.archived ? unarchiveChat(chatId) : archiveChat(chatId);
    router.back();
  };

  const handleReport = () => {
    Alert.alert(
      'Report User',
      `Report ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            reportUser(chatId);
            Alert.alert('Reported', 'User has been reported.');
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: any) => {
    const isMe = item.sender === 'me';
    const isUnread = !isMe && !item.read;

    return (
      <View style={[styles.row, isMe ? styles.right : styles.left]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.clientBubble]}>
          <Text style={[styles.text, isMe && styles.myText, isUnread && styles.unreadText]}>
            {item.text}
          </Text>
          {isUnread && !isMe && <View style={styles.dot} />}
          <Text style={[styles.time, isMe && styles.myText]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{name}</Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleReport}>
              <Text style={{ color: '#f59e0b' }}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleArchiveToggle}>
              <Text style={styles.archive}>
                {chat.archived ? 'Unarchive' : 'Archive'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CHAT — only bottom padding grows when keyboard opens, page stays still */}
        <FlatList
          ref={flatListRef}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: keyboardHeight + 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Typing */}
        {chat.isTyping && (
          <Text style={styles.typing}>{name} is typing...</Text>
        )}

        {/* Archived label */}
        {chat.archived && (
          <Text style={styles.archivedLabel}>This chat is archived</Text>
        )}

        {/* INPUT — only this bar lifts, nothing else moves */}
        <View style={[styles.inputRow, { marginBottom: keyboardHeight }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
          <TouchableOpacity onPress={handleSend}>
            <Text style={[styles.send, !input.trim() && { opacity: 0.5 }]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },

  header: {
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb'
  },

  back: { color: '#10b981' },
  title: { fontWeight: '700' },
  archive: { color: '#ef4444' },

  row: { marginBottom: 10, flexDirection: 'row' },
  right: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },

  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: '#10b981' },
  clientBubble: { backgroundColor: '#e5e7eb' },

  text: { fontSize: 14 },
  myText: { color: '#fff' },
  time: { fontSize: 10, opacity: 0.7 },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginTop: 4,
  },

  unreadText: { fontWeight: '700', color: '#111827' },

  inputRow: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },

  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  send: {
    marginLeft: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 10,
  },

  typing: { paddingHorizontal: 16, fontStyle: 'italic', color: '#6b7280' },
  archivedLabel: { textAlign: 'center', color: '#6b7280', marginBottom: 5 },
});
