import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";

/**
 * ⚠️ TEMP HARDCODED DATA
 * Replace later with API:  
 */
const CLIENTS = [
  { id: "1", name: "Sarah Tan", goal: "Weight Loss", status: "On Track" },
  { id: "2", name: "John Lee", goal: "Muscle Gain", status: "Behind" },
  { id: "3", name: "Alicia Ng", goal: "Maintenance", status: "On Track" },
];

export default function ActiveClients({ onBack }: any) {
  const router = useRouter();

  /**
   *  Navigate to client detail screen
   */
  const handlePress = (client: any) => {
    router.push({
      pathname: "/viewclientdata", 
      params: {
        clientId: client.id,
        clientName: client.name,
      },
    });
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePress(item)}
    >
      <View>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.goal}>{item.goal}</Text>
      </View>

      <Text
        style={[
          styles.status,
          {
            color:
              item.status === "On Track" ? "#059669" : "#dc2626",
          },
        ]}
      >
        {item.status}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* BACK BUTTON */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Active Clients</Text>

      <FlatList
        data={CLIENTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
    paddingTop: 60,
  },

  backBtn: {
    marginBottom: 10,
  },

  backText: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
  },

  goal: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  status: {
    fontSize: 12,
    fontWeight: "600",
  },
});