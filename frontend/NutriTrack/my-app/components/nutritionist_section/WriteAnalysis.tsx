import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import { useAnalysis } from '../../context/AnalysisContext';
import { MOCK_CLIENT_DATA } from './ViewProgressReport';
import { useUser } from '../../context/UserContext';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WriteAnalysis({ onBack, clients }: { 
  onBack?: () => void;
  clients: { id: string; name: string; goal: string }[];
}) {
  const GOAL_LABELS: Record<string, string> = {
    lose: 'Weight Loss',
    gain: 'Muscle Gain',
    maintain: 'Maintenance',
  };
  
  const CLIENTS = clients;
  
  const { getAnalysis, saveAnalysis } = useAnalysis();
  const { user } = useUser();
  const NUTRITIONIST_NAME = `${user.firstName} ${user.lastName}`;

  const [selectedClient, setSelectedClient] = useState<typeof CLIENTS[0] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form fields
  const [summary, setSummary] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [areasToImprove, setAreasToImprove] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSelectClient = (client: typeof CLIENTS[0]) => {
    setSelectedClient(client);
    // Load existing analysis if any
    const existing = getAnalysis(client.id);
    if (existing) {
      setSummary(existing.summary);
      setWentWell(existing.wentWell);
      setAreasToImprove(existing.areasToImprove);
      setRecommendations(existing.recommendations);
      setNextSteps(existing.nextSteps);
    } else {
      setSummary('');
      setWentWell('');
      setAreasToImprove('');
      setRecommendations('');
      setNextSteps('');
    }
  };

  const handleSave = () => {
    if (!selectedClient) return;
    if (!summary.trim()) {
      Alert.alert('Missing info', 'Please fill in at least the summary.');
      return;
    }
    saveAnalysis({
      id: selectedClient.id,
      nutritionistName: NUTRITIONIST_NAME,
      userName: selectedClient.name,
      summary,
      wentWell,
      areasToImprove,
      recommendations,
      nextSteps,
    });
    showToast('Report saved ✓');
  };

  const handleBack = () => {
    if (selectedClient) {
      setSelectedClient(null);
    } else {
      onBack?.();
    }
  };

  // ── Client list ───────────────────────────────────────────────────────────

  const renderClientList = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.sectionLabel}>Select a client</Text>
      {CLIENTS.map(c => (
        <TouchableOpacity
          key={c.id}
          style={s.clientCard}
          onPress={() => handleSelectClient(c)}
        >
          <View style={s.clientAvatar}>
            <Text style={s.clientAvatarText}>{c.name.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <View style={s.clientInfo}>
            <Text style={s.clientName}>{c.name}</Text>
            <Text style={s.clientGoal}>{c.goal}</Text>
          </View>
          <Text style={s.clientChevron}>›</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // ── Report form ───────────────────────────────────────────────────────────

  const renderForm = () => {
    if (!selectedClient) return null;
    
    return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.clientBanner}>
        <View style={s.clientAvatar}>
          <Text style={s.clientAvatarText}>
            {selectedClient!.name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <View>
          <Text style={s.clientName}>{selectedClient!.name}</Text>
          <Text style={s.clientGoal}>{selectedClient!.goal}</Text>
        </View>
      </View>

      {[
        { label: 'Overall Summary', value: summary, setter: setSummary, placeholder: 'Brief overview of the client\'s progress...' },
        { label: 'What Went Well', value: wentWell, setter: setWentWell, placeholder: 'Highlight positive achievements...' },
        { label: 'Areas to Improve', value: areasToImprove, setter: setAreasToImprove, placeholder: 'Areas that need more attention...' },
        { label: 'Recommendations', value: recommendations, setter: setRecommendations, placeholder: 'Specific advice and dietary recommendations...' },
        { label: 'Next Steps', value: nextSteps, setter: setNextSteps, placeholder: 'Action items for the next session...' },
      ].map(field => (
        <View key={field.label} style={s.fieldCard}>
          <Text style={s.fieldLabel}>{field.label}</Text>
          <TextInput
            style={s.fieldInput}
            value={field.value}
            onChangeText={field.setter}
            placeholder={field.placeholder}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      ))}

      <TouchableOpacity style={s.btnSave} onPress={handleSave}>
        <Text style={s.btnSaveText}>Save report</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.safe}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
          <Text style={s.headerTitle}>
            {selectedClient ? 'Write Report' : 'Client Reports'}
          </Text>
          <Text style={s.headerSub}>
            {selectedClient ? `Editing report for ${selectedClient.name}` : 'Select a client to write a report'}
          </Text>

      <View style={s.content}>
        {selectedClient ? renderForm() : renderClientList()}
      </View>

      {toast != null && (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  
  backBtn: { paddingHorizontal: 16, paddingTop: 8, marginBottom: 4 },
  backText: { fontSize: 14, color: '#10b981', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 16 },
  headerSub: { fontSize: 12, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  content: { flex: 1, paddingHorizontal: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#9ca3af',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },

  clientCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  clientBanner: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  clientAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarText: { fontSize: 13, fontWeight: '700', color: '#0F6E56' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  clientGoal: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  clientChevron: { fontSize: 20, color: '#9ca3af' },

  fieldCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8,
  },
  fieldInput: {
    fontSize: 13, color: '#111827', minHeight: 90,
    lineHeight: 20,
  },

  btnSave: {
    backgroundColor: '#10b981', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#1f2937', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: '#fff', fontSize: 13 },
});