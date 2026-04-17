import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeaders } from '../../../constants/api';
import { useGoals } from '../../../context/GoalsContext';
import DateSelector from './date-selector';
import TimelineView, { Meal } from './timeline-view';
import AddMealMenu from './add-meal-menu';
import MealFormModal from './meal-form-modal';
import { BarcodeScanner } from './barcode-scanner';
import DatabaseSearch from './database-search';
import { AiPhotoCapture } from './ai-photo-capture';
import { FoodData } from './database-search';

export default function MealLogScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [token, setToken] = useState<string | null>(null);

  const { meals, setMeals } = useGoals();

  useEffect(() => {
    AsyncStorage.getItem('token').then(setToken);
  }, []);

  const [showAddMenu, setShowAddMenu]               = useState(false);
  const [showManualForm, setShowManualForm]         = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeForm, setShowBarcodeForm]       = useState(false);
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
  const [showDatabaseForm, setShowDatabaseForm]     = useState(false);
  const [showAiCapture, setShowAiCapture]           = useState(false);
  const [showAiForm, setShowAiForm]                 = useState(false);

  const [scannedBarcode, setScannedBarcode] = useState('');
  const [selectedFood, setSelectedFood]     = useState<FoodData | null>(null);
  const [capturedPhoto, setCapturedPhoto]   = useState('');
  const [editingMeal, setEditingMeal]       = useState<Meal | null>(null);

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowAddMenu(true);
  };

  const handleSelectMethod = (method: 'manual' | 'barcode' | 'database' | 'ai') => {
    if (method === 'manual')   setShowManualForm(true);
    if (method === 'barcode')  setShowBarcodeScanner(true);
    if (method === 'database') setShowDatabaseSearch(true);
    if (method === 'ai')       setShowAiCapture(true);
  };

  const handleBarcodeScan = (barcode: string) => {
    setScannedBarcode(barcode);
    setShowBarcodeScanner(false);
    setShowBarcodeForm(true);
  };

  const handleFoodSelect = (food: FoodData) => {
    setSelectedFood(food);
    setShowDatabaseSearch(false);
    setShowDatabaseForm(true);
  };

  const handlePhotoCapture = (photoUri: string) => {
    setCapturedPhoto(photoUri);
    setShowAiCapture(false);
    setShowAiForm(true);
  };

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setShowManualForm(true);
  };

  const handleDeleteMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

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

  const handleSaveSuccess = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      const res = await fetch(`${API_URL}/meal/?entry_date=${dateStr}`, {
        headers: getAuthHeaders(token ?? ''),
      });
      if (!res.ok) return;
      const data = await res.json();

      setMeals(data.map((m: any) => ({
        id: String(m.meal_id),
        name: m.meal_name,
        foodName: m.items?.[0]?.food_name ?? '',
        calories: m.total_calories,
        protein: m.total_protein_g,
        carbs: m.total_carb_g,
        fats: m.total_fat_g,
        amount: m.items?.[0]?.amount,
        time: new Date(m.consumed_at).toLocaleTimeString('en-SG', {
          hour: '2-digit', minute: '2-digit', hour12: false,
          timeZone: 'Asia/Singapore',
        }),
        date: dateStr,
      })));
    } catch (e) {
      console.log('Failed to refresh meals:', e);
    } finally {
      closeAll();
    }
  };

  const dateString = selectedDate.toLocaleDateString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Meal Logger</Text>
          <Text style={styles.subtitle}>Track your daily meals and nutrition</Text>
        </View>

        <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <Text style={styles.dateLabel}>{dateString}</Text>

        <TimelineView
          meals={meals.filter(m => m.date === selectedDate.toISOString().split('T')[0])}
          onTimeSelect={handleTimeSelect}
          onEditMeal={handleEditMeal}
          onDeleteMeal={handleDeleteMeal}
        />
      </ScrollView>

      <AddMealMenu
        open={showAddMenu}
        onOpenChange={setShowAddMenu}
        selectedTime={selectedTime}
        onSelectMethod={handleSelectMethod}
      />

      <MealFormModal
        open={showManualForm}
        meal={editingMeal}
        initialTime={selectedTime}
        token={token}
        onClose={closeAll}
        onSave={handleSaveSuccess}
      />

      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={(open) => {
          setShowBarcodeScanner(open);
          if (!open) setShowAddMenu(false);
        }}
        onScanSuccess={handleBarcodeScan}
      />

      {showBarcodeForm && scannedBarcode ? (
        <MealFormModal
          open={showBarcodeForm}
          initialTime={selectedTime}
          scannedBarcode={scannedBarcode}
          token={token}
          onClose={closeAll}
          onSave={handleSaveSuccess}
        />
      ) : null}

      <DatabaseSearch
        open={showDatabaseSearch}
        token={token ?? ''}
        onOpenChange={(open) => {
          setShowDatabaseSearch(open);
          if (!open) setShowAddMenu(false);
        }}
        onSelectFood={handleFoodSelect}
      />

      {showDatabaseForm && selectedFood ? (
        <MealFormModal
          open={showDatabaseForm}
          initialTime={selectedTime}
          selectedFood={selectedFood}
          token={token}
          onClose={closeAll}
          onSave={handleSaveSuccess}
        />
      ) : null}

      <AiPhotoCapture
        open={showAiCapture}
        onOpenChange={(open) => {
          setShowAiCapture(open);
          if (!open) setShowAddMenu(false);
        }}
        onPhotoCapture={handlePhotoCapture}
      />

      {showAiForm && capturedPhoto ? (
        <MealFormModal
          open={showAiForm}
          initialTime={selectedTime}
          token={token}
          onClose={closeAll}
          onSave={handleSaveSuccess}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#f9fafb' },
  scroll:    { padding: 16, paddingBottom: 40 },
  header:    { alignItems: 'center', marginBottom: 12 },
  title:     { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle:  { fontSize: 14, color: '#6b7280', marginTop: 2 },
  dateLabel: {
    textAlign: 'center', fontSize: 13,
    color: '#6b7280', marginVertical: 8,
  },
});