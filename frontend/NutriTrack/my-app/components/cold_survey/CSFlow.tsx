import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useCSConsts from './CSConsts';
import { styles } from './styles/styles';

import ActivityLevel from './steps/activity_level';
import Dietary from './steps/dietary';
import Goals from './steps/goal';
import UserInfo from './steps/personal_info';
import Progress from './steps/progress';
import Weight from './steps/weight';

export default function CSFlow() {
  const logic = useCSConsts();
  const { step, data, errors, update, toggleAllergy, handleNext, handleBack, progressSteps, currentProgress } = logic;

  const renderStep = () => {
    switch (step) {
      case 1: return <UserInfo data={data} errors={errors} update={update} />;
      case 2: return <Goals data={data} errors={errors} update={update} />;
      case 3: return <Weight data={data} errors={errors} update={update} />;
      case 4: return <Progress data={data} errors={errors} update={update} />;
      case 5: return <ActivityLevel data={data} errors={errors} update={update} />;
      case 6: return <Dietary data={data} update={update} toggleAllergy={toggleAllergy} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.progressRow}>
          {Array.from({ length: progressSteps }).map((_, i) => (
            <View key={i} style={[styles.progressDot, i < currentProgress && styles.progressDotDone]} />
          ))}
        </View>
        <Text style={styles.stepCount}>{currentProgress}/{progressSteps}</Text>
      </View>
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'android' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={handleNext}>
          <Text style={styles.btnPrimaryText}>
            {step === 6 ? 'Finish  ✓' : 'Continue  →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}