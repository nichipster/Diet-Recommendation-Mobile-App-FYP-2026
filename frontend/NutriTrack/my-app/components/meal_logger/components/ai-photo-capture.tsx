import React, { useState, useRef } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { API_URL, getAuthHeaders } from "@/constants/api";

export interface AiRecognitionResult {
  detected_dish: string;
  confidence: number;
  needs_confirmation: boolean;
  top_alternatives: { name: string; confidence: number }[];
  ingredients: {
    name: string; amount_g: number; calories: number;
    protein_g: number; carb_g: number; fat_g: number;
    sugar_g: number; fiber_g: number; sodium_mg: number;
  }[];
  nutrition_total: { calories: number; protein_g: number; carb_g: number; fat_g: number } | null;
  quality_warning: string | null;
}

interface AiPhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: AiRecognitionResult) => void;
  token: string | null;
}

export function AiPhotoCapture({ open, onOpenChange, onResult, token }: AiPhotoCaptureProps) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const handleClose = () => {
    setCapturedPhoto(null);
    setError(null);
    setDisclaimerAccepted(false);
    onOpenChange(false);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
    if (photo?.uri) setCapturedPhoto(photo.uri);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setError(null);
  };

  const analysePhoto = async () => {
    if (!capturedPhoto || !token) return;
    setAnalysing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: capturedPhoto,
        type: "image/jpeg",
        name: "meal.jpg",
      } as any);

      const { "Content-Type": _, ...authHeader } = getAuthHeaders(token);

      const response = await fetch(`${API_URL}/image-recognition/analyze`, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.detail || `Server error ${response.status}`);
      }

      const result: AiRecognitionResult = await response.json();
      setCapturedPhoto(null);
      setDisclaimerAccepted(false);
      onOpenChange(false);
      onResult(result);
    } catch (e: any) {
      setError(e?.message || "Analysis failed. Please try again.");
    } finally {
      setAnalysing(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide">

      {/* ── Step 1: Disclaimer ── */}
      {!disclaimerAccepted ? (
        <View style={styles.disclaimerContainer}>
          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <Feather name="arrow-left" size={22} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.disclaimerContent}>
            {/* Icon */}
            <View style={styles.iconCircle}>
              <Feather name="camera" size={36} color="#7c3aed" />
            </View>

            <Text style={styles.disclaimerTitle}>AI Food Recognition</Text>
            <Text style={styles.disclaimerSubtitle}>Before you continue, please note:</Text>

            {/* Disclaimer points */}
            {[
              {
                icon: "alert-triangle" as const,
                color: "#f59e0b",
                text: "Nutrition estimates are approximate and may not reflect exact values for your specific meal.",
              },
              {
                icon: "cpu" as const,
                color: "#7c3aed",
                text: "AI predictions can be incorrect. Always confirm the detected dish before logging.",
              },
              {
                icon: "sun" as const,
                color: "#10b981",
                text: "For best results, take a clear, well-lit photo with the food filling most of the frame.",
              },
              {
                icon: "heart" as const,
                color: "#ef4444",
                text: "Do not rely solely on AI estimates for medical or clinical dietary decisions.",
              },
            ].map((item, i) => (
              <View key={i} style={styles.disclaimerRow}>
                <View style={[styles.disclaimerIconBox, { backgroundColor: item.color + "15" }]}>
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={styles.disclaimerRowText}>{item.text}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => setDisclaimerAccepted(true)}
            >
              <Text style={styles.acceptButtonText}>I Understand — Continue</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimerFooter}>
              Nutritional data is estimated using AI and may vary from actual values.
            </Text>
          </View>
        </View>

      ) : (
        /* ── Step 2: Camera ── */
        <View style={styles.container}>

          {/* Header with back button */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <Feather name="arrow-left" size={22} color="#374151" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Take Photo of Meal</Text>
            <View style={{ width: 70 }} />{/* spacer to centre title */}
          </View>

          {!permission ? (
            <View style={styles.centreBox}>
              <Text style={styles.hintText}>Checking camera permissions…</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centreBox}>
              <Text style={styles.hintText}>Camera permission required</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Allow Camera Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.cameraContainer}>
                {capturedPhoto ? (
                  <Image source={{ uri: capturedPhoto }} style={styles.image} />
                ) : (
                  <CameraView style={styles.camera} facing="back" ref={cameraRef} />
                )}

                {analysing && (
                  <View style={styles.analysingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.analysingText}>Analysing your meal…</Text>
                  </View>
                )}
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.controls}>
                {capturedPhoto ? (
                  <>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={retakePhoto}
                      disabled={analysing}
                    >
                      <Feather name="rotate-ccw" size={18} />
                      <Text>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, analysing && styles.disabled]}
                      onPress={analysePhoto}
                      disabled={analysing}
                    >
                      <Feather name="cpu" size={18} color="white" />
                      <Text style={styles.primaryButtonText}>Analyse Photo</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.primaryButton} onPress={capturePhoto}>
                    <Feather name="camera" size={18} color="white" />
                    <Text style={styles.primaryButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Disclaimer screen ──
  disclaimerContainer: {
    flex: 1, backgroundColor: "#fff", padding: 20,
  },
  disclaimerContent: {
    flex: 1, justifyContent: "center", paddingBottom: 20,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#7c3aed15",
    justifyContent: "center", alignItems: "center",
    alignSelf: "center", marginBottom: 16,
  },
  disclaimerTitle: {
    fontSize: 22, fontWeight: "800", color: "#111827",
    textAlign: "center", marginBottom: 4,
  },
  disclaimerSubtitle: {
    fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24,
  },
  disclaimerRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, marginBottom: 16,
  },
  disclaimerIconBox: {
    width: 36, height: 36, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },
  disclaimerRowText: {
    flex: 1, fontSize: 14, color: "#374151", lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: "#7c3aed", padding: 16, borderRadius: 12,
    alignItems: "center", marginTop: 24, marginBottom: 12,
  },
  acceptButtonText: {
    color: "#fff", fontWeight: "700", fontSize: 15,
  },
  disclaimerFooter: {
    fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 16,
  },

  // ── Camera screen ──
  container: {
    flex: 1, padding: 20, backgroundColor: "#fff",
  },
  cameraHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  backButton: {
    flexDirection: "row", alignItems: "center", gap: 4, padding: 4,
  },
  backText: {
    fontSize: 16, color: "#374151", fontWeight: "500",
  },
  title: {
    fontSize: 18, fontWeight: "600", textAlign: "center",
  },
  cameraContainer: {
    flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#000",
  },
  camera: { flex: 1 },
  image:  { flex: 1, resizeMode: "cover" },
  controls: {
    flexDirection: "row", gap: 10, marginTop: 16,
  },
  centreBox: {
    flex: 1, justifyContent: "center", alignItems: "center", gap: 12,
  },
  hintText: {
    fontSize: 16, textAlign: "center", color: "#374151",
  },
  primaryButton: {
    flex: 1, backgroundColor: "#000", padding: 14, borderRadius: 8,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
  },
  primaryButtonText: { color: "white", fontWeight: "600" },
  secondaryButton: {
    flex: 1, borderWidth: 1, borderColor: "#ddd", padding: 14, borderRadius: 8,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
  },
  analysingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center", alignItems: "center", gap: 12,
  },
  analysingText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorText: { color: "#ef4444", fontSize: 13, flex: 1 },
  disabled: { opacity: 0.6 },
});