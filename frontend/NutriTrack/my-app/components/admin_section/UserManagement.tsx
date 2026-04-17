import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../ui/Navbar';

// ── DUMMY USERS ──
// TODO (Backend): Replace DUMMY_USERS with real API call
// Endpoint: GET /admin/users
// Returns: array of user objects matching the User type below
const DUMMY_USERS = [
  {
    id: '1',
    first_name: 'Sarah',
    last_name: 'Tang',
    email: 'sarah.tang@email.com',
    role: 'premium',
    status: 'active',
    joined_at: '2026-03-22T00:00:00',
    premium_start: '2026-01-01',
    premium_end: '2027-01-01',
    initials: 'ST',
    avatar_color: '#10b981',
  },
  {
    id: '2',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@email.com',
    role: 'freemium',
    status: 'active',
    joined_at: '2026-03-21T00:00:00',
    premium_start: null,
    premium_end: null,
    initials: 'JD',
    avatar_color: '#3b82f6',
  },
  {
    id: '3',
    first_name: 'Priya',
    last_name: 'Kumar',
    email: 'priya.k@email.com',
    role: 'freemium',
    status: 'suspended',
    joined_at: '2026-03-19T00:00:00',
    premium_start: null,
    premium_end: null,
    initials: 'PK',
    avatar_color: '#f97316',
  },
  {
    id: '4',
    first_name: 'Mark',
    last_name: 'Lim',
    email: 'mark.lim@email.com',
    role: 'premium',
    status: 'active',
    joined_at: '2026-03-20T00:00:00',
    premium_start: '2026-02-01',
    premium_end: '2027-02-01',
    initials: 'ML',
    avatar_color: '#8b5cf6',
  },
  {
    id: '5',
    first_name: 'Wei',
    last_name: 'Chen',
    email: 'wei.chen@email.com',
    role: 'premium',
    status: 'active',
    joined_at: '2026-03-18T00:00:00',
    premium_start: '2026-01-15',
    premium_end: '2027-01-15',
    initials: 'WC',
    avatar_color: '#ec4899',
  },
  {
    id: '6',
    first_name: 'Alex',
    last_name: 'Tan',
    email: 'alex.tan@email.com',
    role: 'freemium',
    status: 'active',
    joined_at: '2026-03-15T00:00:00',
    premium_start: null,
    premium_end: null,
    initials: 'AT',
    avatar_color: '#14b8a6',
  },
];

type User = typeof DUMMY_USERS[0];

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FILTERS = ['All', 'Premium', 'Freemium', 'Suspended'];

export default function UserManagement({ visible, onClose }: Props) {
  const [users, setUsers] = useState<User[]>(DUMMY_USERS);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // ── FETCH ALL USERS ──
  // TODO (Backend): Uncomment and use this function when backend is ready
  // Endpoint: GET /admin/users
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: array of User objects
  // const fetchUsers = async () => {
  //   try {
  //     const response = await fetch(`${API_URL}/admin/users`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (response.ok) {
  //       const data = await response.json();
  //       setUsers(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchUsers error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment this useEffect when backend is ready
  // useEffect(() => {
  //   if (visible) fetchUsers();
  // }, [visible]);

  // ── SUSPEND USER ──
  // TODO (Backend): Replace the local state update with real API call
  // Endpoint: PUT /admin/users/{id}/suspend
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: none
  // Returns: updated user object with status: 'suspended'
  const handleSuspend = (user: User) => {
    Alert.alert(
      'Suspend Account',
      `Are you sure you want to suspend ${user.first_name} ${user.last_name}? They will not be able to log in until unsuspended.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            // TODO (Backend): Replace below with API call
            // const response = await fetch(`${API_URL}/admin/users/${user.id}/suspend`, {
            //   method: 'PUT',
            //   headers: { 'Authorization': `Bearer ${adminToken}` },
            // });
            // if (response.ok) { const updated = await response.json(); ... }

            // Temporary local update — remove when backend is ready
            setUsers(prev =>
              prev.map(u => u.id === user.id ? { ...u, status: 'suspended' } : u)
            );
            if (selectedUser?.id === user.id) {
              setSelectedUser(prev => prev ? { ...prev, status: 'suspended' } : null);
            }
            Alert.alert('Done', `${user.first_name} ${user.last_name} has been suspended.`);
          },
        },
      ]
    );
  };

  // ── UNSUSPEND USER ──
  // TODO (Backend): Replace the local state update with real API call
  // Endpoint: PUT /admin/users/{id}/unsuspend
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: none
  // Returns: updated user object with status: 'active'
  const handleUnsuspend = (user: User) => {
    Alert.alert(
      'Unsuspend Account',
      `Restore access for ${user.first_name} ${user.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsuspend',
          onPress: async () => {
            // TODO (Backend): Replace below with API call
            // const response = await fetch(`${API_URL}/admin/users/${user.id}/unsuspend`, {
            //   method: 'PUT',
            //   headers: { 'Authorization': `Bearer ${adminToken}` },
            // });

            // Temporary local update — remove when backend is ready
            setUsers(prev =>
              prev.map(u => u.id === user.id ? { ...u, status: 'active' } : u)
            );
            if (selectedUser?.id === user.id) {
              setSelectedUser(prev => prev ? { ...prev, status: 'active' } : null);
            }
            Alert.alert('Done', `${user.first_name} ${user.last_name} has been unsuspended.`);
          },
        },
      ]
    );
  };

  // ── DELETE USER ──
  // TODO (Backend): Replace the local state update with real API call
  // Endpoint: DELETE /admin/users/{id}
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: 204 No Content on success
  const handleDelete = (user: User) => {
    Alert.alert(
      'Delete Account',
      `Permanently delete ${user.first_name} ${user.last_name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // TODO (Backend): Replace below with API call
            // const response = await fetch(`${API_URL}/admin/users/${user.id}`, {
            //   method: 'DELETE',
            //   headers: { 'Authorization': `Bearer ${adminToken}` },
            // });
            // if (response.status === 204) { ... }

            // Temporary local update — remove when backend is ready
            setUsers(prev => prev.filter(u => u.id !== user.id));
            setSelectedUser(null);
            Alert.alert('Done', 'Account has been permanently deleted.');
          },
        },
      ]
    );
  };

  const filtered = users.filter(u => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Premium' && u.role === 'premium') ||
      (activeFilter === 'Freemium' && u.role === 'freemium') ||
      (activeFilter === 'Suspended' && u.status === 'suspended');
    const matchSearch =
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalCount = users.length;
  const premiumCount = users.filter(u => u.role === 'premium').length;
  const freemiumCount = users.filter(u => u.role === 'freemium').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: totalCount, color: '#111827' },
            { label: 'Premium', value: premiumCount, color: '#10b981' },
            { label: 'Freemium', value: freemiumCount, color: '#6b7280' },
            { label: 'Suspended', value: suspendedCount, color: '#dc2626' },
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
            placeholder="Search by name or email..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          style={styles.pillsScroll}
        >
          {FILTERS.map(f => (
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

        {/* User list */}
        <View style={styles.userList}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyTitle}>No users found</Text>
            </View>
          ) : (
            filtered.map(user => (
              <View key={user.id} style={styles.userCard}>

                {/* Top row */}
                <View style={styles.userTop}>
                  <View style={[styles.avatar, { backgroundColor: user.avatar_color }]}>
                    <Text style={styles.avatarText}>{user.initials}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user.first_name} {user.last_name}
                    </Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    user.status === 'active' ? styles.statusActive : styles.statusSuspended
                  ]}>
                    <Text style={[
                      styles.statusText,
                      user.status === 'active' ? styles.statusTextActive : styles.statusTextSuspended
                    ]}>
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </Text>
                  </View>
                </View>

                {/* Meta row */}
                <View style={styles.metaRow}>
                  <View style={[
                    styles.planBadge,
                    user.role === 'premium' ? styles.planPremium : styles.planFreemium
                  ]}>
                    <Text style={[
                      styles.planText,
                      user.role === 'premium' ? styles.planTextPremium : styles.planTextFreemium
                    ]}>
                      {user.role === 'premium' ? 'Premium' : 'Freemium'}
                    </Text>
                  </View>
                  <Text style={styles.joinedText}>
                    Joined {formatDate(user.joined_at)}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnView]}
                    onPress={() => setSelectedUser(user)}
                  >
                    <Text style={styles.btnViewText}>View</Text>
                  </TouchableOpacity>

                  {user.status === 'active' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnSuspend]}
                      onPress={() => handleSuspend(user)}
                    >
                      <Text style={styles.btnSuspendText}>Suspend</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnUnsuspend]}
                      onPress={() => handleUnsuspend(user)}
                    >
                      <Text style={styles.btnUnsuspendText}>Unsuspend</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnDelete]}
                    onPress={() => handleDelete(user)}
                  >
                    <Text style={styles.btnDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── USER DETAIL MODAL ── */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.safe}>
          <Navbar
            title="User Detail"
            backLabel="Users"
            onClose={() => setSelectedUser(null)}
          />
          {selectedUser && (
            <ScrollView>
              <View style={styles.detailContent}>

                {/* Profile card */}
                <View style={styles.detailCard}>

                  {/* Avatar + name */}
                  <View style={styles.detailAvatarRow}>
                    <View style={[
                      styles.detailAvatar,
                      { backgroundColor: selectedUser.avatar_color }
                    ]}>
                      <Text style={styles.detailAvatarText}>{selectedUser.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailName}>
                        {selectedUser.first_name} {selectedUser.last_name}
                      </Text>
                      <Text style={styles.detailEmail}>{selectedUser.email}</Text>
                      <View style={styles.detailBadgeRow}>
                        <View style={[
                          styles.planBadge,
                          selectedUser.role === 'premium' ? styles.planPremium : styles.planFreemium
                        ]}>
                          <Text style={[
                            styles.planText,
                            selectedUser.role === 'premium'
                              ? styles.planTextPremium
                              : styles.planTextFreemium
                          ]}>
                            {selectedUser.role === 'premium' ? 'Premium' : 'Freemium'}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          selectedUser.status === 'active'
                            ? styles.statusActive
                            : styles.statusSuspended
                        ]}>
                          <Text style={[
                            styles.statusText,
                            selectedUser.status === 'active'
                              ? styles.statusTextActive
                              : styles.statusTextSuspended
                          ]}>
                            {selectedUser.status === 'active' ? 'Active' : 'Suspended'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Account info */}
                  {/* TODO (Backend): These fields will be populated from GET /admin/users/{id} response */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={styles.infoValue}>#{selectedUser.id.padStart(5, '0')}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Joined</Text>
                    <Text style={styles.infoValue}>{formatDate(selectedUser.joined_at)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plan</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.role === 'premium' ? 'Premium' : 'Freemium'}
                    </Text>
                  </View>
                  {selectedUser.premium_start && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Premium since</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(selectedUser.premium_start)}
                      </Text>
                    </View>
                  )}
                  {selectedUser.premium_end && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Premium until</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(selectedUser.premium_end)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[
                      styles.infoValue,
                      { color: selectedUser.status === 'active' ? '#059669' : '#dc2626' }
                    ]}>
                      {selectedUser.status === 'active' ? 'Active' : 'Suspended'}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Account actions */}
                  <Text style={styles.dangerTitle}>ACCOUNT ACTIONS</Text>

                  {selectedUser.status === 'active' ? (
                    <TouchableOpacity
                      style={styles.dangerSuspend}
                      onPress={() => handleSuspend(selectedUser)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dangerSuspendText}>⚠️ Suspend Account</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.dangerUnsuspend}
                      onPress={() => handleUnsuspend(selectedUser)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dangerUnsuspendText}>✅ Unsuspend Account</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.dangerDelete}
                    onPress={() => handleDelete(selectedUser)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dangerDeleteText}>🗑️ Delete Account</Text>
                  </TouchableOpacity>

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
    borderTopWidth: 3, borderTopColor: '#10b981',
    alignItems: 'center',
  },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  pillsScroll: { marginBottom: 14 },
  pillsRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  userList: {},
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },

  userCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  userTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 8,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 11, color: '#6b7280' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  statusActive: { backgroundColor: '#d1fae5' },
  statusSuspended: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#065f46' },
  statusTextSuspended: { color: '#991b1b' },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  planBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  planPremium: { backgroundColor: '#ede9fe' },
  planFreemium: { backgroundColor: '#f3f4f6' },
  planText: { fontSize: 11, fontWeight: '700' },
  planTextPremium: { color: '#5b21b6' },
  planTextFreemium: { color: '#4b5563' },
  joinedText: { fontSize: 11, color: '#9ca3af' },

  actionRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    alignItems: 'center', borderWidth: 1,
  },
  btnView: { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' },
  btnViewText: { fontSize: 11, fontWeight: '700', color: '#065f46' },
  btnSuspend: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  btnSuspendText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  btnUnsuspend: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  btnUnsuspendText: { fontSize: 11, fontWeight: '700', color: '#065f46' },
  btnDelete: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  btnDeleteText: { fontSize: 11, fontWeight: '700', color: '#991b1b' },

  detailContent: { padding: 16, paddingBottom: 40 },
  detailCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  detailAvatarRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 16,
  },
  detailAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  detailAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  detailName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 3 },
  detailEmail: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  detailBadgeRow: { flexDirection: 'row', gap: 6 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#f9fafb',
  },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

  dangerTitle: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 0.8, marginBottom: 10,
  },
  dangerSuspend: {
    backgroundColor: '#fef3c7', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: '#fde68a',
  },
  dangerSuspendText: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  dangerUnsuspend: {
    backgroundColor: '#d1fae5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: '#6ee7b7',
  },
  dangerUnsuspendText: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  dangerDelete: {
    backgroundColor: '#fee2e2', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  dangerDeleteText: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
});