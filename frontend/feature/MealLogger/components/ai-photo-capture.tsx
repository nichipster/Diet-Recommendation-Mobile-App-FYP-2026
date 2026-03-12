import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";

interface AiPhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoCapture: (photoDataUrl: string) => void;
}

export function AiPhotoCapture({
  open,
  onOpenChange,
  onPhotoCapture,
}: AiPhotoCaptureProps) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    setLoading(true);

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: true,
    });

    if (photo?.uri) {
      setCapturedPhoto(photo.uri);
    }

    setLoading(false);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const usePhoto = () => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto);
      onOpenChange(false);
    }
  };

  if (!permission) return null;

  return (
    <Modal visible={open} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>Take Photo of Meal</Text>

        {!permission.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              Camera permission required
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={requestPermission}
            >
              <Text style={styles.primaryButtonText}>
                Allow Camera Access
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cameraContainer}>
              {capturedPhoto ? (
                <Image
                  source={{ uri: capturedPhoto }}
                  style={styles.image}
                />
              ) : (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  ref={cameraRef}
                />
              )}
            </View>

            <View style={styles.controls}>
              {capturedPhoto ? (
                <>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={retakePhoto}
                  >
                    <Feather name="rotate-ccw" size={18} />
                    <Text>Retake</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={usePhoto}
                  >
                    <Text style={styles.primaryButtonText}>
                      Analyze Photo
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => onOpenChange(false)}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={capturePhoto}
                    disabled={loading}
                  >
                    <Feather name="camera" size={18} color="white" />
                    <Text style={styles.primaryButtonText}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },

  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  image: {
    flex: 1,
    resizeMode: "cover",
  },

  controls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },

  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  permissionText: {
    fontSize: 16,
  },
});