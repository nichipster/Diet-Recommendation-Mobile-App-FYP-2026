import React from "react";
import { ScrollView, TouchableOpacity, Text, View, StyleSheet, Dimensions } from "react-native";

interface DateSelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const screenWidth = Dimensions.get("window").width;
const circleWidth = Math.min(52, (screenWidth - 40) / 7); // ensures 7 circles fit on screen

export default function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {

  const getLast7Days = () => {
    const days: Date[] = [];
    const today = new Date();

    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }

    return days;
  };

  const weekDays = getLast7Days();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ alignSelf: "center" }}
    >
      {weekDays.map((day) => {
        const selected = selectedDate.toDateString() === day.toDateString();

        return (
          <TouchableOpacity
            key={day.toISOString()}
            style={[styles.circle, { width: circleWidth, height: circleWidth, borderRadius: circleWidth/2 }, selected && styles.circleActive]}
            onPress={() => onSelectDate(day)}
          >
            <View style={styles.dateContent}>
              <Text style={[styles.dayText, selected && styles.dayTextActive]}>
                {day.toLocaleDateString("en-US", { weekday: "short" }).charAt(0)}
              </Text>
              <Text style={[styles.dateText, selected && styles.dateTextActive]}>
                {day.getDate()}/{day.getMonth() + 1}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
  paddingHorizontal: 8,
  alignItems: "center",
  marginVertical: 8,
},
  circle: {
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 3,
  },
  circleActive: {
    backgroundColor: "#16a34a",
  },
  dateContent: {
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    color: "#444",
  },
  dayTextActive: {
    color: "#fff",
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#444",
  },
  dateTextActive: {
    color: "#fff",
  },
});