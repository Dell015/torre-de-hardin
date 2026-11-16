"use client";
import { RESORT } from "@/lib/data";
import { fmtLong, nightsBetween, unitLabel, type Booking } from "@/lib/bookings";
import { getSettings } from "@/lib/settings";

export const STATUS: Record<string, string> = { pending: "Waiting", confirmed: "Confirmed", declined: "Declined" };
export const UNIT_CODE: Record<string, string> = { private: "P", family: "F", cabin: "C", hall: "H", estate: "E" };

export const dateLine = (b: Booking) =>
  b.kind === "event"
    ? `${fmtLong(b.start)} · ${({ day: "daytime", evening: "evening", whole: "whole day" } as any)[b.slot || "whole"]}`
    : `${fmtLong(b.start)} → ${fmtLong(b.end)} (${nightsBetween(b.start, b.end)} night${nightsBetween(b.start, b.end) > 1 ? "s" : ""})`;

export const title = (b: Booking) => (b.kind === "block" ? b.name || "Closed" : b.name);

export function Pill({ status }: { status: string }) {
  return <span className={"pill " + status}>{STATUS[status]}</span>;
}

export function copy(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
}

/* ---- reply templates (copy-ready for Messenger / SMS) ---- */
export type TemplateId = "confirm" | "decline" | "receipt" | "reminder";
export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "confirm", label: "Confirmed" },
  { id: "receipt", label: "Ask for receipt" },
  { id: "reminder", label: "Day-before reminder" },
  { id: "decline", label: "Can't accommodate" },
];

export function template(id: TemplateId, b: Booking): string {
  const st = getSettings();
  const first = (b.name || "").trim().split(/\s+/)[0] || "there";
  const what = unitLabel(b.unit);
  const when = dateLine(b);
  const sign = `\n\n— Torre de Jardin\n${RESORT.phones[0].label}`;
  if (id === "confirm")
    return `Good day, ${first}! Your ${b.kind === "event" ? "event" : "stay"} at Torre de Jardin is confirmed.\n\nRef: ${b.ref}\n${what}\n${when}\n${
      b.kind === "event" ? "" : `Check-in from ${st.checkIn} · check-out by ${st.checkOut}\n`
    }\nWe will keep the lawn, the pool and the tower lights ready for you. Message us here if anything changes.${sign}`;
  if (id === "receipt")
    return `Good day, ${first}! We have your request (${b.ref}) for ${what}, ${when}.\n\nTo hold the dates, please send the deposit to ${st.pay.method} ${st.pay.number || "[number]"} (${st.pay.accountName}) and reply with a screenshot of the receipt. Once we see it, we will confirm right away. Thank you!${sign}`;
  if (id === "reminder")
    return `Good day, ${first}! A quick reminder that you are expected at Torre de Jardin ${b.kind === "event" ? "for your event " : "tomorrow "}(${b.ref}).\n\n${when}\n${
      b.kind === "event" ? "" : `Check-in from ${st.checkIn}.\n`
    }Address: ${RESORT.address}\nMap: ${RESORT.maps}\n\nSafe travels, and see you soon.${sign}`;
  return `Good day, ${first}. Thank you for thinking of Torre de Jardin. Unfortunately we cannot accommodate ${what} on ${when}${
    b.declineReason ? ` (${b.declineReason.toLowerCase()})` : ""
  }. We would love to host you on another date — just tell us what works and we will check right away.${sign}`;
}
