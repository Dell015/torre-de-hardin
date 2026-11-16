"use client";
import { useEffect, useId, useRef, useState } from "react";
import { addDays, iso, pad, today } from "@/lib/bookings";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const asDate = (s: string) => new Date(s + "T00:00:00");
const show = (s: string) => asDate(s).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

/**
 * Drop-in replacement for <input type="date">: same value (YYYY-MM-DD), same onChange shape as Select,
 * but with a styled calendar that matches the dropdowns.
 */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  clearable = false,
  placeholder = "Pick a date",
  className = "",
  ...rest
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  clearable?: boolean;
  placeholder?: string;
  className?: string;
  [k: string]: any;
}) {
  const t = today();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || t).slice(0, 7) + "-01");
  const [pos, setPos] = useState({ top: 0, left: 0, up: false });
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();

  const W = 304;
  const place = () => {
    const r = btn.current!.getBoundingClientRect();
    const H = 360;
    const up = window.innerHeight - r.bottom < H && r.top > window.innerHeight - r.bottom;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    setPos({ left, top: up ? r.top : r.bottom, up });
  };
  const openIt = () => {
    setMonth((value || t).slice(0, 7) + "-01");
    place();
    setOpen(true);
  };
  const pick = (d: string) => {
    onChange({ target: { value: d } });
    setOpen(false);
    btn.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!btn.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = (e: Event) => {
      if (pop.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", away);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const first = asDate(month);
  const lead = first.getDay();
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= count; i++) cells.push(`${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(i)}`);
  const shift = (n: number) => setMonth(iso(new Date(first.getFullYear(), first.getMonth() + n, 1)));
  const off = (d: string) => (!!min && d < min) || (!!max && d > max);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); btn.current?.focus(); return; }
    const el = document.activeElement as HTMLElement | null;
    const d = el?.dataset?.d;
    if (!d) return;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (step[e.key]) {
      e.preventDefault();
      const nd = addDays(d, step[e.key]);
      if (nd.slice(0, 7) !== month.slice(0, 7)) setMonth(nd.slice(0, 7) + "-01");
      setTimeout(() => pop.current?.querySelector<HTMLElement>(`[data-d="${nd}"]`)?.focus(), 0);
    }
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={"sel dp " + className}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? setOpen(false) : openIt())}
        {...rest}
      >
        <span className={value ? "" : "ph"}>{value ? show(value) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16v14H4zM4 11h16M8 3v5M16 3v5" />
        </svg>
      </button>
      {open && (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label="Choose a date"
          className="dp-pop"
          style={{ left: pos.left, width: W, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}
          onKeyDown={onKey}
          onClick={(e) => e.preventDefault()}
        >
          <div className="dp-head">
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>
              <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden><path d="M7 1L2 6l5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
            <b>{MONTHS[first.getMonth()]} {first.getFullYear()}</b>
            <button type="button" aria-label="Next month" onClick={() => shift(1)}>
              <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden><path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </div>
          <div className="dp-grid">
            {DOW.map((d) => <span key={d} className="dp-dow">{d}</span>)}
            {cells.map((d, i) =>
              d ? (
                <button
                  key={d}
                  type="button"
                  data-d={d}
                  disabled={off(d)}
                  className={"dp-day" + (d === value ? " on" : "") + (d === t ? " td" : "")}
                  onClick={() => pick(d)}
                  aria-label={show(d)}
                  aria-pressed={d === value}
                  autoFocus={d === (value && value.slice(0, 7) === month.slice(0, 7) ? value : t.slice(0, 7) === month.slice(0, 7) ? t : month)}
                >
                  {Number(d.slice(8))}
                </button>
              ) : (
                <span key={"b" + i} />
              )
            )}
          </div>
          <div className="dp-foot">
            <button type="button" disabled={off(t)} onClick={() => pick(t)}>Today</button>
            {clearable && value && <button type="button" onClick={() => pick("")}>Clear</button>}
          </div>
        </div>
      )}
    </>
  );
}
