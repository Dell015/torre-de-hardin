"use client";
import { useRef, useState } from "react";
import { today, unitLabel, type Booking } from "@/lib/bookings";
import { logAction } from "@/lib/adminlog";
import EntryForm, { ENTRY_TYPES } from "./EntryForm";
import Timeline from "./Timeline";
import { ConfirmLink, dateLine } from "./shared";

const kindLabel = (b: Booking) =>
  b.kind === "block" ? ENTRY_TYPES.find((t) => t.id === (b.tag === "closure" ? "close" : b.tag === "owner" ? "owner" : "room"))!.label : b.kind === "event" ? "Special guest · event" : "Special guest · stay";

export default function Manager({ all, date, open, update, onSave, remove }: { all: Booking[]; date?: string; open: (id: string) => void; update: (id: string, patch: Partial<Booking>, label?: string) => void; onSave: (b: Booking, isNew: boolean) => void; remove: (id: string) => void }) {
  const [formKey, setFormKey] = useState(0);
  const [pick, setPick] = useState<string | undefined>(date);
  const [formOpen, setFormOpen] = useState(!!date);
  const [edit, setEdit] = useState<Booking | null>(null);
  const [showPast, setShowPast] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const t = today();
  const showForm = formOpen || !!edit;
  const reveal = () => setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  const mine = all
    .filter((b) => b.kind === "block" || b.manual)
    .filter((b) => showPast || b.end > t)
    .sort((a, b) => (a.start < b.start ? -1 : 1));

  const del = (b: Booking) => {
    remove(b.id);
    logAction(b.kind === "block" ? `Reopened dates: ${b.name} · ${unitLabel(b.unit)} · ${b.start} → ${b.end}` : `Removed manager booking ${b.ref} · ${b.name}`, "calendar", { ref: b.ref });
  };

  return (
    <div className="ad-pane">
      <p className="muted" style={{ marginTop: 0 }}>Every room and facility on one timeline. Tap a booking to manage it, or tap an empty day to see what is free and add something.</p>
      <Timeline
        all={all}
        open={open}
        update={update}
        onAdd={(d) => {
          setEdit(null);
          setPick(d);
          setFormKey((k) => k + 1);
          setFormOpen(true);
          reveal();
        }}
      />

      <div ref={formRef} className="tl-form">
        {showForm ? (
          <>
            <h3 className="ad-h">{edit ? "Edit entry" : "New entry"}</h3>
            <p className="muted">Things only you can put on the calendar: closing the resort, owner events, a room out of service, or a booking you take yourself (VIP, walk-in, phone call).</p>
            <EntryForm
              key={edit ? edit.id : "new" + formKey + (pick || "")}
              initial={edit || undefined}
              date={pick}
              all={all}
              onCancel={() => { setEdit(null); setFormOpen(false); }}
              onSave={(b, n) => {
                onSave(b, n);
                setEdit(null);
                setFormOpen(false);
                setFormKey((k) => k + 1);
              }}
            />
          </>
        ) : (
          <div className="ad-act">
            <button className="btn btn-solid" onClick={() => { setPick(undefined); setFormOpen(true); reveal(); }}>
              <span>+ Close dates or add a special booking</span>
            </button>
          </div>
        )}
      </div>

      <h3 className="ad-h">Your entries · {mine.length}</h3>
      <div className="ad-filter small">
        <button className={!showPast ? "on" : ""} onClick={() => setShowPast(false)}>Current & upcoming</button>
        <button className={showPast ? "on" : ""} onClick={() => setShowPast(true)}>Include past</button>
      </div>
      {mine.length === 0 ? (
        <p className="ad-empty-s">Nothing here yet. Closures and special bookings you add will be listed.</p>
      ) : (
        <ul className="ad-list">
          {mine.map((b) => (
            <li key={b.id} className="ad-blk">
              <span>
                <span className="label">{kindLabel(b)}</span>
                <b>{b.name}</b>
                <small>
                  {unitLabel(b.unit)} · {dateLine(b)}
                </small>
              </span>
              <span className="ad-act">
                <button className="btn" onClick={() => { setEdit(b); reveal(); }}>
                  <span>Edit</span>
                </button>
                <ConfirmLink label={b.kind === "block" ? "Reopen dates" : "Remove"} yes={b.kind === "block" ? "Yes, reopen" : "Yes, remove"} onConfirm={() => del(b)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
