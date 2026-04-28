import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NUTRITIONISTS } from './ConsultScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ViewNutritionistProfile = ({ onBack, id }: { onBack: () => void; id: number }) => {
  const nutritionist = NUTRITIONISTS.find(n => n.id === id) || NUTRITIONISTS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topSection}>
        <View style={[styles.avatar, { backgroundColor: nutritionist.avatarColor }]}>
          <Text style={styles.avatarText}>{nutritionist.initials}</Text>
        </View>
        <Text style={styles.name}>{nutritionist.name}</Text>
        <Text style={styles.spec}>{nutritionist.specialisation}</Text>
        <Text style={styles.cred}>{nutritionist.credentials}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.text}>{nutritionist.bio || 'No bio yet'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Specialisation</Text>
        <Text style={styles.text}>{nutritionist.specialisation || 'No specialisation yet'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Credentials</Text>
        <Text style={styles.text}>{nutritionist.credentials || 'No credentials yet'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💡 Sample Tip</Text>
        <Text style={styles.text}>{nutritionist.tip || 'No tip yet'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💬 Testimonials</Text>
        <Text style={styles.text}>{nutritionist.testimonial || 'No testimonials yet'}</Text>
      </View>

    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { width: '100%', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  backText: { color: '#10b981', fontWeight: '600', fontSize: 16 },
  topSection: { alignItems: 'center', marginBottom: 24, width: '100%' },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 24 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  spec: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  cred: { fontSize: 13, color: '#10b981', marginTop: 2 },
  card: { width: '100%', maxWidth: 500, backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, color: '#374151' },
  text: { fontSize: 14, color: '#374151', lineHeight: 20 },
});

export default ViewNutritionistProfile;