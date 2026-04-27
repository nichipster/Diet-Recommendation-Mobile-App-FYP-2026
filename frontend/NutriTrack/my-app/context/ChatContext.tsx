import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'client';
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
  sendMessage: (chatId: string, text: string) => void;
  archiveChat: (chatId: string) => void;
  unarchiveChat: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  reportUser: (chatId: string) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
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
      { id: '1', text: 'Hi Sarah!', sender: 'me', time: '09:00', read: false },
      { id: '2', text: 'Can we discuss my meal plan?', sender: 'client', time: '09:02', read: false }
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
      { id: '1', text: 'Hey coach!', sender: 'client', time: '10:15', read: false },
      { id: '2', text: 'How many calories today?', sender: 'client', time: '10:16', read: false },
      { id: '3', text: 'Around 2,200 👍', sender: 'me', time: '10:20', read: true }
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
      { id: '1', text: 'Happy Chinese New Year!', sender: 'client', time: '10:16', read: false }
    ]
  }
];

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);

  // TODO (Backend): Uncomment when backend is ready
// const fetchChats = async () => {
//   try {
//     const token = await AsyncStorage.getItem('token');
//     const res = await fetch(`${API_URL}/chats`, {
//       headers: getAuthHeadersWithToken(token),
//     });
//     if (res.ok) {
//       const data = await res.json();
//       setChats(data);
//     }
//   } catch (e) {
//     console.log('fetchChats error:', e);
//   }
// };

// TODO (Backend): Uncomment when backend is ready
// useEffect(() => {
//   fetchChats();
// }, []);

  /** 📤 Send message */
  const sendMessage = (chatId: string, text: string) => {
    // TODO (Backend): Also call POST /chats/:chatId/messages
  // Body: { text: string, sender: 'me', time: string }
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'me',
      time: getTime(),
      read: true
    };

    // Add my message + auto unarchive
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              archived: false,
              messages: [...chat.messages, newMessage]
            }
          : chat
      )
    );
  };

  /** 📦 Archive */
  const archiveChat = (chatId: string) => {
    // TODO (Backend): Also call PATCH /chats/:chatId/archive
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, archived: true } : chat
      )
    );
  };

  const unarchiveChat = (chatId: string) => {
    // TODO (Backend): Also call PATCH /chats/:chatId/unarchive
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, archived: false } : chat
      )
    );
  };

  /** 👁️ Mark as read */
  const markChatAsRead = (chatId: string) => {
    // TODO (Backend): Also call PATCH /chats/:chatId/read
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map(m =>
                m.sender === 'client' ? { ...m, read: true } : m
              )
            }
          : chat
      )
    );
  };

  /** 🚨 Report user */
  const reportUser = (chatId: string) => {
    // TODO (Backend): Also call POST /chats/:chatId/report
  setChats(prev =>
    prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            reported: true,
            reportCount: (chat.reportCount || 0) + 1
          }
        : chat
    )
  );
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