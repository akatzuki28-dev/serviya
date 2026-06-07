"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BookingAddress {
  street: string;
  city: string;
  coordinates?: { lat: number; lng: number };
}

export interface BookingExtra {
  id: string;
  label: string;
  price: number;
}

export interface BookingState {
  // Paso 1
  serviceType: string | null;
  serviceSlug: string | null;
  serviceName: string | null;

  // Paso 2
  scheduledAt: string | null;
  zone: string | null;
  address: BookingAddress | null;
  extras: string[];

  // Paso 3
  paymentMethod: "mp_link" | "transfer" | null;
  clientNotes: string;
  guestEmail: string;
  guestPhone: string;

  // Quote
  quote: {
    basePrice: number;
    extrasTotal: number;
    total: number;
    platformFee: number;
    netToProvider: number;
    breakdown: { label: string; amount: number }[];
  } | null;

  // Acciones
  setService: (type: string, slug: string, name: string) => void;
  setSchedule: (scheduledAt: string, zone: string | null) => void;
  setAddress: (address: BookingAddress) => void;
  toggleExtra: (extraId: string) => void;
  setPaymentMethod: (method: "mp_link" | "transfer") => void;
  setNotes: (notes: string) => void;
  setGuestInfo: (email: string, phone: string) => void;
  setQuote: (quote: BookingState["quote"]) => void;
  reset: () => void;
  prefillFrom: (data: Partial<BookingState>) => void;
}

const initialState = {
  serviceType: null,
  serviceSlug: null,
  serviceName: null,
  scheduledAt: null,
  zone: null,
  address: null,
  extras: [],
  paymentMethod: null,
  clientNotes: "",
  guestEmail: "",
  guestPhone: "",
  quote: null,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...initialState,

      setService: (type, slug, name) =>
        set({ serviceType: type, serviceSlug: slug, serviceName: name }),

      setSchedule: (scheduledAt, zone) => set({ scheduledAt, zone }),

      setAddress: (address) => set({ address }),

      toggleExtra: (extraId) =>
        set((state) => ({
          extras: state.extras.includes(extraId)
            ? state.extras.filter((e) => e !== extraId)
            : [...state.extras, extraId],
        })),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      setNotes: (notes) => set({ clientNotes: notes }),

      setGuestInfo: (email, phone) =>
        set({ guestEmail: email, guestPhone: phone }),

      setQuote: (quote) => set({ quote }),

      reset: () => set(initialState),

      prefillFrom: (data) => set(data),
    }),
    {
      name: "booking-state",
      // Solo persistir datos de servicio y dirección para "Repetir servicio"
      partialize: (state) => ({
        serviceType: state.serviceType,
        serviceSlug: state.serviceSlug,
        serviceName: state.serviceName,
        scheduledAt: state.scheduledAt,
        address: state.address,
        zone: state.zone,
        extras: state.extras,
      }),
    }
  )
);
