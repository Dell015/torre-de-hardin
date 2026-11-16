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
  deposit: number;
  units: { private: number; family: number; cabin: number };
  names: { private: string; family: string; cabin: string };
  sleeps: { private: string; family: string; cabin: string };
  checkIn: string;
  checkOut: string;
  pay: { method: string; number: string; accountName: string; bank: string; note: string; qr: string };
  phones: string[];
  pin: string;
}

export const DEFAULTS: Settings = {
  showRates: false,
  rates: { private: 0, family: 0, cabin: 0, estate: 0, hall: 0 },
  deposit: 0,
  units: { private: 3, family: 1, cabin: 2 },
  names: { private: "Private Villa", family: "Family Villa", cabin: "Cabin" },
  sleeps: { private: "4 guests", family: "8 guests", cabin: "2 guests" },
  checkIn: RESORT.checkIn,
  checkOut: RESORT.checkOut,
  pay: { method: "GCash", number: "", accountName: "Torre de Jardin", bank: "", note: "", qr: "" },
  phones: RESORT.phones.map((p) => p.label),
  pin: "1234",
};

const KEY = "tdj.settings.v1";
let cache: Settings = DEFAULTS;
let loaded = false;

const merge = (raw: any): Settings => ({
  ...DEFAULTS,
  ...raw,
  rates: { ...DEFAULTS.rates, ...(raw?.rates || {}) },
  units: { ...DEFAULTS.units, ...(raw?.units || {}) },
  names: { ...DEFAULTS.names, ...(raw?.names || {}) },
  sleeps: { ...DEFAULTS.sleeps, ...(raw?.sleeps || {}) },
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
