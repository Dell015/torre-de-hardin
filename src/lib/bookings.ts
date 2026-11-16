"use client";
import { useCallback, useEffect, useState } from "react";
import { STAYS, type StayId } from "./data";
import { getSettings, money, stayName } from "./settings";

/* ---------- Types ---------- */
export type UnitId = StayId | "estate" | "hall";
export type Status = "pending" | "confirmed" | "declined" | "cancelled";
export type Slot = "day" | "evening" | "whole";

export interface Payment {
  id: string;
  kind: "payment" | "refund";
  amount: number;
  method: string;
  ref?: string;
  note?: string;
  at: string; // ISO
}

export interface Booking {
  id: string;
  ref: string;
  kind: "stay" | "event" | "block";
  unit: UnitId;
  start: string; // YYYY-MM-DD (check-in / event date)
  end: string; // YYYY-MM-DD exclusive (check-out). Events: start + 1 day
  payOk?: boolean; // manager confirmed the payment step (even if nothing received yet)
  checkedInAt?: string; // set when the manager marks the guest as arrived
  checkedOutAt?: string; // set when the guest has left
  earlyFrom?: string; // original check-out date if the guest left early
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
  proofData?: string; // small JPEG data URL of the receipt (demo only)
  total?: number;
  declineReason?: string;
  cancelRequest?: { at: string; reason: string; state: "requested" | "rejected"; reply?: string };
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: "guest" | "owner";
  voucher?: string; // code used at checkout
  discount?: number; // PHP taken off by the voucher (0 if rates are hidden)
  discountLabel?: string; // e.g. "10% off"
  deposit?: number; // deposit due for this booking
  payments?: Payment[];
  manual?: boolean; // entered by the owner (special guest, walk-in)
  tag?: "closure" | "owner" | "maintenance" | "other"; // for blocks
  adminNote?: string;
  decidedAt?: string;
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
const cap = (u: StayId) => getSettings().units[u] ?? STAYS.find((s) => s.id === u)!.units;
export const unitLabel = (u: UnitId) =>
  u === "estate" ? "The Whole Estate" : u === "hall" ? "Function Hall" : stayName(u);

/* ---------- Sample bookings (stored once, so the admin looks lived-in; "Clear all bookings" removes them) ---------- */
function seeds(): Booking[] {
  const t = today();
  const at = (days: number) => new Date(Date.now() + days * 864e5).toISOString();
  const pay = (n: number, amount: number, method: string, ref: string, ago = -3): Payment => ({ id: "dp" + n, kind: "payment", amount, method, ref, at: at(ago) });
  const mk = (n: number, kind: Booking["kind"], unit: UnitId, from: number, nights: number, name: string, phone: string, guests: number, extra: Partial<Booking> = {}): Booking => ({
    id: `demo-${n}`, ref: `TDJ-D${String(n).padStart(2, "0")}${"XQ"[n % 2]}${"KM"[n % 2]}`, kind, unit,
    start: addDays(t, from), end: addDays(t, from + nights), status: "confirmed", name, phone, guests, createdAt: at(-5 - (n % 6)), ...extra,
  });
  return [
    // arriving today
    mk(1, "stay", "cabin", 0, 2, "Maria Santos", "09171230001", 2, { payments: [pay(1, 1000, "GCash", "8841 223 019", 0)], notes: "Anniversary — late arrival around 6pm" }),
    mk(2, "stay", "private", 0, 3, "Reyes Family", "09171230002", 4, { payments: [pay(2, 1500, "Bank transfer", "BDO-55120", 0)] }),
    // leaving today
    mk(3, "stay", "private", -2, 2, "Carlo Dela Cruz", "09171230003", 3, { payments: [pay(3, 1500, "GCash", "7720 114 880", -1)] }),
    mk(4, "stay", "family", -3, 3, "Garcia Family", "09171230004", 7, { payments: [pay(4, 2000, "GCash", "5532 908 112")] }),
    // staying now
    mk(5, "stay", "cabin", -1, 3, "Anna & Paolo Tan", "09171230005", 2, { checkedInAt: at(-1), payments: [pay(5, 1000, "Maya", "MY-30021")] }),
    mk(6, "stay", "private", -1, 2, "Jessa Lim", "09171230006", 2, { checkedInAt: at(-1), deposit: 1500 }),
    // waiting for the owner
    mk(7, "stay", "private", 3, 2, "Joanna Bautista", "09171230007", 4, { status: "pending", createdAt: at(-0.12), proof: "gcash-receipt.jpg", pay: "manual", notes: "Birthday weekend with friends", deposit: 1500 }),
    mk(8, "stay", "family", 6, 3, "Marco Villanueva", "09171230008", 8, { status: "pending", createdAt: at(-0.2), pay: "manual", email: "marco.v@email.com", deposit: 2000 }),
    mk(9, "event", "hall", 14, 1, "Aileen Cruz", "09171230009", 80, { status: "pending", createdAt: at(-0.5), slot: "evening", eventType: "Birthday / Debut", pay: "manual", notes: "18th birthday, 80 guests, own caterer", deposit: 1500 }),
    // upcoming, confirmed
    mk(10, "stay", "cabin", 4, 2, "Rico Mendoza", "09171230010", 2, { payments: [pay(10, 1000, "GCash", "2210 556 773")] }),
    mk(11, "stay", "private", 4, 2, "Lopez Barkada", "09171230011", 4),
    mk(12, "stay", "family", 10, 2, "Navarro Family", "09171230012", 6, { payments: [pay(12, 2000, "Bank transfer", "BPI-77341")] }),
    mk(13, "event", "estate", 9, 1, "Santos–Ramos Wedding", "09171230013", 120, { slot: "whole", eventType: "Wedding", payments: [pay(13, 10000, "Bank transfer", "BDO-90017")] }),
    mk(14, "stay", "cabin", 16, 2, "Grace Aquino", "09171230014", 2),
    mk(15, "event", "hall", 20, 1, "Pastor Ben Ocampo", "09171230015", 60, { slot: "day", eventType: "Christening", payments: [pay(15, 1500, "GCash", "9902 331 450")] }),
    mk(16, "stay", "private", 22, 3, "Dr. Hernandez", "09171230016", 3),
    mk(17, "stay", "family", 25, 3, "Bautista Reunion", "09171230017", 8, { payments: [pay(17, 2000, "GCash", "1190 884 003")] }),
  ];
}


/* ---------- Past records (finished, cancelled, declined) so reports and history look lived-in ---------- */
function pastSeeds(): Booking[] {
  const t = today();
  const dayAt = (off: number, h = 10) => new Date(new Date(addDays(t, off) + "T00:00:00").getTime() + h * 36e5).toISOString();
  const RATE: Record<string, number> = { private: 4500, family: 7500, cabin: 3000, hall: 12000, estate: 60000 };
  const DEP: Record<string, number> = { private: 1500, family: 2000, cabin: 1000, hall: 1500, estate: 10000 };
  type Row = [string, UnitId, number, number, number, string, string, ("done" | "cancel" | "refund" | "declined" | "unpaid" | "nopay")?, string?];
  // name, unit, start (days ago, negative), nights, guests, deposit method, balance method, outcome, voucher
  const rows: Row[] = [
    ["Villanueva Family", "family", -4, 2, 8, "GCash", "Cash"],
    ["Mark & Joy Dizon", "cabin", -6, 2, 2, "Maya", "GCash"],
    ["Tolentino Barkada", "private", -9, 3, 4, "GCash", "Cash", "unpaid"],
    ["Engr. Ramos", "private", -12, 2, 3, "Bank transfer", "Bank transfer"],
    ["Cruz-Mercado Debut", "hall", -15, 1, 90, "Bank transfer", "Cash"],
    ["Liza Fernandez", "cabin", -18, 3, 2, "GCash", "GCash", "done", "WELCOME10"],
    ["Pascual Reunion", "family", -23, 3, 8, "Bank transfer", "Cash", "unpaid"],
    ["Ana Soriano", "cabin", -27, 2, 2, "GCash", "GCash", "cancel"],
    ["Tan-Uy Wedding", "estate", -34, 1, 140, "Bank transfer", "Bank transfer"],
    ["Rodel Santiago", "private", -41, 2, 4, "Maya", "Cash", "nopay"],
    ["Gonzales Family", "family", -48, 2, 7, "GCash", "GCash", "refund"],
    ["Camille Reyes", "cabin", -55, 2, 2, "GCash", "Cash"],
    ["Bernardo Christening", "hall", -63, 1, 50, "GCash", "Cash"],
    ["Leah & Jon Abad", "private", -71, 3, 4, "Bank transfer", "GCash"],
    ["Ocampo Barkada", "private", -79, 2, 4, "GCash", "Cash", "declined"],
    ["Dela Rosa Family", "family", -88, 3, 8, "Bank transfer", "Cash"],
    ["Kim Valdez", "cabin", -97, 2, 2, "Maya", "Maya"],
    ["Aquino Company Outing", "estate", -108, 2, 60, "Bank transfer", "Bank transfer"],
    ["Ellen Pangilinan", "cabin", -119, 2, 2, "GCash", "Cash", "cancel"],
    ["Mendez Family", "family", -131, 2, 6, "GCash", "GCash"],
    ["Rex & Bea Salazar", "private", -142, 2, 3, "GCash", "Cash"],
    ["Torres Birthday", "hall", -155, 1, 70, "Bank transfer", "Cash"],
    ["Yu Family", "private", -166, 3, 4, "Bank transfer", "Bank transfer"],
  ];
  const out: Booking[] = [];
  rows.forEach(([name, unit, from, nights, guests, m1, m2, outcome = "done", voucher], i) => {
    const n = i + 1;
    const event = unit === "hall" || (unit === "estate" && nights === 1);
    const start = addDays(t, from);
    const end = addDays(t, from + (event ? 1 : nights));
    const stays = event ? 1 : nights;
    let total = RATE[unit] * stays;
    let discount = 0;
    if (voucher) { discount = Math.round(total * 0.1); total -= discount; }
    const booked = from - 14 - (n % 9); // requested ~2-3 weeks ahead
    const dep = DEP[unit];
    const b: Booking = {
      id: `past-${n}`, ref: `TDJ-P${String(n).padStart(2, "0")}${"QX"[n % 2]}${"MK"[n % 2]}`, kind: event ? "event" : "stay", unit: unit as UnitId,
      start, end, status: outcome === "declined" ? "declined" : outcome === "cancel" || outcome === "refund" ? "cancelled" : "confirmed",
      name, phone: "0917" + String(5550000 + n * 137).slice(0, 7), guests, createdAt: dayAt(booked), decidedAt: dayAt(booked + 1),
      pay: "manual", total: outcome === "declined" ? undefined : total, deposit: outcome === "declined" ? undefined : dep,
    } as Booking;
    if (event) { (b as any).slot = unit === "hall" ? "whole" : "whole"; (b as any).eventType = unit === "estate" ? "Wedding / Company event" : "Celebration"; }
    if (voucher) { b.voucher = voucher; b.discount = discount; b.discountLabel = "10% off"; }
    if (outcome === "nopay") {
      b.checkedInAt = dayAt(from, 14);
      b.checkedOutAt = dayAt(from + stays, 11);
      b.payOk = true; // arrived and left without paying anything
    } else if (outcome === "declined") { b.declineReason = "Dates no longer available"; }
    else {
      const pays: Payment[] = [{ id: `pp${n}a`, kind: "payment", amount: dep, method: m1, ref: `REF-${1000 + n * 37}`, at: dayAt(booked + 1, 15) }];
      if (outcome === "unpaid") {
        b.checkedInAt = dayAt(from, 14);
        b.checkedOutAt = dayAt(from + stays, 11);
        b.payOk = true; // deposit only; the balance was never collected
      }
      if (outcome === "done") {
        pays.push({ id: `pp${n}b`, kind: "payment", amount: total - dep, method: m2, note: "Balance on arrival", at: dayAt(from, 14) });
        b.checkedInAt = dayAt(from, 14);
        b.checkedOutAt = dayAt(from + stays, 11);
        b.payOk = true;
      } else {
        b.cancelledAt = dayAt(from - 6);
        b.cancelledBy = "guest";
        b.cancelReason = outcome === "refund" ? "Family emergency" : "Change of plans";
        if (outcome === "refund") pays.push({ id: `pp${n}r`, kind: "refund", amount: Math.round(dep / 2), method: m1, note: "Half refunded", at: dayAt(from - 5) });
      }
      b.payments = pays;
    }
    out.push(b);
  });
  return out;
}

/* ---------- One sample for every situation the admin has to handle ---------- */
function scenarioSeeds(): Booking[] {
  const t = today();
  const at = (days: number) => new Date(Date.now() + days * 864e5).toISOString();
  const pay = (id: string, amount: number, method: string, ref: string, ago: number): Payment => ({ id, kind: "payment", amount, method, ref, at: at(ago) });
  let n = 0;
  const mk = (kind: Booking["kind"], unit: UnitId, from: number, nights: number, name: string, guests: number, extra: Partial<Booking> = {}): Booking => {
    n += 1;
    return {
      id: `scn-${n}`, ref: `TDJ-S${String(n).padStart(2, "0")}${"QX"[n % 2]}${"KM"[n % 2]}`, kind, unit, start: addDays(t, from), end: addDays(t, from + nights),
      status: "confirmed", name, phone: "0918" + String(4440000 + n * 211).slice(0, 7), guests, createdAt: at(-4), ...extra,
    } as Booking;
  };
  const block = (unit: UnitId, from: number, nights: number, name: string, tag: Booking["tag"], extra: Partial<Booking> = {}): Booking => {
    n += 1;
    return { id: `scn-${n}`, ref: "BLOCK", kind: "block", unit, start: addDays(t, from), end: addDays(t, from + nights), status: "confirmed", name, phone: "", guests: 0, tag, createdAt: at(-9), ...extra } as Booking;
  };
  return [
    // waiting: competing requests for the same dates (one has paid, one has not)
    mk("stay", "family", 7, 2, "Dela Peña Family", 7, { status: "pending", createdAt: at(-0.08), pay: "manual", deposit: 2000, notes: "Sent the downpayment already", payments: [pay("sp1", 2000, "GCash", "6612 400 118", -0.07)] }),
    // waiting: clashes with a confirmed booking (can't be approved)
    mk("event", "hall", 20, 1, "Lim Reception", 70, { status: "pending", createdAt: at(-0.05), slot: "whole", eventType: "Wedding reception", pay: "manual", deposit: 1500 }),
    // waiting: nobody answered for days, so the hold expired
    mk("stay", "cabin", 12, 2, "Sampaguita Tours", 2, { status: "pending", createdAt: at(-4), pay: "manual", deposit: 1000, notes: "Travel agency, asked for a quote first" }),
    // guest asked to cancel (needs an answer)
    mk("stay", "cabin", 8, 2, "Nora Villareal", 2, { deposit: 1000, createdAt: at(-9), payments: [pay("sp2", 1000, "GCash", "4410 220 987", -8)], cancelRequest: { at: at(-0.1), reason: "Family emergency, we can't travel anymore.", state: "requested" } as any }),
    // guest asked to cancel and the owner said no
    mk("stay", "private", 11, 2, "Tess Alvarado", 4, { deposit: 1500, createdAt: at(-12), payments: [pay("sp3", 1500, "Bank transfer", "BPI-11820", -11)], cancelRequest: { at: at(-2), reason: "Change of schedule.", state: "rejected", reply: "Deposit is non-refundable within 7 days of arrival" } as any }),
    // confirmed, paid in full ahead
    mk("stay", "private", 30, 2, "Chua Family", 4, { total: 9000, deposit: 1500, createdAt: at(-14), payments: [pay("sp4", 1500, "GCash", "2290 118 440", -13), pay("sp5", 7500, "Bank transfer", "BDO-77310", -3)] }),
    // confirmed with a voucher
    mk("stay", "cabin", 18, 2, "Kumare Group", 2, { voucher: "KUMARE500", discount: 500, discountLabel: "PHP 500 off", total: 5500, deposit: 1000, createdAt: at(-6), payments: [pay("sp6", 1000, "Maya", "MY-48812", -5)] }),
    // confirmed, nothing paid yet
    mk("stay", "private", 14, 2, "Vergara Couple", 2, { deposit: 1500, createdAt: at(-3), pay: "manual" }),
    // left yesterday, checked out, fully paid
    mk("stay", "cabin", -3, 2, "Wilson Couple", 2, { total: 6000, deposit: 1000, createdAt: at(-15), checkedInAt: at(-3), checkedOutAt: at(-1), payOk: true, payments: [pay("sp7", 1000, "GCash", "9021 556 013", -14), pay("sp8", 5000, "Cash", "", -3)] }),
    // left early (booked until later, freed the room)
    mk("stay", "private", -4, 3, "Bautista Trio", 3, { total: 13500, deposit: 1500, createdAt: at(-16), checkedInAt: at(-4), checkedOutAt: at(-1), earlyFrom: addDays(t, 2), payOk: true, payments: [pay("sp9", 1500, "GCash", "7783 004 221", -15), pay("sp10", 7500, "Cash", "", -4)] }),
    // no-show, cancelled by the owner
    mk("stay", "cabin", -5, 2, "Soriano Couple", 2, { status: "cancelled", deposit: 1000, createdAt: at(-18), cancelledAt: at(-4), cancelledBy: "owner", cancelReason: "No-show", payments: [pay("sp11", 1000, "GCash", "3345 009 118", -17)] }),
    // recently declined
    mk("stay", "family", 2, 2, "Gil Family", 6, { status: "declined", createdAt: at(-3), decidedAt: at(-2), declineReason: "Receipt not received in time", pay: "manual" }),
    // entries only the manager can make
    mk("stay", "private", 15, 2, "Mayor's family (VIP)", 5, { manual: true, createdAt: at(-5), notes: "Complimentary, arranged by the owner" }),
    block("estate", 40, 4, "Holy Week maintenance", "closure"),
    block("estate", 28, 1, "Owner's anniversary", "owner"),
    block("cabin", 5, 2, "Aircon repair, Cabin", "maintenance"),
    block("estate", -20, 3, "Typhoon closure", "closure"),
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

const SEEDED = "tdj.seeded.v3";
export function useBookings() {
  const [mine, setMine] = useState<Booking[]>([]);
  useEffect(() => {
    try {
      if (!localStorage.getItem("tdj.seeded.v4")) {
        localStorage.setItem("tdj.seeded.v4", "1");
        // replace any older sample data with the full set (real bookings are left alone)
        const keep = load().filter((x) => !/^(demo|past|scn)-/.test(String(x.id)));
        localStorage.setItem(KEY, JSON.stringify([...keep, ...seeds(), ...pastSeeds(), ...scenarioSeeds()]));
      }
    } catch {}
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
  const update = useCallback(
    (id: string, patch: Partial<Booking>) => persist(load().map((b) => (b.id === id ? { ...b, ...patch } : b))),
    []
  );
  return { update, all: mine, mine, add, setStatus, remove, clear };
}

/* ---------- Availability ---------- */
/** A waiting request that nobody answered within the hold time stops blocking the dates. */
export const isExpired = (b: Booking) => {
  const h = getSettings().holdHours;
  return b.status === "pending" && !b.seed && h > 0 && Date.now() - Date.parse(b.createdAt) > h * 36e5;
};
const active = (b: Booking) => b.status !== "declined" && b.status !== "cancelled" && !isExpired(b);
export const isLive = active;

/** Does this booking occupy the given night / date? */
const covers = (b: Booking, d: string) => b.start <= d && d < b.end;

export type DayState = "open" | "limited" | "sold" | "closed" | "past";

export function unitsLeft(unit: StayId, date: string, all: Booking[]) {
  const live = all.filter((b) => active(b) && covers(b, date));
  if (live.some((b) => b.unit === "estate")) return 0;
  return Math.max(0, cap(unit) - live.filter((b) => b.unit === unit).length);
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
  const full = STAYS.map((s) => cap(s.id));
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
export const peso = (n?: number) => money(n);
