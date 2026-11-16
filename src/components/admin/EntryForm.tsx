"use client";
import Select from "./Select";
import { useMemo, useState } from "react";
import { STAYS } from "@/lib/data";
import { isLive, addDays, eachNight, fmtShort, today, unitLabel, type Booking, type Slot, type UnitId } from "@/lib/bookings";
import { getSettings } from "@/lib/settings";
import DatePicker from "./DatePicker";

export type EntryType = "close" | "owner" | "room" | "guest";
export const ENTRY_TYPES: { id: EntryType; label: string; hint: string }[] = [
  { id: "close", label: "Close the resort", hint: "Nobody can book these dates (holiday, renovation, typhoon…)." },
  { id: "owner", label: "Owner's personal event", hint: "Family event or private use. Blocks the calendar." },
  { id: "room", label: "Close a room or the hall", hint: "Maintenance, deep cleaning, or one unit set aside." },
  { id: "guest", label: "Special guest / walk-in", hint: "Add a confirmed booking yourself — a VIP, a friend, a phone booking." },
];

const typeOf = (b: Booking): EntryType => (b.kind !== "block" ? "guest" : b.tag === "closure" ? "close" : b.tag === "owner" ? "owner" : "room");

/** Existing bookings that clash with this entry (warns, never blocks — the owner decides). */
export function conflictsFor(e: Pick<Booking, "id" | "unit" | "start" | "end" | "slot" | "kind">, all: Booking[]) {
  const st = getSettings();
  const live = all.filter((b) => b.id !== e.id && isLive(b) && b.start < e.end && e.start < b.end);
  const out: Booking[] = [];
  for (const b of live) {
    if (e.unit === "estate" || b.unit === "estate") out.push(b);
    else if (e.unit === "hall" && b.unit === "hall" && (e.slot === "whole" || b.slot === "whole" || b.slot === e.slot)) out.push(b);
    else if (e.unit !== "hall" && b.unit === e.unit) {
      const cap = (st.units as any)[e.unit] ?? 1;
      const worst = eachNight(e.start > b.start ? e.start : b.start, (e.end < b.end ? e.end : b.end)).some(
        (n) => live.filter((x) => x.unit === e.unit && x.start <= n && n < x.end).length >= cap
      );
      if (worst) out.push(b);
    }
  }
  return Array.from(new Set(out));
}

export default function EntryForm({
  initial,
  date,
  all,
  onSave,
  onCancel,
}: {
  initial?: Booking;
  date?: string;
  all: Booking[];
  onSave: (b: Booking, isNew: boolean) => void;
  onCancel: () => void;
}) {
  const start0 = initial?.start || date || today();
  const [type, setType] = useState<EntryType>(initial ? typeOf(initial) : "close");
  const [picked, setPicked] = useState(!!initial); // new entries start with just the 4 choices
  const [unit, setUnit] = useState<UnitId>(initial?.unit || "estate");
  const [from, setFrom] = useState(start0);
  const [to, setTo] = useState(initial ? (initial.kind === "event" ? initial.start : addDays(initial.end, -1)) : start0); // last night / day, inclusive
  const [slot, setSlot] = useState<Slot>(initial?.slot || "whole");
  const [eventy, setEventy] = useState(initial?.kind === "event");
  const [name, setName] = useState(initial?.name && initial.kind === "block" ? initial.name : initial?.manual || initial?.kind !== "block" ? initial?.name || "" : "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [guests, setGuests] = useState(initial?.guests || 2);
  const [notes, setNotes] = useState(initial?.notes || "");

  const info = ENTRY_TYPES.find((t) => t.id === type)!;
  const isEvent = type === "guest" && eventy;
  const effUnit: UnitId = type === "close" || type === "owner" ? (unit === "estate" || initial ? unit : "estate") : unit;
  const lastDay = to < from ? from : to;
  const draft = {
    id: initial?.id || "",
    unit: effUnit,
    kind: (type === "guest" ? (isEvent ? "event" : "stay") : "block") as Booking["kind"],
    start: from,
    end: isEvent ? addDays(from, 1) : addDays(lastDay, 1),
    slot: effUnit === "hall" || isEvent ? (isEvent && effUnit === "estate" ? "whole" : slot) : undefined,
  };
  const clashes = useMemo(() => conflictsFor(draft as any, all), [effUnit, from, lastDay, slot, type, eventy, all]);
  const nights = isEvent ? 1 : Math.round((Date.parse(draft.end) - Date.parse(draft.start)) / 864e5);
  const needsName = type === "guest" ? name.trim().length > 1 : true;

  const save = () => {
    if (!needsName) return;
    const label = name.trim() || info.label;
    const b: Booking = {
      ...(initial || { id: (type === "guest" ? "man-" : "blk-") + Date.now().toString(36), ref: type === "guest" ? "MAN-" + Date.now().toString(36).slice(-5).toUpperCase() : "BLOCK", createdAt: new Date().toISOString() }),
      kind: draft.kind,
      unit: effUnit,
      start: draft.start,
      end: draft.end,
      slot: draft.slot,
      status: initial ? initial.status : "confirmed",
      name: label,
      phone: type === "guest" ? phone : "",
      guests: type === "guest" ? guests : 0,
      notes: notes || undefined,
      manual: initial ? initial.manual : type === "guest" ? true : undefined,
      tag: type === "close" ? "closure" : type === "owner" ? "owner" : type === "room" ? "maintenance" : undefined,
      eventType: isEvent ? initial?.eventType || "Special event" : undefined,
    } as Booking;
    onSave(b, !initial);
  };

  return (
    <div className="ad-entry">
      {!initial && (
        <>
        <h4 className="ad-step">{picked ? "1. What is this?" : "What do you want to do?"}</h4>
        <div className="ad-types" role="radiogroup" aria-label="What do you want to add?">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={picked && type === t.id}
              className={picked && type === t.id ? "on" : ""}
              onClick={() => {
                setType(t.id);
                setPicked(true);
                setUnit(t.id === "close" || t.id === "owner" ? "estate" : "private");
              }}
            >
              <b>{t.label}</b>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
        </>
      )}
      {picked && <>
      <h4 className="ad-step">{initial ? "Details" : "2. Pick the dates and details"}</h4>
      <div className="fields two">
        {(type !== "close") && (
          <label>
            <span className="label">{type === "owner" ? "Which part is in use" : type === "guest" ? "Room / venue" : "What to close"}</span>
            <Select value={unit} onChange={(e) => setUnit(e.target.value as UnitId)}>
              {(type === "owner" || type === "guest") && <option value="estate">Whole estate</option>}
              {STAYS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="hall">Function hall</option>
              {type === "room" && <option value="estate">Whole estate</option>}
            </Select>
          </label>
        )}
        {type === "guest" && (
          <label>
            <span className="label">Booking type</span>
            <Select value={eventy ? "event" : "stay"} onChange={(e) => setEventy(e.target.value === "event")}>
              <option value="stay">Overnight stay</option>
              <option value="event">Event (one day)</option>
            </Select>
          </label>
        )}
        <label>
          <span className="label">{isEvent ? "Date" : "First night / day"}</span>
          <DatePicker value={from} onChange={(e) => { if (!e.target.value) return; setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} />
        </label>
        {!isEvent && (
          <label>
            <span className="label">Last night / day</span>
            <DatePicker value={lastDay} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </label>
        )}
        {(effUnit === "hall" || (isEvent && effUnit === "hall")) && (
          <label>
            <span className="label">Hall time</span>
            <Select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              <option value="whole">Whole day</option>
              <option value="day">Daytime</option>
              <option value="evening">Evening</option>
            </Select>
          </label>
        )}
        <label>
          <span className="label">{type === "guest" ? "Guest name" : "Note (shown on the calendar)"}</span>
          <input value={name} placeholder={type === "guest" ? "e.g. Mayor's family" : type === "close" ? "e.g. Holy Week closure" : type === "owner" ? "e.g. Owner's anniversary" : "e.g. Aircon repair"} onChange={(e) => setName(e.target.value)} />
        </label>
        {type === "guest" && (
          <>
            <label>
              <span className="label">Mobile (optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              <span className="label">Guests</span>
              <input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} />
            </label>
          </>
        )}
      </div>
      <label className="ad-note">
        <span className="label">Private note (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <p className="muted small">
        {unitLabel(effUnit)} · {nights} {isEvent ? "day" : nights === 1 ? "night" : "nights"}
      </p>
      {clashes.length > 0 && (
        <div className="ad-warn">
          <b>
            {clashes.length} existing booking{clashes.length > 1 ? "s are" : " is"} already on these dates:
          </b>
          <ul>
            {clashes.slice(0, 6).map((c) => (
              <li key={c.id}>
                <b>{c.name}</b> — {unitLabel(c.unit)}, {fmtShort(c.start)} to {fmtShort(c.end)}
              </li>
            ))}
          </ul>
          <small>
            Saving will not move or cancel them. Guests who already booked keep their booking, so contact them yourself if they need to change.
          </small>
        </div>
      )}
      <div className="ad-act">
        <button className="btn btn-solid" disabled={!needsName} onClick={save}>
          <span>{initial ? "Save changes" : type === "guest" ? "Add booking" : "Block these dates"}</span>
        </button>
        <button className="btn" onClick={() => { if (!initial) setPicked(false); onCancel(); }}>
          <span>Cancel</span>
        </button>
      </div>
      </>}
    </div>
  );
}
