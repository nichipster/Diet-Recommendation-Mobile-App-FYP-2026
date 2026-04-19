import React from 'react';
import { StyleSheet } from 'react-native';

export default function StatsBar(){};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -52,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 16,
  },
  divider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
});