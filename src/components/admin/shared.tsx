"use client";
import { useEffect, useState } from "react";
import { RESORT } from "@/lib/data";
import { fmtLong, nightsBetween, unitLabel, type Booking } from "@/lib/bookings";
import { getSettings } from "@/lib/settings";

export const STATUS: Record<string, string> = { pending: "Waiting", confirmed: "Confirmed", declined: "Declined", cancelled: "Cancelled" };
export const UNIT_CODE: Record<string, string> = { private: "P", family: "F", cabin: "C", hall: "H", estate: "E" };

export const dateLine = (b: Booking) =>
  b.kind === "event"
    ? `${fmtLong(b.start)} · ${({ day: "daytime", evening: "evening", whole: "whole day" } as any)[b.slot || "whole"]}`
    : `${fmtLong(b.start)} → ${fmtLong(b.end)} (${nightsBetween(b.start, b.end)} night${nightsBetween(b.start, b.end) > 1 ? "s" : ""})`;

export const title = (b: Booking) => (b.kind === "block" ? b.name || "Closed" : b.name);

/** Where a booking is in its life: waiting, upcoming, staying now, finished, declined or cancelled. */
export function phaseOf(b: { status: string; start: string; end: string; checkedInAt?: string; checkedOutAt?: string; kind?: string }): "pending" | "upcoming" | "inhouse" | "completed" | "declined" | "cancelled" {
  if (b.status !== "confirmed") return b.status as any;
  const t = new Date().toISOString().slice(0, 10);
  if (b.checkedOutAt || b.end <= t) return "completed";
  if (b.checkedInAt || (b.start <= t && t < b.end)) return b.checkedInAt ? "inhouse" : "upcoming";
  return "upcoming";
}
/** Money still owed on a booking: the estimated total (or the deposit if there is no total) minus what was received. */
export function balanceOf(b: { total?: number; deposit?: number; payments?: { kind: string; amount: number }[]; status: string; kind?: string }): number {
  const paid = (b.payments || []).reduce((n, p) => n + (p.kind === "refund" ? -p.amount : p.amount), 0);
  const target = b.total || b.deposit || 0;
  return Math.max(0, target - paid);
}
/** A finished stay or event that was never fully paid. */
export const unpaidAfter = (b: Parameters<typeof phaseOf>[0] & Parameters<typeof balanceOf>[0]) => b.kind !== "block" && phaseOf(b) === "completed" && balanceOf(b) > 0;

export function StatusPill({ b }: { b: Parameters<typeof phaseOf>[0] }) {
  const ph = phaseOf(b);
  if (ph === "completed") return <span className="pill completed">Completed</span>;
  if (ph === "inhouse") return <span className="pill confirmed">Staying now</span>;
  return <Pill status={b.status} />;
}

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
export type TemplateId = "confirm" | "decline" | "receipt" | "reminder" | "cancel" | "keep" | "thanks";
export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "confirm", label: "Confirmed" },
  { id: "receipt", label: "Ask for receipt" },
  { id: "reminder", label: "Day-before reminder" },
  { id: "decline", label: "Can't accommodate" },
  { id: "cancel", label: "Cancellation confirmed" },
  { id: "keep", label: "Cancellation not approved" },
  { id: "thanks", label: "Thank you" },
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
    return `Good day, ${first}! We have your request (${b.ref}) for ${what}, ${when}.\n\nYour reservation is waiting for our approval. To secure the dates right away, please send the downpayment to ${st.pay.method} ${st.pay.number || "[number]"} (${st.pay.accountName}) and reply with a screenshot of the receipt. Once we see it, we will confirm your booking. Thank you!${sign}`;
  if (id === "reminder")
    return `Good day, ${first}! A quick reminder that you are expected at Torre de Jardin ${b.kind === "event" ? "for your event " : "tomorrow "}(${b.ref}).\n\n${when}\n${
      b.kind === "event" ? "" : `Check-in from ${st.checkIn}.\n`
    }Address: ${RESORT.address}\nMap: ${RESORT.maps}\n\nSafe travels, and see you soon.${sign}`;
  if (id === "cancel") {
    const paid = (b.payments || []).reduce((a, p) => a + (p.kind === "refund" ? -p.amount : p.amount), 0);
    return `Good day, ${first}. Your booking ${b.ref} (${what}, ${when}) has been cancelled as requested.${
      paid > 0 ? `\n\nWe received PHP ${paid.toLocaleString("en-PH")} from you. We will message you about the refund according to our policy.` : ""
    }\n\nWe hope to host you another time — just message us and we will find a date that works.${sign}`;
  }
  if (id === "thanks")
    return `Good day, ${first}! Thank you for staying with us at Torre de Jardin (${b.ref}). We hope you had a lovely time. If you have photos or feedback, we would love to hear them, and you are always welcome back.${sign}`;
  if (id === "keep")
    return `Good day, ${first}. About your cancellation request for ${b.ref} (${what}, ${when}): we are unable to cancel it under our policy${
      b.cancelRequest?.reply ? ` — ${b.cancelRequest.reply}` : ""
    }. If you would like to move to another date instead, just tell us and we will check what is open.${sign}`;
  return `Good day, ${first}. Thank you for thinking of Torre de Jardin. Unfortunately we cannot accommodate ${what} on ${when}${
    b.declineReason ? ` (${b.declineReason.toLowerCase()})` : ""
  }. We would love to host you on another date — just tell us what works and we will check right away.${sign}`;
}

/** Two-step button for anything destructive: first tap asks, second tap does it. */
export function ConfirmLink({ label, yes, onConfirm, solid, disabled }: { label: string; yes?: string; onConfirm: () => void; solid?: boolean; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 7000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed)
    return (
      <button className={solid ? "btn" : "link small ad-danger"} disabled={disabled} onClick={() => setArmed(true)}>
        <span>{label}</span>
      </button>
    );
  return (
    <span className="ad-confirm" role="alert">
      <b>Are you sure?</b>
      <button className="btn btn-solid ad-yes" onClick={() => { setArmed(false); onConfirm(); }}>
        <span>{yes || "Yes, do it"}</span>
      </button>
      <button className="link small" onClick={() => setArmed(false)}>
        <span>Keep it</span>
      </button>
    </span>
  );
}
