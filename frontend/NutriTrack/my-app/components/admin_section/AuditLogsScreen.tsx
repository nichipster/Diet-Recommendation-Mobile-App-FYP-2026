import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/api';

type AuditLog = {
  id: string;
  action: string;
  detail: string;
  type: string;
  admin_email: string;
  timestamp: string;
  ip_address: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FILTERS = ['All', 'Data Access', 'User Actions', 'Auth', 'Warnings'];

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

// ── MAP BACKEND RESPONSE TO FRONTEND TYPE ──
// Backend returns id as integer — convert to string
// ip_address is Optional[str] — fallback to empty string
const mapLog = (l: any): AuditLog => ({
  id:          String(l.id),
  action:      l.action,
  detail:      l.detail,
  type:        l.type,
  admin_email: l.admin_email,
  timestamp:   l.timestamp,
  ip_address:  l.ip_address ?? '',
});

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
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(8);

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH AUDIT LOGS ──
  // Endpoint: GET /admin/audit-logs
  // Headers: { Authorization: Bearer <token> }
  // Query params: ?limit=200&offset=0
  // Returns: array of AuditLogResponse sorted by timestamp descending
  // Each: { id, action, detail, type, admin_email, timestamp, ip_address }
  // Note: accessing this endpoint itself creates a data_access log entry
  // on the backend automatically — frontend does not need to do anything extra
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${API_URL}/admin/audit-logs?limit=200&offset=0`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.map(mapLog));
      } else {
        console.log('fetchLogs failed:', res.status);
      }
    } catch (e) {
      console.log('fetchLogs error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchLogs();
  }, [visible]);

  // ── FILTERED LOGS ──
  const filteredLogs = logs.filter(log => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Data Access'  && log.type === 'data_access') ||
      (activeFilter === 'User Actions' && log.type === 'user_action') ||
      (activeFilter === 'Auth'         && log.type === 'auth')        ||
      (activeFilter === 'Warnings'     && log.type === 'warning');

    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase())      ||
      log.detail.toLowerCase().includes(search.toLowerCase())      ||
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
              All admin data access actions are logged to comply with
              Singapore's Personal Data Protection Act.
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
            <TouchableOpacity
              onPress={() => { setSearch(''); setVisibleCount(8); }}
            >
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

        {/* ── LOADING STATE ── */}
        {loading && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Loading audit logs...</Text>
          </View>
        )}

        {/* ── LOG LIST ── */}
        {!loading && filteredLogs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>
              {logs.length === 0 ? 'No audit logs yet' : 'No logs found'}
            </Text>
            <Text style={styles.emptySub}>
              {logs.length === 0
                ? 'Logs will appear here as admin actions are performed'
                : 'Try a different search term or filter'}
            </Text>
          </View>
        ) : !loading && (
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
                    {
                      borderLeftColor: config.borderColor,
                      backgroundColor: config.cardBg,
                    }
                  ]}
                >
                  <View style={styles.logTop}>
                    <View style={[
                      styles.logIcon,
                      { backgroundColor: config.iconBg }
                    ]}>
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
                    {log.ip_address ? (
                      <Text style={styles.logIp}>{log.ip_address}</Text>
                    ) : null}
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
  pillActive:      { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillWarning:     { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
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
  emptySub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

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