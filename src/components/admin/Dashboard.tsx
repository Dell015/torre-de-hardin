"use client";
import { useMemo, useState } from "react";
import { addDays, fmtLong, iso, pad, parse, today, unitLabel, type Booking } from "@/lib/bookings";
import { Pill, UNIT_CODE, dateLine, title } from "./shared";

const live = (b: Booking) => b.status !== "declined";
const covers = (b: Booking, d: string) => b.start <= d && d < b.end;

export default function Dashboard({ all, open, go }: { all: Booking[]; open: (id: string) => void; go: (t: string) => void }) {
  const t = today();
  const [month, setMonth] = useState(() => t.slice(0, 7) + "-01");
  const [sel, setSel] = useState(t);

  const pending = all.filter((b) => b.status === "pending" && b.kind !== "block");
  const arrivals = all.filter((b) => live(b) && b.kind === "stay" && b.start === t);
  const departures = all.filter((b) => live(b) && b.kind === "stay" && b.end === t);
  const inHouse = all.filter((b) => live(b) && b.kind === "stay" && covers(b, t));
  const events = all.filter((b) => live(b) && b.kind === "event" && b.start === t);
  const next30 = all.filter((b) => live(b) && b.kind !== "block" && b.start >= t && b.start <= addDays(t, 30)).length;

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
          <h3 className="ad-h">Needs your answer</h3>
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
                <li key={k + b.id}>
                  <button onClick={() => open(b.id)}>
                    <span>
                      <b>{title(b)}</b>
                      <small>{unitLabel(b.unit)}</small>
                    </span>
                    <span className="label">{k}</span>
                  </button>
                </li>
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
              const shown = bs.slice(0, 3);
              return (
                <button key={d} className={"ad-day" + (d === sel ? " sel" : "") + (d === t ? " today" : "")} onClick={() => setSel(d)}>
                  <i>{Number(d.slice(8))}</i>
                  <span className="ad-chips">
                    {shown.map((b) => (
                      <em key={b.id} className={"chip " + b.kind + (b.status === "pending" ? " pend" : "")}>
                        {b.kind === "block" ? "×" : UNIT_CODE[b.unit]}
                      </em>
                    ))}
                    {bs.length > 3 && <em className="chip more">+{bs.length - 3}</em>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="ad-key">
            <span>P Private · F Family · C Cabin · H Hall · E Estate</span>
            <span>
              <em className="chip stay pend">x</em> waiting · <em className="chip block">×</em> closed
            </span>
          </p>
          <h3 className="ad-h">{fmtLong(sel)}</h3>
          {onDay.length === 0 ? (
            <p className="muted">Open — nothing booked.</p>
          ) : (
            <ul className="ad-mini">
              {onDay.map((b) => (
                <li key={b.id}>
                  <button onClick={() => open(b.id)}>
                    <span>
                      <b>{title(b)}</b>
                      <small>
                        {unitLabel(b.unit)}
                        {b.kind === "block" ? " · closed" : b.seed ? " · demo booking" : ""}
                      </small>
                    </span>
                    {b.kind !== "block" && <Pill status={b.status} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
