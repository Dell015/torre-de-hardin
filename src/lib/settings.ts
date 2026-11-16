"use client";
import { useCallback, useEffect, useState } from "react";
import { RESORT, STAYS } from "./data";

/**
 * Owner-editable settings. Stored in this browser's localStorage for the demo.
 * To go live, replace load()/persist() with calls to your database — nothing else changes.
 */
export type RateKey = "private" | "family" | "cabin" | "estate" | "hall";

export interface Settings {
  showRates: boolean;
  rates: Record<RateKey, number>; // per night (hall: per event)
  deposits: Record<RateKey, number>; // reservation deposit per room / estate / hall
  units: { private: number; family: number; cabin: number };
  names: { private: string; family: string; cabin: string };
  sleeps: { private: string; family: string; cabin: string };
  checkIn: string;
  checkOut: string;
  pay: { method: string; number: string; accountName: string; bank: string; note: string; qr: string };
  phones: string[];
  holdHours: number; // a waiting request holds its dates this long (0 = forever)
  pin: string;
}

export const DEFAULTS: Settings = {
  showRates: false,
  rates: { private: 0, family: 0, cabin: 0, estate: 0, hall: 0 },
  deposits: { private: 0, family: 0, cabin: 0, estate: 0, hall: 0 },
  // Rooms are defined in code (data.ts) only — not editable from the admin.
  units: Object.fromEntries(STAYS.map((x) => [x.id, x.units])) as Settings["units"],
  names: Object.fromEntries(STAYS.map((x) => [x.id, x.name])) as Settings["names"],
  sleeps: Object.fromEntries(STAYS.map((x) => [x.id, x.sleeps])) as Settings["sleeps"],
  checkIn: RESORT.checkIn,
  checkOut: RESORT.checkOut,
  pay: { method: "GCash", number: "", accountName: "Torre de Jardin", bank: "", note: "", qr: "" },
  phones: RESORT.phones.map((p) => p.label),
  holdHours: 48,
  pin: "1234",
};

const KEY = "tdj.settings.v1";
let cache: Settings = DEFAULTS;
let loaded = false;

const merge = (raw: any): Settings => ({
  ...DEFAULTS,
  ...raw,
  rates: { ...DEFAULTS.rates, ...(raw?.rates || {}) },
  deposits: { ...DEFAULTS.deposits, ...(raw?.deposits || {}) },
  units: DEFAULTS.units,
  names: DEFAULTS.names,
  sleeps: DEFAULTS.sleeps,
  pay: { ...DEFAULTS.pay, ...(raw?.pay || {}) },
});

function load(): Settings {
  try {
    return merge(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    return DEFAULTS;
  }
}

/** Synchronous read for non-React code (availability maths). */
export function getSettings(): Settings {
  // Returns defaults until a component has mounted (useSettings), so server and first client render match.
  return cache;
}

export function saveSettings(next: Settings) {
  cache = next;
  loaded = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("tdj:settings"));
  } catch {}
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  cache = DEFAULTS;
  window.dispatchEvent(new Event("tdj:settings"));
}

export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    const on = () => {
      cache = load();
      loaded = true;
      setS(cache);
    };
    on();
    window.addEventListener("storage", on);
    window.addEventListener("tdj:settings", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("tdj:settings", on);
    };
  }, []);
  const update = useCallback((patch: Partial<Settings>) => saveSettings({ ...getSettings(), ...patch }), []);
  return { s, update };
}

export const stayName = (id: string) => (getSettings().names as any)[id] || STAYS.find((x) => x.id === id)?.name || id;

/** Price in pesos; shows "PHP x,xxx" until the owner switches rates on and enters a number. */
export function money(n?: number) {
  const st = getSettings();
  return st.showRates && n ? `PHP ${n.toLocaleString("en-PH")}` : "PHP x,xxx";
}
export const rateOf = (k: string) => (getSettings().rates as any)[k] || 0;

export const depositOf = (k: string) => (getSettings().deposits as any)[k] || 0;
