import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../constants/api';

// ── DUMMY USERS ──
// TODO (Backend): Replace with real data from GET /admin/users
// Returns: array of User objects
const DUMMY_USERS = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'freemium',
    status: 'active',
    joined_at: '2026-01-12T00:00:00',
    last_active: '2026-03-23T00:00:00',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    role: 'premium',
    status: 'active',
    joined_at: '2026-01-20T00:00:00',
    last_active: '2026-03-24T00:00:00',
  },
  {
    id: '3',
    first_name: 'Alex',
    last_name: 'Lee',
    email: 'alex@example.com',
    role: 'nutritionist',
    status: 'active',
    joined_at: '2026-02-05T00:00:00',
    last_active: '2026-03-25T00:00:00',
  },
  {
    id: '4',
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@nutritrack.com',
    role: 'admin',
    status: 'active',
    joined_at: '2026-01-01T00:00:00',
    last_active: '2026-03-25T00:00:00',
  },
  {
    id: '5',
    first_name: 'Sarah',
    last_name: 'Tan',
    email: 'sarah@example.com',
    role: 'freemium',
    status: 'suspended',
    joined_at: '2026-02-10T00:00:00',
    last_active: '2026-03-10T00:00:00',
  },
  {
    id: '6',
    first_name: 'Mike',
    last_name: 'Wong',
    email: 'mike@example.com',
    role: 'premium',
    status: 'active',
    joined_at: '2026-02-15T00:00:00',
    last_active: '2026-03-24T00:00:00',
  },
];

type User = typeof DUMMY_USERS[0];

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── FILTER PILLS ──
const FILTERS = ['All', 'Admin', 'Nutritionist', 'Premium', 'Freemium', 'Suspended'];

// ── ROLE DISPLAY CONFIG ──
const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin:        { bg: '#d1fae5', text: '#065f46', label: 'Admin'        },
  nutritionist: { bg: '#fff7ed', text: '#c2410c', label: 'Nutritionist' },
  premium:      { bg: '#ede9fe', text: '#5b21b6', label: 'Premium'      },
  freemium:     { bg: '#f3f4f6', text: '#4b5563', label: 'Freemium'     },
};

// ── AVATAR COLOURS ──
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
  if (days === 0)  return 'Today';
  if (days === 1)  return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
};

// ── BLANK CREATE FORM ──
const blankForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'admin',
};

export default function UserManagement({ visible, onClose }: Props) {
  const [users, setUsers]             = useState<User[]>(DUMMY_USERS);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetail, setShowDetail]   = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // ── CREATE FORM STATE ──
  const [form, setForm]     = useState(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── FETCH USERS ──
  // TODO (Backend): Uncomment when backend is ready
  // Endpoint: GET /admin/users
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: array of User objects with id, first_name, last_name,
  //          email, role, status, joined_at, last_active
  // const fetchUsers = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/users`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setUsers(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchUsers error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment when backend is ready
  // useEffect(() => {
  //   if (visible) fetchUsers();
  // }, [visible]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim())  newErrors.last_name  = 'Last name is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) newErrors.email = 'Enter a valid email address';
    if (form.password.length < 6)    newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── CREATE USER ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: POST /admin/users
  // Headers: { Authorization: Bearer <admin_token>, Content-Type: application/json }
  // Body: { first_name, last_name, email, password, role }
  // Returns: created User object with id, joined_at etc set by backend
  // Note: all admin accounts have equal rights — no hierarchy
  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      // TODO (Backend): Replace below with API call
      // const res = await fetch(`${API_URL}/admin/users`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${adminToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(form),
      // });
      // if (res.ok) {
      //   const newUser = await res.json();
      //   setUsers(prev => [newUser, ...prev]);
      // }

      // Temporary local update — remove when backend is ready
      const newUser: User = {
        id: Date.now().toString(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: 'active',
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      };
      setUsers(prev => [newUser, ...prev]);
      setShowCreateForm(false);
      setForm(blankForm);
      setErrors({});
      Alert.alert('User Created ✅', `${form.first_name} ${form.last_name} has been created as ${ROLE_CONFIG[form.role].label}.`);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── UPGRADE TO PREMIUM ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: PUT /admin/users/{id}/upgrade
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: { role: 'premium' }
  // Returns: updated User object
  const handleUpgrade = (user: User) => {
    Alert.alert(
      'Upgrade to Premium',
      `Upgrade ${user.first_name} ${user.last_name} to Premium?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/admin/users/${user.id}/upgrade`, {
              //   method: 'PUT',
              //   headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              //   body: JSON.stringify({ role: 'premium' }),
              // });
              // if (res.ok) { const updated = await res.json(); setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); }

              // Temporary local update — remove when backend is ready
              setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, role: 'premium' } : u
              ));
              setSelectedUser(prev => prev ? { ...prev, role: 'premium' } : prev);
              Alert.alert('Upgraded ✅', `${user.first_name} is now a Premium user.`);
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── DOWNGRADE TO FREEMIUM ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: PUT /admin/users/{id}/downgrade
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: { role: 'freemium' }
  // Returns: updated User object
  const handleDowngrade = (user: User) => {
    Alert.alert(
      'Downgrade to Freemium',
      `Downgrade ${user.first_name} ${user.last_name} to Freemium?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/admin/users/${user.id}/downgrade`, {
              //   method: 'PUT',
              //   headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              //   body: JSON.stringify({ role: 'freemium' }),
              // });
              // if (res.ok) { const updated = await res.json(); setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); }

              // Temporary local update — remove when backend is ready
              setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, role: 'freemium' } : u
              ));
              setSelectedUser(prev => prev ? { ...prev, role: 'freemium' } : prev);
              Alert.alert('Downgraded', `${user.first_name} has been moved to Freemium.`);
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── REMOVE NUTRITIONIST ROLE ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: PUT /admin/users/{id}/role
  // Headers: { Authorization: Bearer <admin_token> }
  // Body: { role: 'freemium' }
  // Returns: updated User object
  // Note: demotes nutritionist back to freemium
  const handleRemoveNutritionist = (user: User) => {
    Alert.alert(
      'Remove Nutritionist Role',
      `Remove nutritionist role from ${user.first_name} ${user.last_name}? They will become a Freemium user.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Role',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/admin/users/${user.id}/role`, {
              //   method: 'PUT',
              //   headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              //   body: JSON.stringify({ role: 'freemium' }),
              // });
              // if (res.ok) { const updated = await res.json(); setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); }

              // Temporary local update — remove when backend is ready
              setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, role: 'freemium' } : u
              ));
              setSelectedUser(prev => prev ? { ...prev, role: 'freemium' } : prev);
              Alert.alert('Role Removed', `${user.first_name} is now a Freemium user.`);
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── SUSPEND / UNSUSPEND ──
  // TODO (Backend): Uncomment API calls and remove dummy local updates when backend is ready
  // Suspend:   PUT /admin/users/{id}/suspend
  // Unsuspend: PUT /admin/users/{id}/unsuspend
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: updated User object
  const handleSuspend = (user: User) => {
    const isSuspended = user.status === 'suspended';
    Alert.alert(
      isSuspended ? 'Unsuspend User' : 'Suspend User',
      `${isSuspended ? 'Unsuspend' : 'Suspend'} ${user.first_name} ${user.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuspended ? 'Unsuspend' : 'Suspend',
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const endpoint = isSuspended ? 'unsuspend' : 'suspend';
              // const res = await fetch(`${API_URL}/admin/users/${user.id}/${endpoint}`, {
              //   method: 'PUT',
              //   headers: { 'Authorization': `Bearer ${adminToken}` },
              // });
              // if (res.ok) { const updated = await res.json(); setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); }

              // Temporary local update — remove when backend is ready
              const newStatus = isSuspended ? 'active' : 'suspended';
              setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, status: newStatus } : u
              ));
              setSelectedUser(prev => prev ? { ...prev, status: newStatus } : prev);
              Alert.alert(
                isSuspended ? 'Unsuspended ✅' : 'Suspended',
                `${user.first_name} has been ${isSuspended ? 'unsuspended' : 'suspended'}.`
              );
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── DELETE USER ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: DELETE /admin/users/{id}
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: 204 No Content
  const handleDelete = (user: User) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.first_name} ${user.last_name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
              //   method: 'DELETE',
              //   headers: { 'Authorization': `Bearer ${adminToken}` },
              // });
              // if (res.status === 204) { setUsers(prev => prev.filter(u => u.id !== user.id)); }

              // Temporary local update — remove when backend is ready
              setUsers(prev => prev.filter(u => u.id !== user.id));
              setShowDetail(false);
              setSelectedUser(null);
              Alert.alert('Deleted', `${user.first_name} has been permanently deleted.`);
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── FILTERED USERS ──
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

  // ── STATS ──
  const totalCount       = users.length;
  const premiumCount     = users.filter(u => u.role === 'premium').length;
  const freemiumCount    = users.filter(u => u.role === 'freemium').length;
  const suspendedCount   = users.filter(u => u.status === 'suspended').length;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── STATS ROW ── */}
        {/* TODO (Backend): Counts derived from GET /admin/users response */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total',     value: totalCount,     color: '#111827' },
            { label: 'Premium',   value: premiumCount,   color: '#5b21b6' },
            { label: 'Freemium',  value: freemiumCount,  color: '#6b7280' },
            { label: 'Suspended', value: suspendedCount, color: '#dc2626' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

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
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyTitle}>No users found</Text>
          </View>
        ) : (
          filtered.map(user => {
            const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.freemium;
            return (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userTop}>
                  <View style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(user.id) }
                  ]}>
                    <Text style={styles.avatarText}>
                      {getInitials(user.first_name, user.last_name)}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user.first_name} {user.last_name}
                    </Text>
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
                    onPress={() => { setSelectedUser(user); setShowDetail(true); }}
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

                {/* First name */}
                <Text style={styles.fieldLabel}>First name *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.first_name ? styles.inputError : null]}
                  placeholder="e.g. Sarah"
                  placeholderTextColor="#9ca3af"
                  value={form.first_name}
                  onChangeText={v => { setForm(p => ({ ...p, first_name: v })); setErrors(p => ({ ...p, first_name: '' })); }}
                />
                {errors.first_name ? <Text style={styles.errorText}>{errors.first_name}</Text> : null}

                {/* Last name */}
                <Text style={styles.fieldLabel}>Last name *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.last_name ? styles.inputError : null]}
                  placeholder="e.g. Tan"
                  placeholderTextColor="#9ca3af"
                  value={form.last_name}
                  onChangeText={v => { setForm(p => ({ ...p, last_name: v })); setErrors(p => ({ ...p, last_name: '' })); }}
                />
                {errors.last_name ? <Text style={styles.errorText}>{errors.last_name}</Text> : null}

                {/* Email */}
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

                {/* Password */}
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

                {/* Role */}
                <Text style={styles.fieldLabel}>Role *</Text>
                <View style={styles.roleRow}>
                    {[
                      { key: 'admin',        label: 'Admin'        },
                      { key: 'nutritionist', label: 'Nutritionist' },
                    ].map(r => (
                    <TouchableOpacity
                      key={r.key}
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

                {/* Info box for admin role */}
                {form.role === 'admin' && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      ℹ️ Admin accounts have full access to all admin pages. All admins have equal rights with no hierarchy.
                    </Text>
                  </View>
                )}

                {/* Info box for nutritionist role */}
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

                  {/* Avatar */}
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

                  {/* Role badge */}
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

                  {/* Info rows */}
                  {[
                    { label: 'Joined',      value: formatDate(selectedUser.joined_at)   },
                    { label: 'Last active', value: timeAgo(selectedUser.last_active)    },
                    { label: 'Status',      value: selectedUser.status === 'suspended' ? 'Suspended' : 'Active' },
                  ].map(row => (
                    <View key={row.label} style={styles.detailRow}>
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

                  {/* ── ROLE ACTIONS ── */}
                  {/* Only show role actions for non-admin users */}
                  {selectedUser.role !== 'admin' && (
                    <>
                      <Text style={styles.sectionDivider}>Role Actions</Text>

                      {/* Freemium → upgrade to premium */}
                      {selectedUser.role === 'freemium' && (
                        <TouchableOpacity
                          style={styles.roleActionBtn}
                          onPress={() => handleUpgrade(selectedUser)}
                        >
                          <Text style={styles.roleActionBtnText}>⬆️ Upgrade to Premium</Text>
                        </TouchableOpacity>
                      )}

                      {/* Premium → downgrade to freemium */}
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

                      {/* Nutritionist → remove role */}
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

                  {/* ── ACCOUNT ACTIONS ── */}
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
  suspendedTag: {
    fontSize: 10, color: '#dc2626', fontWeight: '600', marginTop: 2,
  },
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

  // ── Modal navbar ──
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

  // ── Form ──
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
  infoBoxOrange: {
    backgroundColor: '#fff7ed',
    borderLeftColor: '#f59e0b',
  },
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

  // ── Detail modal ──
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
  roleActionBtnText: {
    fontSize: 13, fontWeight: '700', color: '#065f46',
  },

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