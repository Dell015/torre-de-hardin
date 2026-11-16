"use client";
import { useEffect, useState } from "react";
import type { Booking } from "./bookings";
import { today } from "./bookings";

export interface Voucher {
  id: string;
  code: string; // stored upper-case
  kind: "percent" | "fixed";
  value: number; // percent (1-100) or PHP
  appliesTo: "all" | "stay" | "event";
  from?: string; // guest must book on/after (YYYY-MM-DD)
  until?: string; // ...on/before
  maxUses?: number;
  active: boolean;
  note?: string; // private: who it was for
  createdAt: string;
}

const KEY = "tdj.vouchers.v1";
const SEED = "tdj.vouchers.seeded.v2";
const read = (): Voucher[] => {
  try {
    if (!localStorage.getItem(SEED)) {
      // first visit: sample vouchers covering each situation (live, limited, expired, switched off)
      localStorage.setItem(SEED, "1");
      const now = new Date().toISOString();
      const d = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
      const have = JSON.parse(localStorage.getItem(KEY) || "[]") as Voucher[];
      const sample: Voucher[] = [
        { id: "v-seed1", code: "WELCOME10", kind: "percent", value: 10, appliesTo: "all", active: true, note: "First-time guests", createdAt: now },
        { id: "v-seed2", code: "KUMARE500", kind: "fixed", value: 500, appliesTo: "stay", maxUses: 5, active: true, note: "For the owner's friends", createdAt: now },
        { id: "v-seed3", code: "SUMMER15", kind: "percent", value: 15, appliesTo: "stay", from: d(-120), until: d(-60), active: true, note: "Summer promo (ended)", createdAt: now },
        { id: "v-seed4", code: "STAFF20", kind: "percent", value: 20, appliesTo: "all", active: false, note: "Staff and family. Switched off for now", createdAt: now },
        { id: "v-seed5", code: "ONEFORYOU", kind: "fixed", value: 1000, appliesTo: "event", maxUses: 1, active: true, note: "One-time gift for an event guest", createdAt: now },
        { id: "v-seed6", code: "BDAY5", kind: "percent", value: 5, appliesTo: "all", from: d(-5), until: d(60), active: true, note: "Birthday month", createdAt: now },
      ];
      const codes = new Set(have.map((v) => v.code));
      localStorage.setItem(KEY, JSON.stringify([...have, ...sample.filter((v) => !codes.has(v.code))]));
    }
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export const getVouchers = read;
export function saveVouchers(list: Voucher[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("tdj:vouchers"));
  } catch {}
}
export function useVouchers() {
  const [v, setV] = useState<Voucher[]>([]);
  useEffect(() => {
    const on = () => setV(read());
    on();
    window.addEventListener("tdj:vouchers", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("tdj:vouchers", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return v;
}

export const usesOf = (code: string, bookings: Booking[]) =>
  bookings.filter((b) => b.voucher === code && b.status !== "declined" && b.status !== "cancelled").length;

export const describe = (v: Voucher) => (v.kind === "percent" ? `${v.value}% off` : `PHP ${v.value.toLocaleString("en-PH")} off`);

/** Check a code a guest typed. */
export function checkVoucher(raw: string, mode: "stay" | "event", bookings: Booking[]): { ok: true; v: Voucher } | { ok: false; error: string } {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a voucher code." };
  const v = read().find((x) => x.code === code);
  if (!v || !v.active) return { ok: false, error: "That code isn't valid." };
  const t = today();
  if (v.from && t < v.from) return { ok: false, error: "That voucher isn't active yet." };
  if (v.until && t > v.until) return { ok: false, error: "That voucher has expired." };
  if (v.appliesTo !== "all" && v.appliesTo !== mode) return { ok: false, error: `That voucher is for ${v.appliesTo === "stay" ? "stays" : "events"} only.` };
  if (v.maxUses && usesOf(v.code, bookings) >= v.maxUses) return { ok: false, error: "That voucher has been fully used." };
  return { ok: true, v };
}

export const discountFor = (v: Voucher, amount: number) =>
  amount > 0 ? Math.min(amount, v.kind === "percent" ? Math.round((amount * v.value) / 100) : v.value) : 0;
