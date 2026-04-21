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
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id">) => void;
  updateBookingStatus: (id: number, status: BookingStatus) => void;
}

// ─── Dummy seed data ──────────────────────────────────────────────────────────

const SEED_BOOKINGS: Booking[] = [
  {
    id: 1,
    user: "Sarah Tan",
    initials: "ST",
    date: "2026-04-22",
    time: "10:00",
    status: "pending",
    topic: "Weight management",
    nutritionist: "Sarah Tan",
  },
  {
    id: 2,
    user: "Marcus Lim",
    initials: "ML",
    date: "2026-04-23",
    time: "11:00",
    status: "confirmed",
    topic: "Sports nutrition",
    nutritionist: "Marcus Lim",
  },
  {
    id: 3,
    user: "Priya Nair",
    initials: "PN",
    date: "2026-04-25",
    time: "09:00",
    status: "declined",
    topic: "Gut health",
    nutritionist: "Priya Nair",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS);

  const addBooking = (booking: Omit<Booking, "id">) => {
    setBookings(prev => [...prev, { ...booking, id: Date.now() }]);
  };

  const updateBookingStatus = (id: number, status: BookingStatus) => {
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
  };

  return (
    <BookingContext.Provider value={{ bookings, addBooking, updateBookingStatus }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingProvider");
  return ctx;
}
