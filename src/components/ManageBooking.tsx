"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtLong, nightsBetween, unitLabel, useBookings, type Booking } from "@/lib/bookings";
import { logAction } from "@/lib/adminlog";
import { RESORT } from "@/lib/data";

const digits = (s: string) => s.replace(/\D/g, "").slice(-9);
const LABEL: Record<string, string> = { pending: "Waiting for the owners", confirmed: "Confirmed", declined: "Not accepted", cancelled: "Cancelled" };

export default function ManageBooking() {
  const { mine, update } = useBookings();
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) setRef(r);
  }, []);

  const b: Booking | undefined = mine.find((x) => x.id === id);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const hit = mine.find((x) => x.kind !== "block" && x.ref.toLowerCase() === ref.trim().toLowerCase() && digits(x.phone) === digits(phone) && digits(phone).length >= 9);
    if (!hit) return setErr("We couldn't find a booking with that reference and mobile number. Check them and try again, or call us.");
    setErr("");
    setId(hit.id);
  };

  const request = () => {
    if (!b) return;
    const why = reason.trim() || "No reason given";
    update(b.id, { cancelRequest: { at: new Date().toISOString(), reason: why, state: "requested" } });
    logAction(`Guest requested cancellation of ${b.ref} · ${b.name}: ${why}`, "booking", { actor: "Guest", ref: b.ref });
    setAsking(false);
    setReason("");
  };
  const withdraw = () => {
    if (!b) return;
    update(b.id, { cancelRequest: undefined });
    logAction(`Guest withdrew cancellation request for ${b.ref} · ${b.name}`, "booking", { actor: "Guest", ref: b.ref });
  };

  return (
    <div className="manage">
      <div className="wrap">
        <div className="chap">
          <span className="chap-no">∗</span>
          <span className="label">Your booking</span>
          <span className="rule" />
        </div>
        <h1 className="h2">
          Manage your <em>stay.</em>
        </h1>

        {!b ? (
          <form onSubmit={find} className="manage-form">
            <p className="lede">Enter the reference from your confirmation and the mobile number you booked with.</p>
            <div className="fields two">
              <label>
                <span className="label">Reference</span>
                <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="TDJ-XXXXX" autoCapitalize="characters" />
              </label>
              <label>
                <span className="label">Mobile number</span>
                <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxxx" />
              </label>
            </div>
            {err && <p className="warn">{err}</p>}
            <div className="row">
              <button className="btn btn-solid" type="submit">
                <span>Find my booking</span>
              </button>
              <Link className="btn" href="/">
                <span>Back to the estate</span>
              </Link>
            </div>
          </form>
        ) : (
          <div className="manage-card">
            <div className="ticket">
              <span className="label">Reference</span>
              <strong>{b.ref}</strong>
            </div>
            <dl className="manage-dl">
              <div>
                <dt className="label">Status</dt>
                <dd>
                  <span className={"pill " + b.status}>{LABEL[b.status]}</span>
                </dd>
              </div>
              <div>
                <dt className="label">Where</dt>
                <dd>{unitLabel(b.unit)}</dd>
              </div>
              <div>
                <dt className="label">When</dt>
                <dd>
                  {b.kind === "event" ? fmtLong(b.start) : `${fmtLong(b.start)} → ${fmtLong(b.end)} (${nightsBetween(b.start, b.end)} nights)`}
                </dd>
              </div>
              <div>
                <dt className="label">Guest</dt>
                <dd>{b.name}</dd>
              </div>
            </dl>
            {b.status === "pending" && <p className="small muted">Your reservation is waiting for the owners' approval. Sending your downpayment right away secures your booking.</p>}

            {b.status === "cancelled" ? (
              <p className="lede">This booking has been cancelled. If you paid a deposit, the owners will contact you about it. You are welcome to book another date.</p>
            ) : b.status === "declined" ? (
              <p className="lede">Sorry — the owners couldn't accommodate this request. Please book another date or call us.</p>
            ) : b.cancelRequest?.state === "requested" ? (
              <div className="manage-note">
                <b>Cancellation requested</b>
                <p>
                  We've sent your request to the owners. They'll reply by message. Until then, your booking stays as it is.
                  {b.cancelRequest.reason ? <><br /><span className="muted">Your reason: “{b.cancelRequest.reason}”</span></> : null}
                </p>
                <button className="btn" onClick={withdraw}>
                  <span>Withdraw my request</span>
                </button>
              </div>
            ) : (
              <>
                {b.cancelRequest?.state === "rejected" && (
                  <div className="manage-note">
                    <b>Your earlier cancellation request wasn't approved</b>
                    {b.cancelRequest.reply && <p>“{b.cancelRequest.reply}”</p>}
                  </div>
                )}
                {asking ? (
                  <div className="manage-ask">
                    <label>
                      <span className="label">Why are you cancelling? (optional)</span>
                      <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Change of plans, someone is sick…" />
                    </label>
                    <p className="small muted">The owners review every request. Any refund follows the resort's policy and is arranged by message.</p>
                    <div className="row">
                      <button className="btn btn-solid" onClick={request}>
                        <span>Send cancellation request</span>
                      </button>
                      <button className="btn" onClick={() => setAsking(false)}>
                        <span>Never mind</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="row">
                    <button className="btn" onClick={() => setAsking(true)}>
                      <span>Request cancellation</span>
                    </button>
                  </div>
                )}
              </>
            )}

            <p className="small">
              Need something else? Call <a href={`tel:${RESORT.phones[0].tel}`}>{RESORT.phones[0].label}</a> or message us on{" "}
              <a href={RESORT.messenger} target="_blank" rel="noreferrer">Messenger</a>.
            </p>
            <div className="row">
              <button className="link small" onClick={() => setId(null)}>
                <span>Look up another booking</span>
              </button>
              <Link className="link small" href="/">
                <span>Back to the estate</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
