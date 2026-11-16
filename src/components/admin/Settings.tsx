"use client";
import { useEffect, useState } from "react";
import { clearLog, logAction, useLog } from "@/lib/adminlog";
import { exportBookings } from "@/lib/export";
import { resetSettings, saveSettings, useSettings, type Settings as S } from "@/lib/settings";
import type { Booking } from "@/lib/bookings";

function shrink(f: File, max: number): Promise<string> {
  return new Promise((res) => {
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * k);
        c.height = Math.round(im.height * k);
        c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/png"));
      };
      im.src = String(rd.result);
    };
    rd.readAsDataURL(f);
  });
}

export default function Settings({ all, mine, clear }: { all: Booking[]; mine: Booking[]; clear: () => void }) {
  const { s } = useSettings();
  const log = useLog();
  const [pay, setPay] = useState(s.pay);
  const [saved, setSaved] = useState(false);
  const [pin, setPin] = useState({ a: "", b: "" });
  const [pinMsg, setPinMsg] = useState("");
  const [range, setRange] = useState("all");
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setPay(s.pay), [s.pay]);

  const savePay = () => {
    saveSettings({ ...s, pay });
    logAction("Saved payment details");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  const savePin = () => {
    if (!/^\d{4,8}$/.test(pin.a)) return setPinMsg("Use 4 to 8 digits.");
    if (pin.a !== pin.b) return setPinMsg("The two PINs do not match.");
    saveSettings({ ...s, pin: pin.a });
    logAction("Changed login PIN");
    setPin({ a: "", b: "" });
    setPinMsg("PIN changed ✓");
  };
  const t = new Date().toISOString().slice(0, 10);
  const subset = (all: Booking[]) =>
    range === "upcoming" ? all.filter((b) => b.end >= t) : range === "month" ? all.filter((b) => b.start.slice(0, 7) === t.slice(0, 7)) : range === "pending" ? all.filter((b) => b.status === "pending") : all;
  const doExport = (f: "xlsx" | "csv") => {
    const n = exportBookings(subset(mine), f, range === "all" ? "all-bookings" : range);
    logAction(`Exported ${n} bookings (${f.toUpperCase()})`);
  };

  return (
    <div className="ad-pane">
      <h3 className="ad-h">Payment details guests see</h3>
      <div className="fields two">
        <label>
          <span className="label">Method</span>
          <input value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} />
        </label>
        <label>
          <span className="label">Account number</span>
          <input value={pay.number} placeholder="09xx xxx xxxx" onChange={(e) => setPay({ ...pay, number: e.target.value })} />
        </label>
        <label>
          <span className="label">Account name</span>
          <input value={pay.accountName} onChange={(e) => setPay({ ...pay, accountName: e.target.value })} />
        </label>
        <label>
          <span className="label">Bank (optional)</span>
          <input value={pay.bank} onChange={(e) => setPay({ ...pay, bank: e.target.value })} />
        </label>
      </div>
      <label className="ad-note">
        <span className="label">Short note under the details</span>
        <input value={pay.note} placeholder="Send the deposit, then upload your receipt." onChange={(e) => setPay({ ...pay, note: e.target.value })} />
      </label>
      <div className="ad-qr">
        <div className="qrbox">{pay.qr ? <img src={pay.qr} alt="QR" /> : <small>No QR yet</small>}</div>
        <div className="ad-act">
          <label className="btn">
            <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && setPay({ ...pay, qr: await shrink(e.target.files[0], 700) })} />
            <span>{pay.qr ? "Replace QR" : "Upload QR image"}</span>
          </label>
          {pay.qr && (
            <button className="btn" onClick={() => setPay({ ...pay, qr: "" })}>
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>
      <div className="row">
        <button className="btn btn-solid" onClick={savePay}>
          <span>{saved ? "Saved ✓" : "Save payment details"}</span>
        </button>
      </div>

      <h3 className="ad-h">Export bookings</h3>
      <p className="muted">Download a file you can open in Excel, Google Sheets or Numbers. Demo bookings are left out.</p>
      <div className="ad-filter">
        {[["all", "Everything"], ["upcoming", "Upcoming"], ["month", "This month"], ["pending", "Waiting"]].map(([v, l]) => (
          <button key={v} className={range === v ? "on" : ""} onClick={() => setRange(v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn btn-solid" onClick={() => doExport("xlsx")}>
          <span>Download Excel (.xlsx)</span>
        </button>
        <button className="btn" onClick={() => doExport("csv")}>
          <span>CSV</span>
        </button>
      </div>

      <h3 className="ad-h">Login PIN</h3>
      <div className="fields two">
        <label>
          <span className="label">New PIN</span>
          <input type="password" inputMode="numeric" value={pin.a} onChange={(e) => setPin({ ...pin, a: e.target.value })} />
        </label>
        <label>
          <span className="label">Repeat PIN</span>
          <input type="password" inputMode="numeric" value={pin.b} onChange={(e) => setPin({ ...pin, b: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <button className="btn" onClick={savePin}>
          <span>Change PIN</span>
        </button>
        {pinMsg && <span className="muted">{pinMsg}</span>}
      </div>
      <p className="muted small">Demo only: the PIN lives in this browser. The live version uses a proper account login.</p>

      <h3 className="ad-h">Activity</h3>
      {log.length === 0 ? (
        <p className="muted">Nothing yet. Approvals, declines, edits and exports are listed here.</p>
      ) : (
        <ul className="ad-log">
          {log.slice(0, 25).map((l, i) => (
            <li key={i}>
              <small>{new Date(l.t).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      )}
      {log.length > 0 && (
        <button className="link small" onClick={clearLog}>
          <span>Clear activity</span>
        </button>
      )}

      <h3 className="ad-h">Demo data</h3>
      <div className="row">
        <button className="btn" onClick={() => { clear(); logAction("Cleared demo bookings"); }}>
          <span>Clear all bookings</span>
        </button>
        {confirmReset ? (
          <button className="btn btn-solid" onClick={() => { resetSettings(); setConfirmReset(false); }}>
            <span>Yes, reset rates & settings</span>
          </button>
        ) : (
          <button className="btn" onClick={() => setConfirmReset(true)}>
            <span>Reset rates & settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
