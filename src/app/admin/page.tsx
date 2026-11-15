"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, fmtLong, nightsBetween, today, unitLabel, useBookings, type Booking, type UnitId } from "@/lib/bookings";

const STATUS: Record<string, string> = { pending: "Waiting", confirmed: "Confirmed", declined: "Declined" };

export default function Admin() {
  const { mine, setStatus, remove, add, clear } = useBookings();
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "declined">("all");
  const [blk, setBlk] = useState({ unit: "estate" as UnitId, from: today(), to: addDays(today(), 1), label: "Owner's block" });

  const list = useMemo(
    () => mine.filter((b) => filter === "all" || b.status === filter).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [mine, filter]
  );
  const counts = {
    pending: mine.filter((b) => b.status === "pending").length,
    confirmed: mine.filter((b) => b.status === "confirmed").length,
  };

  function block() {
    if (blk.to <= blk.from) return;
    const b: Booking = {
      id: "blk-" + Date.now().toString(36),
      ref: "BLOCK",
      kind: "block",
      unit: blk.unit,
      start: blk.from,
      end: blk.to,
      status: "confirmed",
      name: blk.label,
      phone: "",
      guests: 0,
      createdAt: new Date().toISOString(),
    };
    add(b);
  }

  return (
    <div className="admin">
      <div className="wrap">
        <div className="chap">
          <span className="chap-no">∗</span>
          <span className="label">Owner's desk · demo</span>
          <span className="rule" />
        </div>
        <h1 className="h2">
          Requests, <em>at a glance.</em>
        </h1>
        <p className="lede">
          This is a preview of the owners' side. Requests made on the site appear here. Approving or declining updates the
          calendar guests see. In the live version this page sits behind a login and sends the guest a confirmation.
        </p>

        <div className="ad-stats">
          <div>
            <b>{counts.pending}</b>
            <span className="label">Waiting for you</span>
          </div>
          <div>
            <b>{counts.confirmed}</b>
            <span className="label">Confirmed</span>
          </div>
          <div>
            <b>{mine.length}</b>
            <span className="label">Total this session</span>
          </div>
        </div>

        <div className="ad-filter">
          {(["all", "pending", "confirmed", "declined"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS[f]}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="ad-empty">
            <p>No requests yet.</p>
            <Link className="btn btn-solid" href="/">
              <span>Make one on the site</span>
            </Link>
          </div>
        ) : (
          <ul className="ad-list">
            {list.map((b) => (
              <li key={b.id} className={"ad-item " + b.status}>
                <div className="ad-main">
                  <span className="label">
                    {b.ref} · {b.kind === "block" ? "Blocked" : b.kind === "event" ? "Event" : "Stay"}
                  </span>
                  <h3>{b.kind === "block" ? b.name : b.name}</h3>
                  <p>
                    {unitLabel(b.unit)} · {fmtLong(b.start)}
                    {b.kind === "stay" || b.kind === "block"
                      ? ` → ${fmtLong(b.end)} (${nightsBetween(b.start, b.end)} nights)`
                      : ` · ${b.slot}`}
                    {b.guests ? ` · ${b.guests} guests` : ""}
                  </p>
                  {b.eventType && <p className="muted">{b.eventType}</p>}
                  {b.phone && (
                    <p className="muted">
                      {b.phone}
                      {b.email ? ` · ${b.email}` : ""}
                    </p>
                  )}
                  {b.notes && <p className="muted">“{b.notes}”</p>}
                  {b.proof && <p className="muted">Receipt: {b.proof}</p>}
                </div>
                <div className="ad-actions">
                  <span className={"pill " + b.status}>{STATUS[b.status]}</span>
                  {b.kind !== "block" && b.status !== "confirmed" && (
                    <button className="btn btn-solid" onClick={() => setStatus(b.id, "confirmed")}>
                      <span>Approve</span>
                    </button>
                  )}
                  {b.kind !== "block" && b.status !== "declined" && (
                    <button className="btn" onClick={() => setStatus(b.id, "declined")}>
                      <span>Decline</span>
                    </button>
                  )}
                  <button className="link small" onClick={() => remove(b.id)}>
                    <span>Remove</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="ad-block">
          <span className="label">Close dates to guests</span>
          <div className="fields two">
            <label>
              <span className="label">What</span>
              <select value={blk.unit} onChange={(e) => setBlk({ ...blk, unit: e.target.value as UnitId })}>
                <option value="estate">Whole estate</option>
                <option value="private">Private Villa</option>
                <option value="family">Family Villa</option>
                <option value="cabin">Cabin</option>
                <option value="hall">Function hall</option>
              </select>
            </label>
            <label>
              <span className="label">Note</span>
              <input value={blk.label} onChange={(e) => setBlk({ ...blk, label: e.target.value })} />
            </label>
            <label>
              <span className="label">From</span>
              <input type="date" value={blk.from} onChange={(e) => setBlk({ ...blk, from: e.target.value })} />
            </label>
            <label>
              <span className="label">Until (exclusive)</span>
              <input type="date" value={blk.to} onChange={(e) => setBlk({ ...blk, to: e.target.value })} />
            </label>
          </div>
          <div className="row">
            <button className="btn btn-solid" onClick={block}>
              <span>Close these dates</span>
            </button>
            <button className="btn" onClick={clear}>
              <span>Clear demo data</span>
            </button>
            <Link className="btn" href="/">
              <span>Back to site</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
