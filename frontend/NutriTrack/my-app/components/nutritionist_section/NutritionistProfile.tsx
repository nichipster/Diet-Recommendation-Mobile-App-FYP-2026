import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useUser } from '../../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import NUTRITIONISTS from '../consult_section/ConsultScreen'

const NUTRITIONISTS = [
  {
    id: 1,
    initials: 'SL',
    avatarColor: '#10b981',
    name: 'Dr. Sarah Lim',
    specialisation: 'Sports & Weight Management',
    credentials: 'RD, MSc Nutrition',
    rating: 4.9,
    reviews: 128,
    tags: ['Weight Loss', 'Sports Nutrition', 'Meal Planning'],
    tip: 'Eating protein within 30 minutes after a workout helps muscle recovery. Aim for 20–30g per session...',
    diaryFeedback: 'Your protein intake has been low this week. Try adding eggs or Greek yoghurt at breakfast.',
    review: {
      stars: 5,
      text: 'Very helpful session. Dr. Sarah gave me a clear meal plan that actually worked.',
    },
    filters: ['Weight Loss', 'Sports'],
  },
  {
    id: 2,
    initials: 'MK',
    avatarColor: '#3b82f6',
    name: 'Mr. Marcus Koh',
    specialisation: 'Vegan & Plant-Based Diets',
    credentials: 'RD, Plant-Based Cert.',
    rating: 4.7,
    reviews: 94,
    tags: ['Vegan', 'Plant-Based'],
    tip: 'Combining rice and lentils gives you a complete protein profile — great for plant-based eaters...',
    diaryFeedback: null,
    review: {
      stars: 5,
      text: 'Very helpful session. Marcus gave practical advice for my vegan diet.',
    },
    filters: ['Vegan'],
  },
  {
    id: 3,
    initials: 'PN',
    avatarColor: '#f97316',
    name: 'Ms. Priya Nair',
    specialisation: 'Diabetes & Metabolic Health',
    credentials: 'RD, CDE',
    rating: 4.8,
    reviews: 76,
    tags: ['Diabetes', 'Low GI', 'Metabolic Health'],
    tip: 'Choosing low GI foods helps stabilise blood sugar. Swap white rice for brown rice or quinoa...',
    diaryFeedback: null,
    review: null,
    filters: ['Diabetes'],
  },
];

export default function NutritionistProfile({ onBack, nutritionistId }: { onBack: () => void; nutritionistId: number; }) {
  const { user } = useUser();

  // Find nutritionist from dummy data
  const nutritionist = NUTRITIONISTS.find(n => n.id === Number(nutritionistId));

  const [bio, setBio] = useState(nutritionist?.tip || '');
  const [tip, setTip] = useState(nutritionist?.tip || '');
  
  if (!nutritionist) return <Text>Nutritionist not found</Text>;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Back Button */}
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
       <Ionicons name="arrow-back" size={24} color="#10b981" />
       <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.profileSection}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: nutritionist.avatarColor }]}>
          <Text style={styles.avatarText}>
            {nutritionist.initials}
          </Text>
        </View>

        {/* Profile Name */}
        <Text style={styles.name}>{nutritionist.name}</Text>
        <Text style={styles.spec}>{nutritionist.specialisation}</Text>
        <Text style={styles.cred}>{nutritionist.credentials}</Text>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <TextInput
          style={styles.textInput}
          value={bio}
          onChangeText={setBio}
    placeholder="Write your bio..."
    multiline
  />
</View>

      {/* Specializations */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Specializations</Text>
        <Text style={styles.specializationText}>{nutritionist.specialisation || "No specializations listed."}</Text>
      </View>

      {/* Credentials */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Credentials</Text>
        <Text style={styles.credText}>{nutritionist.credentials || "No credentials listed."}</Text>
      </View>

      {/* Testimonials */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💬 Testimonials</Text>
        <Text style={styles.testimonialsText}>“This nutritionist helped me achieve my health goals!” – Client A</Text>
        <Text style={styles.testimonialsText}>“Their tips are practical and easy to follow!” – Client B</Text>
      </View>

      {/* Sample Tip */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💡 Sample Tip</Text>
         <TextInput
         style={styles.textInput}
         value={tip}
         onChangeText={setTip}
         placeholder="Add a sample tip..."
         multiline
        />
      </View>

      {/* Call to Action - Upgrade */}
      <View style={styles.upgradeSection}>
        <Text style={styles.upgradeText}>Ready to take your health to the next level?</Text>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { 
    padding: 16, 
    alignItems: 'center', 
    backgroundColor: '#f9fafb' 
  },
  profileSection: {
    alignItems: 'center', 
    marginBottom: 24, 
    width: '100%',
    paddingHorizontal: 16
  },
  backText: {
  color: '#10b981',
  fontWeight: '600',
  marginLeft: 8,  
  fontSize: 16
},
  backButton: {
  position: 'absolute',
  top: 40,  
  left: 16,
  flexDirection: 'row',  
  alignItems: 'center',
  zIndex: 10,
  padding: 8,
  backgroundColor: 'rgba(255,255,255,0.9)',
  borderRadius: 8,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 24 
  },
  name: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#111827', 
    marginBottom: 4 
  },
  spec: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginBottom: 2 
  },
  cred: { 
    fontSize: 13, 
    color: '#10b981', 
    marginTop: 2 
  },
  card: { 
    width: '100%', 
    maxWidth: 500, 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 10, 
    color: '#374151' 
  },
  bioText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 10,
  },
  specializationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  credText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  testimonialsText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 10,
  },
  upgradeSection: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
  textInput: {
  fontSize: 14,
  color: '#374151',
  lineHeight: 20,
  marginTop: 10,
  padding: 10,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 8,
  backgroundColor: '#f9fafb',
  textAlignVertical: 'top', // ensures multiline starts at the top
},
});
