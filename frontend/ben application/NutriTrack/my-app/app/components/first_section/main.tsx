import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Main() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.heading}>Successful!</Text>
        <Text style={styles.sub}>You are now logged in.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDEAE4',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1814',
  },
  sub: {
    fontSize: 15,
    color: '#8C6B2F',
  },
});