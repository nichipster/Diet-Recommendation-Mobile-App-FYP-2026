import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";

//Dummy Data !!
const CLIENTS = [
  { id: "1", name: "Sarah Tan", goal: "Weight Loss", status: "On Track" },
  { id: "2", name: "John Lee", goal: "Muscle Gain", status: "Behind" },
  { id: "3", name: "Alicia Ng", goal: "Maintenance", status: "On Track" },
];

export default function ActiveClients({ onBack }: any) {
  const router = useRouter();
  const [clients, setClients] = useState(CLIENTS);
  const [searchQuery, setSearchQuery] = useState("");

  const handleViewMealLogs = (client: any) => {
    router.push({
      pathname: "/viewmeallogs",
      params: { clientId: client.id, clientName: client.name },
    });
  };

  const handleViewClientData = (client: any) => {
    router.push({
      pathname: "/viewprogressreport",
      params: { clientId: client.id, clientName: client.name },
    });
  };

  const toggleStatus = (id: string) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === id
          ? { ...client, status: client.status === "On Track" ? "Behind" : "On Track" }
          : client
      )
    );
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      {/* LEFT: Name and Goal */}
      <View style={styles.leftSection}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.goal}>{item.goal}</Text>
      </View>

      {/* MIDDLE: Progress Report*/}
      <View style={styles.middleSection}>
        <TouchableOpacity
          style={styles.middleButton}
          onPress={() => handleViewClientData(item)}
        >
          <Text style={styles.middleButtonText}>Progress Report</Text>
        </TouchableOpacity>
      </View>

      {/* RIGHT: Meal Logs */}
      <View style={styles.rightSection}>
      <TouchableOpacity
          style={styles.middleButton}
          onPress={() => handleViewMealLogs(item)}
        >
          <Text style={styles.middleButtonText}>Meal Logs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Active Clients</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredClients}
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
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  leftSection: {
    flex: 2,
  },
  middleSection: {
    flex: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  rightSection: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
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
  middleButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  middleButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  toggleBtn: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 4,
    alignItems: "center",
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },
});
