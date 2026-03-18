import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { styles } from '../styles/forgotpwstyles';

export default function Forgotpwcode() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'android' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* ── Form Fields ── */}
          <View style={styles.form}>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="Email@example.com"
                placeholderTextColor="#A0A0A0"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

          </View>

          {/* ── Get Verification Code Button ── */}
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Get verification code</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}