"use client";
import { useEffect, useState } from "react";
import { logAction } from "./adminlog";

/**
 * Undo support for the owners' desk. Before every admin change we save a copy of bookings, vouchers and
 * settings. "Undo" puts everything back the way it was before that change.
 */
const KEY = "tdj.undo.v1";
const KEYS = { b: "tdj.bookings.v1", v: "tdj.vouchers.v1", s: "tdj.settings.v1" };
export interface Snap {
  id: string;
  t: string;
  label: string;
  b: string | null;
  v: string | null;
  s: string | null;
}
const read = (): Snap[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const write = (l: Snap[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    // storage full (receipt images): drop the oldest half and retry
    try {
      localStorage.setItem(KEY, JSON.stringify(l.slice(0, Math.ceil(l.length / 2))));
    } catch {}
  }
  window.dispatchEvent(new Event("tdj:history"));
};

/** Call right BEFORE changing something. */
export function snap(label: string) {
  try {
    const s: Snap = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      t: new Date().toISOString(),
      label,
      b: localStorage.getItem(KEYS.b),
      v: localStorage.getItem(KEYS.v),
      s: localStorage.getItem(KEYS.s),
    };
    write([s, ...read()].slice(0, 25));
  } catch {}
}

/** Put everything back to how it was before snapshot `id` (that change and any later ones are undone). */
export function restore(id: string) {
  const l = read();
  const i = l.findIndex((x) => x.id === id);
  if (i < 0) return;
  const s = l[i];
  const put = (k: string, v: string | null) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v));
  put(KEYS.b, s.b);
  put(KEYS.v, s.v);
  put(KEYS.s, s.s);
  write(l.slice(i + 1));
  window.dispatchEvent(new Event("tdj:bookings"));
  window.dispatchEvent(new Event("tdj:vouchers"));
  window.dispatchEvent(new Event("tdj:settings"));
  logAction(`Undid: ${s.label}${i > 0 ? ` (and ${i} later change${i > 1 ? "s" : ""})` : ""}`, "undo");
}

export function useHistory() {
  const [l, setL] = useState<Snap[]>([]);
  useEffect(() => {
    const on = () => setL(read());
    on();
    window.addEventListener("tdj:history", on);
    return () => window.removeEventListener("tdj:history", on);
  }, []);
  return l;
}
