import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useUpgradePrompt } from '@/components/upgrade_lock/UpgradePrompt';
import { API_URL, getAuthHeaders } from '@/constants/api';

export interface FoodData {
  external_id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "ingredient" | "product" | "manual";
  servingSize?: string;
  brand?: string;
}

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (foodData: FoodData) => void;
  token: string | null;
}

export function BarcodeScanner({ open, onOpenChange, onScanSuccess, token }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualInput, setManualInput]   = useState('');
  const [scanned, setScanned]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  const { showPrompt, promptFeature, promptForFeature, hidePrompt } = useUpgradePrompt();

  const lookupBarcode = async (barcode: string) => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to scan barcodes.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/food/barcode/${encodeURIComponent(barcode)}`,
        { headers: getAuthHeaders(token) }
      );

      if (res.status === 404) {
        Alert.alert('Not Found', 'This barcode wasn\'t found in the database.');
        setScanned(false);
        return;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.error('Barcode lookup failed:', res.status, errorText);
        Alert.alert('Error', `Barcode lookup failed (${res.status}). Please try again.`);
        setScanned(false);
        return;
      }

      const details = await res.json();
      console.log('Barcode API response:', JSON.stringify(details));

      const foodData: FoodData = {
        external_id: details.external_id ?? 0,
        name:        details.name ?? 'Unknown',
        source:      details.source ?? 'product',
        brand:       details.brand ?? undefined,
        calories:    details.calories ?? 0,
        protein:     details.protein_g ?? 0,
        carbs:       details.carb_g ?? 0,
        fat:         details.fat_g ?? 0,
        servingSize: details.serving_size != null
          ? `${details.serving_size}${details.serving_unit ?? ''}`
          : undefined,
      };

      try {
        onScanSuccess(foodData);
        onOpenChange(false);
        setScanned(false);
      } catch (callbackErr) {
        console.error('onScanSuccess threw an error:', callbackErr);
        Alert.alert('Error', 'Something went wrong processing this food item.');
        setScanned(false);
      }

    } catch (err) {
      console.error('Barcode fetch error:', err);
      Alert.alert('Error', 'Failed to look up barcode. Please check your connection and try again.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || loading) return;
    const blocked = promptForFeature('Barcode Scanner');
    if (blocked) return;
    setScanned(true);
    lookupBarcode(data);
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim() || loading) return;
    const blocked = promptForFeature('Barcode Scanner');
    if (blocked) return;
    lookupBarcode(manualInput.trim());
    setManualInput('');
  };

  const handleClose = () => {
    setScanned(false);
    setManualInput('');
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <>
      <Modal visible={open} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.title}>Scan Product Barcode</Text>

          {!permission ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Checking camera permissions...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Camera access is needed to scan barcodes.</Text>
              <TouchableOpacity style={styles.button} onPress={requestPermission}>
                <Text style={styles.buttonText}>Allow Camera Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                }}
              />
              <View style={styles.overlay}>
                {loading
                  ? <ActivityIndicator color="white" size="large" />
                  : <Text style={styles.overlayText}>
                      {scanned ? 'Processing...' : 'Position barcode within frame'}
                    </Text>
                }
              </View>
            </View>
          )}

          {scanned && !loading && (
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
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, { marginTop: 8 }]}
            onPress={handleManualSubmit}
            disabled={!manualInput.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.buttonText}>Submit Manually</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={handleClose}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
