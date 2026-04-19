import React, { useState } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AiRecognitionResult } from "./ai-photo-capture";
import { API_URL, getAuthHeaders } from "@/constants/api";

interface AiResultModalProps {
  open: boolean;
  result: AiRecognitionResult | null;
  token: string | null;
  onClose: () => void;
  onLogged: () => void;
  onRetake: () => void;
}

const PORTION_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function AiResultModal({
  open, result, token, onClose, onLogged, onRetake,
}: AiResultModalProps) {
  const [selectedDish, setSelectedDish]     = useState<string | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);
  const [submitting, setSubmitting]         = useState(false);

  if (!result) return null;

  const dish = selectedDish ?? result.detected_dish;
  const total = result.nutrition_total;

  const scaledCalories  = total ? Math.round(total.calories  * portionMultiplier) : null;
  const scaledProtein   = total ? (total.protein_g * portionMultiplier).toFixed(1) : null;
  const scaledCarbs     = total ? (total.carb_g    * portionMultiplier).toFixed(1) : null;
  const scaledFat       = total ? (total.fat_g     * portionMultiplier).toFixed(1) : null;

  const confidencePct   = Math.round(result.confidence * 100);
  const confidenceColor =
    result.confidence >= 0.75 ? "#22c55e" :
    result.confidence >= 0.55 ? "#f59e0b" : "#ef4444";

  const handleLog = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/image-recognition/log`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          meal_name: dish,
          ingredients: result.ingredients,
          portion_multiplier: portionMultiplier,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.detail || `Server error ${response.status}`);
      }
      Alert.alert("Success ✅", "Meal logged successfully!");
      onLogged();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log meal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide">
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>AI Result</Text>
          <TouchableOpacity onPress={onRetake}>
            <Feather name="camera" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Quality warning */}
        {result.quality_warning && (
          <View style={styles.warningBox}>
            <Feather name="alert-triangle" size={14} color="#b45309" />
            <Text style={styles.warningText}>{result.quality_warning}</Text>
          </View>
        )}

        {/* Detected dish + confidence */}
        <View style={styles.dishCard}>
          <Text style={styles.dishName}>{dish}</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + "20", borderColor: confidenceColor }]}>
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              {confidencePct}% confidence
            </Text>
          </View>
        </View>

        {/* Low-confidence: pick from alternatives */}
        {result.needs_confirmation && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Not sure? Select the correct dish:</Text>
            <View style={styles.alternativesRow}>
              {/* Include the top prediction itself as an option */}
              {[result.detected_dish, ...result.top_alternatives.map(a => a.name)].map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.altChip,
                    (selectedDish ?? result.detected_dish) === name && styles.altChipSelected,
                  ]}
                  onPress={() => setSelectedDish(name)}
                >
                  <Text
                    style={[
                      styles.altChipText,
                      (selectedDish ?? result.detected_dish) === name && styles.altChipTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Portion multiplier */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Portion size</Text>
          <View style={styles.portionRow}>
            {PORTION_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.portionChip, portionMultiplier === v && styles.portionChipSelected]}
                onPress={() => setPortionMultiplier(v)}
              >
                <Text style={[styles.portionChipText, portionMultiplier === v && styles.portionChipTextSelected]}>
                  {v === 1.0 ? "1× (full)" : `${v}×`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nutrition summary */}
        {total && (
          <View style={styles.nutritionBox}>
            <Text style={styles.nutritionHeading}>Estimated Nutrition</Text>
            <View style={styles.macroRow}>
              <MacroCard label="Calories" value={`${scaledCalories}`} unit="kcal" color="#f97316" />
              <MacroCard label="Protein"  value={scaledProtein!}       unit="g"    color="#3b82f6" />
              <MacroCard label="Carbs"    value={scaledCarbs!}         unit="g"    color="#22c55e" />
              <MacroCard label="Fat"      value={scaledFat!}           unit="g"    color="#eab308" />
            </View>
          </View>
        )}

        {/* Ingredients list */}
        {result.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Detected Ingredients</Text>
            {result.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <Text style={styles.ingredientDetail}>
                  {Math.round(ing.amount_g * portionMultiplier)}g · {Math.round(ing.calories * portionMultiplier)} kcal
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
            <Text style={styles.cancelButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logButton, submitting && styles.disabled]}
            onPress={handleLog}
            disabled={submitting}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.logButtonText}>{submitting ? "Logging…" : "Log Meal"}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </Modal>
  );
}

function MacroCard({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <View style={[macroStyles.card, { borderColor: color }]}>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
      <Text style={macroStyles.unit}>{unit}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  card:  { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, alignItems: "center", backgroundColor: "#fff" },
  value: { fontSize: 16, fontWeight: "700" },
  unit:  { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  label: { fontSize: 11, color: "#6b7280", marginTop: 2 },
});

const styles = StyleSheet.create({
  container:      { padding: 20, paddingBottom: 40, backgroundColor: "#fff", flexGrow: 1 },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:          { fontSize: 18, fontWeight: "700" },
  warningBox:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef3c7", borderRadius: 8, padding: 10, marginBottom: 12 },
  warningText:    { color: "#b45309", fontSize: 13, flex: 1 },
  dishCard:       { alignItems: "center", paddingVertical: 20, gap: 8, borderBottomWidth: 1, borderColor: "#f3f4f6", marginBottom: 16 },
  dishName:       { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center" },
  confidenceBadge:{ borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  confidenceText: { fontSize: 13, fontWeight: "600" },
  section:        { marginBottom: 20 },
  sectionLabel:   { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  alternativesRow:{ flexDirection: "row", flexWrap: "wrap", gap: 8 },
  altChip:        { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  altChipSelected:{ borderColor: "#7c3aed", backgroundColor: "#7c3aed" },
  altChipText:    { fontSize: 14, color: "#374151" },
  altChipTextSelected: { color: "#fff", fontWeight: "600" },
  portionRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  portionChip:    { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  portionChipSelected: { borderColor: "#000", backgroundColor: "#000" },
  portionChipText:     { fontSize: 14, color: "#374151" },
  portionChipTextSelected: { color: "#fff", fontWeight: "600" },
  nutritionBox:   { backgroundColor: "#f9fafb", borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  nutritionHeading: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  macroRow:       { flexDirection: "row", gap: 8 },
  ingredientRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  ingredientName: { fontSize: 14, color: "#111827", flex: 1 },
  ingredientDetail:{ fontSize: 13, color: "#6b7280" },
  buttonRow:      { flexDirection: "row", gap: 10, marginTop: 24 },
  cancelButton:   { flex: 1, borderWidth: 1, borderColor: "#d1d5db", padding: 14, borderRadius: 10, alignItems: "center" },
  cancelButtonText:{ color: "#374151", fontWeight: "600" },
  logButton:      { flex: 2, backgroundColor: "#7c3aed", padding: 14, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  logButtonText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  disabled:       { opacity: 0.6 },
});