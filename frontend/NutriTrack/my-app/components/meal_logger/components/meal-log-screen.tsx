// meal-log-screen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import DateSelector from './date-selector';
import TimelineView, { Meal } from './timeline-view';
import AddMealMenu from './add-meal-menu';
import MealFormModal from './meal-form-modal';
import { BarcodeScanner } from './barcode-scanner';
import { BarcodeProductForm } from './barcode-product-form';
import DatabaseSearch from './database-search';
import { DatabaseFoodForm } from './database-food-form';
import { AiPhotoCapture } from './ai-photo-capture';
import { AiMealForm } from './ai-meal-form';
import { FoodData } from './database-search';

export default function MealLogScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedTime, setSelectedTime] = useState('08:00');

  // ── which modal/screen is active ──
  const [showAddMenu, setShowAddMenu]           = useState(false);
  const [showManualForm, setShowManualForm]     = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeForm, setShowBarcodeForm]   = useState(false);
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
  const [showDatabaseForm, setShowDatabaseForm] = useState(false);
  const [showAiCapture, setShowAiCapture]       = useState(false);
  const [showAiForm, setShowAiForm]             = useState(false);

  // ── data passed between steps ──
  const [scannedBarcode, setScannedBarcode]     = useState('');
  const [selectedFood, setSelectedFood]         = useState<FoodData | null>(null);
  const [capturedPhoto, setCapturedPhoto]       = useState('');
  const [editingMeal, setEditingMeal]           = useState<Meal | null>(null);

  // ── time slot pressed → open menu ──
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowAddMenu(true);
  };

  // ── method selected from menu ──
  const handleSelectMethod = (method: 'manual' | 'barcode' | 'database' | 'ai') => {
    if (method === 'manual')   setShowManualForm(true);
    if (method === 'barcode')  setShowBarcodeScanner(true);
    if (method === 'database') setShowDatabaseSearch(true);
    if (method === 'ai')       setShowAiCapture(true);
  };

  // ── barcode scanned → show product form ──
  const handleBarcodeScan = (barcode: string) => {
    setScannedBarcode(barcode);
    setShowBarcodeScanner(false);
    setShowBarcodeForm(true);
  };

  // ── food selected from database → show food form ──
  const handleFoodSelect = (food: FoodData) => {
    setSelectedFood(food);
    setShowDatabaseSearch(false);
    setShowDatabaseForm(true);
  };

  // ── photo captured → show AI form ──
  const handlePhotoCapture = (photoUri: string) => {
    setCapturedPhoto(photoUri);
    setShowAiCapture(false);
    setShowAiForm(true);
  };

  // ── add meal from any method ──
  const handleAddMeal = (meal: Omit<Meal, 'id'>) => {
    const newMeal: Meal = {
      ...meal,
      id: Date.now().toString(),
    };
    setMeals(prev => [...prev, newMeal]);
  };

  // ── edit meal ──
  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setShowManualForm(true);
  };

  const handleSaveMeal = (meal: Meal | Omit<Meal, 'id'>) => {
    if ('id' in meal) {
      setMeals(prev => prev.map(m => m.id === meal.id ? meal : m));
    } else {
      handleAddMeal(meal);
    }
    setEditingMeal(null);
  };

  // ── delete meal ──
  const handleDeleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  // ── close all and reset ──
  const closeAll = () => {
    setShowManualForm(false);
    setShowBarcodeForm(false);
    setShowDatabaseForm(false);
    setShowAiForm(false);
    setEditingMeal(null);
    setScannedBarcode('');
    setSelectedFood(null);
    setCapturedPhoto('');
  };

  const dateString = selectedDate.toLocaleDateString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Meal Logger</Text>
          <Text style={styles.subtitle}>Track your daily meals and nutrition</Text>
        </View>

        {/* ── Date Selector ── */}
        <DateSelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <Text style={styles.dateLabel}>{dateString}</Text>

        {/* ── Timeline ── */}
        <TimelineView
          meals={meals.filter(m => m.date === selectedDate.toISOString().split('T')[0])}
          onTimeSelect={handleTimeSelect}
          onEditMeal={handleEditMeal}
          onDeleteMeal={handleDeleteMeal}
        />

      </ScrollView>

      {/* ── Add Meal Menu ── */}
      <AddMealMenu
        open={showAddMenu}
        onOpenChange={setShowAddMenu}
        selectedTime={selectedTime}
        onSelectMethod={handleSelectMethod}
      />

      {/* ── Manual Form Modal ── */}
      <MealFormModal
        open={showManualForm}
        meal={editingMeal}
        initialTime={selectedTime}
        onClose={closeAll}
        onSave={handleSaveMeal}
      />

      {/* ── Barcode Scanner ── */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={(open) => {
          setShowBarcodeScanner(open);
          if (!open) setShowAddMenu(false);
        }}
        onScanSuccess={handleBarcodeScan}
      />

      {/* ── Barcode Product Form ── */}
      {showBarcodeForm && scannedBarcode ? (
        <MealFormModal
          open={showBarcodeForm}
          initialTime={selectedTime}
          onClose={closeAll}
          onSave={(meal) => {
            handleSaveMeal(meal);
            closeAll();
          }}
        />
      ) : null}

      {/* ── Database Search ── */}
      <DatabaseSearch
        open={showDatabaseSearch}
        onOpenChange={(open) => {
          setShowDatabaseSearch(open);
          if (!open) setShowAddMenu(false);
        }}
        onSelectFood={handleFoodSelect}
      />

      {/* ── Database Food Form ── */}
      {showDatabaseForm && selectedFood ? (
        <MealFormModal
          open={showDatabaseForm}
          initialTime={selectedTime}
          onClose={closeAll}
          onSave={(meal) => {
            handleSaveMeal(meal);
            closeAll();
          }}
        />
      ) : null}

      {/* ── AI Photo Capture ── */}
      <AiPhotoCapture
        open={showAiCapture}
        onOpenChange={(open) => {
          setShowAiCapture(open);
          if (!open) setShowAddMenu(false);
        }}
        onPhotoCapture={handlePhotoCapture}
      />

      {/* ── AI Meal Form ── */}
      {showAiForm && capturedPhoto ? (
        <MealFormModal
          open={showAiForm}
          initialTime={selectedTime}
          onClose={closeAll}
          onSave={(meal) => {
            handleSaveMeal(meal);
            closeAll();
          }}
        />
      ) : null}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#f9fafb' },
  scroll:   { padding: 16, paddingBottom: 40 },
  header:   { alignItems: 'center', marginBottom: 12 },
  title:    { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  dateLabel: {
    textAlign: 'center', fontSize: 13,
    color: '#6b7280', marginVertical: 8,
  },
});