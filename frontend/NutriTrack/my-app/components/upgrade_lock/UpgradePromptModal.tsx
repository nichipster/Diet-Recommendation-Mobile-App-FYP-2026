import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature?: string; // ← optional feature name that triggered the prompt
};

export default function UpgradePromptModal({ visible, onClose, onUpgrade, feature }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.sub}>
            {feature
              ? `${feature} is a Premium feature.`
              : 'You\'re on the Freemium plan.'}
            {'\n'}Upgrade to get the full NutriTrack experience.
          </Text>

          <View style={styles.featureList}>
            {[
              '🤖 AI photo meal recognition',
              '🍽️ Unlimited meal recommendations',
              '📊 Advanced dietary reports',
              '🥗 Meal plans with grocery lists',
              '🚫 No ads',
            ].map(f => (
              <Text key={f} style={styles.featureItem}>{f}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={onUpgrade}
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeBtnText}>Upgrade to Premium — S$9.90/mth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 10,
  },
  emoji:  { fontSize: 40, marginBottom: 12 },
  title:  { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sub: {
    fontSize: 14, color: '#6b7280', textAlign: 'center',
    lineHeight: 20, marginBottom: 16,
  },
  featureList: { alignSelf: 'stretch', marginBottom: 20, gap: 6 },
  featureItem: { fontSize: 13, color: '#374151', fontWeight: '500' },
  upgradeBtn: {
    backgroundColor: '#7c3aed', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    alignSelf: 'stretch', marginBottom: 10,
    shadowColor: '#7c3aed', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  laterBtn:  { paddingVertical: 8 },
  laterText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
});