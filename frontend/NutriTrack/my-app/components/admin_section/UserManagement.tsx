import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/api';

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'nutritionist' | 'premium' | 'freemium';
  status: 'active' | 'suspended';
  joined_at: string;
  last_active: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FILTERS = ['All', 'Admin', 'Nutritionist', 'Premium', 'Freemium', 'Suspended'];

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin:        { bg: '#d1fae5', text: '#065f46', label: 'Admin'        },
  nutritionist: { bg: '#fff7ed', text: '#c2410c', label: 'Nutritionist' },
  premium:      { bg: '#ede9fe', text: '#5b21b6', label: 'Premium'      },
  freemium:     { bg: '#f3f4f6', text: '#4b5563', label: 'Freemium'     },
};

const AVATAR_COLORS = [
  '#10b981', '#6ee7b7', '#8b5cf6', '#f59e0b',
  '#3b82f6', '#ef4444', '#ec4899', '#14b8a6',
];

const getAvatarColor = (id: string): string =>
  AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length];

const getInitials = (first: string, last: string): string =>
  `${first[0]}${last[0]}`.toUpperCase();

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

const timeAgo = (dateStr: string): string => {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
};

// ── MAP BACKEND RESPONSE TO FRONTEND TYPE ──
// New backend AdminUserResponse uses:
//   user_id (int), suspended (bool), created_at, role (UserRole enum)
// Old backend used: id (int), status (string), joined_at
// This mapper handles both versions safely
const mapUser = (u: any): User => ({
  id:          String(u.user_id ?? u.id),
  first_name:  u.first_name,
  last_name:   u.last_name,
  email:       u.email,
  role:        u.role,
  status:      u.suspended !== undefined
                 ? (u.suspended ? 'suspended' : 'active')
                 : (u.status ?? 'active'),
  joined_at:   u.created_at ?? u.joined_at,
  last_active: u.last_active ?? u.created_at,
});

const blankForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'admin',
};

export default function UserManagement({ visible, onClose }: Props) {
  const [users, setUsers]                       = useState<User[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [search, setSearch]                     = useState('');
  const [activeFilter, setActiveFilter]         = useState('All');
  const [selectedUser, setSelectedUser]         = useState<User | null>(null);
  const [showDetail, setShowDetail]             = useState(false);
  const [showCreateForm, setShowCreateForm]     = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [form, setForm]                         = useState(blankForm);
  const [errors, setErrors]                     = useState<Record<string, string>>({});
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [upgradingUser, setUpgradingUser]       = useState<User | null>(null);

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH ALL USERS ──
  // Endpoint: GET /admin/users
  // Headers: { Authorization: Bearer <token> }
  // Returns: array of AdminUserResponse
  // Each: { user_id, first_name, last_name, email,
  //         role, suspended, created_at }
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map(mapUser));
      } else {
        console.log('fetchUsers failed:', res.status);
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchUsers();
  }, [visible]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim())  newErrors.last_name  = 'Last name is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) newErrors.email = 'Enter a valid email address';
    if (form.password.length < 6)     newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── CREATE USER ──
  // Endpoint: POST /admin/users
  // Body: { first_name, last_name, email, password, role }
  // Returns: AdminUserResponse (201 Created)
  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          email:      form.email.trim(),
          password:   form.password,
          role:       form.role,
        }),
      });
      if (res.status === 201) {
        const newUser = await res.json();
        setUsers(prev => [mapUser(newUser), ...prev]);
        setShowCreateForm(false);
        setForm(blankForm);
        setErrors({});
        Alert.alert(
          'User Created ✅',
          `${form.first_name} ${form.last_name} has been created as ${ROLE_CONFIG[form.role]?.label ?? form.role}.`
        );
      } else {
        const err = await res.json();
        if (res.status === 409) {
          setErrors({ email: 'This email is already registered' });
        } else {
          Alert.alert('Error', err.detail || 'Failed to create user.');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── UPGRADE TO PREMIUM ──
  // Shows plan selector first then calls the unified role endpoint
  // Endpoint: PUT /admin/users/{user_id}/role
  // Body: { new_role: 'premium' }
  // Returns: 204 No Content
  const handleUpgrade = (u: User) => {
    setUpgradingUser({ ...u });
    setShowPlanSelector(true);
  };

  const confirmUpgrade = async (plan: 'monthly' | 'annual') => {
    const targetUser = upgradingUser;
    if (!targetUser) return;
    setShowPlanSelector(false);
    const planLabel = plan === 'monthly' ? 'Monthly (S$9.90/mo)' : 'Annual (S$99.00/yr)';
    Alert.alert(
      'Upgrade to Premium',
      `Upgrade ${targetUser.first_name} ${targetUser.last_name} to Premium — ${planLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;
              const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ new_role: 'premium' }),
              });
              if (res.status === 204) {
                const updatedUser: User = { ...targetUser, role: 'premium' };
                setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
                setSelectedUser(updatedUser);
                Alert.alert('Upgraded ✅', `${targetUser.first_name} is now a Premium user.`);
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to upgrade user.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setUpgradingUser(null);
            }
          },
        },
      ]
    );
  };

  // ── DOWNGRADE TO FREEMIUM ──
  // Endpoint: PUT /admin/users/{user_id}/role
  // Body: { new_role: 'freemium' }
  // Returns: 204 No Content
  const handleDowngrade = (u: User) => {
    const targetUser = { ...u };
    Alert.alert(
      'Downgrade to Freemium',
      `Downgrade ${targetUser.first_name} ${targetUser.last_name} to Freemium? Their active subscription will be cancelled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;
              const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ new_role: 'freemium' }),
              });
              if (res.status === 204) {
                const updatedUser: User = { ...targetUser, role: 'freemium' };
                setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
                setSelectedUser(updatedUser);
                Alert.alert('Downgraded', `${targetUser.first_name} has been moved to Freemium.`);
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to downgrade user.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── REMOVE NUTRITIONIST ROLE ──
  // Endpoint: PUT /admin/users/{user_id}/role
  // Body: { new_role: 'freemium' }
  // Returns: 204 No Content
  const handleRemoveNutritionist = (u: User) => {
    const targetUser = { ...u };
    Alert.alert(
      'Remove Nutritionist Role',
      `Remove nutritionist role from ${targetUser.first_name} ${targetUser.last_name}? They will become a Freemium user.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Role',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;
              const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ new_role: 'freemium' }),
              });
              if (res.status === 204) {
                const updatedUser: User = { ...targetUser, role: 'freemium' };
                setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
                setSelectedUser(updatedUser);
                Alert.alert('Role Removed', `${targetUser.first_name} is now a Freemium user.`);
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to remove role.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── SUSPEND / UNSUSPEND ──
  // Suspend:   PUT /admin/users/{user_id}/suspend
  // Unsuspend: PUT /admin/users/{user_id}/unsuspend
  // Returns: 204 No Content (no body returned)
  // Update locally after 204 — do not try to parse response body
  const handleSuspend = (u: User) => {
    const targetUser = { ...u };
    const isSuspended = targetUser.status === 'suspended';
    Alert.alert(
      isSuspended ? 'Unsuspend User' : 'Suspend User',
      `${isSuspended ? 'Unsuspend' : 'Suspend'} ${targetUser.first_name} ${targetUser.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuspended ? 'Unsuspend' : 'Suspend',
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;
              const endpoint = isSuspended ? 'unsuspend' : 'suspend';
              const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/${endpoint}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (res.status === 204) {
                const newStatus = isSuspended ? 'active' : 'suspended';
                const updatedUser: User = { ...targetUser, status: newStatus };
                setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
                setSelectedUser(updatedUser);
                Alert.alert(
                  isSuspended ? 'Unsuspended ✅' : 'Suspended',
                  `${targetUser.first_name} has been ${isSuspended ? 'unsuspended' : 'suspended'}.`
                );
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to update user.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── DELETE USER ──
  // Endpoint: DELETE /admin/users/{user_id}
  // Returns: 204 No Content
  const handleDelete = (u: User) => {
    const targetUser = { ...u };
    Alert.alert(
      'Delete User',
      `Permanently delete ${targetUser.first_name} ${targetUser.last_name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;
              const res = await fetch(`${API_URL}/admin/users/${targetUser.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (res.status === 204) {
                setUsers(prev => prev.filter(u => u.id !== targetUser.id));
                setShowDetail(false);
                setSelectedUser(null);
                Alert.alert('Deleted', `${targetUser.first_name} has been permanently deleted.`);
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to delete user.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const filtered = users.filter(u => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Admin'        && u.role === 'admin')        ||
      (activeFilter === 'Nutritionist' && u.role === 'nutritionist') ||
      (activeFilter === 'Premium'      && u.role === 'premium')      ||
      (activeFilter === 'Freemium'     && u.role === 'freemium')     ||
      (activeFilter === 'Suspended'    && u.status === 'suspended');
    const matchSearch =
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalCount     = users.length;
  const premiumCount   = users.filter(u => u.role === 'premium').length;
  const freemiumCount  = users.filter(u => u.role === 'freemium').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total',     value: totalCount,     color: '#111827' },
            { label: 'Premium',   value: premiumCount,   color: '#5b21b6' },
            { label: 'Freemium',  value: freemiumCount,  color: '#6b7280' },
            { label: 'Suspended', value: suspendedCount, color: '#dc2626' },
          ].map(s => (
            <View key={`stat-${s.label}`} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        )}

        {/* Create user button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => { setForm(blankForm); setErrors({}); setShowCreateForm(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>＋  Create New User</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
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
              key={`filter-${f}`}
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
        {!loading && filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyTitle}>No users found</Text>
          </View>
        ) : (
          filtered.map(user => {
            const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.freemium;
            return (
              <View key={`user-${user.id}`} style={styles.userCard}>
                <View style={styles.userTop}>
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(user.id) }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(user.first_name, user.last_name)}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    {user.status === 'suspended' && (
                      <Text style={styles.suspendedTag}>Suspended</Text>
                    )}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: role.text }]}>
                      {role.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.btnView]}
                    onPress={() => { setSelectedUser({ ...user }); setShowDetail(true); }}
                  >
                    <Text style={styles.btnViewText}>👁 View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.btnSuspend]}
                    onPress={() => handleSuspend(user)}
                  >
                    <Text style={styles.btnSuspendText}>
                      {user.status === 'suspended' ? '▶ Unsuspend' : '⏸ Suspend'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.btnDelete]}
                    onPress={() => handleDelete(user)}
                  >
                    <Text style={styles.btnDeleteText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── PLAN SELECTOR MODAL ── */}
      <Modal visible={showPlanSelector} animationType="fade" transparent>
        <View style={styles.planOverlay}>
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>Choose Plan</Text>
            <Text style={styles.planSub}>
              Select a subscription plan for {upgradingUser?.first_name}
            </Text>
            <TouchableOpacity
              style={styles.planOption}
              onPress={() => confirmUpgrade('monthly')}
            >
              <Text style={styles.planOptionTitle}>Monthly</Text>
              <Text style={styles.planOptionPrice}>S$9.90 / month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.planOption, styles.planOptionAnnual]}
              onPress={() => confirmUpgrade('annual')}
            >
              <Text style={styles.planOptionTitle}>Annual</Text>
              <Text style={styles.planOptionPrice}>S$99.00 / year</Text>
              <Text style={styles.planSavings}>Save S$19.80</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.planCancel}
              onPress={() => { setShowPlanSelector(false); setUpgradingUser(null); }}
            >
              <Text style={styles.planCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── CREATE USER MODAL ── */}
      <Modal visible={showCreateForm} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.modalNavbar}>
            <TouchableOpacity
              style={styles.modalBackBtn}
              onPress={() => { setShowCreateForm(false); setForm(blankForm); setErrors({}); }}
            >
              <Text style={styles.modalBackArrow}>‹</Text>
              <Text style={styles.modalBackText}>Users</Text>
            </TouchableOpacity>
            <Text style={styles.modalNavTitle}>Create New User</Text>
            <View style={styles.modalNavSpacer} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formContent}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>➕ Create New User</Text>
                <Text style={styles.formSub}>
                  Create an admin or nutritionist account. Regular user accounts are created through the sign up flow.
                </Text>

                <Text style={styles.fieldLabel}>First name *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.first_name ? styles.inputError : null]}
                  placeholder="e.g. Sarah"
                  placeholderTextColor="#9ca3af"
                  value={form.first_name}
                  onChangeText={v => { setForm(p => ({ ...p, first_name: v })); setErrors(p => ({ ...p, first_name: '' })); }}
                />
                {errors.first_name ? <Text style={styles.errorText}>{errors.first_name}</Text> : null}

                <Text style={styles.fieldLabel}>Last name *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.last_name ? styles.inputError : null]}
                  placeholder="e.g. Tan"
                  placeholderTextColor="#9ca3af"
                  value={form.last_name}
                  onChangeText={v => { setForm(p => ({ ...p, last_name: v })); setErrors(p => ({ ...p, last_name: '' })); }}
                />
                {errors.last_name ? <Text style={styles.errorText}>{errors.last_name}</Text> : null}

                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.email ? styles.inputError : null]}
                  placeholder="e.g. sarah@nutritrack.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={v => { setForm(p => ({ ...p, email: v })); setErrors(p => ({ ...p, email: '' })); }}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                <Text style={styles.fieldLabel}>Password *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.password ? styles.inputError : null]}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={form.password}
                  onChangeText={v => { setForm(p => ({ ...p, password: v })); setErrors(p => ({ ...p, password: '' })); }}
                />
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                <Text style={styles.fieldLabel}>Role *</Text>
                <View style={styles.roleRow}>
                  {[
                    { key: 'admin',        label: 'Admin'        },
                    { key: 'nutritionist', label: 'Nutritionist' },
                  ].map(r => (
                    <TouchableOpacity
                      key={`role-${r.key}`}
                      style={[styles.rolePill, form.role === r.key && styles.rolePillActive]}
                      onPress={() => setForm(p => ({ ...p, role: r.key }))}
                    >
                      <Text style={[
                        styles.rolePillText,
                        form.role === r.key && styles.rolePillTextActive
                      ]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {form.role === 'admin' && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      ℹ️ Admin accounts have full access to all admin pages. All admins have equal rights with no hierarchy.
                    </Text>
                  </View>
                )}

                {form.role === 'nutritionist' && (
                  <View style={[styles.infoBox, styles.infoBoxOrange]}>
                    <Text style={[styles.infoText, styles.infoTextOrange]}>
                      ℹ️ Nutritionist accounts can accept consultation bookings from Premium users.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                  onPress={handleCreate}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>
                    {submitting ? 'Creating...' : 'Create User'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowCreateForm(false); setForm(blankForm); setErrors({}); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── USER DETAIL MODAL ── */}
      {selectedUser && (
        <Modal visible={showDetail} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <View style={styles.modalNavbar}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => { setShowDetail(false); setSelectedUser(null); }}
              >
                <Text style={styles.modalBackArrow}>‹</Text>
                <Text style={styles.modalBackText}>Users</Text>
              </TouchableOpacity>
              <Text style={styles.modalNavTitle}>User Details</Text>
              <View style={styles.modalNavSpacer} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formContent}>
                <View style={styles.formCard}>

                  <View style={[
                    styles.detailAvatar,
                    { backgroundColor: getAvatarColor(selectedUser.id) }
                  ]}>
                    <Text style={styles.detailAvatarText}>
                      {getInitials(selectedUser.first_name, selectedUser.last_name)}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>
                    {selectedUser.first_name} {selectedUser.last_name}
                  </Text>
                  <Text style={styles.detailEmail}>{selectedUser.email}</Text>

                  <View style={styles.detailBadgeRow}>
                    <View style={[
                      styles.roleBadge,
                      { backgroundColor: ROLE_CONFIG[selectedUser.role]?.bg || '#f3f4f6' }
                    ]}>
                      <Text style={[
                        styles.roleBadgeText,
                        { color: ROLE_CONFIG[selectedUser.role]?.text || '#4b5563' }
                      ]}>
                        {ROLE_CONFIG[selectedUser.role]?.label || selectedUser.role}
                      </Text>
                    </View>
                    {selectedUser.status === 'suspended' && (
                      <View style={styles.suspendedBadge}>
                        <Text style={styles.suspendedBadgeText}>Suspended</Text>
                      </View>
                    )}
                  </View>

                  {[
                    { label: 'Joined',      value: formatDate(selectedUser.joined_at)  },
                    { label: 'Last active', value: timeAgo(selectedUser.last_active)   },
                    { label: 'Status',      value: selectedUser.status === 'suspended' ? 'Suspended' : 'Active' },
                  ].map(row => (
                    <View key={`detail-${row.label}`} style={styles.detailRow}>
                      <Text style={styles.detailLbl}>{row.label}</Text>
                      <Text style={[
                        styles.detailVal,
                        row.label === 'Status' && selectedUser.status === 'suspended'
                          ? { color: '#dc2626' }
                          : row.label === 'Status'
                          ? { color: '#10b981' }
                          : {}
                      ]}>
                        {row.value}
                      </Text>
                    </View>
                  ))}

                  {selectedUser.role !== 'admin' && (
                    <>
                      <Text style={styles.sectionDivider}>Role Actions</Text>
                      {selectedUser.role === 'freemium' && (
                        <TouchableOpacity
                          style={styles.roleActionBtn}
                          onPress={() => handleUpgrade(selectedUser)}
                        >
                          <Text style={styles.roleActionBtnText}>⬆️ Upgrade to Premium</Text>
                        </TouchableOpacity>
                      )}
                      {selectedUser.role === 'premium' && (
                        <TouchableOpacity
                          style={[styles.roleActionBtn, styles.roleActionBtnYellow]}
                          onPress={() => handleDowngrade(selectedUser)}
                        >
                          <Text style={[styles.roleActionBtnText, { color: '#92400e' }]}>
                            ⬇️ Downgrade to Freemium
                          </Text>
                        </TouchableOpacity>
                      )}
                      {selectedUser.role === 'nutritionist' && (
                        <TouchableOpacity
                          style={[styles.roleActionBtn, styles.roleActionBtnPurple]}
                          onPress={() => handleRemoveNutritionist(selectedUser)}
                        >
                          <Text style={[styles.roleActionBtnText, { color: '#5b21b6' }]}>
                            👤 Remove Nutritionist Role
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  <Text style={styles.sectionDivider}>Account Actions</Text>
                  <View style={styles.accountActionsRow}>
                    <TouchableOpacity
                      style={[styles.accountActionBtn, styles.btnSuspendDetail]}
                      onPress={() => handleSuspend(selectedUser)}
                    >
                      <Text style={styles.btnSuspendDetailText}>
                        {selectedUser.status === 'suspended' ? '▶ Unsuspend' : '⏸ Suspend'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.accountActionBtn, styles.btnDeleteDetail]}
                      onPress={() => handleDelete(selectedUser)}
                    >
                      <Text style={styles.btnDeleteDetailText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  main: { flex: 1, padding: 14 },
  safe: { flex: 1, backgroundColor: '#fff' },

  loadingBox: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#9ca3af' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    borderTopWidth: 3, borderTopColor: '#10b981', alignItems: 'center',
  },
  statVal: { fontSize: 16, fontWeight: '700' },
  statLbl: { fontSize: 9, color: '#6b7280', marginTop: 2, textAlign: 'center' },

  createBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 12,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  pillsScroll: { marginBottom: 12 },
  pillsRow: { gap: 8, paddingVertical: 2 },
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

  userCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 11, color: '#9ca3af' },
  suspendedTag: { fontSize: 10, color: '#dc2626', fontWeight: '600', marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: 6 },
  cardBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    alignItems: 'center', borderWidth: 1,
  },
  btnView:        { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' },
  btnViewText:    { fontSize: 11, fontWeight: '700', color: '#065f46' },
  btnSuspend:     { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  btnSuspendText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  btnDelete:      { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  btnDeleteText:  { fontSize: 11, fontWeight: '700', color: '#991b1b' },

  planOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  planCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 20, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 8,
  },
  planTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  planSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  planOption: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#10b981',
  },
  planOptionAnnual: { backgroundColor: '#ede9fe', borderColor: '#8b5cf6' },
  planOptionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  planOptionPrice: { fontSize: 13, color: '#6b7280' },
  planSavings: { fontSize: 11, color: '#10b981', fontWeight: '700', marginTop: 3 },
  planCancel: {
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    backgroundColor: '#fff', marginTop: 4,
  },
  planCancelText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },

  modalNavbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
  },
  modalBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  modalBackArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  modalBackText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
  modalNavTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 60,
  },
  modalNavSpacer: { width: 60 },

  formContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  formSub: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', marginBottom: 4,
  },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, marginTop: 2 },

  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  rolePill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  rolePillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  rolePillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  rolePillTextActive: { color: '#fff' },

  infoBox: {
    backgroundColor: '#dbeafe', borderRadius: 10,
    padding: 10, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
  },
  infoBoxOrange: { backgroundColor: '#fff7ed', borderLeftColor: '#f59e0b' },
  infoText: { fontSize: 12, color: '#1e40af', lineHeight: 18 },
  infoTextOrange: { color: '#92400e' },

  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#6ee7b7' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },

  detailAvatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 10,
  },
  detailAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  detailName: {
    fontSize: 16, fontWeight: '800', color: '#111827',
    textAlign: 'center', marginBottom: 4,
  },
  detailEmail: {
    fontSize: 12, color: '#9ca3af',
    textAlign: 'center', marginBottom: 12,
  },
  detailBadgeRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginBottom: 14,
  },
  suspendedBadge: {
    backgroundColor: '#fee2e2', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 10,
  },
  suspendedBadgeText: { fontSize: 10, fontWeight: '700', color: '#dc2626' },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
  },
  detailLbl: { fontSize: 13, color: '#6b7280' },
  detailVal: { fontSize: 13, fontWeight: '600', color: '#111827' },

  sectionDivider: {
    fontSize: 12, fontWeight: '700', color: '#374151',
    marginTop: 16, marginBottom: 10,
  },

  roleActionBtn: {
    backgroundColor: '#d1fae5', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#6ee7b7', marginBottom: 8,
  },
  roleActionBtnYellow: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  roleActionBtnPurple: { backgroundColor: '#ede9fe', borderColor: '#c4b5fd' },
  roleActionBtnText: { fontSize: 13, fontWeight: '700', color: '#065f46' },

  accountActionsRow: { flexDirection: 'row', gap: 8 },
  accountActionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', borderWidth: 1,
  },
  btnSuspendDetail:     { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  btnSuspendDetailText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  btnDeleteDetail:      { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  btnDeleteDetailText:  { fontSize: 13, fontWeight: '700', color: '#991b1b' },
});