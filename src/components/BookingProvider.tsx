"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { UnitId } from "@/lib/bookings";
import BookingSheet from "./BookingSheet";

export interface Preset {
  mode?: "stay" | "event";
  unit?: UnitId;
  eventType?: string;
}
interface Ctx {
  open: boolean;
  preset: Preset | null;
  openBooking: (p?: Preset) => void;
  closeBooking: () => void;
}
const BookingCtx = createContext<Ctx>({
  open: false,
  preset: null,
  openBooking: () => {},
  closeBooking: () => {},
});
export const useBooking = () => useContext(BookingCtx);

export default function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const openBooking = useCallback((p?: Preset) => {
    setPreset(p ?? null);
    setOpen(true);
  }, []);
  const closeBooking = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, preset, openBooking, closeBooking }), [open, preset, openBooking, closeBooking]);
  return (
    <BookingCtx.Provider value={value}>
      {children}
      <BookingSheet />
    </BookingCtx.Provider>
  );
}
