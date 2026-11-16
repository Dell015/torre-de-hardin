"use client";
import { useEffect, useState } from "react";
import { STAYS } from "@/lib/data";
import { addDays, fmtShort, nightsBetween, today, unitLabel, type Booking, type UnitId } from "@/lib/bookings";
import { logAction } from "@/lib/adminlog";
import { getSettings, saveSettings, useSettings, type Settings } from "@/lib/settings";

const num = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, "")) || 0));

export default function Rates({ all, add, remove }: { all: Booking[]; add: (b: Booking) => void; remove: (id: string) => void }) {
  const { s } = useSettings();
  const [d, setD] = useState<Settings>(s);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!dirty) setD(s);
  }, [s, dirty]);
  const set = (fn: (x: Settings) => Settings) => {
    setD((x) => fn(x));
    setDirty(true);
    setSaved(false);
  };
  const save = () => {
    saveSettings(d);
    logAction("Saved rates & rooms");
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const [blk, setBlk] = useState({ unit: "estate" as UnitId, from: today(), to: addDays(today(), 1), label: "Owner's block" });
  const blocks = all.filter((b) => b.kind === "block").sort((a, b) => (a.start < b.start ? -1 : 1));
  const addBlock = () => {
    if (blk.to <= blk.from) return;
    add({
      id: "blk-" + Date.now().toString(36), ref: "BLOCK", kind: "block", unit: blk.unit, start: blk.from, end: blk.to,
      slot: blk.unit === "hall" ? "whole" : undefined, status: "confirmed", name: blk.label || "Closed", phone: "", guests: 0,
      createdAt: new Date().toISOString(),
    });
    logAction(`Closed ${unitLabel(blk.unit)} ${blk.from} → ${blk.to}`);
  };

  return (
    <div className="ad-pane">
      <div className={"ad-savebar" + (dirty ? " dirty" : "")}>
        <span className="label">{dirty ? "Unsaved changes" : saved ? "Saved — the site is updated ✓" : "Everything saved"}</span>
        <button className="btn btn-solid" disabled={!dirty} onClick={save}>
          <span>Save changes</span>
        </button>
      </div>

      <h3 className="ad-h">Rooms & prices</h3>
      <label className="ad-switch">
        <input type="checkbox" checked={d.showRates} onChange={(e) => set((x) => ({ ...x, showRates: e.target.checked }))} />
        <span>
          Show prices on the website
          <small>Off = guests see “PHP x,xxx” and the owners quote by message.</small>
        </span>
      </label>

      <div className="ad-rooms">
        {STAYS.map((st) => {
          const k = st.id;
          return (
            <div className="ad-room" key={k}>
              <div className="fields two">
                <label>
                  <span className="label">Name</span>
                  <input value={d.names[k]} onChange={(e) => set((x) => ({ ...x, names: { ...x.names, [k]: e.target.value } }))} />
                </label>
                <label>
                  <span className="label">Sleeps</span>
                  <input value={d.sleeps[k]} onChange={(e) => set((x) => ({ ...x, sleeps: { ...x.sleeps, [k]: e.target.value } }))} />
                </label>
                <label>
                  <span className="label">Price per night (PHP)</span>
                  <input inputMode="numeric" value={d.rates[k] || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, rates: { ...x.rates, [k]: num(e.target.value) } }))} />
                </label>
                <div className="ad-step">
                  <span className="label">How many of these</span>
                  <div>
                    <button aria-label="Fewer" onClick={() => set((x) => ({ ...x, units: { ...x.units, [k]: Math.max(1, x.units[k] - 1) } }))}>−</button>
                    <b>{d.units[k]}</b>
                    <button aria-label="More" onClick={() => set((x) => ({ ...x, units: { ...x.units, [k]: Math.min(20, x.units[k] + 1) } }))}>+</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="ad-room">
          <div className="fields two">
            <label>
              <span className="label">Whole estate · per night (PHP)</span>
              <input inputMode="numeric" value={d.rates.estate || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, rates: { ...x.rates, estate: num(e.target.value) } }))} />
            </label>
            <label>
              <span className="label">Function hall · per event (PHP)</span>
              <input inputMode="numeric" value={d.rates.hall || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, rates: { ...x.rates, hall: num(e.target.value) } }))} />
            </label>
          </div>
        </div>
      </div>

      <h3 className="ad-h">Deposit & times</h3>
      <div className="fields two">
        <label>
          <span className="label">Reservation deposit (PHP)</span>
          <input inputMode="numeric" value={d.deposit || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, deposit: num(e.target.value) }))} />
        </label>
        <span />
        <label>
          <span className="label">Check-in time</span>
          <input value={d.checkIn} onChange={(e) => set((x) => ({ ...x, checkIn: e.target.value }))} />
        </label>
        <label>
          <span className="label">Check-out time</span>
          <input value={d.checkOut} onChange={(e) => set((x) => ({ ...x, checkOut: e.target.value }))} />
        </label>
      </div>

      <h3 className="ad-h">Close dates to guests</h3>
      <p className="muted">Use this for maintenance, private use or walk-in bookings. A room closure takes one unit out of service; “Whole estate” closes everything.</p>
      <div className="fields two">
        <label>
          <span className="label">What</span>
          <select value={blk.unit} onChange={(e) => setBlk({ ...blk, unit: e.target.value as UnitId })}>
            <option value="estate">Whole estate</option>
            {STAYS.map((st) => (
              <option key={st.id} value={st.id}>
                {d.names[st.id]}
              </option>
            ))}
            <option value="hall">Function hall</option>
          </select>
        </label>
        <label>
          <span className="label">Note</span>
          <input value={blk.label} onChange={(e) => setBlk({ ...blk, label: e.target.value })} />
        </label>
        <label>
          <span className="label">From</span>
          <input type="date" value={blk.from} onChange={(e) => setBlk({ ...blk, from: e.target.value, to: e.target.value >= blk.to ? addDays(e.target.value, 1) : blk.to })} />
        </label>
        <label>
          <span className="label">Until (checkout day)</span>
          <input type="date" value={blk.to} min={addDays(blk.from, 1)} onChange={(e) => setBlk({ ...blk, to: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <button className="btn btn-solid" onClick={addBlock}>
          <span>Close these dates</span>
        </button>
      </div>
      {blocks.length > 0 && (
        <ul className="ad-list tight">
          {blocks.map((b) => (
            <li key={b.id} className="ad-blk">
              <span>
                <b>{unitLabel(b.unit)}</b>
                <small>
                  {fmtShort(b.start)} → {fmtShort(b.end)} · {nightsBetween(b.start, b.end)} night(s) · {b.name}
                </small>
              </span>
              <button className="link small" onClick={() => remove(b.id)}>
                <span>Reopen</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
