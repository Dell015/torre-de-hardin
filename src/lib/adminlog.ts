"use client";
import { useEffect, useState } from "react";

export interface LogItem {
  t: string;
  text: string;
}
const KEY = "tdj.log.v1";
const read = (): LogItem[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export function logAction(text: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([{ t: new Date().toISOString(), text }, ...read()].slice(0, 200)));
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
    return () => window.removeEventListener("tdj:log", on);
  }, []);
  return l;
}
