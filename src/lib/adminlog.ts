"use client";
import { useEffect, useState } from "react";

export type Cat = "booking" | "payment" | "calendar" | "voucher" | "rates" | "settings" | "login" | "export" | "undo";
export interface LogItem {
  id?: string;
  t: string;
  cat: Cat;
  actor: "Owner" | "Manager" | "Guest";
  text: string;
  ref?: string;
  amount?: number; // PHP, for payments / discounts
}
export const CATS: { id: Cat; label: string }[] = [
  { id: "booking", label: "Bookings" },
  { id: "payment", label: "Payments" },
  { id: "calendar", label: "Calendar" },
  { id: "voucher", label: "Vouchers" },
  { id: "rates", label: "Rates & deposits" },
  { id: "settings", label: "Settings" },
  { id: "login", label: "Sign-ins" },
  { id: "export", label: "Exports" },
  { id: "undo", label: "Undo" },
];
/** Handy groups for the audit log filter. */
export const GROUPS: { id: string; label: string; cats: Cat[] }[] = [
  { id: "all", label: "All activity", cats: CATS.map((c) => c.id) },
  { id: "payments", label: "All payments", cats: ["payment"] },
  { id: "transactions", label: "All transactions", cats: ["payment", "voucher"] },
];

const KEY = "tdj.log.v2";
function seedLog() {
  const ago = (days: number, h = 10) => new Date(Date.now() - days * 864e5 - (10 - h) * 36e5).toISOString();
  const L = (d: number, h: number, cat: Cat, actor: LogItem["actor"], text: string, extra: Partial<LogItem> = {}): LogItem => ({ id: `seedlog-${d}-${h}-${cat}`, t: ago(d, h), cat, actor, text, ...extra });
  return [
    L(0.1, 9, "login", "Owner", "Owner signed in"),
    L(0.15, 10, "booking", "Guest", "New request: Dela Peña Family · Family Villa", { ref: "TDJ-S01QK" }),
    L(0.4, 8, "booking", "Guest", "Cancellation requested for TDJ-S04QK (Nora Villareal): Family emergency", { ref: "TDJ-S04QK" }),
    L(1, 15, "payment", "Manager", "Recorded PHP 5,000 (Cash) for Wilson Couple", { amount: 5000, ref: "TDJ-S09QK" }),
    L(1, 11, "booking", "Manager", "Marked Wilson Couple as checked out", { ref: "TDJ-S09QK" }),
    L(1, 9, "booking", "Manager", "Bautista Trio left early, freed the remaining nights", { ref: "TDJ-S10XM" }),
    L(2, 14, "booking", "Manager", "Declined TDJ-S12XM · Gil Family (Receipt not received in time)", { ref: "TDJ-S12XM" }),
    L(2, 10, "booking", "Owner", "Cancellation request for TDJ-S05XM not approved: Deposit is non-refundable within 7 days of arrival", { ref: "TDJ-S05XM" }),
    L(3, 16, "payment", "Manager", "Recorded PHP 7,500 (Bank transfer) for Chua Family", { amount: 7500, ref: "TDJ-S06QK" }),
    L(4, 13, "booking", "Owner", "Cancelled TDJ-S11QK · Soriano Couple (by owner: No-show)", { ref: "TDJ-S11QK" }),
    L(4, 9, "voucher", "Owner", "Used voucher KUMARE500 on TDJ-S07XM (-PHP 500)", { amount: 500, ref: "TDJ-S07XM" }),
    L(5, 17, "calendar", "Owner", "Added calendar entry: Closed · Cabin · Aircon repair"),
    L(6, 11, "voucher", "Owner", "Created voucher BDAY5 (5% off)"),
    L(7, 14, "calendar", "Owner", "Added calendar entry: Owner's event · Owner's anniversary"),
    L(8, 10, "rates", "Owner", "Saved rates, deposits & times"),
    L(9, 15, "export", "Manager", "Exported 23 bookings (XLSX)"),
    L(10, 9, "voucher", "Owner", "Switched off voucher STAFF20"),
    L(11, 16, "calendar", "Manager", "Added calendar entry: Resort closed · Holy Week maintenance"),
    L(12, 13, "undo", "Manager", "Undid: Declined TDJ-S12XM (reopened)"),
    L(14, 10, "settings", "Owner", "Updated payment details"),
  ];
}
const read = (): LogItem[] => {
  try {
    if (!localStorage.getItem(KEY + ".seeded")) {
      localStorage.setItem(KEY + ".seeded", "1");
      const cur = JSON.parse(localStorage.getItem(KEY) || "[]") as LogItem[];
      localStorage.setItem(KEY, JSON.stringify([...cur, ...seedLog()].sort((a, b) => (a.t < b.t ? 1 : -1))));
    }
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
function currentRole(): "Owner" | "Manager" {
  try {
    return JSON.parse(sessionStorage.getItem("tdj.session.v1") || "{}").role === "Manager" ? "Manager" : "Owner";
  } catch {
    return "Owner";
  }
}
export function logAction(text: string, cat: Cat = "settings", extra: Partial<LogItem> = {}) {
  try {
    const item: LogItem = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: new Date().toISOString(), cat, actor: (extra.actor as any) || currentRole(), text, ...extra };
    localStorage.setItem(KEY, JSON.stringify([item, ...read()].slice(0, 2000)));
    window.dispatchEvent(new Event("tdj:log"));
  } catch {}
}
export function clearLog() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("tdj:log"));
  } catch {}
}
export function useLog() {
  const [l, setL] = useState<LogItem[]>([]);
  useEffect(() => {
    const on = () => setL(read());
    on();
    window.addEventListener("tdj:log", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("tdj:log", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return l;
}
