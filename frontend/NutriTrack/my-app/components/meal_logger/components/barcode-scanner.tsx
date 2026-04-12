import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useUpgradePrompt } from '@/components/upgrade_lock/UpgradePrompt';
import UpgradePromptModal from '@/components/upgrade_lock/UpgradePromptModal';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScanSuccess }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualInput, setManualInput]   = useState('');
  const [scanned, setScanned]           = useState(false);

  const {
    showPrompt, promptFeature,
    promptForFeature, hidePrompt,
  } = useUpgradePrompt();

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    // Gates manual submit
    const blocked = promptForFeature('Barcode Scanner');
    if (blocked) return;
    
    onScanSuccess(manualInput.trim());
    onOpenChange(false);
    setManualInput('');
  };

  const handleClose = () => {
    setScanned(false);
    setManualInput('');
    onOpenChange(false);
  };

  // ← Gate the barcode scan itself
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    const blocked = promptForFeature('Barcode Scanner');
    if (blocked) return;
    setScanned(true);
    onScanSuccess(data);
    onOpenChange(false);
  };

  return (
    <>
      <Modal visible={open} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.title}>Scan Product Barcode</Text>

          {!permission ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>
                Checking camera permissions...
              </Text>
            </View>

          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>
                Camera access is needed to scan barcodes.
              </Text>
              <TouchableOpacity style={styles.button} onPress={requestPermission}>
                <Text style={styles.buttonText}>Allow Camera Access</Text>
              </TouchableOpacity>
            </View>

          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned} // ← use gated handler
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13', 'ean8',
                    'upc_a', 'upc_e',
                    'code128', 'code39',
                  ],
                }}
              />
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>Position barcode within frame</Text>
              </View>
            </View>
          )}

          {scanned && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#6b7280', marginTop: 12 }]}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.orText}>— or enter manually —</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter barcode number"
            value={manualInput}
            onChangeText={setManualInput}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.button, { marginTop: 8 }]}
            onPress={handleManualSubmit}
            disabled={!manualInput.trim()}
          >
            <Text style={styles.buttonText}>Submit Manually</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ← Upgrade prompt renders outside the scanner modal */}
      <UpgradePromptModal
        visible={showPrompt}
        onClose={() => {
          hidePrompt();
          handleClose(); // ← close scanner too when user dismisses
        }}
        onUpgrade={() => {
          hidePrompt();
          handleClose();
        }}
        feature={promptFeature}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, padding: 16, backgroundColor: '#fff' },
  title:           { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  permissionBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  permissionText:  { fontSize: 15, textAlign: 'center', color: '#374151' },
  cameraContainer: { height: 280, marginTop: 40, marginBottom: 12, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  camera:          { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  overlayText: {
    backgroundColor: 'rgba(0,0,0,0.5)', color: 'white',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
  },
  orText:       { textAlign: 'center', color: '#9ca3af', marginVertical: 12, fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: '#ddd', padding: 10,
    borderRadius: 6, textAlign: 'center', fontSize: 16,
  },
  button: {
    backgroundColor: '#000', padding: 14,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
  },
  outlineButton: {
    backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#000', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});