"use client";
import { useMemo, useState } from "react";
import { addDays, fmtLong, isLive, today, unitLabel, type Booking, type UnitId } from "@/lib/bookings";
import { STAYS } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import Select from "./Select";
import { QuickRow } from "./Dashboard";
import { balanceOf, clashIds, phaseOf, title, unpaidAfter } from "./shared";
import DatePicker from "./DatePicker";

type Row = { id: UnitId; name: string; cap: number };
type Sel = { id: string } | { unit: UnitId; date: string } | null;
const SLOT: Record<string, string> = { day: "daytime", evening: "evening", whole: "whole day" };
const TAG: Record<string, string> = { closure: "Resort closed", owner: "Owner's event", maintenance: "Out of service", other: "Closed" };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayOf = (d: string) => new Date(d + "T00:00:00");

export default function Timeline({ all, open, update, onAdd }: { all: Booking[]; open: (id: string) => void; update: (id: string, patch: Partial<Booking>, label?: string) => void; onAdd: (date: string) => void }) {
  const t = today();
  const [from, setFrom] = useState(() => addDays(t, -2));
  const [span, setSpan] = useState("14");
  const [focus, setFocus] = useState<"all" | "wait" | "clash" | "owe" | "move">("all");
  const [sel, setSel] = useState<Sel>(null);
  const N = Number(span);
  const days = useMemo(() => Array.from({ length: N }, (_, i) => addDays(from, i)), [from, N]);
  const endWin = addDays(from, N);
  const idx = (d: string) => Math.round((Date.parse(d) - Date.parse(from)) / 864e5);

  const st = getSettings();
  const rows: Row[] = [
    ...STAYS.map((s) => ({ id: s.id as UnitId, name: st.names[s.id], cap: st.units[s.id] })),
    { id: "hall", name: "Function hall", cap: 1 },
    { id: "estate", name: "Whole estate", cap: 1 },
  ];
  const liveAll = useMemo(() => all.filter(isLive), [all]);
  const estateOn = (d: string) => liveAll.some((b) => b.unit === "estate" && b.start <= d && d < b.end);

  const clash = useMemo(() => clashIds(all), [all]);

  const inWin = (b: Booking) => b.end > from && b.start < endWin;
  const winBookings = liveAll.filter((b) => b.kind !== "block" && inWin(b));
  const counts = {
    wait: winBookings.filter((b) => b.status === "pending").length,
    clash: winBookings.filter((b) => clash.has(b.id)).length,
    owe: liveAll.filter((b) => unpaidAfter(b) && inWin(b)).length,
    move: winBookings.filter((b) => b.kind === "stay" && (b.start === t || b.end === t)).length,
  };
  const match = (b: Booking) =>
    focus === "all" || (focus === "wait" && b.status === "pending") || (focus === "clash" && clash.has(b.id)) || (focus === "owe" && unpaidAfter(b)) || (focus === "move" && b.kind === "stay" && (b.start === t || b.end === t));

  const layout = rows.map((r) => {
    const items = liveAll.filter((b) => b.unit === r.id && inWin(b)).sort((a, b) => (a.start === b.start ? (a.createdAt < b.createdAt ? -1 : 1) : a.start < b.start ? -1 : 1));
    const ends: string[] = [];
    const placed = items.map((b) => {
      let lane = ends.findIndex((e) => e <= b.start);
      if (lane < 0) { lane = ends.length; ends.push(b.end); } else ends[lane] = b.end;
      return { b, lane };
    });
    const lanes = Math.max(r.id === "hall" || r.id === "estate" ? 1 : r.cap, ends.length, 1);
    let sub = "";
    if (r.id === "hall") sub = `${new Set(items.filter((b) => b.kind !== "block").map((b) => b.start)).size} event day(s)`;
    else if (r.id === "estate") sub = `${days.filter(estateOn).length} day(s) closed`;
    else {
      const nights = items.filter((b) => b.kind === "stay").reduce((n, b) => n + Math.max(0, Math.min(idx(b.end), N) - Math.max(idx(b.start), 0)), 0);
      sub = `${r.cap} unit${r.cap > 1 ? "s" : ""} · ${Math.round((nights / (r.cap * N)) * 100)}% booked`;
    }
    return { r, placed, lanes, sub };
  });

  const bar = (b: Booking) => {
    const stay = b.kind === "stay";
    let s = stay ? 2 * idx(b.start) + 2 : 2 * idx(b.start) + 1;
    let e = stay ? 2 * idx(b.end) + 2 : 2 * idx(b.end) + 1;
    const contL = s < 1, contR = e > 2 * N + 1;
    s = Math.max(1, s); e = Math.min(2 * N + 1, e);
    const ph = phaseOf(b);
    const owe = unpaidAfter(b);
    const cls = b.kind === "block" ? "blk" : ph === "pending" ? "pend" : ph === "inhouse" ? "inh" : ph === "completed" ? "done" : "conf";
    const meta =
      b.kind === "block" ? TAG[b.tag || "other"] :
      owe ? `Owes PHP ${balanceOf(b).toLocaleString("en-PH")}` :
      ph === "pending" ? "Waiting for approval" :
      ph === "inhouse" ? "Staying now" :
      b.kind === "event" ? `${SLOT[b.slot || "whole"]} · ${b.guests} guests` :
      b.checkedInAt && !b.checkedOutAt ? "Arrived" :
      `${b.guests} guest${b.guests === 1 ? "" : "s"}`;
    return { s, e, contL, contR, cls: cls + (owe ? " owe" : "") + (clash.has(b.id) ? " clash" : ""), meta };
  };

  const shift = (n: number) => setFrom(addDays(from, n));
  const selBooking = sel && "id" in sel ? all.find((b) => b.id === sel.id) : null;
  const selCell = sel && "unit" in sel ? sel : null;
  const cellInfo = (c: { unit: UnitId; date: string }) => {
    const items = liveAll.filter((b) => b.unit === c.unit && b.start <= c.date && c.date < b.end);
    const r = rows.find((x) => x.id === c.unit)!;
    const closed = c.unit !== "estate" && estateOn(c.date);
    const free = closed ? 0 : c.unit === "hall" || c.unit === "estate" ? (items.length ? 0 : 1) : Math.max(0, r.cap - items.length);
    return { items, closed, free, r };
  };

  return (
    <div className="tl-wrap">
      <div className="tl-bar">
        <div className="tl-nav">
          <button className="btn" aria-label="Earlier" onClick={() => shift(-7)}><span>←</span></button>
          <button className="btn" onClick={() => setFrom(addDays(t, -2))}><span>Today</span></button>
          <button className="btn" aria-label="Later" onClick={() => shift(7)}><span>→</span></button>
        </div>
        <label className="tl-jump">
          <span className="label">Go to date</span>
          <DatePicker value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </label>
        <label className="tl-span">
          <span className="label">Show</span>
          <Select value={span} onChange={(e) => setSpan(e.target.value)}>
            <option value="14">2 weeks</option>
            <option value="28">4 weeks</option>
            <option value="42">6 weeks</option>
          </Select>
        </label>
      </div>

      <div className="ad-filter small tl-focus">
        <button className={focus === "all" ? "on" : ""} onClick={() => setFocus("all")}>Everything</button>
        <button className={focus === "wait" ? "on" : ""} onClick={() => setFocus("wait")}>Waiting for you · {counts.wait}</button>
        <button className={focus === "clash" ? "on" : ""} onClick={() => setFocus("clash")}>Overlaps · {counts.clash}</button>
        <button className={focus === "move" ? "on" : ""} onClick={() => setFocus("move")}>Arriving / leaving today · {counts.move}</button>
        <button className={focus === "owe" ? "on" : ""} onClick={() => setFocus("owe")}>Unpaid · {counts.owe}</button>
      </div>

      <div className="tl" style={{ ["--n" as any]: N }}>
        <div className="tl-in">
          <div className="tl-r tl-head">
            <div className="tl-l"><small>{fmtLong(days[0])} → {fmtLong(days[N - 1])}</small></div>
            <div className="tl-hd">
              {days.map((d) => {
                const dt = dayOf(d);
                return (
                  <div key={d} className={"tl-d" + (d === t ? " td" : "") + (dt.getDay() === 0 || dt.getDay() === 6 ? " wk" : "")}>
                    <em>{dt.getDate() === 1 || d === days[0] ? MON[dt.getMonth()] : ""}</em>
                    <small>{DOW[dt.getDay()]}</small>
                    <b>{dt.getDate()}</b>
                  </div>
                );
              })}
            </div>
          </div>
          {layout.map(({ r, placed, lanes, sub }) => (
            <div className="tl-r" key={r.id}>
              <div className="tl-l">
                <b><i className={"ad-dot u-" + r.id} /> {r.name}</b>
                <small>{sub}</small>
              </div>
              <div className="tl-trk" style={{ ["--lanes" as any]: lanes }}>
                <div className="tl-bg">
                  {days.map((d) => {
                    const dt = dayOf(d);
                    const closed = r.id !== "estate" && estateOn(d);
                    const on = selCell && selCell.unit === r.id && selCell.date === d;
                    return (
                      <button
                        key={d}
                        className={"tl-c" + (d === t ? " td" : "") + (dt.getDay() === 0 || dt.getDay() === 6 ? " wk" : "") + (closed ? " cl" : "") + (on ? " sel" : "")}
                        aria-label={`${r.name}, ${fmtLong(d)}`}
                        onClick={() => setSel({ unit: r.id, date: d })}
                      />
                    );
                  })}
                </div>
                <div className="tl-bars">
                  {placed.map(({ b, lane }) => {
                    const g = bar(b);
                    if (g.e <= g.s) return null;
                    const on = selBooking?.id === b.id;
                    return (
                      <button
                        key={b.id}
                        className={"tl-b " + g.cls + (g.contL ? " cl-l" : "") + (g.contR ? " cl-r" : "") + (on ? " on" : "") + (!match(b) ? " dim" : "")}
                        style={{ gridColumn: `${g.s} / ${g.e}`, gridRow: lane + 1 }}
                        title={`${title(b)} · ${g.meta}`}
                        onClick={() => setSel({ id: b.id })}
                      >
                        <b>{title(b)}</b>
                        <small>{g.meta}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="ad-key tl-key">
        <span><i className="tl-sw conf" /> Confirmed</span>
        <span><i className="tl-sw pend" /> Waiting for approval</span>
        <span><i className="tl-sw inh" /> Staying now</span>
        <span><i className="tl-sw done" /> Finished</span>
        <span><i className="tl-sw blk" /> Closed / out of service</span>
        <span><i className="tl-sw clash" /> Overlap</span>
        <span><i className="tl-sw owe" /> Unpaid</span>
      </p>

      {selBooking && (
        <div className="tl-panel">
          <div className="tl-panel-h">
            <h4>{unitLabel(selBooking.unit)}</h4>
            <button className="link small" onClick={() => setSel(null)}><span>Close</span></button>
          </div>
          {clash.has(selBooking.id) && <p className="small tl-warn">Another booking is on the same dates. Open it and decide which one to keep.</p>}
          <ul className="ad-mini">
            <QuickRow key={selBooking.id} b={selBooking} t={t} open={open} update={update} startOpen />
          </ul>
        </div>
      )}
      {selCell && (() => {
        const c = cellInfo(selCell);
        return (
          <div className="tl-panel">
            <div className="tl-panel-h">
              <h4>{c.r.name} · {fmtLong(selCell.date)}</h4>
              <button className="link small" onClick={() => setSel(null)}><span>Close</span></button>
            </div>
            <p className="small muted">
              {c.closed ? "The whole estate is closed or booked on this day." : c.free > 0 ? (c.r.cap > 1 ? `${c.free} of ${c.r.cap} free.` : "Free.") : "Fully taken."}
            </p>
            {c.items.length > 0 && (
              <ul className="ad-mini">
                {c.items.map((b) => <QuickRow key={b.id} b={b} t={t} open={open} update={update} />)}
              </ul>
            )}
            <div className="ad-act">
              <button className="btn btn-solid" onClick={() => onAdd(selCell.date)}><span>Add a booking or closure on {fmtLong(selCell.date)}</span></button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
