import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/api';

// ── TYPES ──
// Matches ExportRecordResponse from admin_export.py exactly
type ExportRecord = {
  id: number;
  filename: string;
  range: string;
  format: string;
  records: number;
  created_at: string;
  download_url: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── EXPORT FIELDS ──
// Fixed — admin cannot toggle these on/off
// All are anonymised — no names, emails or user IDs
const EXPORT_FIELDS = [
  'Meal log history',
  'Meal ratings (1–5 stars)',
  'Saved / favourite meals',
  'Dietary preferences',
  'Goal type & activity level',
  'Calorie & macro targets',
  'Meal log time of day',
];

// ── DATE RANGES ──
// Must match ExportRange enum values in backend models exactly:
// '30d', '3mo', '6mo', 'all'
const DATE_RANGES = [
  { key: '30d', label: 'Last 30d'      },
  { key: '3mo', label: 'Last 3 months' },
  { key: '6mo', label: 'Last 6 months' },
  { key: 'all', label: 'All time'      },
];

// ── FORMATS ──
// Must match ExportFormat enum values in backend models exactly:
// 'CSV', 'JSON'
const FORMATS = [
  { key: 'CSV',  label: 'CSV',  sub: 'Spreadsheet' },
  { key: 'JSON', label: 'JSON', sub: 'Raw data'     },
];

const formatTimestamp = (ts: string): string =>
  new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function DataExportScreen({ visible, onClose }: Props) {
  const [history, setHistory]           = useState<ExportRecord[]>([]);
  const [selectedRange, setSelectedRange]   = useState('3mo');
  const [selectedFormat, setSelectedFormat] = useState('CSV');
  const [exporting, setExporting]       = useState(false);
  const [loading, setLoading]           = useState(false);

  const getToken = async (): Promise<string | null> =>
    await AsyncStorage.getItem('token');

  // ── FETCH EXPORT HISTORY ──
  // Endpoint: GET /admin/export/history
  // Headers: { Authorization: Bearer <token> }
  // Returns: array of ExportRecordResponse sorted by created_at descending
  // Each: { id, filename, range, format, records, created_at, download_url }
  // download_url is a path like /admin/export/download/{token}
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/export/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
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

  // ── GENERATE EXPORT ──
  // Endpoint: POST /admin/export/generate
  // Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  // Body: { range: '30d'|'3mo'|'6mo'|'all', format: 'CSV'|'JSON' }
  // Returns: ExportRecordResponse (201 Created)
  //   { id, filename, range, format, records, created_at, download_url }
  // Backend:
  //   1. Queries meal_logs filtered by date range
  //   2. Anonymises all data (hashes user_id, removes PII)
  //   3. Generates CSV or JSON file in private_exports/ folder
  //   4. Saves export_history record with a secure token
  //   5. Returns download_url = /admin/export/download/{token}
  const handleExport = async () => {
    const rangeLabel = DATE_RANGES.find(r => r.key === selectedRange)?.label || '';
    Alert.alert(
      'Generate Export',
      `Export anonymised data for ${rangeLabel} as ${selectedFormat}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setExporting(true);
            try {
              const token = await getToken();
              if (!token) return;
              const res = await fetch(`${API_URL}/admin/export/generate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  range:  selectedRange,
                  format: selectedFormat,
                }),
              });
              if (res.status === 201) {
                const newExport: ExportRecord = await res.json();
                setHistory(prev => [newExport, ...prev]);
                Alert.alert(
                  'Export Ready ✅',
                  `${newExport.filename} has been generated with ${newExport.records.toLocaleString()} records. Tap Download to save it.`
                );
              } else {
                const err = await res.json();
                Alert.alert('Error', err.detail || 'Failed to generate export.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  // ── DOWNLOAD EXPORT ──
  // Endpoint: GET /admin/export/download/{token}
  // download_url from history is a relative path like
  //   /admin/export/download/lhbfO4oSNtTnngqDNm9EhtX_ko4C4GhM
  // We prepend API_URL to build the full URL and open it in the browser
  // The file is served as application/octet-stream — browser will download it
  // Note: download links expire after 24 hours (backend enforces this)
  const handleDownload = async (record: ExportRecord) => {
    if (!record.download_url) {
      Alert.alert('Error', 'Download link is not available.');
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      // Build full URL from relative download_url path
      const fullUrl = `${API_URL}${record.download_url}?token=${token}`;
      const canOpen = await Linking.canOpenURL(fullUrl);
      if (canOpen) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Error', 'Cannot open download link on this device.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open the download link.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* ── PDPA BANNER ── */}
        <View style={styles.pdpaBanner}>
          <Text style={styles.pdpaIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pdpaTitle}>Anonymised data only</Text>
            <Text style={styles.pdpaSub}>
              All exports are fully anonymised. No names, emails or personal identifiers are included. PDPA compliant.
            </Text>
          </View>
        </View>

        {/* ── EXPORT FORM ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Export training data</Text>
          <Text style={styles.cardSub}>
            Export anonymised user behaviour data to improve the meal recommendation model.
          </Text>

          {/* Date range */}
          <Text style={styles.fieldLabel}>Date range</Text>
          <View style={styles.rangeRow}>
            {DATE_RANGES.map(r => (
              <TouchableOpacity
                key={`range-${r.key}`}
                style={[styles.rangePill, selectedRange === r.key && styles.rangePillActive]}
                onPress={() => setSelectedRange(r.key)}
              >
                <Text style={[
                  styles.rangePillText,
                  selectedRange === r.key && styles.rangePillTextActive
                ]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Data fields */}
          <Text style={styles.fieldLabel}>Data included</Text>
          {EXPORT_FIELDS.map(field => (
            <View key={`field-${field}`} style={styles.fieldRow}>
              <View style={styles.fieldCheck}>
                <Text style={styles.fieldCheckText}>✓</Text>
              </View>
              <Text style={styles.fieldName}>{field}</Text>
              <Text style={styles.fieldAnon}>anonymised</Text>
            </View>
          ))}

          {/* Format selector */}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Export format</Text>
          <View style={styles.formatRow}>
            {FORMATS.map(f => (
              <TouchableOpacity
                key={`format-${f.key}`}
                style={[styles.formatBtn, selectedFormat === f.key && styles.formatBtnActive]}
                onPress={() => setSelectedFormat(f.key)}
              >
                <Text style={[
                  styles.formatLabel,
                  selectedFormat === f.key && styles.formatLabelActive
                ]}>
                  {f.label}
                </Text>
                <Text style={styles.formatSub}>{f.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Export button */}
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.85}
          >
            {exporting ? (
              <View style={styles.exportBtnInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.exportBtnText}>Generating export...</Text>
              </View>
            ) : (
              <Text style={styles.exportBtnText}>📤 Generate Export</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── EXPORT HISTORY ── */}
        {/* Endpoint: GET /admin/export/history */}
        <Text style={styles.historyTitle}>
          Previous exports ({history.length})
        </Text>

        {loading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading export history...</Text>
          </View>
        )}

        {!loading && history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No exports yet</Text>
            <Text style={styles.emptySub}>Generate your first export above</Text>
          </View>
        ) : (
          history.map(record => (
            <View key={`export-${record.id}`} style={styles.historyCard}>
              <View style={[
                styles.historyIcon,
                { backgroundColor: record.format === 'CSV' ? '#f0fdf4' : '#dbeafe' }
              ]}>
                <Text style={styles.historyIconText}>
                  {record.format === 'CSV' ? '📄' : '📋'}
                </Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyFilename} numberOfLines={1}>
                  {record.filename}
                </Text>
                <Text style={styles.historyMeta}>
                  {record.records.toLocaleString()} records · {record.range} · {record.format}
                </Text>
                <Text style={styles.historyTime}>
                  {formatTimestamp(record.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownload(record)}
              >
                <Text style={styles.downloadBtnText}>↓ Download</Text>
              </TouchableOpacity>
            </View>
          ))
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

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 18 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },

  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  rangePill: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fff', alignItems: 'center', minWidth: 60,
  },
  rangePillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  rangePillText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  rangePillTextActive: { color: '#fff' },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 8,
  },
  fieldCheck: {
    width: 18, height: 18, borderRadius: 5,
    backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fieldCheckText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  fieldName: { fontSize: 12, color: '#374151', flex: 1 },
  fieldAnon: { fontSize: 10, color: '#9ca3af', flexShrink: 0 },

  formatRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  formatBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', alignItems: 'center',
  },
  formatBtnActive: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  formatLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  formatLabelActive: { color: '#10b981' },
  formatSub: { fontSize: 10, color: '#9ca3af', marginTop: 2 },

  exportBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  exportBtnDisabled: { backgroundColor: '#6ee7b7' },
  exportBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  loadingBox: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#9ca3af' },

  historyTitle: {
    fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10,
  },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#9ca3af' },

  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 0.5, borderColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  historyIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  historyIconText: { fontSize: 16 },
  historyInfo: { flex: 1 },
  historyFilename: { fontSize: 11, fontWeight: '700', color: '#111827', marginBottom: 2 },
  historyMeta: { fontSize: 10, color: '#6b7280', marginBottom: 1 },
  historyTime: { fontSize: 10, color: '#9ca3af' },

  downloadBtn: {
    backgroundColor: '#d1fae5', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8, flexShrink: 0,
  },
  downloadBtnText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
});