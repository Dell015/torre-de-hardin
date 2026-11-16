"use client";
import { useMemo, useState } from "react";
import Select from "./Select";
import { addDays, today, unitLabel, type Booking } from "@/lib/bookings";
import { exportIncome, type MoneyRow } from "@/lib/export";
import { logAction } from "@/lib/adminlog";
import { balanceOf, unpaidAfter } from "./shared";
import DatePicker from "./DatePicker";

const php = (n: number) => `${n < 0 ? "-" : ""}PHP ${Math.abs(Math.round(n)).toLocaleString("en-PH")}`;
const day = (iso: string) => iso.slice(0, 10);
const monthKey = (iso: string) => iso.slice(0, 7);
const monthName = (k: string) => new Date(k + "-01T00:00:00").toLocaleString("en-PH", { month: "long", year: "numeric" });

export default function Income({ all, open }: { all: Booking[]; open: (id: string) => void }) {
  const t = today();
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState(t.slice(0, 8) + "01");
  const [to, setTo] = useState(t);

  const [a, b, label] = useMemo((): [string, string, string] => {
    const y = t.slice(0, 4), m = t.slice(0, 7);
    if (range === "today") return [t, t, "today"];
    if (range === "week") {
      const d = new Date(t + "T00:00:00");
      const mon = addDays(t, -((d.getDay() + 6) % 7));
      return [mon, addDays(mon, 6), "this-week"];
    }
    if (range === "month") return [m + "-01", m + "-31", "this-month"];
    if (range === "last") {
      const d = new Date(Number(y), Number(t.slice(5, 7)) - 2, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return [k + "-01", k + "-31", "last-month"];
    }
    if (range === "30") return [addDays(t, -29), t, "last-30-days"];
    if (range === "year") return [y + "-01-01", y + "-12-31", "this-year"];
    if (range === "custom") return [from, to < from ? from : to, "custom"];
    return ["0000-01-01", "9999-12-31", "all-time"];
  }, [range, from, to, t]);

  // every payment / refund ever recorded
  const everything = useMemo<MoneyRow[]>(
    () =>
      all.flatMap((bk) =>
        (bk.payments || []).map((p) => ({ at: p.at, guest: bk.name, ref: bk.ref, id: bk.id, room: unitLabel(bk.unit), kind: p.kind, method: p.method, reference: p.ref || "", note: p.note || "", amount: p.amount }) as MoneyRow & { id: string })
      ).sort((x, y) => (x.at < y.at ? 1 : -1)),
    [all]
  );
  const rows = everything.filter((r) => day(r.at) >= a && day(r.at) <= b);
  const sum = (list: MoneyRow[], kind?: string) => list.filter((r) => !kind || r.kind === kind).reduce((n, r) => n + r.amount, 0);
  const received = sum(rows, "payment");
  const refunded = sum(rows, "refund");
  const net = received - refunded;

  const group = (key: (r: MoneyRow) => string) => {
    const m = new Map<string, { n: number; v: number }>();
    rows.forEach((r) => {
      const k = key(r);
      const o = m.get(k) || { n: 0, v: 0 };
      o.n += 1;
      o.v += r.kind === "refund" ? -r.amount : r.amount;
      m.set(k, o);
    });
    return Array.from(m.entries()).sort((x, y) => y[1].v - x[1].v);
  };
  const byRoom = group((r) => r.room);
  const byMethod = group((r) => r.method);

  // last 6 months
  const months = useMemo(() => {
    const out: { k: string; v: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1 - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ k, v: everything.filter((r) => monthKey(r.at) === k).reduce((n, r) => n + (r.kind === "refund" ? -r.amount : r.amount), 0) });
    }
    return out;
  }, [everything, t]);
  const top = Math.max(1, ...months.map((m) => m.v));

  // money still expected: confirmed bookings whose deposit isn't fully in yet
  const owed = all
    .filter((bk) => bk.kind !== "block" && bk.status === "confirmed")
    .map((bk) => {
      const paid = (bk.payments || []).reduce((n, p) => n + (p.kind === "refund" ? -p.amount : p.amount), 0);
      const after = unpaidAfter(bk);
      return { bk, after, left: after ? balanceOf(bk) : Math.max(0, (bk.deposit || 0) - paid) };
    })
    .filter((x) => x.left > 0)
    .sort((a, b) => Number(b.after) - Number(a.after));
  const owedTotal = owed.reduce((n, x) => n + x.left, 0);

  const doExport = (f: "xlsx" | "csv") => {
    const n = exportIncome(rows, f, label, [
      ["Item", "Value"],
      ["Period", range === "all" ? "All time" : `${a} to ${b}`],
      ["Payments received (PHP)", received],
      ["Refunds (PHP)", refunded],
      ["Net income (PHP)", net],
      ["Number of transactions", rows.length],
    ]);
    logAction(`Exported ${n} payments (${f.toUpperCase()})`, "export");
  };

  return (
    <div className="ad-pane">
      <div className="fields two">
        <label>
          <span className="label">Show income for</span>
          <Select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="last">Last month</option>
            <option value="30">Last 30 days</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
            <option value="custom">Pick dates</option>
          </Select>
        </label>
        {range === "custom" && (
          <div className="fields two">
            <label><span className="label">From</span><DatePicker value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
            <label><span className="label">To</span><DatePicker value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
          </div>
        )}
      </div>

      <div className="ad-money">
        <div className="big"><span>Net income</span><b>{php(net)}</b></div>
        <div><span>Payments received</span><b>{php(received)}</b></div>
        <div><span>Refunds given</span><b>{php(refunded)}</b></div>
        {(() => {
          const late = owed.filter((x) => x.after);
          const lateTotal = late.reduce((n, x) => n + x.left, 0);
          return late.length > 0 ? (
            <button type="button" className="late" onClick={() => document.getElementById("owed-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <span>Still to collect</span>
              <b>{php(owedTotal)}</b>
              <small>{late.length} finished stay{late.length === 1 ? "" : "s"} unpaid ({php(lateTotal)}). Tap to see who</small>
            </button>
          ) : (
            <div><span>Still to collect</span><b>{php(owedTotal)}</b><small>{owed.length} booking{owed.length === 1 ? "" : "s"} with money owed</small></div>
          );
        })()}
      </div>

      <h3 className="ad-h">Last 6 months</h3>
      <ul className="ad-bars">
        {months.map((m) => (
          <li key={m.k}>
            <span>{new Date(m.k + "-01T00:00:00").toLocaleString("en-PH", { month: "short", year: "2-digit" })}</span>
            <i><u style={{ width: Math.max(0, (m.v / top) * 100) + "%" }} /></i>
            <b>{php(m.v)}</b>
          </li>
        ))}
      </ul>

      <div className="ad-cols two-up">
        <div>
          <h3 className="ad-h">By room or venue</h3>
          {byRoom.length === 0 ? <p className="muted">No payments in this period.</p> : (
            <ul className="ad-split">{byRoom.map(([k, o]) => <li key={k}><span>{k}<small>{o.n} payment{o.n === 1 ? "" : "s"}</small></span><b>{php(o.v)}</b></li>)}</ul>
          )}
        </div>
        <div>
          <h3 className="ad-h">By how they paid</h3>
          {byMethod.length === 0 ? <p className="muted">No payments in this period.</p> : (
            <ul className="ad-split">{byMethod.map(([k, o]) => <li key={k}><span>{k}<small>{o.n} payment{o.n === 1 ? "" : "s"}</small></span><b>{php(o.v)}</b></li>)}</ul>
          )}
        </div>
      </div>

      <div className="ad-listhead">
        <h3 className="ad-h">Every payment · {rows.length}</h3>
        <Select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Show payments for">
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="last">Last month</option>
          <option value="30">Last 30 days</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
          <option value="custom">Pick dates</option>
        </Select>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Nothing recorded for {range === "all" ? "this account yet" : "this period"}. Payments are recorded on each booking, under the Payment step.</p>
      ) : (
        <ul className="ad-pl">
          {rows.map((r: any) => (
            <li key={r.id + r.at + r.amount}>
              <button onClick={() => open(r.id)}>
                <span>
                  <b>{r.guest}</b>
                  <small>
                    {new Date(r.at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })} · {r.room} · {r.method}
                    {r.reference ? ` · ref ${r.reference}` : ""}
                  </small>
                </span>
                <b className={r.kind === "refund" ? "neg" : "pos"}>{r.kind === "refund" ? "-" : "+"}{php(r.amount).replace("-", "")}</b>
              </button>
            </li>
          ))}
        </ul>
      )}

      {owed.length > 0 && (
        <>
          <h3 className="ad-h" id="owed-list">Money still to collect</h3>
          <ul className="ad-pl">
            {owed.map(({ bk, left, after }) => (
              <li key={bk.id} className={after ? "late" : ""}>
                <button onClick={() => open(bk.id)}>
                  <span><b>{bk.name}</b><small>{unitLabel(bk.unit)} · {bk.ref} · {after ? "stay finished, balance unpaid" : "deposit not yet received"}</small></span>
                  <b>{php(left)}</b>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="row ad-foot">
        <button className="btn btn-solid" disabled={rows.length === 0} onClick={() => doExport("xlsx")}><span>Download as Excel ({rows.length})</span></button>
        <button className="link small" disabled={rows.length === 0} onClick={() => doExport("csv")}><span>or download as plain CSV</span></button>
      </div>
    </div>
  );
}
