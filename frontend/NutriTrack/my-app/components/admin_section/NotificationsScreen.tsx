import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/api';

// ── TYPE ──
// Backend returns: { id, title, message, segment, sent_at, recipient_count }
// emoji and emoji_bg are derived on the frontend — backend does not store them
type SentNotification = {
  id: string;
  title: string;
  message: string;
  segment: string;
  sent_at: string;
  recipient_count: number;
  emoji: string;
  emoji_bg: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const SEGMENTS = [
  { key: 'all',      label: 'All Users' },
  { key: 'freemium', label: 'Freemium'  },
  { key: 'premium',  label: 'Premium'   },
];

const SEGMENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  all:      { bg: '#d1fae5', text: '#065f46', label: 'All Users' },
  freemium: { bg: '#f3f4f6', text: '#4b5563', label: 'Freemium'  },
  premium:  { bg: '#ede9fe', text: '#5b21b6', label: 'Premium'   },
};

// ── DERIVE EMOJI FROM SEGMENT ──
// Backend does not store emoji — we derive it on the frontend
const getEmojiForSegment = (seg: string): { emoji: string; emoji_bg: string } => {
  if (seg === 'premium')  return { emoji: '💎', emoji_bg: '#ede9fe' };
  if (seg === 'freemium') return { emoji: '⭐', emoji_bg: '#fef3c7' };
  return { emoji: '📣', emoji_bg: '#d1fae5' };
};

// ── MAP BACKEND RESPONSE TO FRONTEND TYPE ──
// Backend returns notification_id as integer — convert to string
const mapNotification = (n: any): SentNotification => ({
  id:              String(n.id ?? n.notification_id),
  title:           n.title,
  message:         n.message,
  segment:         n.segment,
  sent_at:         n.sent_at,
  recipient_count: n.recipient_count,
  ...getEmojiForSegment(n.segment),
});

const timeAgo = (dateStr: string): string => {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins  < 60) return `${mins} min ago`;
  if (hrs   < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  if (days  < 7)  return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
};

export default function NotificationsScreen({ visible, onClose }: Props) {
  const [history, setHistory]   = useState<SentNotification[]>([]);
  const [loading, setLoading]   = useState(false);
  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [segment, setSegment]   = useState('all');
  const [sending, setSending]   = useState(false);
  const [titleError, setTitleError]     = useState('');
  const [messageError, setMessageError] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [visibleCount, setVisibleCount]   = useState(5);

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH NOTIFICATION HISTORY ──
  // Endpoint: GET /admin/notifications/history
  // Headers: { Authorization: Bearer <token> }
  // Returns: array of SentNotificationResponse sorted by sent_at descending
  // Each: { id, title, message, segment, sent_at, recipient_count }
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/notifications/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.map(mapNotification));
      } else {
        console.log('fetchHistory failed:', res.status);
      }
    } catch (e) {
      console.log('fetchHistory error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchHistory();
  }, [visible]);

  // ── FILTERED + PAGINATED HISTORY ──
  const filteredHistory = history.filter(n => {
    const matchFilter =
      historyFilter === 'all' ||
      n.segment === historyFilter;
    const matchSearch =
      n.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      n.message.toLowerCase().includes(historySearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const visibleHistory = filteredHistory.slice(0, visibleCount);

  const getSegmentEmoji = (): string => {
    if (segment === 'premium')  return '💎';
    if (segment === 'freemium') return '⭐';
    return '👥';
  };

  // ── SEND NOTIFICATION ──
  // Endpoint: POST /admin/notifications/send
  // Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  // Body: { title, message, segment }
  // segment must be exactly: 'all' | 'premium' | 'freemium'
  // Returns: { id, title, message, segment, sent_at, recipient_count }
  // Backend will:
  // 1. Query all users matching the segment
  // 2. Get their stored Expo push tokens from push_token table
  // 3. Call Expo Push API via push_notification_service.py
  // 4. Store the sent notification in notification_history table
  const handleSend = async () => {
    let hasError = false;

    if (!title.trim()) {
      setTitleError('Title is required');
      hasError = true;
    } else {
      setTitleError('');
    }

    if (!message.trim()) {
      setMessageError('Message is required');
      hasError = true;
    } else {
      setMessageError('');
    }

    if (hasError) return;

    const segLabel = SEGMENT_COLORS[segment].label;

    Alert.alert(
      'Send Notification',
      `Send "${title.trim()}" to ${segLabel} users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const token = await getToken();
              if (!token) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

              const res = await fetch(`${API_URL}/admin/notifications/send`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title:   title.trim(),
                  message: message.trim(),
                  segment,
                }),
              });

              if (res.ok) {
                const sent = await res.json();
                const mapped = mapNotification(sent);
                setHistory(prev => [mapped, ...prev]);
                setTitle('');
                setMessage('');
                setSegment('all');
                Alert.alert(
                  'Notification Sent ✅',
                  `Your notification has been sent to ${mapped.recipient_count.toLocaleString()} users.`
                );
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to send notification.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  // ── SENT TOTAL count from real history ──
  const sentTotal = history.length;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── STATS ROW ── */}
        {/* Sent total is derived from real history length */}
        <View style={styles.statsRow}>
          {[
            { label: 'Sent total', value: sentTotal.toString(), color: '#10b981' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── COMPOSE FORM ── */}
        <View style={styles.composeCard}>
          <Text style={styles.composeTitle}>📣 Send announcement</Text>
          <Text style={styles.composeSub}>
            Send a push notification to your users. Choose who receives it below.
          </Text>

          {/* Title */}
          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput
            style={[styles.fieldInput, titleError ? styles.inputError : null]}
            placeholder="e.g. New feature just launched!"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={v => { setTitle(v); setTitleError(''); }}
            maxLength={200}
          />
          {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}

          {/* Message */}
          <Text style={styles.fieldLabel}>Message *</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea, messageError ? styles.inputError : null]}
            placeholder="Write your message here..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            value={message}
            onChangeText={v => { setMessage(v); setMessageError(''); }}
            textAlignVertical="top"
            maxLength={2000}
          />
          {messageError ? <Text style={styles.errorText}>{messageError}</Text> : null}

          {/* Segment selector */}
          <Text style={styles.fieldLabel}>Send to *</Text>
          <View style={styles.segRow}>
            {SEGMENTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.segPill, segment === s.key && styles.segPillActive]}
                onPress={() => setSegment(s.key)}
              >
                <Text style={[
                  styles.segPillText,
                  segment === s.key && styles.segPillTextActive
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recipient info */}
          <View style={styles.recipientBox}>
            <Text style={styles.recipientEmoji}>{getSegmentEmoji()}</Text>
            <Text style={styles.recipientText}>
              Notification will be sent to all{' '}
              <Text style={styles.recipientCount}>
                {SEGMENT_COLORS[segment].label}
              </Text>
              {' '}users with an active push token
            </Text>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
          >
            <Text style={styles.sendBtnText}>
              {sending ? 'Sending...' : 'Send Notification'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── NOTIFICATION HISTORY ── */}
        <Text style={styles.sectionLabel}>
          All sent notifications ({filteredHistory.length})
        </Text>

        {/* History search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor="#9ca3af"
            value={historySearch}
            onChangeText={v => {
              setHistorySearch(v);
              setVisibleCount(5);
            }}
          />
          {historySearch.length > 0 && (
            <TouchableOpacity
              onPress={() => { setHistorySearch(''); setVisibleCount(5); }}
            >
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* History filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {[
            { key: 'all',      label: 'All'       },
            { key: 'all_seg',  label: 'All Users'  },
            { key: 'freemium', label: 'Freemium'   },
            { key: 'premium',  label: 'Premium'    },
          ].map(f => {
            const filterKey = f.key === 'all_seg' ? 'all' : f.key;
            const isActive  = f.key === 'all'
              ? historyFilter === 'all' && f.key === 'all'
              : historyFilter === filterKey;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => {
                  setHistoryFilter(filterKey);
                  setVisibleCount(5);
                }}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading state */}
        {loading && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Loading notifications...</Text>
          </View>
        )}

        {/* History list */}
        {!loading && filteredHistory.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>
              {history.length === 0
                ? 'No notifications sent yet'
                : 'No results found'}
            </Text>
          </View>
        ) : !loading && (
          <>
            {visibleHistory.map(notif => {
              const seg = SEGMENT_COLORS[notif.segment] || SEGMENT_COLORS.all;
              return (
                <View key={notif.id} style={styles.notifCard}>
                  <View style={styles.notifTop}>
                    <View style={[styles.notifIcon, { backgroundColor: notif.emoji_bg }]}>
                      <Text style={styles.notifIconText}>{notif.emoji}</Text>
                    </View>
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      <Text style={styles.notifMsg} numberOfLines={2}>
                        {notif.message}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.notifMeta}>
                    <View style={[styles.segBadge, { backgroundColor: seg.bg }]}>
                      <Text style={[styles.segBadgeText, { color: seg.text }]}>
                        {seg.label}
                      </Text>
                    </View>
                    <Text style={styles.notifReach}>
                      ↗ {notif.recipient_count.toLocaleString()} reached
                    </Text>
                    <Text style={styles.notifTime}>{timeAgo(notif.sent_at)}</Text>
                  </View>
                </View>
              );
            })}

            {/* Load more */}
            {visibleCount < filteredHistory.length && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount(prev => prev + 5)}
              >
                <Text style={styles.loadMoreText}>
                  Load more ({filteredHistory.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            )}

            {/* Show less */}
            {visibleCount > 5 && filteredHistory.length > 5 && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount(5)}
              >
                <Text style={styles.loadMoreText}>Show less</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981', alignItems: 'center',
  },
  statVal: { fontSize: 15, fontWeight: '700' },
  statLbl: { fontSize: 9, color: '#6b7280', marginTop: 2, textAlign: 'center' },

  composeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  composeTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  composeSub: { fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 18 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', marginBottom: 4,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, marginTop: 2 },

  segRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segPill: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fff', alignItems: 'center',
  },
  segPillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  segPillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  segPillTextActive: { color: '#fff' },

  recipientBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#d1fae5',
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 14,
  },
  recipientEmoji: { fontSize: 16 },
  recipientText: { fontSize: 12, color: '#374151', flex: 1 },
  recipientCount: { fontWeight: '700', color: '#065f46' },

  sendBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: '#6ee7b7' },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10,
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchClear: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },

  filterScroll: { marginBottom: 12 },
  filterRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },

  notifCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  notifTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 8,
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifIconText: { fontSize: 16 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  notifMsg: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  notifMeta: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, flexWrap: 'wrap',
  },
  segBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  segBadgeText: { fontSize: 10, fontWeight: '700' },
  notifReach: { fontSize: 10, color: '#10b981', fontWeight: '600' },
  notifTime: { fontSize: 10, color: '#9ca3af' },

  loadMoreBtn: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: '#10b981' },
});