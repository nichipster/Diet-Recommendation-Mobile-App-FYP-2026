import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  isPremium: boolean;
  children: React.ReactNode;
  onUpgradePress?: () => void;
  blurHeight?: number;
};

const PremiumOverlay = ({ isPremium, children, onUpgradePress, blurHeight = 150 }: Props) => {
  return (
    <View style={styles.container}>
      {/* Actual Content */}
      <View pointerEvents={isPremium? 'auto' : 'none'} style={{flex: 1}}>
      {children}
      </View>

      {/* Overlay if NOT premium */}
      {!isPremium && (
        <View style={[styles.partialOverlay, { height: blurHeight }]}>
        <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
        style={styles.blur}>            
            <View style={styles.overlayContent}>
              <Text style={styles.title}>Premium Feature 🔒</Text>
              <Text style={styles.subtitle}>
                Upgrade to unlock this feature
              </Text>

              <Pressable style={styles.button} onPress={onUpgradePress}>
                <Text style={styles.buttonText}>Upgrade</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

export default PremiumOverlay;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blur: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  overlayContent: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    marginTop: 5,
    color: '#ddd',
    textAlign: 'center',
  },
  partialOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    pointerEvents: 'box-none',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  button: {
    marginTop: 15,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});