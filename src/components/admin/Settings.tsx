"use client";
import { useEffect, useState } from "react";
import { logAction } from "@/lib/adminlog";
import { snap } from "@/lib/history";
import { ConfirmLink } from "./shared";
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
  const [pay, setPay] = useState(s.pay);
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState("all");
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setPay(s.pay), [s.pay]);

  const savePay = () => {
    snap("Saved payment details");
    saveSettings({ ...s, pay });
    logAction("Saved payment details", "settings");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  const t = new Date().toISOString().slice(0, 10);
  const subset = (all: Booking[]) =>
    range === "upcoming" ? all.filter((b) => b.end >= t) : range === "month" ? all.filter((b) => b.start.slice(0, 7) === t.slice(0, 7)) : range === "pending" ? all.filter((b) => b.status === "pending") : all;
  const doExport = (f: "xlsx" | "csv") => {
    const n = exportBookings(subset(all), f, range === "all" ? "all-bookings" : range);
    logAction(`Exported ${n} bookings (${f.toUpperCase()})`, "export");
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
      <p className="muted">Download a file you can open in Excel, Google Sheets or Numbers. Includes the sample bookings until you clear them under Demo data.</p>
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
      </div>
      <p className="muted small">Excel gives you tabs for bookings, closed dates and a summary. <button className="link small" onClick={() => doExport("csv")}><span>Download as plain CSV instead</span></button> (one simple table, for importing into other software).</p>

      <h3 className="ad-h">Demo data</h3>
      <div className="row">
        <ConfirmLink solid label="Clear all bookings" yes="Yes, delete every booking" onConfirm={() => { snap("Cleared all bookings"); clear(); logAction("Cleared all bookings", "booking"); }} />
        {confirmReset ? (
          <button className="btn btn-solid" onClick={() => { snap("Reset rates & settings"); resetSettings(); setConfirmReset(false); }}>
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
