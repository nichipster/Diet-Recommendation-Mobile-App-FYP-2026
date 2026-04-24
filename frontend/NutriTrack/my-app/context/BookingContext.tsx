import React, { createContext, useContext, useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Booking {
  id: number;
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
  addBooking: (booking: Omit<Booking, "id">) => void;
  updateBookingStatus: (id: number, status: BookingStatus) => void;
  submitReview: (id: number, rating: number, reviewText: string) => void;
  thisMonthClients: number;
  thisMonthConsultations: number;
  pendingCount: number;
  slots: Record<number, Record<string, string[]>>;
  saveSlots: (nutritionistId: number, slots: Record<string, string[]>) => void;
  getSlots: (nutritionistId: number) => Record<string, string[]>;
}

// ─── Dummy seed data ──────────────────────────────────────────────────────────

const SEED_BOOKINGS: Booking[] = [
  {
    id: 1,
    user: "Sarah Gan",
    initials: "SG",
    date: "2026-04-22",
    time: "10:00",
    status: "confirmed",
    topic: "Weight management",
    nutritionist: "Dr. Sarah Lim",
    rating: null,       
    reviewText: null,   
  },
  {
    id: 2,
    user: "Marcus Gim",
    initials: "MG",
    date: "2026-04-24",
    time: "11:00",
    status: "confirmed",
    topic: "Sports nutrition",
    nutritionist: "Mr. Marcus Koh",
    rating: null,       
    reviewText: null,
  },
  {
    id: 3,
    user: "Priya Gair",
    initials: "PG",
    date: "2026-04-25",
    time: "09:00",
    status: "declined",
    topic: "Gut health",
    nutritionist: "Ms. Priya Nair",
    rating: null,       
    reviewText: null
  },
  { id: 4, user: 'Alice Tan',   initials: 'AT', date: '2026-01-05', time: '10:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 5, user: 'Ben Lim',     initials: 'BL', date: '2026-01-14', time: '11:00', status: 'confirmed', topic: 'Muscle gain',     nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 6, user: 'Clara Ng',    initials: 'CN', date: '2026-01-20', time: '14:00', status: 'confirmed', topic: 'Diabetes',        nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 7, user: 'David Koh',   initials: 'DK', date: '2026-02-03', time: '09:00', status: 'confirmed', topic: 'Sports nutrition',nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 8, user: 'Eva Goh',     initials: 'EG', date: '2026-02-10', time: '10:00', status: 'confirmed', topic: 'Meal planning',   nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 9, user: 'Grace Tan',   initials: 'GT', date: '2026-02-25', time: '15:00', status: 'confirmed', topic: 'Vegan diet',      nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 10, user: 'Henry Lim',   initials: 'HL', date: '2026-03-04', time: '10:00', status: 'confirmed', topic: 'Gut health',      nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 11, user: 'Iris Ng',     initials: 'IN', date: '2026-03-11', time: '11:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 12, user: 'Jack Koh',    initials: 'JK', date: '2026-03-15', time: '14:00', status: 'confirmed', topic: 'Sports nutrition',nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 13, user: 'Karen Goh',   initials: 'KG', date: '2026-03-22', time: '09:00', status: 'confirmed', topic: 'Diabetes',        nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 14, user: 'Leon Tan',    initials: 'LT', date: '2026-03-28', time: '10:00', status: 'confirmed', topic: 'Meal planning',   nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
  { id: 15, user: 'Mia Lim',     initials: 'ML', date: '2026-04-02', time: '13:00', status: 'confirmed', topic: 'Weight loss',     nutritionist: 'Mr. Marcus Koh', rating: null, reviewText: null },
  { id: 16, user: 'Nathan Yeo',  initials: 'NY', date: '2026-04-08', time: '15:00', status: 'confirmed', topic: 'Vegan diet',      nutritionist: 'Ms. Priya Nair', rating: null, reviewText: null },
  { id: 17, user: 'Olivia Tan',  initials: 'OT', date: '2026-04-15', time: '10:00', status: 'confirmed', topic: 'Gut health',      nutritionist: 'Dr. Sarah Lim',  rating: null, reviewText: null },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS);

  const addBooking = (booking: Omit<Booking, "id">) => {
    setBookings(prev => [...prev, { ...booking, id: Date.now(), 
      rating: booking.rating ?? null,         
      reviewText: booking.reviewText ?? null, }]);
  };

  const updateBookingStatus = (id: number, status: BookingStatus) => {
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
  };

  const submitReview = (id: number, rating: number, reviewText: string) => {
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, rating, reviewText } : b))
    );
  };
  
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

const INITIAL_SLOTS: Record<number, Record<string, string[]>> = {
  1: {
    "2026-04-21": ["10:00","14:00","15:00"],
    "2026-04-22": ["10:00","14:00","15:00"],
    "2026-04-23": ["11:00","13:00","16:00"],
    "2026-04-25": ["09:00","10:00"],
    "2026-04-28": ["14:00","15:00","17:00"],
    "2026-04-29": ["09:00","13:00"],
    "2026-05-01": ["10:00","11:00","14:00"],
  },
  2: {
    "2026-04-22": ["09:00","11:00"],
    "2026-04-24": ["10:00","14:00"],
    "2026-04-29": ["11:00","15:00"],
    "2026-05-02": ["09:00","13:00","16:00"],
    "2026-05-06": ["10:00","14:00"],
    "2026-05-08": ["11:00","15:00","17:00"],
  },
  3: {
    "2026-04-23": ["09:00","14:00"],
    "2026-04-26": ["10:00","11:00","15:00"],
    "2026-04-30": ["13:00","16:00"],
    "2026-05-03": ["09:00","10:00","14:00"],
    "2026-05-07": ["11:00","15:00"],
    "2026-05-10": ["10:00","13:00","17:00"],
  },
};

const [slots, setSlots] = useState<Record<number, Record<string, string[]>>>(INITIAL_SLOTS);

const saveSlots = (nutritionistId: number, newSlots: Record<string, string[]>) => {
  setSlots(prev => ({ ...prev, [nutritionistId]: newSlots }));
};

const getSlots = (nutritionistId: number) => slots[nutritionistId] ?? {};

  return (
    <BookingContext.Provider value={{ 
  bookings, addBooking, updateBookingStatus, submitReview,
  thisMonthClients, thisMonthConsultations, pendingCount, slots, saveSlots, getSlots
}}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingProvider");
  return ctx;
}
