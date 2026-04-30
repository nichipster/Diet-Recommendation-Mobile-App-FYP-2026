import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  title: string;
  backLabel?: string;
  onClose: () => void;
};

export default function Navbar({ title, backLabel = 'Profile', onClose }: Props) {
  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeArrow}>‹</Text>
        <Text style={styles.closeText}>{backLabel}</Text>
      </TouchableOpacity>
      <View pointerEvents="none" style={styles.navTitleContainer}>
        <Text style={styles.navTitle}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  closeArrow: { fontSize: 30, color: '#10b981', fontWeight: '300', lineHeight: 32 },
  closeText: { fontSize: 15, color: '#10b981', fontWeight: '600' },
navTitleContainer: {
  position: 'absolute',
  left: 0,
  right: 0,
  alignItems: 'center',
},
navTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#111827',
},
});