"use client";
import Select from "./Select";
import { useMemo, useState } from "react";
import { CATS, GROUPS, clearLog, useLog, type Cat } from "@/lib/adminlog";
import { buildXlsx, download, toCsv } from "@/lib/xlsx";
import type { Booking } from "@/lib/bookings";
import { addDays, today } from "@/lib/bookings";
import { restore, useHistory } from "@/lib/history";
import { ConfirmLink } from "./shared";

const label = (c: Cat) => CATS.find((x) => x.id === c)!.label;
const fmt = (t: string) => new Date(t).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function Audit({ all }: { all: Booking[] }) {
  const log = useLog();
  const hist = useHistory();
  const [view, setView] = useState("all");
  const sel: Cat[] = GROUPS.find((g) => g.id === view)?.cats || [view as Cat];
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const [when, setWhen] = useState("all");
  const [fromC, setFromC] = useState("");
  const [toC, setToC] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);


  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const t0 = today();
    const ago = (d: number) => addDays(t0, -d);
    const [from, to] =
      when === "today" ? [t0, t0] : when === "7" ? [ago(6), t0] : when === "30" ? [ago(29), t0] : when === "month" ? [t0.slice(0, 7) + "-01", t0] : when === "custom" ? [fromC, toC] : ["", ""];
    return log.filter(
      (l) =>
        sel.includes(l.cat) &&
        (who === "all" || l.actor === who) &&
        (!from || l.t.slice(0, 10) >= from) &&
        (!to || l.t.slice(0, 10) <= to) &&
        (!n || (l.text + " " + (l.ref || "")).toLowerCase().includes(n))
    );
  }, [log, sel, who, q, when, fromC, toC]);

  const paid = rows.filter((l) => l.cat === "payment" && l.amount).reduce((a, l) => a + (l.amount || 0), 0);
  const head = ["When", "Who", "Type", "Reference", "Details", "Amount (PHP)"];
  const data = () => rows.map((l) => [fmt(l.t), l.actor, label(l.cat), l.ref || "", l.text, l.amount ?? ""]);
  const exp = (f: "xlsx" | "csv") => {
    const name = `torre-de-jardin-audit-${today()}`;
    if (f === "csv") download(new Blob([toCsv([head, ...data()])], { type: "text/csv;charset=utf-8" }), name + ".csv");
    else download(buildXlsx([{ name: "Audit log", rows: [head, ...(data() as any)], widths: [22, 9, 16, 14, 70, 14] }]), name + ".xlsx");
  };

  return (
    <div className="ad-pane">
      <p className="muted">Every approval, payment, calendar change, voucher and setting change is recorded here with the time. Entries can't be edited.</p>
      <div className="ad-filters">
        <label>
          <span className="label">What to show</span>
          <Select value={view} onChange={(e) => setView(e.target.value)}>
            <optgroup label="Everything">
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Just one kind">
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </Select>
        </label>
        <label>
          <span className="label">When</span>
          <Select value={when} onChange={(e) => setWhen(e.target.value)}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="month">This month</option>
            <option value="custom">Pick dates…</option>
          </Select>
        </label>
        <label>
          <span className="label">Done by</span>
          <Select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">Everyone</option>
            <option value="Owner">Owner only</option>
            <option value="Manager">Manager only</option>
            <option value="Guest">Guests only</option>
          </Select>
        </label>
        <label>
          <span className="label">Search</span>
          <input value={q} placeholder="Name, reference, voucher…" onChange={(e) => setQ(e.target.value)} />
        </label>
        {when === "custom" && (
          <>
            <label>
              <span className="label">From</span>
              <input type="date" value={fromC} onChange={(e) => setFromC(e.target.value)} />
            </label>
            <label>
              <span className="label">To</span>
              <input type="date" value={toC} onChange={(e) => setToC(e.target.value)} />
            </label>
          </>
        )}
      </div>

      <div className="ad-sum">
        <span>
          <b>{rows.length}</b> {rows.length === 1 ? "entry" : "entries"}
        </span>
        {paid !== 0 && (
          <span>
            Payments in this view: <b>PHP {paid.toLocaleString("en-PH")}</b>
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="ad-empty-s">Nothing matches. Try “All activity” and “All time”.</p>
      ) : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>What happened</th>
                <th className="r">Amount</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 300).map((l, i) => (
                <tr key={l.id || i}>
                  <td data-l="When" className="nw">{fmt(l.t)}</td>
                  <td data-l="Type"><em className={"ad-cat c-" + l.cat}>{label(l.cat)}</em></td>
                  <td data-l="What">{l.text}</td>
                  <td data-l="Amount" className="r nw">{l.amount ? `${l.amount < 0 ? "−" : ""}PHP ${Math.abs(l.amount).toLocaleString("en-PH")}` : ""}</td>
                  <td data-l="By" className="nw by">{l.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 300 && <p className="muted small">Showing the latest 300. Export to see all {rows.length}.</p>}
      <h3 className="ad-h">Undo history</h3>
      <p className="muted small">Made a mistake? Each line below puts everything back to how it was <b>before</b> that change (later changes are undone too).</p>
      {hist.length === 0 ? (
        <p className="muted">No changes to undo yet.</p>
      ) : (
        <ul className="ad-pays">
          {hist.slice(0, 12).map((h, i) => (
            <li key={h.id}>
              <span>
                {h.label}
                <small>{fmt(h.t)}</small>
              </span>
              <ConfirmLink label={i === 0 ? "Undo" : "Go back to before this"} yes="Yes, undo" onConfirm={() => restore(h.id)} />
            </li>
          ))}
        </ul>
      )}

      <div className="row">
        <button className="btn btn-solid" onClick={() => exp("xlsx")}>
          <span>Export to Excel</span>
        </button>
        <button className="btn" onClick={() => exp("csv")}>
          <span>CSV</span>
        </button>
        {confirmClear ? (
          <button className="btn" onClick={() => { clearLog(); setConfirmClear(false); }}>
            <span>Yes, clear the whole log</span>
          </button>
        ) : (
          <button className="link small" onClick={() => setConfirmClear(true)}>
            <span>Clear log</span>
          </button>
        )}
      </div>
    </div>
  );
}
