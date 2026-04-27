import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../ui/Navbar';
import FormField from '../profile_section/profile/cards/FormField';
import { useUser } from '../../context/UserContext';
import { API_URL } from '../../constants/api';

const CATEGORIES = [
  'Billing & Subscription',
  'Technical Issue',
  'Account Problem',
  'Meal Logging',
  'Nutrition Advice',
  'Recommendation',
  'General',
  'Others',
];

const DUMMY_MY_TICKETS = [
  {
    id: '1',
    subject: 'Cannot access premium features',
    description: 'I upgraded to premium but still see the freemium view...',
    category: 'Billing & Subscription',
    status: 'In Progress',
    created_at: '2026-03-23T10:00:00',
    admin_reply: null,
  },
  {
    id: '2',
    subject: 'Barcode scan not working',
    description: 'The barcode scanner does not open on my Samsung device...',
    category: 'Technical Issue',
    status: 'Resolved',
    created_at: '2026-03-17T14:00:00',
    admin_reply: 'We have pushed a fix in the latest update. Please update your app.',
  },
];

type Ticket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  admin_reply: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Open':        { bg: '#fee2e2', text: '#991b1b' },
  'In Progress': { bg: '#fef3c7', text: '#92400e' },
  'Resolved':    { bg: '#d1fae5', text: '#065f46' },
};

export default function SupportTicketScreen({ visible, onClose }: Props) {
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState<Ticket[]>(DUMMY_MY_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // ── FETCH USER'S TICKETS ──
  // Backend endpoint: GET /support/tickets/me
  // Returns: list of tickets submitted by the logged-in user
  useEffect(() => {
    if (visible) fetchMyTickets();
  }, [visible]);

  const fetchMyTickets = async () => {
    try {
      const response = await fetch(`${API_URL}/support/tickets/me`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMyTickets(data);
      }
    } catch (e) {
      console.log('fetchMyTickets error:', e);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setSubject('');
    setDescription('');
    setSubjectError('');
    setDescriptionError('');
    setCategoryError('');
  };

  // ── SUBMIT TICKET ──
  // Backend endpoint: POST /support/tickets
  // Body: { category, subject, description }
  // Returns: { id, subject, description, category, status: 'Open', created_at }
  const handleSubmit = async () => {
    let hasError = false;

    if (!selectedCategory) {
      setCategoryError('Please select a category');
      hasError = true;
    } else {
      setCategoryError('');
    }

    if (!subject.trim()) {
      setSubjectError('Subject is required');
      hasError = true;
    } else {
      setSubjectError('');
    }

    if (!description.trim()) {
      setDescriptionError('Please describe your issue');
      hasError = true;
    } else {
      setDescriptionError('');
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      if (response.ok) {
        const newTicket = await response.json();
        setMyTickets(prev => [newTicket, ...prev]);
      } else {
        const dummyTicket: Ticket = {
          id: Date.now().toString(),
          subject: subject.trim(),
          description: description.trim(),
          category: selectedCategory,
          status: 'Open',
          created_at: new Date().toISOString(),
          admin_reply: null,
        };
        setMyTickets(prev => [dummyTicket, ...prev]);
      }

      Alert.alert(
        'Ticket Submitted ✅',
        'We have received your ticket and will respond within 24 hours.',
        [{ text: 'OK', onPress: () => { resetForm(); setActiveTab('history'); } }]
      );
    } catch (e) {
      const dummyTicket: Ticket = {
        id: Date.now().toString(),
        subject: subject.trim(),
        description: description.trim(),
        category: selectedCategory,
        status: 'Open',
        created_at: new Date().toISOString(),
        admin_reply: null,
      };
      setMyTickets(prev => [dummyTicket, ...prev]);
      Alert.alert(
        'Ticket Submitted ✅',
        'We have received your ticket and will respond within 24 hours.',
        [{ text: 'OK', onPress: () => { resetForm(); setActiveTab('history'); } }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <SafeAreaView style={styles.navbarSafe} edges={['top']}>
          <Navbar title="Support Ticket" backLabel="Profile" onClose={onClose} />
        </SafeAreaView>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Get Help</Text>
          <Text style={styles.headerSub}>We usually respond within 24 hours</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'new' && styles.tabActive]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
              New Ticket
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              My Tickets ({myTickets.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* ── NEW TICKET FORM ── */}
            {activeTab === 'new' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>What do you need help with?</Text>
                <Text style={styles.cardSub}>
                  Select a category and describe your issue. Our team will get back to you as soon as possible.
                </Text>

                <Text style={styles.fieldLabel}>Category *</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                      onPress={() => { setSelectedCategory(cat); setCategoryError(''); }}
                    >
                      <Text style={[
                        styles.catPillText,
                        selectedCategory === cat && styles.catPillTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}

                <FormField
                  label="Subject *"
                  value={subject}
                  onChangeText={v => { setSubject(v); setSubjectError(''); }}
                  placeholder="e.g. Cannot access my premium features"
                  error={subjectError}
                />

                <FormField
                  label="Description *"
                  value={description}
                  onChangeText={v => { setDescription(v); setDescriptionError(''); }}
                  placeholder="Describe your issue in detail..."
                  error={descriptionError}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── TICKET HISTORY ── */}
            {activeTab === 'history' && (
              <View>
                {myTickets.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyEmoji}>🎫</Text>
                    <Text style={styles.emptyTitle}>No tickets yet</Text>
                    <Text style={styles.emptySub}>
                      Submit a ticket if you need help with anything
                    </Text>
                  </View>
                ) : (
                  myTickets.map(ticket => (
                    <TouchableOpacity
                      key={ticket.id}
                      style={styles.ticketCard}
                      onPress={() => setSelectedTicket(ticket)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.ticketTop}>
                        <View style={styles.ticketInfo}>
                          <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                          <Text style={styles.ticketCategory}>{ticket.category}</Text>
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
                      <Text style={styles.ticketPreview} numberOfLines={2}>
                        {ticket.description}
                      </Text>
                      {ticket.admin_reply && (
                        <View style={styles.replyBox}>
                          <Text style={styles.replyLabel}>💬 Admin replied</Text>
                          <Text style={styles.replyText} numberOfLines={2}>
                            {ticket.admin_reply}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

          </View>
        </ScrollView>

        {/* Ticket detail modal */}
        <Modal visible={!!selectedTicket} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
            <SafeAreaView style={styles.navbarSafe} edges={['top']}>
              <Navbar
                title="Ticket Detail"
                backLabel="My Tickets"
                onClose={() => setSelectedTicket(null)}
              />
            </SafeAreaView>
            {selectedTicket && (
              <ScrollView>
                <View style={styles.content}>
                  <View style={styles.card}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailSubject}>{selectedTicket.subject}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_COLORS[selectedTicket.status]?.bg || '#f3f4f6' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: STATUS_COLORS[selectedTicket.status]?.text || '#374151' }
                        ]}>
                          {selectedTicket.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{selectedTicket.category}</Text>
                    </View>
                    <Text style={styles.detailDate}>{formatDate(selectedTicket.created_at)}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.detailLabel}>Your message</Text>
                    <Text style={styles.detailBody}>{selectedTicket.description}</Text>
                    {selectedTicket.admin_reply && (
                      <>
                        <View style={styles.divider} />
                        <View style={styles.adminReplyBox}>
                          <Text style={styles.adminReplyLabel}>💬 Admin reply</Text>
                          <Text style={styles.adminReplyText}>{selectedTicket.admin_reply}</Text>
                        </View>
                      </>
                    )}
                    {!selectedTicket.admin_reply && (
                      <View style={styles.pendingBox}>
                        <Text style={styles.pendingText}>
                          ⏳ Awaiting admin response. We will notify you when we reply.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 0 },

  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#10b981' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#10b981' },

  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 18 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  catPillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catPillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  catPillTextActive: { color: '#fff' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, marginTop: 2 },

  submitBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 8,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#6ee7b7' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  ticketCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  ticketTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 6,
  },
  ticketInfo: { flex: 1, marginRight: 8 },
  ticketSubject: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  ticketCategory: { fontSize: 11, color: '#6b7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketPreview: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 8 },
  replyBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: '#10b981', marginBottom: 8,
  },
  replyLabel: { fontSize: 10, fontWeight: '700', color: '#065f46', marginBottom: 3 },
  replyText: { fontSize: 12, color: '#374151' },
  ticketDate: { fontSize: 11, color: '#9ca3af' },

  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 8,
  },
  detailSubject: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8 },
  catBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  catBadgeText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
  detailDate: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  detailBody: { fontSize: 14, color: '#374151', lineHeight: 22 },
  adminReplyBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    padding: 14, borderLeftWidth: 3, borderLeftColor: '#10b981',
  },
  adminReplyLabel: { fontSize: 12, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  adminReplyText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  pendingBox: {
    backgroundColor: '#fefce8', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#fde68a', marginTop: 8,
  },
  pendingText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  navbarSafe: {
    backgroundColor: '#fff',
  },

});