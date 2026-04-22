import React, { createContext, useContext, useState } from "react";

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
}

// ─── Dummy seed data ──────────────────────────────────────────────────────────

const SEED_BOOKINGS: Booking[] = [
  {
    id: 1,
    user: "Sarah Gan",
    initials: "ST",
    date: "2026-04-22",
    time: "10:00",
    status: "pending",
    topic: "Weight management",
    nutritionist: "Dr. Sarah Lim",
    rating: null,       
    reviewText: null,   
  },
  {
    id: 2,
    user: "Marcus Gim",
    initials: "ML",
    date: "2026-04-23",
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
    initials: "PN",
    date: "2026-04-25",
    time: "09:00",
    status: "declined",
    topic: "Gut health",
    nutritionist: "Ms. Priya Nair",
    rating: null,       
    reviewText: null
  },
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

  return (
    <BookingContext.Provider value={{ bookings, addBooking, updateBookingStatus,submitReview }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingProvider");
  return ctx;
}
