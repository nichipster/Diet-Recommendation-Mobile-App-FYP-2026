import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native';

// ── DUMMY AUDIT LOGS ──
// TODO (Backend): Replace with real data from GET /admin/audit-logs
// Returns: array of AuditLog objects sorted by timestamp descending
// Backend must automatically log every sensitive admin action:
//   - Admin views a user profile         → type: 'data_access'
//   - Admin creates a user               → type: 'user_action'
//   - Admin suspends/unsuspends a user   → type: 'user_action'
//   - Admin deletes a user               → type: 'user_action'
//   - Admin upgrades/downgrades a user   → type: 'user_action'
//   - Admin sends a notification         → type: 'user_action'
//   - Admin adds/edits/deletes food      → type: 'user_action'
//   - Failed login to admin panel        → type: 'warning'
//   - Bulk data access (export)          → type: 'warning'
//   - System events (API limit etc)      → type: 'system'
//   - Admin login/logout                 → type: 'auth'
const DUMMY_LOGS = [
  {
    id: '1',
    action: 'Viewed user profile',
    detail: 'Admin accessed personal data of john@example.com',
    type: 'data_access',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-16T14:32:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '2',
    action: 'Created nutritionist account',
    detail: 'New account created for sarah@nutritrack.com',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-16T13:15:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '3',
    action: 'Suspended user account',
    detail: 'Account suspended for sarah@example.com',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-16T11:48:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '4',
    action: 'Failed login attempt',
    detail: '3 consecutive failed login attempts to admin panel from unknown IP',
    type: 'warning',
    admin_email: 'unknown',
    timestamp: '2026-04-16T10:22:00',
    ip_address: '203.45.12.88',
  },
  {
    id: '5',
    action: 'Admin logged in',
    detail: 'Successful login to admin panel',
    type: 'auth',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-16T09:00:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '6',
    action: 'Deleted user account',
    detail: 'Permanently deleted account mike@example.com',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-15T16:05:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '7',
    action: 'Upgraded user to Premium',
    detail: 'john@example.com upgraded from Freemium to Premium',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-15T14:30:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '8',
    action: 'Bulk data access',
    detail: 'Admin exported full user list — 4,821 user records accessed',
    type: 'warning',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-15T09:14:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '9',
    action: 'Added food to database',
    detail: 'New food item "Grilled Salmon" added to food database',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-14T15:22:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '10',
    action: 'Sent push notification',
    detail: 'Notification "New Feature — My Meals is live!" sent to 4,821 users',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-14T11:00:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '11',
    action: 'Viewed user profile',
    detail: 'Admin accessed personal data of jane@example.com',
    type: 'data_access',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-13T16:45:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '12',
    action: 'Spoonacular API limit hit',
    detail: 'Daily API quota of 150 calls was reached — some requests may have failed',
    type: 'warning',
    admin_email: 'system',
    timestamp: '2026-04-13T23:58:00',
    ip_address: 'system',
  },
  {
    id: '13',
    action: 'Removed nutritionist role',
    detail: 'alex@example.com demoted from Nutritionist to Freemium',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-12T10:30:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '14',
    action: 'Admin logged out',
    detail: 'Admin session ended',
    type: 'auth',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-12T18:00:00',
    ip_address: '192.168.1.1',
  },
  {
    id: '15',
    action: 'Deleted food from database',
    detail: 'Food item "Brown Rice Bowl" removed from food database',
    type: 'user_action',
    admin_email: 'admin@nutritrack.com',
    timestamp: '2026-04-11T14:10:00',
    ip_address: '192.168.1.1',
  },
  {
  id: '16',
  action: 'Edited food item',
  detail: 'Food item "Grilled Chicken Salad" updated in food database',
  type: 'user_action',
  admin_email: 'admin@nutritrack.com',
  timestamp: '2026-04-15T13:00:00',
  ip_address: '192.168.1.1',
  },
];

type AuditLog = typeof DUMMY_LOGS[0];

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── FILTER OPTIONS ──
const FILTERS = ['All', 'Data Access', 'User Actions', 'Auth', 'Warnings'];

// ── LOG TYPE CONFIG ──
const LOG_CONFIG: Record<string, {
  icon: string; iconBg: string;
  badgeBg: string; badgeText: string;
  borderColor: string; label: string;
  cardBg: string;
}> = {
  data_access: {
    icon: '👁️', iconBg: '#dbeafe',
    badgeBg: '#dbeafe', badgeText: '#1e40af',
    borderColor: '#3b82f6', label: 'Data Access',
    cardBg: '#fff',
  },
  user_action: {
    icon: '👤', iconBg: '#d1fae5',
    badgeBg: '#d1fae5', badgeText: '#065f46',
    borderColor: '#10b981', label: 'User Action',
    cardBg: '#fff',
  },
  auth: {
    icon: '🔐', iconBg: '#ede9fe',
    badgeBg: '#ede9fe', badgeText: '#5b21b6',
    borderColor: '#8b5cf6', label: 'Auth',
    cardBg: '#fff',
  },
  warning: {
    icon: '⚠️', iconBg: '#fee2e2',
    badgeBg: '#fee2e2', badgeText: '#991b1b',
    borderColor: '#ef4444', label: 'Warning',
    cardBg: '#fef2f2',
  },
  system: {
    icon: '⚙️', iconBg: '#fef3c7',
    badgeBg: '#fef3c7', badgeText: '#92400e',
    borderColor: '#f59e0b', label: 'System',
    cardBg: '#fff',
  },
};

const formatTimestamp = (ts: string): string => {
  const date = new Date(ts);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit'
  });
  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short'
  });

  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  return `${dateStr} ${time}`;
};

export default function AuditLogsScreen({ visible, onClose }: Props) {
  const [logs]              = useState<AuditLog[]>(DUMMY_LOGS);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(8);

  // ── FETCH AUDIT LOGS ──
  // TODO (Backend): Uncomment when backend is ready
  // Endpoint: GET /admin/audit-logs
  // Headers: { Authorization: Bearer <admin_token> }
  // Query params: ?limit=50&offset=0 for pagination
  // Returns: array of AuditLog objects sorted by timestamp descending
  // Each log entry should be automatically created by the backend
  // whenever a sensitive admin action is performed — the frontend
  // does not need to manually trigger log creation
  // const fetchLogs = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/audit-logs?limit=50&offset=0`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setLogs(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchLogs error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment when backend is ready
  // useEffect(() => {
  //   if (visible) fetchLogs();
  // }, [visible]);

  // ── FILTERED LOGS ──
  const filteredLogs = logs.filter(log => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Data Access'  && log.type === 'data_access') ||
      (activeFilter === 'User Actions' && log.type === 'user_action') ||
      (activeFilter === 'Auth'         && log.type === 'auth')        ||
      (activeFilter === 'Warnings'     && log.type === 'warning');

    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_address.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  const visibleLogs = filteredLogs.slice(0, visibleCount);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── PDPA COMPLIANCE BANNER ── */}
        <View style={styles.pdpaBanner}>
          <Text style={styles.pdpaIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pdpaTitle}>PDPA Compliance</Text>
            <Text style={styles.pdpaSub}>
              All admin data access actions are logged to comply with Singapore's Personal Data Protection Act.
            </Text>
          </View>
        </View>

        {/* ── SEARCH ── */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs, emails, IP addresses..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={v => { setSearch(v); setVisibleCount(8); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setVisibleCount(8); }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── FILTER PILLS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          style={styles.pillsScroll}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.pill,
                activeFilter === f && styles.pillActive,
                f === 'Warnings' && activeFilter !== f && styles.pillWarning,
              ]}
              onPress={() => { setActiveFilter(f); setVisibleCount(8); }}
            >
              <Text style={[
                styles.pillText,
                activeFilter === f && styles.pillTextActive,
                f === 'Warnings' && activeFilter !== f && styles.pillTextWarning,
              ]}>
                {f === 'Warnings' ? '⚠️ Warnings' : f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── LOG LIST ── */}
        {/* TODO (Backend): Data from GET /admin/audit-logs */}
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No logs found</Text>
            <Text style={styles.emptySub}>Try a different search term or filter</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              Showing {visibleLogs.length} of {filteredLogs.length} logs
            </Text>

            {visibleLogs.map(log => {
              const config = LOG_CONFIG[log.type] || LOG_CONFIG.user_action;
              return (
                <View
                  key={log.id}
                  style={[
                    styles.logCard,
                    { borderLeftColor: config.borderColor, backgroundColor: config.cardBg }
                  ]}
                >
                  <View style={styles.logTop}>
                    <View style={[styles.logIcon, { backgroundColor: config.iconBg }]}>
                      <Text style={styles.logIconText}>{config.icon}</Text>
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={styles.logAction}>{log.action}</Text>
                      <Text style={styles.logDetail}>{log.detail}</Text>
                    </View>
                  </View>
                  <View style={styles.logMeta}>
                    <View style={[
                      styles.logBadge,
                      { backgroundColor: config.badgeBg }
                    ]}>
                      <Text style={[
                        styles.logBadgeText,
                        { color: config.badgeText }
                      ]}>
                        {config.label}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>
                      {formatTimestamp(log.timestamp)}
                    </Text>
                    <Text style={styles.logIp}>{log.ip_address}</Text>
                  </View>
                </View>
              );
            })}

            {/* Load more */}
            {visibleCount < filteredLogs.length && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount(prev => prev + 8)}
              >
                <Text style={styles.loadMoreText}>
                  Load more ({filteredLogs.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            )}

            {/* Show less */}
            {visibleCount > 8 && filteredLogs.length > 8 && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount(8)}
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

  pdpaBanner: {
    backgroundColor: '#dbeafe', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  pdpaIcon: { fontSize: 18, flexShrink: 0 },
  pdpaTitle: { fontSize: 12, fontWeight: '700', color: '#1e40af', marginBottom: 3 },
  pdpaSub: { fontSize: 11, color: '#1e40af', lineHeight: 16 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchClear: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },

  pillsScroll: { marginBottom: 12 },
  pillsRow: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive:  { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillWarning: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  pillText:        { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive:  { color: '#fff' },
  pillTextWarning: { color: '#991b1b' },

  resultsCount: {
    fontSize: 11, color: '#9ca3af',
    marginBottom: 10, fontWeight: '500',
  },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub:   { fontSize: 13, color: '#9ca3af' },

  logCard: {
    borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 0.5,
    borderColor: '#e5e7eb', borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  logTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 8,
  },
  logIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logIconText: { fontSize: 14 },
  logInfo: { flex: 1 },
  logAction: { fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 3 },
  logDetail: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  logMeta: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, flexWrap: 'wrap',
  },
  logBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  logBadgeText: { fontSize: 9, fontWeight: '700' },
  logTime: { fontSize: 10, color: '#9ca3af' },
  logIp: { fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' },

  loadMoreBtn: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: '#10b981' },
});