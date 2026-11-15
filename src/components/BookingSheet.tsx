"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap, initGsap, lockScroll } from "@/lib/motion";
import { useBooking } from "./BookingProvider";
import Calendar from "./Calendar";
import { STAYS, EVENT_TYPES, RESORT } from "@/lib/data";
import {
  type Booking,
  type Slot,
  type UnitId,
  addDays,
  dayState,
  eachNight,
  estateFree,
  fmtLong,
  fmtShort,
  hallFree,
  iso,
  makeRef,
  nightsBetween,
  parse,
  peso,
  today,
  unitAvailable,
  unitLabel,
  unitsLeft,
  useBookings,
} from "@/lib/bookings";

const STEPS = ["Dates", "Details", "Deposit"];
const SLOTS: { id: Slot; name: string; time: string }[] = [
  { id: "day", name: "Daytime", time: "8 AM – 4 PM" },
  { id: "evening", name: "Evening", time: "5 PM – 11 PM" },
  { id: "whole", name: "Whole day", time: "8 AM – 11 PM" },
];

/** A decorative stand-in for the owners' payment QR. Not scannable. */
function SampleQR() {
  const n = 25;
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const cells: JSX.Element[] = [];
  const finder = (x: number, y: number) => x < 8 && y < 8 || x > n - 9 && y < 8 || x < 8 && y > n - 9;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() > 0.52) cells.push(<rect key={x + "-" + y} x={x} y={y} width="1" height="1" />);
  const F = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" />
      <rect x="1" y="1" width="5" height="5" fill="var(--paper)" />
      <rect x="2" y="2" width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="qr" aria-label="Sample QR code" fill="currentColor">
      {cells}
      <F x={0} y={0} />
      <F x={n - 7} y={0} />
      <F x={0} y={n - 7} />
    </svg>
  );
}

export default function BookingSheet() {
  const { open, preset, closeBooking } = useBooking();
  const { all, add } = useBookings();

  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"stay" | "event">("stay");
  const [month, setMonth] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [unit, setUnit] = useState<UnitId | "">("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [eventDate, setEventDate] = useState("");
  const [slot, setSlot] = useState<Slot>("evening");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventGuests, setEventGuests] = useState(50);
  const [exclusive, setExclusive] = useState(false);
  const [d, setD] = useState({ name: "", phone: "", email: "", notes: "" });
  const [pay, setPay] = useState<"manual" | "online">("manual");
  const [proof, setProof] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const [touched, setTouched] = useState(false);

  /* ---- open / close choreography ---- */
  useEffect(() => {
    if (open && !mounted) {
      if (preset?.mode) setMode(preset.mode);
      if (preset?.unit) {
        if (preset.unit === "hall") setMode("event");
        else setUnit(preset.unit);
      }
      if (preset?.eventType) setEventType(preset.eventType);
      setMounted(true);
      lockScroll(true);
    }
    if (!open && mounted) {
      const el = panel.current;
      const desktop = window.matchMedia("(min-width: 900px)").matches;
      gsap.to(back.current, { opacity: 0, duration: 0.7, ease: "power2.out" });
      gsap.to(el, {
        xPercent: desktop ? 100 : 0,
        yPercent: desktop ? 0 : 100,
        duration: 0.8,
        ease: "power4.out",
        onComplete: () => {
          setMounted(false);
          lockScroll(false);
          if (done) resetAll();
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return;
    initGsap();
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    gsap.set(panel.current, desktop ? { xPercent: 100, yPercent: 0 } : { yPercent: 100, xPercent: 0 });
    gsap.to(panel.current, { xPercent: 0, yPercent: 0, duration: 1.25, ease: "expo.out" });
    gsap.fromTo(back.current, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.out" });
  }, [mounted]);

  useLayoutEffect(() => {
    if (!mounted || !body.current) return;
    gsap.fromTo(
      body.current.querySelectorAll(".sh-in"),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: "expo.out", clearProps: "transform" }
    );
    body.current.scrollTo({ top: 0 });
  }, [step, mounted, mode, done]);

  useEffect(() => {
    if (!mounted) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && closeBooking();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [mounted, closeBooking]);

  function resetAll() {
    setStep(0);
    setStart("");
    setEnd("");
    setUnit("");
    setEventDate("");
    setD({ name: "", phone: "", email: "", notes: "" });
    setProof("");
    setPay("manual");
    setDone(null);
    setTouched(false);
    setNote("");
  }

  /* ---- derived availability ---- */
  const stateOf = (date: string) => dayState(date, mode, all);
  const nights = start && end ? nightsBetween(start, end) : 0;

  // furthest checkout while choosing: the first closed/sold night after start
  const maxEnd = useMemo(() => {
    if (!start || mode !== "stay") return undefined;
    for (let dt = start, i = 0; i < 120; dt = addDays(dt, 1), i++) {
      if (dt > start) {
        const st = dayState(dt, "stay", all);
        if (st === "closed" || st === "sold") return dt;
      }
    }
    return undefined;
  }, [start, all, mode]);

  const unitStatus = (u: UnitId) => {
    if (!nights) return { ok: true, left: 0 };
    if (u === "estate") return { ok: unitAvailable("estate", start, end, all), left: 0 };
    const left = Math.min(...eachNight(start, end).map((n) => unitsLeft(u as any, n, all)));
    return { ok: left > 0, left };
  };

  useEffect(() => {
    if (unit && nights && !unitStatus(unit).ok) setUnit("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, all]);

  const slotOk = (s: Slot) => !!eventDate && hallFree(eventDate, s, all);
  useEffect(() => {
    if (mode === "event" && eventDate && !slotOk(slot)) {
      const next = SLOTS.find((s) => slotOk(s.id));
      if (next) setSlot(next.id);
    }
    if (exclusive && eventDate && !estateFree(eventDate, all)) setExclusive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate, all]);

  /* ---- picking ---- */
  function pick(date: string) {
    setNote("");
    if (mode === "event") {
      setEventDate(date);
      return;
    }
    if (!start || (start && end)) {
      setStart(date);
      setEnd("");
      return;
    }
    if (date <= start) {
      setStart(date);
      return;
    }
    setEnd(date);
  }

  const guests = mode === "stay" ? adults + kids : eventGuests;
  const stayValid = !!(start && end && unit && unitStatus(unit as UnitId).ok);
  const eventValid = !!(eventDate && slotOk(slot) && eventGuests > 0);
  const datesValid = mode === "stay" ? stayValid : eventValid;
  const phoneOk = /^(\+?63|0)9\d{9}$/.test(d.phone.replace(/[\s-]/g, ""));
  const detailsValid = d.name.trim().length > 1 && phoneOk && (!d.email || /\S+@\S+\.\S+/.test(d.email));

  function next() {
    if (step === 0 && !datesValid) return setTouched(true);
    if (step === 1 && !detailsValid) return setTouched(true);
    setTouched(false);
    setStep((s) => s + 1);
  }

  function submit() {
    if (busy) return;
    setBusy(true);
    const unitFinal: UnitId = mode === "stay" ? (unit as UnitId) : exclusive ? "estate" : "hall";
    const b: Booking = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ref: makeRef(),
      kind: mode,
      unit: unitFinal,
      start: mode === "stay" ? start : eventDate,
      end: mode === "stay" ? end : addDays(eventDate, 1),
      slot: mode === "event" ? (exclusive ? "whole" : slot) : undefined,
      status: "pending",
      name: d.name.trim(),
      phone: d.phone.trim(),
      email: d.email.trim(),
      guests,
      adults: mode === "stay" ? adults : undefined,
      kids: mode === "stay" ? kids : undefined,
      eventType: mode === "event" ? eventType : undefined,
      notes: d.notes.trim(),
      pay,
      proof: proof || undefined,
      createdAt: new Date().toISOString(),
    };
    setTimeout(
      () => {
        add(b);
        setDone(b);
        setBusy(false);
      },
      pay === "online" ? 1600 : 700
    );
  }

  if (!mounted) return null;

  const canPrev = month > iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const shiftMonth = (n: number) => {
    const m = parse(month);
    setMonth(iso(new Date(m.getFullYear(), m.getMonth() + n, 1)));
  };

  const summary =
    mode === "stay"
      ? start && end
        ? `${fmtShort(start)} → ${fmtShort(end)} · ${nights} night${nights > 1 ? "s" : ""}${unit ? " · " + unitLabel(unit as UnitId) : ""}`
        : start
        ? `Arriving ${fmtShort(start)} — choose a departure`
        : "Choose your arrival date"
      : eventDate
      ? `${fmtLong(eventDate)} · ${exclusive ? "Whole estate" : SLOTS.find((s) => s.id === slot)?.name}`
      : "Choose your event date";

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Reserve">
      <div className="sheet-back" ref={back} onClick={closeBooking} />
      <div className="sheet-panel" ref={panel}>
        <header className="sheet-head">
          <div>
            <span className="label">Reserve</span>
            {!done && (
              <ol className="sheet-steps">
                {STEPS.map((s, i) => (
                  <li key={s} className={i === step ? "on" : i < step ? "past" : ""}>
                    <span>{["i", "ii", "iii"][i]}</span> {s}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <button className="sheet-close" onClick={closeBooking} aria-label="Close">
            <span>Close</span>
            <i />
          </button>
        </header>

        <div className="sheet-body" ref={body} data-lenis-prevent>
          {done ? (
            <div className="sheet-step done">
              <p className="label sh-in">Request received</p>
              <h2 className="sh-in sheet-h">
                Thank you, <em>{done.name.split(" ")[0]}</em>.
              </h2>
              <p className="sh-in lede">
                Your request is now with the owners. They review each one personally and will confirm by text or Messenger. Your
                dates are held for you in the meantime.
              </p>
              <div className="sh-in ticket">
                <div>
                  <span className="label">Reference</span>
                  <strong>{done.ref}</strong>
                </div>
                <div>
                  <span className="label">{done.kind === "event" ? "Event" : "Stay"}</span>
                  <p>
                    {unitLabel(done.unit)}
                    <br />
                    {done.kind === "stay"
                      ? `${fmtLong(done.start)} – ${fmtLong(done.end)}`
                      : `${fmtLong(done.start)} · ${SLOTS.find((s) => s.id === done.slot)?.name}`}
                  </p>
                </div>
                <div>
                  <span className="label">Status</span>
                  <p className="pill">Waiting for owner approval</p>
                </div>
              </div>
              <p className="sh-in small">
                Prefer to talk? Call <a href={`tel:${RESORT.phones[0].tel}`}>{RESORT.phones[0].label}</a> or message us on{" "}
                <a href={RESORT.messenger} target="_blank" rel="noreferrer">
                  Messenger
                </a>
                . Quote your reference.
              </p>
              <div className="sh-in row">
                <button className="btn btn-solid" onClick={closeBooking}>
                  <span>Back to the estate</span>
                </button>
                <a className="btn" href="/admin">
                  <span>See the owner's desk</span>
                </a>
              </div>
            </div>
          ) : step === 0 ? (
            <div className="sheet-step">
              <div className="seg sh-in" role="tablist">
                <button className={mode === "stay" ? "on" : ""} onClick={() => setMode("stay")} role="tab">
                  Overnight stay
                </button>
                <button className={mode === "event" ? "on" : ""} onClick={() => setMode("event")} role="tab">
                  Event &amp; function hall
                </button>
              </div>

              <h2 className="sheet-h sh-in">
                {mode === "stay" ? (
                  <>
                    When shall we <em>expect you?</em>
                  </>
                ) : (
                  <>
                    Which day is <em>the day?</em>
                  </>
                )}
              </h2>

              <div className="sh-in">
                <Calendar
                  month={month}
                  onMonth={shiftMonth}
                  canPrev={canPrev}
                  mode={mode === "stay" ? "range" : "single"}
                  start={mode === "stay" ? start : eventDate}
                  end={mode === "stay" ? end : ""}
                  maxEnd={maxEnd}
                  stateOf={stateOf}
                  onPick={pick}
                />
              </div>

              {mode === "stay" ? (
                <>
                  <div className="sh-in dates-line">
                    <div>
                      <span className="label">Arrive · from {RESORT.checkIn}</span>
                      <b>{start ? fmtLong(start) : "—"}</b>
                    </div>
                    <div>
                      <span className="label">Depart · by {RESORT.checkOut}</span>
                      <b>{end ? fmtLong(end) : "—"}</b>
                    </div>
                  </div>

                  <div className="sh-in guests">
                    {[
                      ["Adults", adults, setAdults, 1, 20],
                      ["Children", kids, setKids, 0, 20],
                    ].map(([label, val, set, min, max]: any) => (
                      <div className="stepper" key={label}>
                        <span>{label}</span>
                        <div>
                          <button onClick={() => set(Math.max(min, val - 1))} aria-label={`Fewer ${label}`}>
                            –
                          </button>
                          <b>{val}</b>
                          <button onClick={() => set(Math.min(max, val + 1))} aria-label={`More ${label}`}>
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="sh-in">
                    <span className="label">Where would you like to sleep?</span>
                    <ul className="units">
                      {[...STAYS.map((s) => ({ id: s.id as UnitId, name: s.name, note: s.kicker, img: s.images[0].name })), {
                        id: "estate" as UnitId,
                        name: "The Whole Estate",
                        note: "Every villa, the pool, garden and hall — exclusively yours",
                        img: "",
                      }].map((u) => {
                        const st = unitStatus(u.id);
                        const disabled = !!nights && !st.ok;
                        return (
                          <li key={u.id}>
                            <button
                              className={"unit" + (unit === u.id ? " on" : "") + (disabled ? " off" : "")}
                              disabled={disabled}
                              onClick={() => setUnit(u.id)}
                            >
                              <span className="unit-main">
                                <b>{u.name}</b>
                                <small>{u.note}</small>
                              </span>
                              <span className="unit-side">
                                <small>{peso()} / night</small>
                                <em>
                                  {!nights
                                    ? "Pick dates"
                                    : disabled
                                    ? u.id === "estate"
                                      ? "Not free"
                                      : "Taken"
                                    : u.id === "estate"
                                    ? "Available"
                                    : st.left === 1
                                    ? "1 left"
                                    : "Available"}
                                </em>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {unit === "estate" && (
                      <p className="small sh-in">
                        While the estate is yours, all other villas and the hall close to other guests on those nights.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="sh-in dates-line">
                    <div>
                      <span className="label">Date</span>
                      <b>{eventDate ? fmtLong(eventDate) : "—"}</b>
                    </div>
                    <div>
                      <span className="label">Function hall</span>
                      <b>Reservation required</b>
                    </div>
                  </div>
                  <div className="sh-in">
                    <span className="label">Time</span>
                    <div className="slots">
                      {SLOTS.map((s) => (
                        <button
                          key={s.id}
                          disabled={!eventDate || !slotOk(s.id) || exclusive}
                          className={(slot === s.id && !exclusive ? "on " : "") + "slot"}
                          onClick={() => setSlot(s.id)}
                        >
                          <b>{s.name}</b>
                          <small>{s.time}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sh-in fields two">
                    <label>
                      <span className="label">Occasion</span>
                      <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                        {EVENT_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="label">Expected guests</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={eventGuests}
                        onChange={(e) => setEventGuests(Math.max(0, Number(e.target.value)))}
                      />
                    </label>
                  </div>
                  <label className={"check sh-in" + (!eventDate || !estateFree(eventDate, all) ? " off" : "")}>
                    <input
                      type="checkbox"
                      checked={exclusive}
                      disabled={!eventDate || !estateFree(eventDate, all)}
                      onChange={(e) => setExclusive(e.target.checked)}
                    />
                    <span />
                    <div>
                      <b>Take the whole estate that day</b>
                      <small>Pool, garden, hall and villas closed to other guests. Best for weddings.</small>
                    </div>
                  </label>
                </>
              )}
              {touched && !datesValid && (
                <p className="warn sh-in">
                  {mode === "stay"
                    ? "Please choose your dates and a place to sleep."
                    : "Please choose a date and an available time."}
                </p>
              )}
              {note && <p className="warn">{note}</p>}
            </div>
          ) : step === 1 ? (
            <div className="sheet-step">
              <h2 className="sheet-h sh-in">
                And who is <em>coming?</em>
              </h2>
              <div className="fields sh-in">
                <label>
                  <span className="label">Full name</span>
                  <input
                    autoComplete="name"
                    value={d.name}
                    onChange={(e) => setD({ ...d, name: e.target.value })}
                    placeholder="Maria Santos"
                  />
                </label>
                <label>
                  <span className="label">Mobile number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={d.phone}
                    onChange={(e) => setD({ ...d, phone: e.target.value })}
                    placeholder="09xx xxx xxxx"
                  />
                </label>
                <label>
                  <span className="label">Email · optional</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={d.email}
                    onChange={(e) => setD({ ...d, email: e.target.value })}
                    placeholder="you@email.com"
                  />
                </label>
                <label>
                  <span className="label">{mode === "event" ? "Tell us about the day" : "Anything we should know?"} · optional</span>
                  <textarea
                    rows={4}
                    value={d.notes}
                    onChange={(e) => setD({ ...d, notes: e.target.value })}
                    placeholder={
                      mode === "event"
                        ? "Theme, suppliers, set-up time, special requests…"
                        : "Arrival time, celebrations, dietary needs…"
                    }
                  />
                </label>
              </div>
              {touched && !detailsValid && (
                <p className="warn sh-in">Please add your name and a valid Philippine mobile number (09xx xxx xxxx).</p>
              )}
            </div>
          ) : (
            <div className="sheet-step">
              <h2 className="sheet-h sh-in">
                Review &amp; <em>secure your dates.</em>
              </h2>
              <div className="recap sh-in">
                <div>
                  <span className="label">{mode === "event" ? "Event" : "Stay"}</span>
                  <p>
                    <b>{unitLabel(mode === "stay" ? (unit as UnitId) : exclusive ? "estate" : "hall")}</b>
                    <br />
                    {mode === "stay"
                      ? `${fmtLong(start)} → ${fmtLong(end)} · ${nights} night${nights > 1 ? "s" : ""}`
                      : `${fmtLong(eventDate)} · ${exclusive ? "Whole day" : SLOTS.find((x) => x.id === slot)?.name}`}
                  </p>
                </div>
                <div>
                  <span className="label">Guests</span>
                  <p>
                    {guests}
                    {mode === "event" ? ` · ${eventType}` : kids ? ` (${kids} children)` : ""}
                  </p>
                </div>
                <div>
                  <span className="label">Estimate</span>
                  <p>
                    <b>{peso()}</b>
                    <br />
                    <small>Rates are confirmed by the owners.</small>
                  </p>
                </div>
              </div>

              <span className="label sh-in">Reservation deposit — {peso()}</span>
              <div className="pays sh-in">
                <button className={"pay" + (pay === "manual" ? " on" : "")} onClick={() => setPay("manual")}>
                  <span className="pay-mark">A</span>
                  <span>
                    <b>GCash or bank transfer</b>
                    <small>Send the deposit, then upload your receipt</small>
                  </span>
                </button>
                <button className={"pay" + (pay === "online" ? " on" : "")} onClick={() => setPay("online")}>
                  <span className="pay-mark">B</span>
                  <span>
                    <b>Pay online</b>
                    <small>GCash, Maya or card through secure checkout</small>
                  </span>
                  <em className="soon">Sample</em>
                </button>
              </div>

              {pay === "manual" ? (
                <div className="pay-body sh-in">
                  <div className="qrbox">
                    <SampleQR />
                    <small>Sample QR</small>
                  </div>
                  <div>
                    <p className="small">
                      GCash · <b>09xx xxx xxxx</b>
                      <br />
                      Account name · <b>Torre de Jardin</b>
                      <br />
                      <span className="muted">The owners' real account details will appear here.</span>
                    </p>
                    <label className="upload">
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setProof(e.target.files?.[0]?.name || "")} />
                      <span>{proof ? "✓ " + proof : "Upload receipt (optional now)"}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="pay-body sh-in">
                  <p className="small">
                    In the live site you will be taken to a secure checkout (GCash, Maya, cards, QR&nbsp;Ph). For this prototype,
                    pressing <b>Request reservation</b> simulates that step.
                  </p>
                </div>
              )}
              <p className="small sh-in muted">
                Nothing is charged until the owners confirm. Your request holds the dates while they review it.
              </p>
            </div>
          )}
        </div>

        {!done && (
          <footer className="sheet-foot">
            <p className="sum">{summary}</p>
            <div className="foot-btns">
              {step > 0 && (
                <button className="btn" onClick={() => setStep(step - 1)}>
                  <span>Back</span>
                </button>
              )}
              {step < 2 ? (
                <button className="btn btn-solid" onClick={next} aria-disabled={step === 0 ? !datesValid : !detailsValid}>
                  <span>Continue</span>
                </button>
              ) : (
                <button className="btn btn-solid" onClick={submit} disabled={busy}>
                  <span>{busy ? (pay === "online" ? "Opening checkout…" : "Sending…") : "Request reservation"}</span>
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
