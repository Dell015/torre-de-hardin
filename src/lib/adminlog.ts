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
const read = (): LogItem[] => {
  try {
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
