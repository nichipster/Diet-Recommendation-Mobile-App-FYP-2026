import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';
import { useUser } from './UserContext';

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'recipient';
  senderId: string;
  time: string;
  read: boolean;
};

type Chat = {
  id: string;
  name: string;
  messages: Message[];
  archived: boolean;
  isTyping?: boolean;
  reported?: boolean;
  reportCount?: number;
};

type ChatContextType = {
  chats: Chat[];
  sendMessage: (chatId: string, text: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  reportUser: (chatId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getTime = () =>
  new Date().toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Singapore',
  });

  // FALLBACK DATA — shown while backend is not yet connected.
  // TODO (Backend): Replace with GET /chats
  // Returns: array of {
  //   id: string,
  //   name: string,
  //   archived: boolean,
  //   isTyping: boolean,
  //   reported: boolean,
  //   reportCount: number,
  //   messages: array of {
  //     id: string, text: string,
  //     sender: 'me' | 'client',
  //     time: string, read: boolean
  //   }
  // }


const INITIAL_CHATS: Chat[] = [
  {
    id: '1',
    name: 'Sarah Gan',
    archived: false,
    isTyping: false,
    reported: false,
    reportCount: 0,
    messages: [
      { id: '1', text: 'Hi Sarah!', sender: 'me', senderId: '', time: '09:00', read: false },
      { id: '2', text: 'Can we discuss my meal plan?', sender: 'recipient', senderId: '', time: '09:02', read: false }
    ]
  },
  {
    id: '2',
    name: 'Marcus Gim',
    archived: false,
    isTyping: false,
    reported: false,
    reportCount: 0,
    messages: [
      { id: '1', text: 'Hey coach!', sender: 'recipient', senderId: '', time: '10:15', read: false },
      { id: '2', text: 'How many calories today?', sender: 'recipient', senderId: '', time: '10:16', read: false },
      { id: '3', text: 'Around 2,200 👍', sender: 'me', senderId: '', time: '10:20', read: true }
    ]
  },
  {
    id: '3',
    name: 'Priya Gair',
    archived: true,
    isTyping: false,
    reported: false,
    reportCount: 0,
    messages: [
      { id: '1', text: 'Happy Chinese New Year!', sender: 'recipient', senderId: '', time: '10:16', read: false }
    ]
  }
];

const POLL_INTERVAL = 3000; // 3 seconds

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const { user } = useUser();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchChats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/chats`, {
        headers: getAuthHeadersWithToken(token),
      });

      if (res.ok) {
        const data = await res.json();
        setChats(prev =>
          data.map((serverChat: Chat) => {
            const local = prev.find(c => c.id === serverChat.id);
            if (!local) return serverChat;

            // Keep any local messages not yet confirmed by server
            const serverIds = new Set(serverChat.messages.map((m: Message) => m.id));
            const pendingLocal = local.messages.filter(m => !serverIds.has(m.id));

            return {
              ...serverChat,
              messages: [...serverChat.messages, ...pendingLocal],
            };
          })
        );
      }
    } catch (e) {
      console.log('fetchChats error:', e);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(fetchChats, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setChats([]);
      stopPolling();
      return;
    }

    fetchChats();
    startPolling();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        fetchChats();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [user?.id]);

  const sendMessage = async (chatId: string, text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'me',
      senderId: '',
      time: getTime(),
      read: true
    };

    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, archived: false, messages: [...chat.messages, newMessage] }
          : chat
      )
    );

    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({ text, sender: 'me', time: getTime() }),
      });
    } catch (e) {
      console.log('sendMessage error:', e);
    }
  };

  const archiveChat = async (chatId: string) => {
    setChats(prev =>
      prev.map(chat => chat.id === chatId ? { ...chat, archived: true } : chat)
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/chats/${chatId}/archive`, {
        method: 'PATCH',
        headers: getAuthHeadersWithToken(token),
      });
    } catch (e) {
      console.log('archiveChat error:', e);
    }
  };

  const unarchiveChat = async (chatId: string) => {
    setChats(prev =>
      prev.map(chat => chat.id === chatId ? { ...chat, archived: false } : chat)
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/chats/${chatId}/unarchive`, {
        method: 'PATCH',
        headers: getAuthHeadersWithToken(token),
      });
    } catch (e) {
      console.log('unarchiveChat error:', e);
    }
  };

  const markChatAsRead = async (chatId: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: chat.messages.map(m => m.sender === 'recipient' ? { ...m, read: true } : m) }
          : chat
      )
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/chats/${chatId}/read`, {
        method: 'PATCH',
        headers: getAuthHeadersWithToken(token),
      });
    } catch (e) {
      console.log('markChatAsRead error:', e);
    }
  };

  const reportUser = async (chatId: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, reported: true, reportCount: (chat.reportCount || 0) + 1 }
          : chat
      )
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/chats/${chatId}/report`, {
        method: 'POST',
        headers: getAuthHeadersWithToken(token),
      });
    } catch (e) {
      console.log('reportUser error:', e);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        sendMessage,
        archiveChat,
        unarchiveChat,
        markChatAsRead,
        reportUser
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChats = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChats must be used inside ChatProvider');
  return context;
};