import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

export interface FoodData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  servingSize?: string;
}

interface DatabaseSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFood: (foodData: FoodData) => void;
}

export default function DatabaseSearch({
  open,
  onOpenChange,
  onSelectFood,
}: DatabaseSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FoodData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const mockDatabase: FoodData[] = [
    { name: "Chicken Breast, Grilled", calories: 165, protein: 31, carbs: 0, servingSize: "100g" },
    { name: "Brown Rice, Cooked", calories: 112, protein: 2.6, carbs: 24, servingSize: "100g" },
    { name: "Apple", calories: 52, protein: 0.3, carbs: 14, servingSize: "100g" },
    { name: "Banana", calories: 89, protein: 1.1, carbs: 23, servingSize: "100g" },
    { name: "Salmon, Baked", calories: 206, protein: 22, carbs: 0, servingSize: "100g" },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const searchTerms = searchQuery.toLowerCase().split(" ");

    const filtered = mockDatabase.filter((food) =>
      searchTerms.some((term) => food.name.toLowerCase().includes(term))
    );

    setResults(filtered);
    setIsSearching(false);
  };

  const handleSelectFood = (food: FoodData) => {
    onSelectFood(food);
    onOpenChange(false);
    setSearchQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <Modal visible={open} animationType="slide">
      <View style={styles.container}>

        <Text style={styles.title}>Search Food Database</Text>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search food..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer}>
          {isSearching && (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
              <Text>Searching...</Text>
            </View>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <View style={styles.center}>
              <Text>No results found for "{searchQuery}"</Text>
            </View>
          )}

          {!isSearching &&
            results.map((food, index) => (
              <TouchableOpacity
                key={index}
                style={styles.foodCard}
                onPress={() => handleSelectFood(food)}
              >
                <Text style={styles.foodName}>{food.name}</Text>

                <Text style={styles.serving}>
                  Serving: {food.servingSize}
                </Text>

                <View style={styles.macros}>
                  <Text style={styles.calories}>{food.calories} cal</Text>
                  <Text style={styles.protein}>{food.protein}g protein</Text>
                  <Text style={styles.carbs}>{food.carbs}g carbs</Text>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  searchRow: {
    flexDirection: "row",
    marginBottom: 15,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },

  searchButton: {
    marginLeft: 10,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },

  buttonText: {
    color: "white",
    fontWeight: "600",
  },

  resultsContainer: {
    flex: 1,
  },

  foodCard: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },

  foodName: {
    fontWeight: "600",
    fontSize: 16,
  },

  serving: {
    color: "#666",
    marginTop: 4,
  },

  macros: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },

  calories: {
    color: "#ea580c",
  },

  protein: {
    color: "#2563eb",
  },

  carbs: {
    color: "#16a34a",
  },

  cancelBtn: {
    marginTop: 10,
    backgroundColor: "#444",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  center: {
    alignItems: "center",
    marginTop: 40,
  },
});