"use client";
import { iso, parse, pad, type DayState } from "@/lib/bookings";

interface Props {
  month: string; // YYYY-MM-01
  onMonth: (delta: number) => void;
  canPrev: boolean;
  start: string;
  end: string;
  maxEnd?: string; // last selectable checkout date while picking an end
  mode: "range" | "single";
  stateOf: (date: string) => DayState;
  onPick: (date: string, state: DayState) => void;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function MonthGrid({ ym, ...p }: Props & { ym: Date; second?: boolean }) {
  const y = ym.getFullYear();
  const m = ym.getMonth();
  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= dim; d++) cells.push(`${y}-${pad(m + 1)}-${pad(d)}`);
  const picking = p.mode === "range" && p.start && !p.end;

  return (
    <div className={"cal-month" + (p.second ? " second" : "")}>
      <div className="cal-title">
        {ym.toLocaleDateString("en-PH", { month: "long" })} <em>{y}</em>
      </div>
      <div className="cal-grid cal-dow" aria-hidden>
        {DOW.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((date, i) => {
          if (!date) return <span key={"b" + i} />;
          const st = p.stateOf(date);
          let blocked = st === "past" || st === "closed" || st === "sold";
          // while choosing a checkout date, any day up to the first blocked night is fine
          if (picking && date > p.start && (!p.maxEnd || date <= p.maxEnd)) blocked = false;
          if (picking && p.maxEnd && date > p.maxEnd) blocked = true;
          const isStart = date === p.start;
          const isEnd = date === p.end;
          const inRange = p.mode === "range" && p.start && p.end && date > p.start && date < p.end;
          const cls = [
            "cal-day",
            "is-" + st,
            blocked ? "is-blocked" : "",
            isStart ? "is-start" : "",
            isEnd ? "is-end" : "",
            inRange ? "in-range" : "",
            date === iso(new Date()) ? "is-today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={date}
              className={cls}
              disabled={blocked}
              aria-label={`${parse(date).toDateString()} — ${st}`}
              aria-pressed={isStart || isEnd}
              onClick={() => p.onPick(date, st)}
            >
              <span>{Number(date.slice(8))}</span>
              {st === "limited" && !blocked && <i className="dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Calendar(props: Props) {
  const a = parse(props.month);
  const b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
  return (
    <div className="cal">
      <div className="cal-nav">
        <button type="button" onClick={() => props.onMonth(-1)} disabled={!props.canPrev} aria-label="Previous month">
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
            <path d="M22 5H1M5 1L1 5l4 4" />
          </svg>
        </button>
        <button type="button" onClick={() => props.onMonth(1)} aria-label="Next month">
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
            <path d="M0 5h21M17 1l4 4-4 4" />
          </svg>
        </button>
      </div>
      <div className="cal-months">
        <MonthGrid {...props} ym={a} />
        <MonthGrid {...props} ym={b} second />
      </div>
      <ul className="cal-key" aria-hidden>
        <li>
          <i className="k k-open" /> Open
        </li>
        <li>
          <i className="k k-limited" /> Few left
        </li>
        <li>
          <i className="k k-sold" /> Taken
        </li>
      </ul>
    </div>
  );
}
