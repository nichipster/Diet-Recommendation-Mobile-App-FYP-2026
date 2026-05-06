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
  Alert,
} from "react-native";
import { API_URL, getAuthHeaders } from "@/constants/api";

export interface FoodData {
  food_id?: number;
  external_id: number | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "ingredient" | "product" | "manual" | "admin" | "custom";
  servingSize?: string;
  brand?: string;
}

interface DatabaseSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFood: (foodData: FoodData) => void;
  token: string | null;
}

export default function DatabaseSearch({
  open,
  onOpenChange,
  onSelectFood,
  token,
}: DatabaseSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FoodData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !token) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `${API_URL}/food/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: getAuthHeaders(token),
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      
      const mappedResults: FoodData[] = data.map((item: any) => ({
        food_id: item.food_id ?? item.custom_meal_id,
        external_id: item.external_id,
        name: item.name,
        source: item.source,
        brand: item.brand,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: "100g",
      }));
      setResults(mappedResults);
    } catch (error) {
      Alert.alert("Error", "Search failed. Please try again.");
      setResults([]);
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFood = async (food: FoodData) => {
    if (!token) return;

    // Custom meals are fetched from a different endpoint entirely
    if (food.source === 'custom') {
      try {
        const detailResponse = await fetch(
          `${API_URL}/custom-meals/${food.food_id}`,
          { headers: getAuthHeaders(token) }
        );
        if (!detailResponse.ok) throw new Error('Failed to get custom meal details');
        const details = await detailResponse.json();
        const updatedFood: FoodData = {
          ...food,
          calories: details.calories,
          protein: details.protein,
          carbs: details.carbs,
          fat: details.fats,
          servingSize: `${details.serving_size}${details.serving_unit}`,
        };
        onSelectFood(updatedFood);
        onOpenChange(false);
        setSearchQuery('');
        setResults([]);
        setHasSearched(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to load custom meal details');
        console.error(error);
      }
      return;
    }

    try {
      const detailUrl =
        food.source === 'admin' || food.source === 'manual'
          ? `${API_URL}/food/detail?food_id=${food.food_id}&source=${food.source}`
          : `${API_URL}/food/detail?external_id=${food.external_id}&source=${food.source}`;

      const detailResponse = await fetch(detailUrl, {
        headers: getAuthHeaders(token),
      });
      if (!detailResponse.ok) throw new Error('Failed to get food details');

      const details = await detailResponse.json();
      const updatedFood: FoodData = {
        ...food,
        calories: details.calories,
        protein: details.protein_g,
        carbs: details.carb_g,
        fat: details.fat_g,
        servingSize: `${details.serving_size}${details.serving_unit}`,
      };

      onSelectFood(updatedFood);
      onOpenChange(false);
      setSearchQuery('');
      setResults([]);
      setHasSearched(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load food details');
      console.error(error);
    }
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
            editable={!isSearching}
            placeholderTextColor="#9ca3af"
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

                {food.brand && <Text style={styles.brand}>Brand: {food.brand}</Text>}

                <Text style={styles.source}>Type: {food.source}</Text>

                <View style={styles.macros}>
                  <Text style={styles.serving}>Serving: {food.servingSize}</Text>
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
  brand: {
    color: "#666",
    marginTop: 4,
    fontSize: 13,
  },
  source: {
    color: "#999",
    marginTop: 2,
    fontSize: 12,
  },
  macros: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },
  serving: {
    color: "#6b7280",
    fontSize: 12,
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