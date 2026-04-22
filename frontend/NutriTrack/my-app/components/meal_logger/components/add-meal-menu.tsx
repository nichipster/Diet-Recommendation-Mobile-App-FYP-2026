import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

interface AddMealMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTime: string;
  onSelectMethod: (method: "manual" | "barcode" | "database" | "ai") => void;
}

export default function AddMealMenu({
  open,
  onOpenChange,
  selectedTime,
  onSelectMethod,
}: AddMealMenuProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);

    if (hour === 0) return `12:${minutes}am`;
    if (hour < 12) return `${hour}:${minutes}am`;
    if (hour === 12) return `12:${minutes}pm`;
    return `${hour - 12}:${minutes}pm`;
  };

  const methods = [
    { id: "manual" as const, icon: "edit-3", title: "Manual Logging", description: "Enter Meal Details Manually" },
    { id: "barcode" as const, icon: "maximize", title: "Scan Barcode", description: "Scan Product Barcode for Info" },
    { id: "database" as const, icon: "database", title: "Search Database", description: "Find Food In Our Database" },
    { id: "ai" as const, icon: "camera", title: "AI Image Recognition", description: "Take A Photo Of Your Meal" },
  ];

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>Add Meal at {formatTime(selectedTime)}</Text>
          <Text style={styles.subtitle}>Choose a method to log your meal</Text>

          {/* Options */}
          {methods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={styles.button}
              onPress={() => {
                onSelectMethod(method.id);
              }}
            >
              <View style={styles.iconBox}>
                <Feather name={method.icon as any} size={22} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.methodTitle}>{method.title}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Back Button moved here */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onOpenChange(false)}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: 20 },
  container: { backgroundColor: "white", borderRadius: 14, padding: 20, width: "100%", alignSelf: "center" },
  title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginTop: 4, marginBottom: 16, color: "#666" },
  button: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, marginBottom: 10 },
  iconBox: { marginRight: 12 },
  textContainer: { flex: 1 },
  methodTitle: { fontSize: 16, fontWeight: "600" },
  methodDescription: { fontSize: 13, color: "#666", marginTop: 2 },
  backButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ddd",
    alignItems: "center",
  },
  backText: { fontSize: 14, fontWeight: "600" },
});