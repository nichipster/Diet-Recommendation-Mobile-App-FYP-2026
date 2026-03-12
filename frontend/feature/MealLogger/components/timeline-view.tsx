import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface TimelineViewProps {
  onTimeSelect: (time: string) => void;
}

export default function TimelineView({ onTimeSelect }: TimelineViewProps) {
  // Generate hours from 6am → 11pm
  const hours = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;

    return {
      value: `${hour.toString().padStart(2, "0")}:00`,
      label:
        hour < 12
          ? `${hour}am`
          : hour === 12
          ? "12pm"
          : `${hour - 12}pm`,
    };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Log a Meal</Text>

      {hours.map((hour, index) => (
        <View key={hour.value}>
          <View style={styles.row}>
            <Text style={styles.hour}>{hour.label}</Text>

            <View style={styles.line} />

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => onTimeSelect(hour.value)}
            >
              <Text style={styles.plus}>+</Text>
            </TouchableOpacity>
          </View>

          {index < hours.length - 1 && (
            <View style={styles.connectorRow}>
              <View style={styles.hourSpacer} />
              <View style={styles.verticalLine} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    width: "60%",        // shrink to 60% of parent
    alignSelf: "center", // center it horizontally
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  hour: {
    width: 60,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },

  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  plus: {
    fontSize: 18,
    fontWeight: "bold",
  },

  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  hourSpacer: {
    width: 60,
  },

  verticalLine: {
    width: 1,
    height: 14,
    backgroundColor: "#ddd",
    marginLeft: 2,
  },
});