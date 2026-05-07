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
import { SafeAreaView } from 'react-native-safe-area-context';

const GOAL_LABELS: Record<string, string> = {
  lose: 'Weight Loss',
  gain: 'Muscle Gain',
  maintain: 'Maintenance',
};

type Client = {
  id: string;
  name: string;
  goal: string;
};

type Props = {
  clients: Client[];
  onBack: () => void;
};

export default function ActiveClients({ clients, onBack }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Map incoming clients instead of global data
  const mappedClients = clients.map(client => ({
    ...client,
    goal: GOAL_LABELS[client.goal] ?? client.goal,
    status: 'On Track',
  }));

  const handleViewMealLogs = (client: Client) => {
    router.push({
      pathname: "/viewmeallogs",
      params: { clientId: client.id, clientName: client.name },
    });
  };

  const handleViewClientData = (client: Client) => {
    router.push({
      pathname: "/viewprogressreport",
      params: { clientId: client.id, clientName: client.name },
    });
  };

  // ✅ Filter from scoped data
  const filteredClients = mappedClients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.goal}>{item.goal}</Text>
      </View>

      <View style={styles.middleSection}>
        <TouchableOpacity
          style={styles.middleButton}
          onPress={() => handleViewClientData(item)}
        >
          <Text style={styles.middleButtonText}>Progress Report</Text>
        </TouchableOpacity>
      </View>

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Active Clients</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#9ca3af"
      />

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
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
});
