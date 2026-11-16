"use client";
import Select from "./Select";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fmtShort, isExpired, fmtLong, unitLabel, type Booking, type Payment, type Status } from "@/lib/bookings";
import EntryForm, { conflictsFor } from "./EntryForm";
import { logAction } from "@/lib/adminlog";
import { exportBookings } from "@/lib/export";
import { getSettings } from "@/lib/settings";
import { RESORT } from "@/lib/data";
import { ConfirmLink, Pill, StatusPill, phaseOf, STATUS, TEMPLATES, copy, dateLine, template, title, type TemplateId } from "./shared";

type Api = {
  all: Booking[];
  update: (id: string, patch: Partial<Booking>, label?: string) => void;
  setStatus: (id: string, s: Status) => void;
  remove: (id: string) => void;
};
const REASONS = ["Dates no longer available", "Receipt not received in time", "Outside our capacity", "Owner's private use"];

export default function Bookings({ api, initialFilter, openId, onClose, onSave }: { api: Api; initialFilter: string; openId: string | null; onClose: () => void; onSave: (b: Booking, isNew: boolean) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [kind, setKind] = useState("all");
  const [sel, setSel] = useState<string | null>(openId);
  useEffect(() => setSel(openId), [openId]);
  useEffect(() => setFilter(initialFilter || "all"), [initialFilter]);

  const guests = api.all.filter((b) => b.kind !== "block");
  const match = (b: Booking, f: string) =>
    f === "all" ? true : f === "cancelreq" ? b.cancelRequest?.state === "requested" : f === "completed" ? phaseOf(b) === "completed" : f === "confirmed" ? b.status === "confirmed" && phaseOf(b) !== "completed" : b.status === f;
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return guests
      .filter((b) => match(b, filter) && (kind === "all" || b.kind === kind))
      .filter((b) => !n || [b.name, b.ref, b.phone, b.email, unitLabel(b.unit), b.eventType].join(" ").toLowerCase().includes(n))
      .sort((a, b) => (filter === "completed" ? (a.start < b.start ? 1 : -1) : a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.start < b.start ? -1 : 1));
  }, [guests, q, filter, kind]);

  const cur = api.all.find((b) => b.id === sel) || null;
  const close = () => {
    setSel(null);
    onClose();
  };
  const counts = (s: string) => guests.filter((b) => match(b, s)).length;

  return (
    <div className="ad-pane">
      <div className="ad-tools">
        <input className="ad-search" placeholder="Search name, reference, mobile…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
          <option value="all">Stays & events</option>
          <option value="stay">Stays only</option>
          <option value="event">Events only</option>
        </Select>
      </div>
      <div className="ad-filter">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
          {[["all", "All bookings"], ["pending", "Waiting for you"], ["cancelreq", "Cancellation requests"], ["confirmed", "Confirmed (upcoming)"], ["completed", "Completed (past)"], ["declined", "Declined"], ["cancelled", "Cancelled"]].map(([f, l]) => (
            <option key={f} value={f}>
              {l} ({counts(f)})
            </option>
          ))}
        </Select>
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
                {b.cancelRequest?.state === "requested" ? <span className="pill request">Cancel request</span> : <StatusPill b={b} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="row ad-foot">
        <button className="btn btn-solid" onClick={() => exportBookings(list, "xlsx", "bookings")}>
          <span>Download these as Excel ({list.length})</span>
        </button>
        <button className="link small" onClick={() => exportBookings(list, "csv", "bookings")}>
          <span>or download as plain CSV</span>
        </button>
      </div>

      {cur && <Drawer key={cur.id} b={cur} api={api} close={close} onSave={onSave} />}
    </div>
  );
}

function Drawer({ b, api, close, onSave }: { b: Booking; api: Api; close: () => void; onSave: (b: Booking, isNew: boolean) => void }) {
  const isBlock = b.kind === "block";
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"booking" | "pay" | "msg" | "more">("booking");
  const show = (t: string) => isBlock || tab === t;
  const [tpl, setTpl] = useState<TemplateId>(phaseOf(b) === "completed" ? "thanks" : b.status === "confirmed" ? "confirm" : b.status === "declined" ? "decline" : b.proof ? "confirm" : "receipt");
  const [text, setText] = useState(() => template(tpl, b));
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(b.adminNote || "");
  const [zoom, setZoom] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelWhy, setCancelWhy] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectWhy, setRejectWhy] = useState("");
  const dep = getSettings().deposit;
  const demo = !!b.seed;
  const pays = b.payments || [];
  const paidSum = pays.reduce((a, p) => a + (p.kind === "refund" ? -p.amount : p.amount), 0);
  const phase = phaseOf(b);
  const clashes = !isBlock && !demo && b.status === "pending" ? conflictsFor(b as any, api.all) : [];
  const hard = clashes.filter((c) => c.status === "confirmed");
  const soft = clashes.filter((c) => c.status === "pending");
  const expired = isExpired(b);
  // steps unlock one after the other
  const showPay = demo || b.status === "pending" || b.status === "confirmed" || pays.length > 0;
  const s1 = demo || b.status !== "pending";
  const s2 = demo || (s1 && (!showPay || b.status !== "confirmed" || paidSum > 0 || !!b.payOk || !!b.manual || b.pay === "online"));
  const tabs: [string, string][] = showPay
    ? [["booking", "1 · Review"], ["pay", "2 · Payment"], ["msg", "3 · Message"], ["more", "More"]]
    : [["booking", "1 · Review"], ["msg", "2 · Message"], ["more", "More"]];
  const rivals = !isBlock && !demo && b.status === "confirmed" ? conflictsFor(b as any, api.all).filter((c) => c.status === "pending") : [];
  const declineRivals = () => {
    rivals.forEach((c) => {
      api.update(c.id, { status: "declined", declineReason: "Dates no longer available", decidedAt: new Date().toISOString() }, `Declined ${c.ref} (dates taken)`);
      logAction(`Declined ${c.ref} · ${c.name} (dates taken by ${b.ref})`, "booking", { ref: c.ref });
    });
  };
  const paidOf = (c: Booking) => (c.payments || []).reduce((n, p) => n + (p.kind === "refund" ? -p.amount : p.amount), 0);
  const RivalBox = rivals.length > 0 && (
    <div className="ad-warn">
      <b>{rivals.length === 1 ? "Another request is still waiting for these dates" : `${rivals.length} other requests are still waiting for these dates`}</b>
      <ul>{rivals.map((c) => <li key={c.id}><b>{c.name}</b> · {fmtShort(c.start)} to {fmtShort(c.end)}</li>)}</ul>
      <div className="ad-act"><ConfirmLink solid label="Decline them" yes="Yes, decline" onConfirm={declineRivals} /></div>
      <small>Declining marks them “Dates no longer available”. You can message them from their own booking.</small>
    </div>
  );
  const locked = (t: string) => (t === "pay" ? !s1 : t === "msg" ? !(s1 && s2) : false);
  useEffect(() => {
    if (locked(tab)) setTab(!s1 ? "booking" : "pay");
  }, [s1, s2]); // eslint-disable-line

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
    api.update(b.id, { status: "confirmed", declineReason: undefined, decidedAt: new Date().toISOString() }, `Approved ${b.ref}`);
    logAction(`Approved ${b.ref} · ${b.name}`, "booking", { ref: b.ref });
    pick("confirm", nb);
    setTab("pay");
  };
  const decline = () => {
    const nb = { ...b, status: "declined" as Status, declineReason: reason };
    api.update(b.id, { status: "declined", declineReason: reason, decidedAt: new Date().toISOString() }, `Declined ${b.ref}`);
    logAction(`Declined ${b.ref} · ${b.name} (${reason})`, "booking", { ref: b.ref });
    setDeclining(false);
    pick("decline", nb);
    setTab("msg");
  };
  const cancelBooking = (by: "guest" | "owner", why: string, tplReply?: string) => {
    const nb = { ...b, status: "cancelled" as Status, cancelReason: why };
    api.update(b.id, { status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: why, cancelledBy: by, decidedAt: new Date().toISOString(), cancelRequest: b.cancelRequest ? { ...b.cancelRequest, state: "requested" } : undefined }, `Cancelled ${b.ref}`);
    logAction(`Cancelled ${b.ref} · ${b.name} (${by === "guest" ? "guest request approved" : "by owner"}${why ? `: ${why}` : ""})`, "booking", { ref: b.ref });
    setCancelling(false);
    pick("cancel", nb);
    setTab("msg");
  };
  const keepBooking = () => {
    api.update(b.id, { cancelRequest: { ...b.cancelRequest!, state: "rejected", reply: rejectWhy || undefined } }, `Kept ${b.ref} (cancellation not approved)`);
    logAction(`Cancellation request for ${b.ref} not approved${rejectWhy ? `: ${rejectWhy}` : ""}`, "booking", { ref: b.ref });
    setRejecting(false);
    pick("keep", { ...b, cancelRequest: { ...b.cancelRequest!, state: "rejected", reply: rejectWhy || undefined } });
  };
  const del = () => {
    api.remove(b.id);
    logAction(isBlock ? `Reopened dates: ${b.name} · ${unitLabel(b.unit)} · ${b.start} → ${b.end}` : `Removed ${b.ref} · ${b.name}`, isBlock ? "calendar" : "booking", { ref: b.ref });
    close();
  };
  const doCopy = () => {
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const phone = b.phone.replace(/[^\d+]/g, "");
  const dueDep = b.deposit || dep || 0;
  const [pf, setPf] = useState({ amount: String(Math.max(0, dueDep - paidSum) || ""), method: "GCash", ref: "", note: "" });
  const addPay = (kind: Payment["kind"]) => {
    const amount = Number(pf.amount);
    if (!(amount > 0)) return;
    const p: Payment = { id: Date.now().toString(36), kind, amount, method: pf.method, ref: pf.ref || undefined, note: pf.note || undefined, at: new Date().toISOString() };
    api.update(b.id, { payments: [...pays, p] }, `${kind === "refund" ? "Refund" : "Payment"} on ${b.ref}`);
    logAction(`${kind === "refund" ? "Refunded" : "Received"} PHP ${amount.toLocaleString("en-PH")} via ${pf.method} for ${b.ref} · ${b.name}${pf.ref ? ` (ref ${pf.ref})` : ""}`, "payment", { ref: b.ref, amount: kind === "refund" ? -amount : amount });
    setPf({ ...pf, amount: "", ref: "", note: "" });
  };
  const delPay = (id: string) => {
    api.update(b.id, { payments: pays.filter((x) => x.id !== id) }, `Removed a payment on ${b.ref}`);
    logAction(`Removed a payment record on ${b.ref}`, "payment", { ref: b.ref });
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // page stays still; only the panel scrolls
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="ad-drawer-wrap" data-lenis-prevent onClick={(e) => e.target === e.currentTarget && close()}>
      <aside className="ad-drawer" role="dialog" aria-label="Booking details">
        <header>
          <div>
            <span className="label">
              {isBlock ? (b.tag === "closure" ? "Resort closed" : b.tag === "owner" ? "Owner's event" : "Closed") : `${b.ref} · ${b.kind === "event" ? "Event" : "Stay"}${b.manual ? " · added by owner" : ""}`}
            </span>
            <h3>{title(b)}</h3>
          </div>
          <button className="ad-x" onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        {!isBlock && (
          <nav className="ad-dtabs" aria-label="Booking steps">
            {tabs.map(([k, l]) => (
              <button key={k} className={tab === k ? "on" : ""} disabled={locked(k)} title={locked(k) ? (k === "pay" ? "Approve or decline first" : "Finish the payment step first") : undefined} onClick={() => setTab(k as any)}>
                {locked(k) && (
                  <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden><rect x="1" y="5.5" width="9" height="7" rx="1" fill="currentColor" /><path d="M3 5.5V3.5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                )}
                {l}
              </button>
            ))}
          </nav>
        )}

        <div className="ad-body">
          {show("booking") && <>
          {!isBlock && <StatusPill b={b} />}
          {!isBlock && phase === "completed" && <p className="ad-next">This stay is finished, so there is nothing left to approve or cancel. You can still record a late payment or send a thank-you message.</p>}
          {!isBlock && phase === "inhouse" && <p className="ad-next">The guest is here now. Mark early departures from the Overview page.</p>}
          {!isBlock && !demo && b.status === "pending" && (
            <div className="ad-review">
              <h4>Before you decide</h4>
              <ul>
                <li className={paidSum > 0 ? "ok" : "warn"}>
                  {paidSum > 0 ? `Downpayment received: PHP ${paidSum.toLocaleString("en-PH")}${dueDep ? ` of PHP ${dueDep.toLocaleString("en-PH")}` : ""}.` : b.proofData || b.proof ? "Receipt uploaded, but no payment recorded yet. Check it on the Payment step." : "No downpayment yet. A downpayment is what secures a booking."}
                </li>
                {hard.length > 0 ? (
                  <li className="bad">Dates already confirmed for {hard.map((c) => c.name).join(", ")}. This request can't be approved. Decline it, or change its dates under More.</li>
                ) : soft.length > 0 ? (
                  soft.map((c) => (
                    <li key={c.id} className="warn">
                      Also waiting for the same dates: <b>{c.name}</b> ({fmtShort(c.start)} to {fmtShort(c.end)}), {paidOf(c) > 0 ? `downpayment paid (PHP ${paidOf(c).toLocaleString("en-PH")})` : "no downpayment yet"}. Approve the one that has paid; the rest can be declined after.
                    </li>
                  ))
                ) : (
                  <li className="ok">The dates are free.</li>
                )}
                {expired && <li className="warn">This request waited longer than {getSettings().holdHours} hours without a decision, so its dates were opened up to other guests again.</li>}
              </ul>
            </div>
          )}
          {RivalBox}
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
          {b.status === "cancelled" && (
            <p className="muted">
              Cancelled{b.cancelledBy ? ` by ${b.cancelledBy === "guest" ? "guest request" : "owner"}` : ""}
              {b.cancelReason ? ` — ${b.cancelReason}` : ""}
              {paidSum > 0 ? `. PHP ${paidSum.toLocaleString("en-PH")} was received — remember to refund and record it below.` : ""}
            </p>
          )}
          {!isBlock && !demo && b.cancelRequest?.state === "requested" && b.status !== "cancelled" && (
            <div className="ad-cancelreq">
              <b>The guest asked to cancel</b>
              <p>“{b.cancelRequest.reason}” <small>· {new Date(b.cancelRequest.at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</small></p>
              {paidSum > 0 && <p className="small">They have paid PHP {paidSum.toLocaleString("en-PH")} — decide on a refund after approving.</p>}
              {rejecting ? (
                <>
                  <label>
                    <span className="label">Reply (optional, included in the message)</span>
                    <input value={rejectWhy} placeholder="e.g. Deposit is non-refundable within 7 days" onChange={(e) => setRejectWhy(e.target.value)} />
                  </label>
                  <div className="ad-act">
                    <button className="btn btn-solid" onClick={keepBooking}><span>Keep booking, send reply</span></button>
                    <button className="btn" onClick={() => setRejecting(false)}><span>Back</span></button>
                  </div>
                </>
              ) : (
                <div className="ad-act">
                  <ConfirmLink solid label="Approve cancellation" yes="Yes, cancel this booking" onConfirm={() => cancelBooking("guest", b.cancelRequest!.reason)} />
                  <button className="btn" onClick={() => setRejecting(true)}><span>Don't cancel</span></button>
                </div>
              )}
            </div>
          )}

          </>}
          {!isBlock && tab === "pay" && (
            <>
              {RivalBox}
              <span className="label">Money</span>
              <dl className="ad-dl">
                <div>
                  <dt className="label">Total (estimate)</dt>
                  <dd>{b.total ? `PHP ${b.total.toLocaleString("en-PH")}` : "—"}</dd>
                </div>
                <div>
                  <dt className="label">Deposit due</dt>
                  <dd>{dueDep ? `PHP ${dueDep.toLocaleString("en-PH")}` : "—"}</dd>
                </div>
                <div>
                  <dt className="label">Received</dt>
                  <dd>
                    <b>PHP {paidSum.toLocaleString("en-PH")}</b>
                    {dueDep ? (paidSum >= dueDep ? " · deposit paid ✓" : ` · PHP ${(dueDep - paidSum).toLocaleString("en-PH")} to go`) : ""}
                  </dd>
                </div>
                {b.voucher && (
                  <div>
                    <dt className="label">Voucher</dt>
                    <dd>
                      {b.voucher} · {b.discountLabel}
                      {b.discount ? ` (−PHP ${b.discount.toLocaleString("en-PH")})` : ""}
                    </dd>
                  </div>
                )}
              </dl>
              {b.proofData ? (
                <button className={"ad-proof" + (zoom ? " zoom" : "")} onClick={() => setZoom(!zoom)}>
                  <img src={b.proofData} alt={`Receipt ${b.proof || ""}`} />
                  <small>Guest's receipt · {zoom ? "tap to shrink" : "tap to enlarge"}</small>
                </button>
              ) : b.proof ? (
                <p className="muted">Receipt file sent: {b.proof}</p>
              ) : (
                <p className="muted">{b.pay === "online" ? "Paid through online checkout (simulated)." : demo ? "Demo booking." : "No receipt from the guest yet."}</p>
              )}
              {pays.length > 0 && (
                <ul className="ad-pays">
                  {pays.map((p) => (
                    <li key={p.id}>
                      <span>
                        <b>
                          {p.kind === "refund" ? "−" : "+"}PHP {p.amount.toLocaleString("en-PH")}
                        </b>{" "}
                        {p.kind === "refund" ? "refund" : "received"} · {p.method}
                        {p.ref ? ` · ref ${p.ref}` : ""}
                        <small>{new Date(p.at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}{p.note ? ` · ${p.note}` : ""}</small>
                      </span>
                      {!demo && (
                        <ConfirmLink label="Remove" yes="Yes, remove" onConfirm={() => delPay(p.id)} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!demo && (
                <div className="ad-decline">
                  <span className="label">Record a payment</span>
                  <div className="fields two">
                    <label>
                      <span className="label">Amount (PHP)</span>
                      <input inputMode="numeric" value={pf.amount} onChange={(e) => setPf({ ...pf, amount: e.target.value.replace(/[^\d.]/g, "") })} />
                    </label>
                    <label>
                      <span className="label">Method</span>
                      <Select value={pf.method} onChange={(e) => setPf({ ...pf, method: e.target.value })}>
                        {["GCash", "Maya", "Bank transfer", "Cash", "Card"].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </Select>
                    </label>
                    <label>
                      <span className="label">Reference no. (optional)</span>
                      <input value={pf.ref} onChange={(e) => setPf({ ...pf, ref: e.target.value })} />
                    </label>
                    <label>
                      <span className="label">Note (optional)</span>
                      <input value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} />
                    </label>
                  </div>
                  <div className="ad-act">
                    <button className="btn btn-solid" onClick={() => addPay("payment")}>
                      <span>Record payment</span>
                    </button>
                    <button className="btn" onClick={() => addPay("refund")}>
                      <span>Record refund</span>
                    </button>
                  </div>
                </div>
              )}
              {b.status === "confirmed" && !demo && (
                <div className="ad-act ad-nextstep">
                  {s2 ? (
                    <button className="btn btn-solid" onClick={() => setTab("msg")}><span>Next: write the message →</span></button>
                  ) : (
                    <>
                      <p className="muted small">Record the payment above to continue — or, if the guest hasn't paid yet:</p>
                      <button className="btn" onClick={() => { api.update(b.id, { payOk: true }, `Continued ${b.ref} without payment`); setTab("msg"); }}><span>No payment yet — continue</span></button>
                    </>
                  )}
                </div>
              )}
              {b.status !== "confirmed" && !demo && <div className="ad-act ad-nextstep"><button className="btn btn-solid" onClick={() => setTab("msg")}><span>Next: write the message →</span></button></div>}
            </>
          )}

          {!demo && !isBlock && tab === "booking" && (
            <>
              <div className="ad-act">
                {b.status === "pending" && (
                  <button className="btn btn-solid" disabled={hard.length > 0} onClick={approve}>
                    <span>Approve</span>
                  </button>
                )}
                {b.status === "pending" && !declining && (
                  <button className="btn" onClick={() => setDeclining(true)}>
                    <span>Decline</span>
                  </button>
                )}
                {b.status === "declined" && (
                  <button className="btn" onClick={() => api.update(b.id, { status: "pending", decidedAt: undefined, declineReason: undefined }, `Reopened ${b.ref} as waiting`)}>
                    <span>Reopen as waiting</span>
                  </button>
                )}
                {s1 && b.status !== "pending" && (
                  <button className="btn btn-solid" onClick={() => setTab(showPay ? "pay" : "msg")}>
                    <span>{showPay ? "Next: payment" : "Next: message"}</span>
                  </button>
                )}
              </div>
              {phase === "upcoming" && !cancelling && !declining && (
                <div className="ad-act">
                  <button className="btn" onClick={() => setCancelling(true)}><span>Cancel this booking</span></button>
                </div>
              )}
              {cancelling && (
                <div className="ad-decline">
                  <label>
                    <span className="label">Why is it being cancelled? (required)</span>
                    <input value={cancelWhy} placeholder="e.g. Guest called to cancel" onChange={(e) => setCancelWhy(e.target.value)} />
                  </label>
                  <p className="small muted">The dates open up again for other guests.{paidSum > 0 ? ` Remember: PHP ${paidSum.toLocaleString("en-PH")} was received.` : ""}</p>
                  <div className="ad-act">
                    <ConfirmLink solid disabled={cancelWhy.trim().length < 3} label="Cancel booking" yes="Yes, cancel it" onConfirm={() => cancelBooking("owner", cancelWhy.trim())} />
                    <button className="btn" onClick={() => setCancelling(false)}><span>Keep it</span></button>
                  </div>
                </div>
              )}
              {declining && (
                <div className="ad-decline">
                  <label>
                    <span className="label">Reason (kept for your records, used in the reply)</span>
                    <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                      {REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
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
            </>
          )}

          {show("more") && !demo && !isBlock && (
            <>
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
          {show("more") && !demo && (
            <>
              {editing ? (
                <>
                  <span className="label">Edit {isBlock ? "calendar entry" : "booking"}</span>
                  <EntryForm
                    initial={b}
                    all={api.all}
                    onCancel={() => setEditing(false)}
                    onSave={(nb, isNew) => {
                      onSave(nb, isNew);
                      setEditing(false);
                    }}
                  />
                </>
              ) : (
                <div className="ad-act">
                  <button className="btn" onClick={() => setEditing(true)}>
                    <span>{isBlock ? "Change dates / details" : "Change dates, room or details"}</span>
                  </button>
                </div>
              )}
            </>
          )}

          {!isBlock && tab === "msg" && (<>
          <span className="label">Reply to the guest</span>
          <div className="ad-filter small">
            {TEMPLATES.filter((t) => (phase === "completed" ? ["thanks"] : b.status === "confirmed" ? ["confirm", "reminder", "receipt"] : b.status === "declined" ? ["decline"] : b.status === "cancelled" ? ["cancel"] : b.cancelRequest ? ["receipt", "keep"] : ["receipt"]).includes(t.id) || t.id === tpl).map((t) => (
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
          </>)}

          {show("more") && !demo && (
            <div className="ad-del">
              <ConfirmLink label={isBlock ? "Reopen these dates (delete entry)" : "Delete this booking"} yes={isBlock ? "Yes, reopen" : "Yes, delete it"} onConfirm={del} />
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
