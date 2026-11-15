"use client";
import { useCallback, useEffect, useState } from "react";
import { STAYS, type StayId } from "./data";

/* ---------- Types ---------- */
export type UnitId = StayId | "estate" | "hall";
export type Status = "pending" | "confirmed" | "declined";
export type Slot = "day" | "evening" | "whole";

export interface Booking {
  id: string;
  ref: string;
  kind: "stay" | "event" | "block";
  unit: UnitId;
  start: string; // YYYY-MM-DD (check-in / event date)
  end: string; // YYYY-MM-DD exclusive (check-out). Events: start + 1 day
  slot?: Slot;
  status: Status;
  name: string;
  phone: string;
  email?: string;
  guests: number;
  adults?: number;
  kids?: number;
  eventType?: string;
  notes?: string;
  pay?: "manual" | "online";
  proof?: string;
  createdAt: string;
  seed?: boolean;
}

/* ---------- Date helpers (all local, date-only) ---------- */
export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const today = () => iso(new Date());
export const nightsBetween = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
export function eachNight(a: string, b: string) {
  const out: string[] = [];
  for (let d = a; d < b; d = addDays(d, 1)) out.push(d);
  return out;
}
export const fmtLong = (s: string) =>
  parse(s).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
export const fmtShort = (s: string) =>
  parse(s).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

/* ---------- Capacity ---------- */
const CAP: Record<StayId, number> = Object.fromEntries(STAYS.map((s) => [s.id, s.units])) as any;
export const unitLabel = (u: UnitId) =>
  u === "estate" ? "The Whole Estate" : u === "hall" ? "Function Hall" : STAYS.find((s) => s.id === u)!.name;

/* ---------- Seed data so the calendar feels alive ---------- */
function seeds(): Booking[] {
  const t = today();
  const mk = (
    n: number,
    kind: Booking["kind"],
    unit: UnitId,
    from: number,
    nights: number,
    extra: Partial<Booking> = {}
  ): Booking => ({
    id: `seed-${n}`,
    ref: `SEED-${n}`,
    kind,
    unit,
    start: addDays(t, from),
    end: addDays(t, from + nights),
    status: "confirmed",
    name: "Reserved",
    phone: "",
    guests: 2,
    createdAt: t,
    seed: true,
    ...extra,
  });
  return [
    mk(1, "stay", "private", 3, 2),
    mk(2, "stay", "private", 3, 2),
    mk(3, "stay", "private", 3, 2),
    mk(4, "stay", "cabin", 5, 2),
    mk(5, "stay", "cabin", 5, 2),
    mk(6, "stay", "family", 4, 3),
    mk(7, "event", "estate", 9, 1, { eventType: "Wedding", slot: "whole" }),
    mk(8, "stay", "private", 12, 3),
    mk(9, "stay", "family", 12, 2),
    mk(10, "event", "hall", 14, 1, { eventType: "Birthday / Debut", slot: "evening" }),
    mk(11, "stay", "cabin", 16, 2),
    mk(12, "event", "estate", 20, 1, { eventType: "Family reunion", slot: "whole" }),
    mk(13, "stay", "private", 22, 2),
    mk(14, "stay", "private", 22, 2),
    mk(15, "stay", "family", 25, 3),
    mk(16, "event", "hall", 27, 1, { eventType: "Christening", slot: "day" }),
  ];
}

/* ---------- Store ---------- */
const KEY = "tdj.bookings.v1";
const load = (): Booking[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const persist = (list: Booking[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("tdj:bookings"));
  } catch {}
};

export function useBookings() {
  const [mine, setMine] = useState<Booking[]>([]);
  const [seed, setSeed] = useState<Booking[]>([]);
  useEffect(() => {
    setSeed(seeds());
    setMine(load());
    const on = () => setMine(load());
    window.addEventListener("storage", on);
    window.addEventListener("tdj:bookings", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("tdj:bookings", on);
    };
  }, []);
  const add = useCallback((b: Booking) => persist([b, ...load()]), []);
  const setStatus = useCallback(
    (id: string, status: Status) => persist(load().map((b) => (b.id === id ? { ...b, status } : b))),
    []
  );
  const remove = useCallback((id: string) => persist(load().filter((b) => b.id !== id)), []);
  const clear = useCallback(() => persist([]), []);
  return { all: [...mine, ...seed], mine, add, setStatus, remove, clear };
}

/* ---------- Availability ---------- */
const active = (b: Booking) => b.status !== "declined";

/** Does this booking occupy the given night / date? */
const covers = (b: Booking, d: string) => b.start <= d && d < b.end;

export type DayState = "open" | "limited" | "sold" | "closed" | "past";

export function unitsLeft(unit: StayId, date: string, all: Booking[]) {
  const live = all.filter((b) => active(b) && covers(b, date));
  if (live.some((b) => b.unit === "estate")) return 0;
  return Math.max(0, CAP[unit] - live.filter((b) => b.unit === unit).length);
}

export function estateFree(date: string, all: Booking[]) {
  return !all.some((b) => active(b) && covers(b, date) && b.kind !== "block");
}

export function hallFree(date: string, slot: Slot, all: Booking[]) {
  const live = all.filter((b) => active(b) && covers(b, date));
  if (live.some((b) => b.unit === "estate")) return false;
  const halls = live.filter((b) => b.unit === "hall");
  if (!halls.length) return true;
  if (slot === "whole") return false;
  return !halls.some((b) => b.slot === "whole" || b.slot === slot);
}

export function dayState(date: string, mode: "stay" | "event", all: Booking[]): DayState {
  if (date < today()) return "past";
  const live = all.filter((b) => active(b) && covers(b, date));
  if (live.some((b) => b.unit === "estate")) return "closed";
  if (mode === "event") {
    const halls = live.filter((b) => b.unit === "hall");
    if (!halls.length) return "open";
    return halls.some((b) => b.slot === "whole") ? "sold" : "limited";
  }
  const left = STAYS.map((s) => unitsLeft(s.id, date, all));
  if (left.every((n) => n === 0)) return "sold";
  const full = STAYS.map((s) => s.units);
  return left.some((n, i) => n < full[i]) ? "limited" : "open";
}

/** For a stay range: can this unit be booked for every night? */
export function unitAvailable(unit: UnitId, start: string, end: string, all: Booking[]) {
  if (!start || !end) return true;
  const nights = eachNight(start, end);
  if (unit === "estate") return nights.every((d) => estateFree(d, all));
  if (unit === "hall") return true;
  return nights.every((d) => unitsLeft(unit as StayId, d, all) > 0);
}

export function makeRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "TDJ-";
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

/** Fees are shown as x until the owners confirm their rates. */
export const SHOW_RATES = false;
export const peso = (n?: number) => (SHOW_RATES && n ? `PHP ${n.toLocaleString("en-PH")}` : "PHP x,xxx");
