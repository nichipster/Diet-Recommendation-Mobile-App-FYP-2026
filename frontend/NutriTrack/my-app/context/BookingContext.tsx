import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getAuthHeadersWithToken } from '@/constants/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Booking {
  id: number;
  userId: string;   
  user: string;
  initials: string;
  date: string;
  time: string;
  status: BookingStatus;
  topic: string;
  nutritionist: string;
  rating: number | null;      
  reviewText: string | null;   
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id">) => Promise<void>;
  updateBookingStatus: (id: number, status: BookingStatus) => Promise<void>;
  submitReview: (id: number, rating: number, reviewText: string) => Promise<void>;
  thisMonthClients: number;
  thisMonthConsultations: number;
  pendingCount: number;
  slots: Record<number, Record<string, string[]>>;
  saveSlots: (nutritionistId: number, slots: Record<string, string[]>) => Promise<void>;
  getSlots: (nutritionistId: number) => Record<string, string[]>;
  refreshBookings: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Record<number, Record<string, string[]>>>({});

  // ─── Fetch on mount ────────────────────────────────────────────────────────

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookings`, {
        headers: getAuthHeadersWithToken(token),
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        const err = await res.text();
        console.log('fetchBookings failed:', err);
      }
    } catch (e) {
      console.log('fetchBookings error:', e);
    }
  };

  const fetchSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/nutritionists/slots`, {
        headers: getAuthHeadersWithToken(token),
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (e) {
      console.log('fetchSlots error:', e);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchSlots();
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const addBooking = async (booking: Omit<Booking, "id">) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          ...getAuthHeadersWithToken(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: booking.userId,
          user: booking.user,
          initials: booking.initials,
          date: booking.date,
          time: booking.time,
          status: booking.status,
          topic: booking.topic,
          nutritionistId: booking.nutritionist,
          nutritionist: booking.nutritionist,
          rating: null,
          reviewText: null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setBookings(prev => [...prev, saved]);
      } else {
        console.log('addBooking failed:', await res.text());
      }
    } catch (e) {
      console.log('addBooking error:', e);
    }
  };

  const updateBookingStatus = async (id: number, status: BookingStatus) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_URL}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { ...getAuthHeadersWithToken(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchBookings(); // source of truth
    }
  } catch (e) {
    console.log('updateBookingStatus error:', e);
  }
};

  const submitReview = async (id: number, rating: number, reviewText: string) => {
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, rating, reviewText } : b))
    );
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/bookings/${id}/review`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeadersWithToken(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, reviewText }),
      });
    } catch (e) {
      console.log('submitReview error:', e);
    }
  };

  const saveSlots = async (nutritionistId: number, newSlots: Record<string, string[]>) => {
    setSlots(prev => ({ ...prev, [nutritionistId]: newSlots }));
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/nutritionists/${nutritionistId}/slots`, {
        method: 'POST',
        headers: {
          ...getAuthHeadersWithToken(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: newSlots }),
      });
    } catch (e) {
      console.log('saveSlots error:', e);
    }
  };

  const getSlots = (nutritionistId: number) => slots[nutritionistId] ?? {};

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  const thisMonthClients = useMemo(() =>
    new Set(
      confirmedBookings.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).map(b => b.user)
    ).size,
  [bookings, currentMonth, currentYear]);

  const thisMonthConsultations = useMemo(() =>
    confirmedBookings.filter(b => {
      const d = new Date(b.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length,
  [bookings, currentMonth, currentYear]);

  const pendingCount = useMemo(() =>
    bookings.filter(b => b.status === 'pending').length,
  [bookings]);

  return (
    <BookingContext.Provider value={{ 
      bookings, addBooking, updateBookingStatus, submitReview,
      thisMonthClients, thisMonthConsultations, pendingCount, slots, saveSlots, getSlots, refreshBookings: fetchBookings
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useMyBookings(nutritionistName: string) {
  const { bookings } = useBookings();

  return useMemo(() => {
    return bookings.filter(
      b => b.nutritionist === nutritionistName
    );
  }, [bookings, nutritionistName]);
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingProvider");
  return ctx;
}
