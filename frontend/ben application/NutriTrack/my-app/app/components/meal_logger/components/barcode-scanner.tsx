import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Meal } from './meal-form';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScanSuccess }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setIsScanning(status === 'granted');
    })();
  }, [open]);

  const handleSubmit = () => {
    if (manualInput.trim()) {
      onScanSuccess(manualInput.trim());
      onOpenChange(false);
      setManualInput('');
    }
  };

  if (!open) return null;

  return (
    <Modal visible={open} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>Scan Product Barcode</Text>

        {hasPermission === false && (
          <View style={styles.alert}>
            <Text style={{ color: 'red' }}>
              Camera permission denied. Enter barcode manually.
            </Text>
          </View>
        )}

        {hasPermission && (
          <View style={styles.cameraContainer}>
            <Camera
              style={styles.camera}
              ref={(ref) => (cameraRef.current = ref)}
            />
            {!isScanning && <ActivityIndicator size="large" />}
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Position barcode here</Text>
            </View>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Enter barcode manually"
          value={manualInput}
          onChangeText={setManualInput}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, { marginTop: 8 }]}
          onPress={handleSubmit}
          disabled={!manualInput.trim()}
        >
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => onOpenChange(false)}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  cameraContainer: { height: 250, marginBottom: 12, position: 'relative' },
  camera: { flex: 1, borderRadius: 8 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  alert: { padding: 12, backgroundColor: '#fdd', borderRadius: 6, marginBottom: 12 },
});