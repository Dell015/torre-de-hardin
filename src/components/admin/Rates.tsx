"use client";
import { useEffect, useState } from "react";
import { STAYS } from "@/lib/data";
import { addDays, fmtShort, nightsBetween, today, unitLabel, type Booking, type UnitId } from "@/lib/bookings";
import { logAction } from "@/lib/adminlog";
import { snap } from "@/lib/history";
import { getSettings, saveSettings, useSettings, type Settings } from "@/lib/settings";

const num = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, "")) || 0));

export default function Rates() {
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
    snap("Saved rates, deposits & times");
    saveSettings(d);
    logAction("Saved rates, deposits & times", "rates");
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="ad-pane">
      <div className={"ad-savebar" + (dirty ? " dirty" : "")}>
        <span className="label">{dirty ? "Unsaved changes" : saved ? "Saved — the site is updated ✓" : "Everything saved"}</span>
        <button className="btn btn-solid" disabled={!dirty} onClick={save}>
          <span>Save changes</span>
        </button>
      </div>

      <h3 className="ad-h">Prices</h3>
      <label className="ad-switch">
        <input type="checkbox" checked={d.showRates} onChange={(e) => set((x) => ({ ...x, showRates: e.target.checked }))} />
        <span>
          Show prices on the website
          <small>Off = guests see “PHP x,xxx” and the owner quotes by message.</small>
        </span>
      </label>

      <div className="fields two">
        {STAYS.map((st) => (
          <label key={st.id}>
            <span className="label">
              {st.name} · per night (PHP) <small className="muted">— {st.units} unit{st.units > 1 ? "s" : ""}, {st.sleeps}</small>
            </span>
            <input inputMode="numeric" value={d.rates[st.id] || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, rates: { ...x.rates, [st.id]: num(e.target.value) } }))} />
          </label>
        ))}
        <label>
          <span className="label">Whole estate · per night (PHP)</span>
          <input inputMode="numeric" value={d.rates.estate || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, rates: { ...x.rates, estate: num(e.target.value) } }))} />
        </label>
        <label>
          <span className="label">Function hall · per event (PHP)</span>
          <input inputMode="numeric" value={d.rates.hall || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, rates: { ...x.rates, hall: num(e.target.value) } }))} />
        </label>
      </div>
      <p className="muted small">Rooms, names, capacity and unit counts are set in the code (<code>src/lib/data.ts</code>), not here.</p>

      <h3 className="ad-h">Reservation deposit (per booking)</h3>
      <div className="fields two">
        {STAYS.map((st) => (
          <label key={st.id}>
            <span className="label">{st.name} (PHP)</span>
            <input inputMode="numeric" value={d.deposits[st.id] || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, deposits: { ...x.deposits, [st.id]: num(e.target.value) } }))} />
          </label>
        ))}
        <label>
          <span className="label">Whole estate (PHP)</span>
          <input inputMode="numeric" value={d.deposits.estate || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, deposits: { ...x.deposits, estate: num(e.target.value) } }))} />
        </label>
        <label>
          <span className="label">Function hall (PHP)</span>
          <input inputMode="numeric" value={d.deposits.hall || ""} placeholder="0" onChange={(e) => set((x) => ({ ...x, deposits: { ...x.deposits, hall: num(e.target.value) } }))} />
        </label>
      </div>
      <h3 className="ad-h">Check-in & check-out times</h3>
      <div className="fields two">
        <label>
          <span className="label">Check-in time</span>
          <input value={d.checkIn} onChange={(e) => set((x) => ({ ...x, checkIn: e.target.value }))} />
        </label>
        <label>
          <span className="label">Check-out time</span>
          <input value={d.checkOut} onChange={(e) => set((x) => ({ ...x, checkOut: e.target.value }))} />
        </label>
      </div>

      <h3 className="ad-h">How long a waiting request holds the dates</h3>
      <div className="fields two">
        <label>
          <span className="label">Hours (0 = hold until you answer)</span>
          <input inputMode="numeric" value={d.holdHours} onChange={(e) => set((x) => ({ ...x, holdHours: num(e.target.value) }))} />
        </label>
      </div>
      <p className="muted small">While a request is waiting, other guests can't book those dates. If you haven't answered after this many hours, the dates open up again for others (you can still approve the request if they're still free).</p>

      <p className="muted small">To close dates or add a special guest, use the calendar on the Overview tab.</p>
    </div>
  );
}
