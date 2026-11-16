"use client";
/**
 * Demo accounts. Replace with a real login (Supabase Auth, etc.) when you go live —
 * never ship real passwords in client code.
 */
export const ACCOUNTS = [
  { username: "owner", password: "123456", role: "Owner" as const },
  { username: "manager", password: "123456", role: "Manager" as const },
];
export type Role = (typeof ACCOUNTS)[number]["role"];
export interface Session {
  username: string;
  role: Role;
}
const KEY = "tdj.session.v1";

export function getSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return s && ACCOUNTS.some((a) => a.username === s.username) ? s : null;
  } catch {
    return null;
  }
}
export function login(username: string, password: string): Session | null {
  const a = ACCOUNTS.find((x) => x.username === username.trim().toLowerCase() && x.password === password);
  if (!a) return null;
  const s: Session = { username: a.username, role: a.role };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  return s;
}
export function logout() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
