import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { API_URL } from '../../constants/api';

// ── DUMMY EXPORT HISTORY ──
// TODO (Backend): Replace with real data from GET /admin/export/history
// Returns: array of ExportRecord objects sorted by created_at descending
const DUMMY_HISTORY = [
  {
    id: '1',
    filename: 'export_3mo_2026-04-16.csv',
    range: 'Last 3 months',
    format: 'CSV',
    records: 18420,
    created_at: '2026-04-16T14:32:00',
    download_url: '',
  },
  {
    id: '2',
    filename: 'export_all_2026-03-01.json',
    range: 'All time',
    format: 'JSON',
    records: 52184,
    created_at: '2026-03-01T09:15:00',
    download_url: '',
  },
  {
    id: '3',
    filename: 'export_30d_2026-02-01.csv',
    range: 'Last 30 days',
    format: 'CSV',
    records: 4210,
    created_at: '2026-02-01T11:00:00',
    download_url: '',
  },
  {
    id: '4',
    filename: 'export_6mo_2026-01-15.json',
    range: 'Last 6 months',
    format: 'JSON',
    records: 31920,
    created_at: '2026-01-15T08:45:00',
    download_url: '',
  },
];

// ── ESTIMATED RECORD COUNTS ──
// TODO (Backend): Replace with real counts from GET /admin/export/estimate?range=...
// These are rough estimates shown before the admin generates the export
const ESTIMATED_COUNTS: Record<string, number> = {
  '30d':  6840,
  '3mo':  18420,
  '6mo':  31920,
  'all':  52184,
};

// ── DATA FIELDS ALWAYS INCLUDED IN EVERY EXPORT ──
// These are fixed — the admin cannot toggle them on/off
// All fields are anonymised — no names, emails or user IDs
const EXPORT_FIELDS = [
  'Meal log history',
  'Meal ratings (1–5 stars)',
  'Saved / favourite meals',
  'Dietary preferences',
  'Goal type & activity level',
  'Calorie & macro targets',
  'Meal log time of day',
];

const DATE_RANGES = [
  { key: '30d', label: 'Last 30d'      },
  { key: '3mo', label: 'Last 3 months' },
  { key: '6mo', label: 'Last 6 months' },
  { key: 'all', label: 'All time'      },
];

const FORMATS = [
  { key: 'CSV',  label: 'CSV',  sub: 'Spreadsheet' },
  { key: 'JSON', label: 'JSON', sub: 'Raw data'     },
];

type ExportRecord = typeof DUMMY_HISTORY[0];

type Props = {
  visible: boolean;
  onClose: () => void;
};

const formatTimestamp = (ts: string): string =>
  new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function DataExportScreen({ visible, onClose }: Props) {
  const [history, setHistory]     = useState<ExportRecord[]>(DUMMY_HISTORY);
  const [selectedRange, setSelectedRange] = useState('3mo');
  const [selectedFormat, setSelectedFormat] = useState('CSV');
  const [exporting, setExporting] = useState(false);

  // ── FETCH EXPORT HISTORY ──
  // TODO (Backend): Uncomment when backend is ready
  // Endpoint: GET /admin/export/history
  // Headers: { Authorization: Bearer <admin_token> }
  // Returns: array of ExportRecord objects sorted by created_at descending
  // Each needs: id, filename, range, format, records, created_at, download_url
  // const fetchHistory = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/admin/export/history`, {
  //       headers: { 'Authorization': `Bearer ${adminToken}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setHistory(data);
  //     }
  //   } catch (e) {
  //     console.log('fetchHistory error:', e);
  //   }
  // };

  // TODO (Backend): Uncomment when backend is ready
  // useEffect(() => {
  //   if (visible) fetchHistory();
  // }, [visible]);

  // ── GENERATE EXPORT ──
  // TODO (Backend): Uncomment API call and remove dummy local update when backend is ready
  // Endpoint: POST /admin/export/generate
  // Headers: { Authorization: Bearer <admin_token>, Content-Type: application/json }
  // Body: { range: '30d' | '3mo' | '6mo' | 'all', format: 'CSV' | 'JSON' }
  // Returns: {
  //   id: string,
  //   filename: string,
  //   range: string,
  //   format: string,
  //   records: number,
  //   created_at: string,
  //   download_url: string   ← pre-signed URL to download the file
  // }
  //
  // Backend must:
  // 1. Query meal_logs, meal_ratings, saved_meals, user_profiles tables
  //    filtered by the selected date range
  // 2. Anonymise all data — replace user_id with a random hash,
  //    remove all names, emails and any personally identifiable fields
  // 3. Generate the file in the requested format (CSV or JSON)
  // 4. Store the file securely and return a download_url
  // 5. Save the export record to the export_history table
  //
  // Fields to include in the export (all anonymised):
  //   anonymous_user_id, dietary_preferences, goal_type, activity_level,
  //   calorie_target, protein_target, carbs_target, fats_target,
  //   meal_name, meal_calories, meal_protein, meal_carbs, meal_fats,
  //   meal_logged_at (datetime), meal_rating (1-5, null if not rated),
  //   meal_saved (boolean), meal_time_of_day (morning/afternoon/evening/night)
  //
  // Fields to NEVER include:
  //   user_id, name, email, phone, date_of_birth, ip_address
  const handleExport = async () => {
    Alert.alert(
      'Generate Export',
      `Export anonymised data for ${DATE_RANGES.find(r => r.key === selectedRange)?.label} as ${selectedFormat}?\n\nEstimated ${ESTIMATED_COUNTS[selectedRange].toLocaleString()} records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setExporting(true);
            try {
              // TODO (Backend): Replace below with API call
              // const res = await fetch(`${API_URL}/admin/export/generate`, {
              //   method: 'POST',
              //   headers: {
              //     'Authorization': `Bearer ${adminToken}`,
              //     'Content-Type': 'application/json',
              //   },
              //   body: JSON.stringify({
              //     range: selectedRange,
              //     format: selectedFormat,
              //   }),
              // });
              // if (res.ok) {
              //   const newExport = await res.json();
              //   setHistory(prev => [newExport, ...prev]);
              //   Alert.alert(
              //     'Export Ready ✅',
              //     `${newExport.filename} is ready. Tap Download in the history to save it.`
              //   );
              // }

              // Temporary local update — remove when backend is ready
              await new Promise(resolve => setTimeout(resolve, 2000));
              const rangeLabel = DATE_RANGES.find(r => r.key === selectedRange)?.label || '';
              const dateStr = new Date().toISOString().split('T')[0];
              const newExport: ExportRecord = {
                id: Date.now().toString(),
                filename: `export_${selectedRange}_${dateStr}.${selectedFormat.toLowerCase()}`,
                range: rangeLabel,
                format: selectedFormat,
                records: ESTIMATED_COUNTS[selectedRange],
                created_at: new Date().toISOString(),
                download_url: '',
              };
              setHistory(prev => [newExport, ...prev]);
              Alert.alert(
                'Export Ready ✅',
                `${newExport.filename} has been generated with ${newExport.records.toLocaleString()} records.`
              );
            } catch (e) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  // ── DOWNLOAD EXPORT ──
  // TODO (Backend): Uncomment when backend is ready
  // The download_url returned by POST /admin/export/generate is a
  // pre-signed URL that expires after 24 hours. The frontend opens
  // this URL in the device browser to trigger the file download.
  // import { Linking } from 'react-native';
  // const handleDownload = async (record: ExportRecord) => {
  //   if (!record.download_url) {
  //     Alert.alert('Error', 'Download link is not available.');
  //     return;
  //   }
  //   try {
  //     await Linking.openURL(record.download_url);
  //   } catch (e) {
  //     Alert.alert('Error', 'Could not open the download link.');
  //   }
  // };

  // Temporary dummy download handler — remove when backend is ready
  const handleDownload = (record: ExportRecord) => {
    Alert.alert(
      'Download',
      `${record.filename} will be available for download once the backend is connected.`
    );
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

          {/* Estimated record count */}
          <View style={styles.countBox}>
            <Text style={styles.countLabel}>📊 Estimated records</Text>
            <Text style={styles.countVal}>
              ~{ESTIMATED_COUNTS[selectedRange].toLocaleString()}
            </Text>
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
        {/* TODO (Backend): Data from GET /admin/export/history */}
        <Text style={styles.historyTitle}>
          Previous exports ({history.length})
        </Text>

        {history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No exports yet</Text>
            <Text style={styles.emptySub}>
              Generate your first export above
            </Text>
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

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8,
  },

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

  countBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#d1fae5',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  countLabel: { fontSize: 12, color: '#065f46', fontWeight: '600' },
  countVal: { fontSize: 18, fontWeight: '800', color: '#10b981' },

  exportBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  exportBtnDisabled: { backgroundColor: '#6ee7b7' },
  exportBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

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