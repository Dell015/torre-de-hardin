"use client";
import { useMemo, useState } from "react";
import { addDays, fmtLong, iso, pad, parse, today, unitLabel, type Booking } from "@/lib/bookings";
import { STAYS } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { Pill, StatusPill, UNIT_CODE, balanceOf, dateLine, title, unpaidAfter } from "./shared";
import { logAction } from "@/lib/adminlog";
import { peso } from "@/lib/bookings";

const live = (b: Booking) => b.status !== "declined" && b.status !== "cancelled";
const covers = (b: Booking, d: string) => b.start <= d && d < b.end;

type Fac = { id: string; name: string; state: string; tone: string; note?: string; items: Booking[] };
function facilities(d: string, onDay: Booking[]): Fac[] {
  const st = getSettings();
  const estate = onDay.filter((b) => b.unit === "estate");
  const closedNote = estate.length ? `Closed — ${estate[0].kind === "block" ? estate[0].name : "whole estate booked by " + estate[0].name}` : "";
  const out: Fac[] = [];
  for (const r of STAYS) {
    const items = onDay.filter((b) => b.unit === r.id);
    const n = st.units[r.id];
    const taken = items.length;
    out.push(
      estate.length
        ? { id: r.id, name: st.names[r.id], state: "Closed", tone: "closed", note: closedNote, items }
        : { id: r.id, name: st.names[r.id], state: taken >= n ? `Full · ${taken}/${n}` : taken ? `${taken}/${n} taken` : `${n} free`, tone: taken >= n ? "full" : taken ? "part" : "open", items }
    );
  }
  const halls = onDay.filter((b) => b.unit === "hall");
  out.push(
    estate.length
      ? { id: "hall", name: "Function hall", state: "Closed", tone: "closed", note: closedNote, items: halls }
      : { id: "hall", name: "Function hall", state: halls.length ? (halls.some((b) => b.slot === "whole") ? "Full day" : "Part booked") : "Free", tone: halls.length ? (halls.some((b) => b.slot === "whole") ? "full" : "part") : "open", items: halls }
  );
  out.push({ id: "estate", name: "Whole estate", state: estate.length ? "Booked / closed" : "Free", tone: estate.length ? "full" : "open", items: estate });
  return out;
}


/** Tap a booking → small summary with the actions a manager needs day to day. */
export function QuickRow({ b, t, open, update, right, startOpen }: { startOpen?: boolean; b: Booking; t: string; open: (id: string) => void; update: (id: string, patch: Partial<Booking>, label?: string) => void; right?: React.ReactNode }) {
  const [show, setShow] = useState(!!startOpen);
  const [cancel, setCancel] = useState(false);
  const [why, setWhy] = useState("");
  const isBlock = b.kind === "block";
  const stay = b.kind === "stay";
  const paid = (b.payments || []).reduce((n, p) => n + (p.kind === "refund" ? -p.amount : p.amount), 0);
  const nights = Math.round((Date.parse(b.end) - Date.parse(b.start)) / 864e5);
  const inHouse = stay && b.status === "confirmed" && !!b.checkedInAt && !b.checkedOutAt;
  const dueIn = b.status === "confirmed" && !b.checkedInAt && b.start <= t && t < b.end;
  const act = (patch: Partial<Booking>, label: string) => { update(b.id, patch, label); logAction(label, "booking", { ref: b.ref }); setShow(false); setCancel(false); };
  return (
    <li className={"ad-qr" + (show ? " open" : "")}>
      <button className="ad-qr-h" onClick={() => setShow((s) => !s)} aria-expanded={show}>
        <span>
          {title(b)}
          <small>
            {isBlock ? "Closed" : b.seed ? "Demo booking" : dateLine(b)}
            {b.kind === "event" && b.slot ? ` · ${({ day: "daytime", evening: "evening", whole: "whole day" } as any)[b.slot]}` : ""}
          </small>
        </span>
        <span className="ad-qr-r">
          {!b.checkedInAt && !b.checkedOutAt && right}
          {!isBlock && (b.checkedOutAt ? <em className="ad-ok">Left</em> : b.checkedInAt ? <em className="ad-ok">Arrived</em> : null)}
          {!isBlock && <StatusPill b={b} />}
          <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </span>
      </button>
      {show && (
        <div className="ad-qr-b">
          {!isBlock && (
            <dl>
              <div><dt>Guests</dt><dd>{b.guests || "—"}</dd></div>
              <div><dt>Mobile</dt><dd>{b.phone ? <a href={"tel:" + b.phone}>{b.phone}</a> : "—"}</dd></div>
              <div><dt>Stay</dt><dd>{b.kind === "event" ? "1 day" : `${nights} night${nights === 1 ? "" : "s"}`}</dd></div>
              <div><dt>Paid</dt><dd>{paid > 0 ? peso(paid) : "Nothing yet"}{b.deposit ? ` of ${peso(b.deposit)} deposit` : ""}</dd></div>
            </dl>
          )}
          {b.notes && <p className="small muted">“{b.notes}”</p>}
          {b.earlyFrom && <p className="small muted">Left early — originally booked until {fmtLong(b.earlyFrom)}.</p>}
          {!cancel && (
            <div className="ad-act">
              {dueIn && stay && <button className="btn btn-solid" onClick={() => act({ checkedInAt: new Date().toISOString() }, `Marked ${b.name} as arrived (${b.ref})`)}><span>Mark as arrived</span></button>}
              {stay && b.status === "confirmed" && !b.checkedOutAt && b.end === t && <button className="btn btn-solid" onClick={() => act({ checkedOutAt: new Date().toISOString() }, `Marked ${b.name} as checked out (${b.ref})`)}><span>Mark as checked out</span></button>}
              {inHouse && b.end > t && b.start < t && <button className="btn" onClick={() => act({ checkedOutAt: new Date().toISOString(), earlyFrom: b.end, end: t }, `${b.name} left early — freed the remaining nights (${b.ref})`)}><span>Left early — free the room</span></button>}
              {!isBlock && (b.status === "confirmed" || b.status === "pending") && !b.checkedInAt && b.end !== t && <button className="btn" onClick={() => setCancel(true)}><span>{dueIn ? "No-show / cancel" : "Cancel booking"}</span></button>}
              {isBlock && <button className="btn" onClick={() => open(b.id)}><span>Edit in Calendar</span></button>}
              {!isBlock && <button className="link small" onClick={() => open(b.id)}><span>Open full details →</span></button>}
            </div>
          )}
          {cancel && (
            <div className="ad-decline">
              <label><span className="label">Reason (required)</span><input value={why} placeholder="e.g. Guest called to cancel" onChange={(e) => setWhy(e.target.value)} /></label>
              <p className="small muted">The room opens up again for other guests right away.{paid > 0 ? ` PHP ${paid.toLocaleString("en-PH")} was received — remember the refund.` : ""}</p>
              <div className="ad-act">
                <button className="btn btn-solid" disabled={why.trim().length < 3} onClick={() => act({ status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: why.trim(), cancelledBy: "owner", decidedAt: new Date().toISOString() }, `Cancelled ${b.ref} · ${b.name}${why ? ": " + why : ""}`)}><span>Yes, cancel it</span></button>
                <button className="btn" onClick={() => setCancel(false)}><span>Keep it</span></button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function Dashboard({ all, open, go, onAdd, update }: { all: Booking[]; open: (id: string) => void; go: (t: string) => void; onAdd: (date: string) => void; update: (id: string, patch: Partial<Booking>, label?: string) => void }) {
  const t = today();
  const [month, setMonth] = useState(() => t.slice(0, 7) + "-01");
  const [sel, setSel] = useState(t);

  const pending = all.filter((b) => b.status === "pending" && b.kind !== "block");
  const cancelReqs = all.filter((b) => b.cancelRequest?.state === "requested" && b.status !== "cancelled");
  const arrivals = all.filter((b) => live(b) && b.kind === "stay" && b.start === t);
  const departures = all.filter((b) => live(b) && b.kind === "stay" && b.end === t);
  const inHouse = all.filter((b) => live(b) && b.kind === "stay" && covers(b, t));
  const events = all.filter((b) => live(b) && b.kind === "event" && b.start === t);
  const next30 = all.filter((b) => live(b) && b.kind !== "block" && b.start >= t && b.start <= addDays(t, 30)).length;

  const unpaid = all.filter((b) => unpaidAfter(b)).sort((x, y) => (x.end < y.end ? 1 : -1));
  const unpaidTotal = unpaid.reduce((n, b) => n + balanceOf(b), 0);

  const cells = useMemo(() => {
    const first = parse(month);
    const lead = first.getDay();
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= days; i++) out.push(`${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(i)}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const shift = (n: number) => {
    const d = parse(month);
    setMonth(iso(new Date(d.getFullYear(), d.getMonth() + n, 1)));
  };
  const onDay = all.filter((b) => live(b) && covers(b, sel));
  const label = parse(month).toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  return (
    <div className="ad-pane">
      <div className="ad-stats five">
        <button onClick={() => go("book:pending")}>
          <b>{pending.length}</b>
          <span className="label">Waiting for you</span>
        </button>
        <div>
          <b>{arrivals.length}</b>
          <span className="label">Arriving today</span>
        </div>
        <div>
          <b>{departures.length}</b>
          <span className="label">Leaving today</span>
        </div>
        <div>
          <b>{inHouse.length}</b>
          <span className="label">Staying now</span>
        </div>
        <div>
          <b>{next30}</b>
          <span className="label">Next 30 days</span>
        </div>
      </div>

      <div className="ad-cols">
        <section>
          {unpaid.length > 0 && (
            <div className="ad-unpaid">
              <h3 className="ad-h">Unpaid after the stay <span className="ad-badge">{unpaid.length}</span></h3>
              <p className="small muted">These guests already left but still owe a balance. Total: <b>PHP {unpaidTotal.toLocaleString("en-PH")}</b>. Open one and record the payment on the Payment step.</p>
              <ul className="ad-mini">
                {unpaid.slice(0, 8).map((b) => (
                  <li key={"u" + b.id}>
                    <button onClick={() => open(b.id)}>
                      <span>
                        <b>{title(b)}</b>
                        <small>{unitLabel(b.unit)} · {dateLine(b)}</small>
                      </span>
                      <span className="pill unpaid">{(b.payments || []).length ? "Owes" : "Unpaid"} PHP {balanceOf(b).toLocaleString("en-PH")}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {unpaid.length > 8 && <button className="link small" onClick={() => go("book:completed")}><span>See all {unpaid.length} →</span></button>}
            </div>
          )}
          <h3 className="ad-h">Needs your answer</h3>
          {cancelReqs.length > 0 && (
            <ul className="ad-mini cancel">
              {cancelReqs.map((b) => (
                <li key={"c" + b.id}>
                  <button onClick={() => open(b.id)}>
                    <span>
                      <b>{title(b)}</b>
                      <small>Wants to cancel · {unitLabel(b.unit)} · {dateLine(b)}</small>
                    </span>
                    <span className="pill request">Cancel request</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pending.length === 0 ? (
            <p className="muted">Nothing waiting. A quiet desk.</p>
          ) : (
            <ul className="ad-mini">
              {pending.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <button onClick={() => open(b.id)}>
                    <span>
                      <b>{title(b)}</b>
                      <small>
                        {unitLabel(b.unit)} · {dateLine(b)}
                      </small>
                    </span>
                    <Pill status="pending" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3 className="ad-h">Today · {fmtLong(t)}</h3>
          {arrivals.length + departures.length + events.length === 0 ? (
            <p className="muted">No arrivals, departures or events today.</p>
          ) : (
            <ul className="ad-mini">
              {[...arrivals.map((b) => ["Arrives", b] as const), ...departures.map((b) => ["Leaves", b] as const), ...events.map((b) => ["Event", b] as const)].map(([k, b]) => (
                <QuickRow key={k + b.id} b={b} t={t} open={open} update={update} right={<span className="label">{k}</span>} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="ad-calhead">
            <h3 className="ad-h" style={{ margin: 0 }}>
              {label}
            </h3>
            <div>
              <button aria-label="Previous month" onClick={() => shift(-1)}>
                ←
              </button>
              <button aria-label="Next month" onClick={() => shift(1)}>
                →
              </button>
            </div>
          </div>
          <div className="ad-cal">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="ad-dow">
                {d}
              </span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={i} className="ad-blank" />;
              const bs = all.filter((b) => live(b) && covers(b, d));
              const shown = bs.slice(0, 6);
              return (
                <button key={d} className={"ad-day" + (d === sel ? " sel" : "") + (d === t ? " today" : "")} onClick={() => setSel(d)}>
                  <i>{Number(d.slice(8))}</i>
                  <span className="ad-chips">
                    {shown.map((b) => (
                      <i key={b.id} className={"ad-dot u-" + b.unit + (b.kind === "block" ? " block" : "") + (b.status === "pending" ? " pend" : "")} title={title(b)} />
                    ))}
                    {bs.length > shown.length && <small className="more">+{bs.length - shown.length}</small>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="ad-key">
            <span><i className="ad-dot u-private" /> Private villa</span>
            <span><i className="ad-dot u-family" /> Family villa</span>
            <span><i className="ad-dot u-cabin" /> Cabin</span>
            <span><i className="ad-dot u-hall" /> Function hall</span>
            <span><i className="ad-dot u-estate" /> Whole estate</span>
            <span><i className="ad-dot u-private pend" /> Waiting for approval</span>
            <span><i className="ad-dot block" /> Closed</span>
          </p>
          <div className="row">
            <button className="btn btn-solid" onClick={() => onAdd(sel)}>
              <span>+ Close dates / add booking on {fmtLong(sel)}</span>
            </button>
          </div>
          <h3 className="ad-h">{fmtLong(sel)} — all rooms & facilities</h3>
          <p className="muted small">Tap a booking to mark arrivals and departures, free a room, or cancel.</p>
          <ul className="ad-fac">
            {facilities(sel, onDay).map((f) => (
              <li key={f.id} className={f.tone}>
                <div className="ad-fac-h">
                  <b className="ad-fac-name"><i className={"ad-dot u-" + f.id} />{f.name}</b>
                  <span className={"ad-tag " + f.tone}>{f.state}</span>
                </div>
                {f.items.length === 0 ? (
                  <small className="muted">{f.tone === "closed" ? f.note : "Nothing booked"}</small>
                ) : (
                  <ul>
                    {f.items.map((b) => (
                      <QuickRow key={b.id} b={b} t={t} open={open} update={update} />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
