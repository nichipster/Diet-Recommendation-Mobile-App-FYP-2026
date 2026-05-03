import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../ui/Navbar';
import FormField from '../profile_section/profile/cards/FormField';
import { API_URL } from '../../constants/api';
import { useUser } from '../../context/UserContext';

// ── MESSAGE TYPE ──
// Each message in the conversation thread
type Message = {
  sender: 'user' | 'admin';
  text: string;
  sent_at: string;
};

type Ticket = {
  id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  user_initials: string;
  avatar_color: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  admin_reply: string | null;
  messages: Message[];
};

// ── DUMMY TICKETS ──
const DUMMY_TICKETS: Ticket[] = [
  {
    id: '1',
    user_name: 'Sarah Tang',
    user_email: 'sarah@example.com',
    user_role: 'premium',
    user_initials: 'ST',
    avatar_color: '#10b981',
    subject: 'Cannot access premium features after upgrade',
    description: 'I upgraded to the premium plan yesterday but the app still shows freemium features on my account. I have tried logging out and back in but the issue persists.',
    category: 'Billing & Subscription',
    status: 'Open',
    created_at: '2026-03-25T07:00:00',
    admin_reply: null,
    messages: [
      {
        sender: 'user',
        text: 'I upgraded to the premium plan yesterday but the app still shows freemium features on my account. I have tried logging out and back in but the issue persists.',
        sent_at: '2026-03-25T07:00:00',
      },
    ],
  },
  {
    id: '2',
    user_name: 'John Doe',
    user_email: 'john@example.com',
    user_role: 'freemium',
    user_initials: 'JD',
    avatar_color: '#3b82f6',
    subject: 'Barcode scan not working on Samsung',
    description: 'When I press scan barcode nothing happens. I am using Samsung Galaxy S22 with Android 13.',
    category: 'Technical Issue',
    status: 'In Progress',
    created_at: '2026-03-25T04:00:00',
    admin_reply: null,
    messages: [
      {
        sender: 'user',
        text: 'When I press scan barcode nothing happens. I am using Samsung Galaxy S22 with Android 13.',
        sent_at: '2026-03-25T04:00:00',
      },
      {
        sender: 'admin',
        text: 'Hi John, thank you for reporting this. Could you please check if camera permissions are enabled for NutriTrack in your device settings?',
        sent_at: '2026-03-25T05:30:00',
      },
      {
        sender: 'user',
        text: 'Yes camera permissions are on. Still not working after reinstalling.',
        sent_at: '2026-03-25T06:00:00',
      },
    ],
  },
  {
    id: '3',
    user_name: 'Alex Tan',
    user_email: 'alex@example.com',
    user_role: 'premium',
    user_initials: 'AT',
    avatar_color: '#f97316',
    subject: 'Meal recommendation not updating',
    description: 'Even after logging meals and rating them, my recommendations still show the same meals every day.',
    category: 'Recommendation',
    status: 'Open',
    created_at: '2026-03-24T08:00:00',
    admin_reply: null,
    messages: [
      {
        sender: 'user',
        text: 'Even after logging meals and rating them, my recommendations still show the same meals every day.',
        sent_at: '2026-03-24T08:00:00',
      },
    ],
  },
  {
    id: '4',
    user_name: 'Mark Lim',
    user_email: 'mark@example.com',
    user_role: 'freemium',
    user_initials: 'ML',
    avatar_color: '#8b5cf6',
    subject: 'How do I cancel my subscription?',
    description: 'I would like to cancel my premium subscription before the next billing cycle.',
    category: 'Billing & Subscription',
    status: 'Resolved',
    created_at: '2026-03-23T10:00:00',
    admin_reply: 'You can cancel your subscription from the Profile page under Subscription.',
    messages: [
      {
        sender: 'user',
        text: 'I would like to cancel my premium subscription before the next billing cycle.',
        sent_at: '2026-03-23T10:00:00',
      },
      {
        sender: 'admin',
        text: 'You can cancel your subscription from the Profile page under Subscription. Tap Manage Subscription and select Cancel. Your access will remain until the end of the billing period.',
        sent_at: '2026-03-23T10:30:00',
      },
    ],
  },
  {
    id: '5',
    user_name: 'Priya Nair',
    user_email: 'priya@example.com',
    user_role: 'premium',
    user_initials: 'PN',
    avatar_color: '#ec4899',
    subject: 'Progress report showing wrong data',
    description: 'My progress report is showing 0 for all macros even though I have been logging meals daily.',
    category: 'Meal Logging',
    status: 'Open',
    created_at: '2026-03-24T12:00:00',
    admin_reply: null,
    messages: [
      {
        sender: 'user',
        text: 'My progress report is showing 0 for all macros even though I have been logging meals daily.',
        sent_at: '2026-03-24T12:00:00',
      },
    ],
  },
];

const FILTERS = ['All', 'Open', 'In Progress', 'Resolved'];
const CATEGORY_FILTERS = ['Billing & Subscription', 'Technical Issue', 'Account Problem', 'Meal Logging', 'Recommendation', 'General'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Open':        { bg: '#fee2e2', text: '#991b1b' },
  'In Progress': { bg: '#fef3c7', text: '#92400e' },
  'Resolved':    { bg: '#d1fae5', text: '#065f46' },
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function SupportTicketAdmin({ visible, onClose }: Props) {
  const { user } = useUser();

  const [tickets, setTickets] = useState<Ticket[]>(DUMMY_TICKETS);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (visible) fetchTickets();
  }, [visible]);

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${API_URL}/support/tickets`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Map backend response to include messages array
        // If backend returns messages, use them
        // Otherwise build messages from description + admin_reply
        const mapped: Ticket[] = data.map((t: any) => {
          const messages: Message[] = t.messages ?? [];
          if (messages.length === 0) {
            messages.push({ sender: 'user', text: t.description, sent_at: t.created_at });
            if (t.admin_reply) {
              messages.push({ sender: 'admin', text: t.admin_reply, sent_at: t.updated_at ?? t.created_at });
            }
          }
          return { ...t, messages };
        });
        setTickets(mapped);
      }
    } catch (e) {
      console.log('fetchTickets error:', e);
    }
  };

  // ── SEND REPLY ──
  // Appends new admin message to the local messages array
  // and sends to backend via PUT /support/tickets/{id}/reply
  const handleReply = async (newStatus: 'In Progress' | 'Resolved') => {
    if (!replyText.trim()) {
      setReplyError('Please write a reply before sending');
      return;
    }
    setReplyError('');
    setSubmittingReply(true);

    const newMessage: Message = {
      sender: 'admin',
      text: replyText.trim(),
      sent_at: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `${API_URL}/support/tickets/${selectedTicket?.id}/reply`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_reply: replyText.trim(),
            status: newStatus,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Build updated ticket with new message appended
        const updatedMessages = [...(selectedTicket?.messages ?? []), newMessage];
        const updatedTicket: Ticket = {
          ...selectedTicket!,
          ...data,
          messages: data.messages ?? updatedMessages,
          status: newStatus,
          admin_reply: replyText.trim(),
        };
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        setSelectedTicket(updatedTicket);
      } else {
        // Update locally if backend not ready
        const updatedMessages = [...(selectedTicket?.messages ?? []), newMessage];
        const updatedTicket: Ticket = {
          ...selectedTicket!,
          messages: updatedMessages,
          status: newStatus,
          admin_reply: replyText.trim(),
        };
        setTickets(prev => prev.map(t => t.id === selectedTicket?.id ? updatedTicket : t));
        setSelectedTicket(updatedTicket);
      }

      setReplyText('');
      Alert.alert('Reply Sent', `Ticket marked as ${newStatus}.`);
    } catch (e) {
      // Network error — update locally
      const updatedMessages = [...(selectedTicket?.messages ?? []), newMessage];
      const updatedTicket: Ticket = {
        ...selectedTicket!,
        messages: updatedMessages,
        status: newStatus,
        admin_reply: replyText.trim(),
      };
      setTickets(prev => prev.map(t => t.id === selectedTicket?.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setReplyText('');
      Alert.alert('Reply Sent', `Ticket marked as ${newStatus}.`);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleClose = (ticket: Ticket) => {
    Alert.alert(
      'Close Ticket',
      `Mark "${ticket.subject}" as resolved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/support/tickets/${ticket.id}/close`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${user.token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'Resolved' }),
              });
            } catch (e) {
              console.log('closeTicket error:', e);
            } finally {
              setTickets(prev =>
                prev.map(t => t.id === ticket.id ? { ...t, status: 'Resolved' } : t)
              );
            }
          },
        },
      ]
    );
  };

  const filtered = tickets.filter(t => {
    const matchStatus = activeFilter === 'All' || t.status === activeFilter ||
      CATEGORY_FILTERS.includes(activeFilter) && t.category === activeFilter;
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.user_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCount       = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedCount   = tickets.filter(t => t.status === 'Resolved').length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Open',        value: openCount,       color: '#dc2626' },
            { label: 'In Progress', value: inProgressCount, color: '#d97706' },
            { label: 'Resolved',    value: resolvedCount,   color: '#059669' },
            { label: 'Total',       value: tickets.length,  color: '#10b981' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets or users..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {[...FILTERS, ...CATEGORY_FILTERS].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, activeFilter === f && styles.pillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Ticket list */}
        <View style={styles.ticketList}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎫</Text>
              <Text style={styles.emptyTitle}>No tickets found</Text>
            </View>
          ) : (
            filtered.map(ticket => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketTop}>
                  <View style={[styles.avatar, { backgroundColor: ticket.avatar_color }]}>
                    <Text style={styles.avatarText}>{ticket.user_initials}</Text>
                  </View>
                  <View style={styles.ticketMeta}>
                    <Text style={styles.ticketName}>{ticket.user_name}</Text>
                    <View style={styles.metaRow}>
                      <View style={[
                        styles.planBadge,
                        ticket.user_role === 'premium'
                          ? styles.planBadgePremium
                          : styles.planBadgeFreemium
                      ]}>
                        <Text style={[
                          styles.planBadgeText,
                          ticket.user_role === 'premium'
                            ? styles.planBadgeTextPremium
                            : styles.planBadgeTextFreemium
                        ]}>
                          {ticket.user_role === 'premium' ? 'Premium' : 'Freemium'}
                        </Text>
                      </View>
                      <Text style={styles.ticketTime}>{formatDate(ticket.created_at)}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[ticket.status]?.bg || '#f3f4f6' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: STATUS_COLORS[ticket.status]?.text || '#374151' }
                    ]}>
                      {ticket.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                <Text style={styles.ticketPreview} numberOfLines={2}>
                  {ticket.description}
                </Text>

                <View style={styles.ticketBottom}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{ticket.category}</Text>
                  </View>
                  <View style={styles.actionBtns}>
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => {
                        setSelectedTicket(ticket);
                        setReplyText('');
                      }}
                    >
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </TouchableOpacity>
                    {ticket.status !== 'Resolved' && (
                      <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => handleClose(ticket)}
                      >
                        <Text style={styles.closeBtnText}>Close</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── REPLY MODAL ── */}
      <Modal visible={!!selectedTicket} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safe}>
          <Navbar
            title="Reply to Ticket"
            backLabel="Tickets"
            onClose={() => {
              setSelectedTicket(null);
              setReplyText('');
              setReplyError('');
            }}
          />
          {selectedTicket && (
            <ScrollView>
              <View style={styles.replyContent}>

                {/* Ticket header */}
                <View style={styles.replyCard}>
                  <View style={styles.replyCardTop}>
                    <View style={[styles.avatar, { backgroundColor: selectedTicket.avatar_color }]}>
                      <Text style={styles.avatarText}>{selectedTicket.user_initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketName}>{selectedTicket.user_name}</Text>
                      <Text style={styles.ticketTime}>{selectedTicket.user_email}</Text>
                    </View>
                    <View style={[
                      styles.planBadge,
                      selectedTicket.user_role === 'premium'
                        ? styles.planBadgePremium
                        : styles.planBadgeFreemium
                    ]}>
                      <Text style={[
                        styles.planBadgeText,
                        selectedTicket.user_role === 'premium'
                          ? styles.planBadgeTextPremium
                          : styles.planBadgeTextFreemium
                      ]}>
                        {selectedTicket.user_role === 'premium' ? 'Premium' : 'Freemium'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.replySubject}>{selectedTicket.subject}</Text>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{selectedTicket.category}</Text>
                  </View>
                </View>

                {/* ── FULL CONVERSATION THREAD ── */}
                <View style={styles.threadCard}>
                  <Text style={styles.threadLabel}>
                    💬 Conversation ({selectedTicket.messages.length} messages)
                  </Text>

                  {selectedTicket.messages.map((msg, index) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <View key={index} style={styles.messageWrap}>
                        {/* Sender label */}
                        <View style={[
                          styles.messageSenderRow,
                          isAdmin ? styles.messageSenderRowRight : styles.messageSenderRowLeft
                        ]}>
                          {!isAdmin && (
                            <View style={[styles.msgAvatar, { backgroundColor: selectedTicket.avatar_color }]}>
                              <Text style={styles.msgAvatarText}>{selectedTicket.user_initials}</Text>
                            </View>
                          )}
                          <Text style={styles.messageSenderName}>
                            {isAdmin ? 'You (Admin)' : selectedTicket.user_name}
                          </Text>
                          {isAdmin && (
                            <View style={styles.adminAvatarSmall}>
                              <Text style={styles.adminAvatarText}>AD</Text>
                            </View>
                          )}
                        </View>

                        {/* Bubble */}
                        <View style={[
                          styles.messageBubble,
                          isAdmin ? styles.messageBubbleAdmin : styles.messageBubbleUser
                        ]}>
                          <Text style={[
                            styles.messageBubbleText,
                            isAdmin ? styles.messageBubbleTextAdmin : styles.messageBubbleTextUser
                          ]}>
                            {msg.text}
                          </Text>
                        </View>

                        {/* Timestamp */}
                        <Text style={[
                          styles.messageTime,
                          isAdmin ? styles.messageTimeRight : styles.messageTimeLeft
                        ]}>
                          {formatTime(msg.sent_at)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Reply form */}
                <View style={styles.replyCard}>
                  <FormField
                    label="Your reply *"
                    value={replyText}
                    onChangeText={v => { setReplyText(v); setReplyError(''); }}
                    placeholder="Type your reply to the user..."
                    error={replyError}
                  />

                  <View style={styles.replyActions}>
                    <TouchableOpacity
                      style={[styles.replyActionBtn, styles.replyActionInProgress]}
                      onPress={() => handleReply('In Progress')}
                      disabled={submittingReply}
                    >
                      <Text style={styles.replyActionBtnText}>
                        {submittingReply ? '...' : 'Reply — Keep Open'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.replyActionBtn, styles.replyActionResolve]}
                      onPress={() => handleReply('Resolved')}
                      disabled={submittingReply}
                    >
                      <Text style={styles.replyActionBtnText}>
                        {submittingReply ? '...' : 'Reply & Resolve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981', alignItems: 'center',
  },
  statVal: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  filterScroll: { marginBottom: 14 },
  filterRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  ticketList: {},
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },

  ticketCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  ticketTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 8,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  ticketMeta: { flex: 1 },
  ticketName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  planBadgePremium:      { backgroundColor: '#ede9fe' },
  planBadgeFreemium:     { backgroundColor: '#f3f4f6' },
  planBadgeText:         { fontSize: 10, fontWeight: '700' },
  planBadgeTextPremium:  { color: '#5b21b6' },
  planBadgeTextFreemium: { color: '#4b5563' },
  ticketTime: { fontSize: 10, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketSubject: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  ticketPreview: { fontSize: 12, color: '#6b7280', lineHeight: 17, marginBottom: 10 },
  ticketBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  catBadge: {
    backgroundColor: '#f0fdf4', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 10,
  },
  catBadgeText: { fontSize: 10, fontWeight: '600', color: '#065f46' },
  actionBtns: { flexDirection: 'row', gap: 6 },
  replyBtn: {
    backgroundColor: '#10b981', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  replyBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  closeBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  closeBtnText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },

  replyContent: { padding: 16, paddingBottom: 40 },
  replyCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  replyCardTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 12,
  },
  replySubject: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },

  // ── CONVERSATION THREAD ──
  threadCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  threadLabel: {
    fontSize: 13, fontWeight: '700', color: '#374151',
    marginBottom: 14,
  },

  messageWrap: { marginBottom: 16 },

  messageSenderRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 4,
  },
  messageSenderRowLeft:  { justifyContent: 'flex-start' },
  messageSenderRowRight: { justifyContent: 'flex-end' },

  msgAvatar: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  msgAvatarText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  adminAvatarSmall: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  adminAvatarText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  messageSenderName: { fontSize: 11, fontWeight: '600', color: '#6b7280' },

  messageBubble: {
    maxWidth: '85%', borderRadius: 16, padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  messageBubbleAdmin: {
    backgroundColor: '#10b981',
    borderTopRightRadius: 4,
    alignSelf: 'flex-end',
  },
  messageBubbleText: { fontSize: 13, lineHeight: 19 },
  messageBubbleTextUser:  { color: '#111827' },
  messageBubbleTextAdmin: { color: '#fff' },

  messageTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  messageTimeLeft:  { textAlign: 'left',  marginLeft: 4 },
  messageTimeRight: { textAlign: 'right', marginRight: 4 },

  replyActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  replyActionBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  replyActionInProgress: { backgroundColor: '#f59e0b' },
  replyActionResolve:    { backgroundColor: '#10b981' },
  replyActionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});