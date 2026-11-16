"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fmtLong, unitLabel, type Booking, type Status } from "@/lib/bookings";
import { logAction } from "@/lib/adminlog";
import { exportBookings } from "@/lib/export";
import { getSettings } from "@/lib/settings";
import { RESORT } from "@/lib/data";
import { Pill, STATUS, TEMPLATES, copy, dateLine, template, title, type TemplateId } from "./shared";

type Api = {
  all: Booking[];
  update: (id: string, patch: Partial<Booking>) => void;
  setStatus: (id: string, s: Status) => void;
  remove: (id: string) => void;
};
const REASONS = ["Dates no longer available", "Receipt not received in time", "Outside our capacity", "Owner's private use"];

export default function Bookings({ api, initialFilter, openId, onClose }: { api: Api; initialFilter: string; openId: string | null; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [kind, setKind] = useState("all");
  const [sel, setSel] = useState<string | null>(openId);
  useEffect(() => setSel(openId), [openId]);
  useEffect(() => setFilter(initialFilter || "all"), [initialFilter]);

  const guests = api.all.filter((b) => b.kind !== "block");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return guests
      .filter((b) => (filter === "all" || b.status === filter) && (kind === "all" || b.kind === kind))
      .filter((b) => !n || [b.name, b.ref, b.phone, b.email, unitLabel(b.unit), b.eventType].join(" ").toLowerCase().includes(n))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.start < b.start ? -1 : 1));
  }, [guests, q, filter, kind]);

  const cur = api.all.find((b) => b.id === sel) || null;
  const close = () => {
    setSel(null);
    onClose();
  };
  const counts = (s: string) => guests.filter((b) => s === "all" || b.status === s).length;

  return (
    <div className="ad-pane">
      <div className="ad-tools">
        <input className="ad-search" placeholder="Search name, reference, mobile…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
          <option value="all">Stays & events</option>
          <option value="stay">Stays only</option>
          <option value="event">Events only</option>
        </select>
      </div>
      <div className="ad-filter">
        {["all", "pending", "confirmed", "declined"].map((f) => (
          <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STATUS[f]} · {counts(f)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="ad-empty-s">No bookings match. Requests made on the site appear here the moment they are sent.</p>
      ) : (
        <ul className="ad-list">
          {list.map((b) => (
            <li key={b.id}>
              <button className={"ad-row " + b.status} onClick={() => setSel(b.id)}>
                <span className="ad-row-main">
                  <span className="label">
                    {b.ref} · {b.kind === "event" ? "Event" : "Stay"}
                    {b.seed ? " · demo" : ""}
                  </span>
                  <b>{title(b)}</b>
                  <small>
                    {unitLabel(b.unit)} · {dateLine(b)}
                  </small>
                </span>
                <Pill status={b.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="row ad-foot">
        <button className="btn btn-solid" onClick={() => exportBookings(list.filter((b) => !b.seed), "xlsx", "bookings")}>
          <span>Export these to Excel</span>
        </button>
        <button className="btn" onClick={() => exportBookings(list.filter((b) => !b.seed), "csv", "bookings")}>
          <span>CSV</span>
        </button>
      </div>

      {cur && <Drawer key={cur.id} b={cur} api={api} close={close} />}
    </div>
  );
}

function Drawer({ b, api, close }: { b: Booking; api: Api; close: () => void }) {
  const [tpl, setTpl] = useState<TemplateId>(b.status === "confirmed" ? "confirm" : b.status === "declined" ? "decline" : b.proof ? "confirm" : "receipt");
  const [text, setText] = useState(() => template(tpl, b));
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(b.adminNote || "");
  const [zoom, setZoom] = useState(false);
  const dep = getSettings().deposit;
  const demo = !!b.seed;

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [close]);

  const pick = (id: TemplateId, bb: Booking = b) => {
    setTpl(id);
    setText(template(id, bb));
  };
  const approve = () => {
    const nb = { ...b, status: "confirmed" as Status, declineReason: undefined };
    api.update(b.id, { status: "confirmed", declineReason: undefined, decidedAt: new Date().toISOString() });
    logAction(`Approved ${b.ref} · ${b.name}`);
    pick("confirm", nb);
  };
  const decline = () => {
    const nb = { ...b, status: "declined" as Status, declineReason: reason };
    api.update(b.id, { status: "declined", declineReason: reason, decidedAt: new Date().toISOString() });
    logAction(`Declined ${b.ref} · ${b.name} (${reason})`);
    setDeclining(false);
    pick("decline", nb);
  };
  const del = () => {
    api.remove(b.id);
    logAction(`Removed ${b.ref} · ${b.name}`);
    close();
  };
  const doCopy = () => {
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const phone = b.phone.replace(/[^\d+]/g, "");

  return createPortal(
    <div className="ad-drawer-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <aside className="ad-drawer" role="dialog" aria-label="Booking details">
        <header>
          <div>
            <span className="label">
              {b.ref} · {b.kind === "event" ? "Event" : "Stay"}
            </span>
            <h3>{title(b)}</h3>
          </div>
          <button className="ad-x" onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        <div className="ad-body">
          <Pill status={b.status} />
          <dl className="ad-dl">
            <div>
              <dt className="label">Where</dt>
              <dd>{unitLabel(b.unit)}</dd>
            </div>
            <div>
              <dt className="label">When</dt>
              <dd>{dateLine(b)}</dd>
            </div>
            <div>
              <dt className="label">Guests</dt>
              <dd>
                {b.guests || "—"}
                {b.kids ? ` (${b.kids} children)` : ""}
                {b.eventType ? ` · ${b.eventType}` : ""}
              </dd>
            </div>
            <div>
              <dt className="label">Mobile</dt>
              <dd>{b.phone ? <a href={`tel:${phone}`}>{b.phone}</a> : "—"}</dd>
            </div>
            {b.email && (
              <div>
                <dt className="label">Email</dt>
                <dd>
                  <a href={`mailto:${b.email}`}>{b.email}</a>
                </dd>
              </div>
            )}
            <div>
              <dt className="label">Requested</dt>
              <dd>{new Date(b.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</dd>
            </div>
          </dl>
          {b.notes && <p className="ad-quote">“{b.notes}”</p>}
          {b.declineReason && b.status === "declined" && <p className="muted">Declined: {b.declineReason}</p>}

          <span className="label">Deposit & receipt {dep ? `· PHP ${dep.toLocaleString("en-PH")}` : ""}</span>
          {b.proofData ? (
            <button className={"ad-proof" + (zoom ? " zoom" : "")} onClick={() => setZoom(!zoom)}>
              <img src={b.proofData} alt={`Receipt ${b.proof || ""}`} />
              <small>{zoom ? "Tap to shrink" : "Tap to enlarge"}</small>
            </button>
          ) : b.proof ? (
            <p className="muted">File sent: {b.proof}</p>
          ) : (
            <p className="muted">{b.pay === "online" ? "Paid through online checkout (simulated)." : demo ? "Demo booking." : "No receipt yet."}</p>
          )}

          {!demo && (
            <>
              <div className="ad-act">
                {b.status !== "confirmed" && (
                  <button className="btn btn-solid" onClick={approve}>
                    <span>Approve</span>
                  </button>
                )}
                {b.status !== "declined" && !declining && (
                  <button className="btn" onClick={() => setDeclining(true)}>
                    <span>Decline</span>
                  </button>
                )}
                {b.status !== "pending" && (
                  <button className="btn" onClick={() => api.update(b.id, { status: "pending", decidedAt: undefined })}>
                    <span>Back to waiting</span>
                  </button>
                )}
              </div>
              {declining && (
                <div className="ad-decline">
                  <label>
                    <span className="label">Reason (kept for your records, used in the reply)</span>
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                      {REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <div className="ad-act">
                    <button className="btn btn-solid" onClick={decline}>
                      <span>Confirm decline</span>
                    </button>
                    <button className="btn" onClick={() => setDeclining(false)}>
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}
              <label className="ad-note">
                <span className="label">Your private note</span>
                <textarea
                  rows={2}
                  value={note}
                  placeholder="e.g. Called, will pay Friday"
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => note !== (b.adminNote || "") && api.update(b.id, { adminNote: note })}
                />
              </label>
            </>
          )}

          <span className="label">Reply to the guest</span>
          <div className="ad-filter small">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={tpl === t.id ? "on" : ""} onClick={() => pick(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <textarea className="ad-msg" rows={9} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="ad-act">
            <button className="btn btn-solid" onClick={doCopy}>
              <span>{copied ? "Copied ✓" : "Copy message"}</span>
            </button>
            <a className="btn" href={RESORT.messenger} target="_blank" rel="noreferrer">
              <span>Open Messenger</span>
            </a>
            {phone && (
              <a className="btn" href={`sms:${phone}?&body=${encodeURIComponent(text)}`}>
                <span>Text</span>
              </a>
            )}
          </div>

          {!demo && (
            <button className="link small ad-del" onClick={del}>
              <span>Remove this booking</span>
            </button>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
