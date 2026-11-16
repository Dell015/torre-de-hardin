"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, logout, type Session } from "@/lib/auth";
import { useBookings } from "@/lib/bookings";
import { restore, snap, useHistory } from "@/lib/history";
import { logAction } from "@/lib/adminlog";
import Dashboard from "./Dashboard";
import Bookings from "./Bookings";
import Rates from "./Rates";
import Settings from "./Settings";
import Vouchers from "./Vouchers";
import Audit from "./Audit";
import Income from "./Income";
import Manager from "./Manager";
import { unitLabel, type Booking } from "@/lib/bookings";

const TABS = [
  ["dash", "Overview"],
  ["book", "Bookings"],
  ["mgr", "Manager's booking"],
  ["money", "Income"],
  ["vouch", "Vouchers"],
  ["rates", "Rates & deposits"],
  ["audit", "Audit log"],
  ["set", "Settings"],
] as const;

const PRIMARY: string[] = ["dash", "book", "mgr"];
const ic = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const ICONS: Record<string, React.ReactNode> = {
  dash: ic("M3 11l9-8 9 8M5 10v10h14V10"),
  book: ic("M4 5h16v14H4zM4 10h16M9 5v14"),
  mgr: ic("M4 6h16v14H4zM4 11h16M8 3v5M16 3v5"),
  money: ic("M4 19h16M6 16V9M11 16V5M16 16v-5M20 16V8"),
  vouch: ic("M3 8a2 2 0 0 0 0 8v2h18v-2a2 2 0 0 1 0-8V6H3zM14 6v12"),
  rates: ic("M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8"),
  audit: ic("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"),
  set: ic("M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"),
  more: ic("M5 12h.01M12 12h.01M19 12h.01"),
};

export default function AdminApp() {
  const base = useBookings();
  const hist = useHistory();
  const api = {
    ...base,
    add: (b: Booking) => (snap(`Added ${b.name}`), base.add(b)),
    update: (id: string, patch: Partial<Booking>, label?: string) => {
      const b = base.all.find((x) => x.id === id);
      snap(label || `Edited ${b?.ref || ""} ${b?.name || ""}`.trim());
      base.update(id, patch);
    },
    setStatus: base.setStatus,
    remove: (id: string) => {
      const b = base.all.find((x) => x.id === id);
      snap(`Removed ${b?.ref !== "BLOCK" ? b?.ref : "calendar entry"} ${b?.name || ""}`.trim());
      base.remove(id);
    },
    clear: base.clear,
  };
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const top = hist[0];
    if (!top || Date.now() - Date.parse(top.t) > 4000) return;
    setToast(top.id);
    const t = setTimeout(() => setToast(null), 12000);
    return () => clearTimeout(t);
  }, [hist[0]?.id]);
  const router = useRouter();
  const [me, setMe] = useState<Session | null>(null);
  const [tab, setTab] = useState<string>("dash");
  const [more, setMore] = useState(false);
  const [ask, setAsk] = useState(false);
  const [undoAsk, setUndoAskRaw] = useState(false);
  const setUndoAsk = (v: boolean) => { if (v) setToast(null); setUndoAskRaw(v); };
  const waiting = base.mine.some((b) => b.status === "pending" || b.cancelRequest?.state === "requested");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const m = getSession();
    if (!m) router.replace("/admin/login");
    else setMe(m);
  }, [router]);

  const out = () => {
    logAction(`${me?.role || "User"} signed out`, "login");
    logout();
    router.replace("/admin/login");
  };
  const go = (t: string) => {
    const [a, f] = t.split(":");
    setTab(a);
    setFilter(f || "all");
    setOpenId(null);
  };
  const saveEntry = (b: Booking, isNew: boolean) => {
    const what = b.kind === "block" ? (b.tag === "closure" ? "Closed resort" : b.tag === "owner" ? "Owner's event" : "Closed") : b.kind === "event" ? "Event booking" : "Stay booking";
    if (isNew) api.add(b);
    else api.update(b.id, b);
    logAction(`${isNew ? "Added" : "Edited"} calendar entry: ${what} · ${unitLabel(b.unit)} · ${b.start} → ${b.end}${b.name ? ` (${b.name})` : ""}`, "calendar", { ref: b.ref });
  };
  const [mgrDate, setMgrDate] = useState<string | undefined>();
  const addOn = (d: string) => {
    setMgrDate(d);
    setTab("mgr");
  };
  const openBooking = (id: string) => {
    setTab("book");
    setOpenId(id);
  };

  if (!me) return <div className="admin" />;

  return (
    <div className="admin">
      <nav className="ad-nav" aria-label="Admin sections">
        <div className="ad-nav-brand">Torre de Jardin<small>Admin</small></div>
        {TABS.map(([k, l]) => (
          <button key={k} className={(tab === k ? "on " : "") + (PRIMARY.includes(k) ? "pri" : "sec")} onClick={() => { go(k); setMore(false); }}>
            <span className="ad-ic" aria-hidden>{ICONS[k]}</span>
            <span className="ad-nl">{l}</span>
            {k === "book" && waiting && <i className="dot" />}
          </button>
        ))}
        <div className="ad-nav-foot">
          <span className="ad-me">{me.role}</span>
          <Link className="ad-nav-link" href="/">View site</Link>
          {hist[0] && <button className="ad-nav-link" onClick={() => setUndoAsk(true)} title={hist[0].label}>Undo last change</button>}
          <button className="ad-nav-link" onClick={() => setAsk(true)}>Sign out</button>
        </div>
      </nav>
      {undoAsk && hist[0] && (
        <div className="ad-modal" onClick={() => setUndoAsk(false)}>
          <div className="ad-modal-box" role="alertdialog" aria-label="Undo last change" onClick={(e) => e.stopPropagation()}>
            <h3>Undo this change?</h3>
            <p className="ad-undo-what"><b>{hist[0].label}</b><small>{new Date(hist[0].t).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</small></p>
            <p>Everything goes back to how it was just before this. It is saved in the activity log.</p>
            <div>
              <button className="btn btn-solid" onClick={() => { restore(hist[0].id); setUndoAsk(false); setToast(null); }}><span>Yes, undo it</span></button>
              <button className="btn" onClick={() => setUndoAsk(false)}><span>Keep it</span></button>
            </div>
          </div>
        </div>
      )}
      {ask && (
        <div className="ad-modal" onClick={() => setAsk(false)}>
          <div className="ad-modal-box" role="alertdialog" aria-label="Sign out" onClick={(e) => e.stopPropagation()}>
            <h3>Sign out?</h3>
            <p>You will need to log in again to open the admin.</p>
            <div>
              <button className="btn btn-solid" onClick={() => { setAsk(false); out(); }}><span>Yes, sign out</span></button>
              <button className="btn" onClick={() => setAsk(false)}><span>Stay signed in</span></button>
            </div>
          </div>
        </div>
      )}
      <header className="ad-bar">
        <span className="ad-bar-brand">Torre de Jardin <small>Admin</small></span>
        <button className="ad-burger" onClick={() => setMore(true)} aria-label="Open menu">
          <span>Menu</span><s className="ad-ico" />
          {waiting && <b className="dot" />}
        </button>
      </header>
      {more && (
        <div className="ad-menu" role="dialog" aria-label="Admin menu">
          <div className="ad-menu-top">
            <span className="ad-bar-brand">Torre de Jardin <small>Admin</small></span>
            <button className="ad-burger on" onClick={() => setMore(false)} aria-label="Close menu"><span>Close</span><s className="ad-ico" /></button>
          </div>
          <div className="ad-menu-list">
            {TABS.map(([k, l], n) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => { go(k); setMore(false); }}>
                <em>{String(n + 1).padStart(2, "0")}</em>
                <span>{l}</span>
                {k === "book" && waiting && <i className="dot" />}
              </button>
            ))}
          </div>
          <div className="ad-menu-foot">
            <span className="ad-me">{me.role}</span>
            <Link className="link small" href="/"><span>View site</span></Link>
            {hist[0] && <button className="link small" onClick={() => { setMore(false); setUndoAsk(true); }}><span>Undo last change</span></button>}
            <button className="link small" onClick={() => setAsk(true)}><span>Sign out</span></button>
          </div>
        </div>
      )}
      <div className="wrap">
        <div className="ad-top">
          <div>
            <div className="chap">
              <span className="chap-no">∗</span>
              <span className="label">Owners' desk · demo</span>
              <span className="rule" />
            </div>
            <h1 className="h2">
              {TABS.find((t) => t[0] === tab)![1]}
              <em>.</em>
            </h1>
          </div>
          <div className="ad-top-r">
            <span className="ad-me">{me.role}</span>
            <Link className="link small" href="/">
              <span>View site</span>
            </Link>
            {hist[0] && (
              <button className="link small" onClick={() => setUndoAsk(true)} title={hist[0].label}>
                <span>Undo last change</span>
              </button>
            )}
            <button className="link small" onClick={() => setAsk(true)}>
              <span>Sign out</span>
            </button>
          </div>
        </div>


        {toast && hist[0] && hist[0].id === toast && createPortal(
          <div className="ad-toast" role="status">
            <div className="ad-toast-t">
              <b>Done</b>
              <span>{hist[0].label}</span>
            </div>
            <button className="ad-toast-undo" onClick={() => { restore(hist[0].id); setToast(null); }}>Undo</button>
            <button className="ad-toast-x" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
          </div>,
          document.body
        )}
        {tab === "dash" && <Dashboard all={api.all} open={openBooking} go={go} onAdd={addOn} update={api.update} />}
        {tab === "book" && <Bookings api={api} initialFilter={filter} openId={openId} onClose={() => setOpenId(null)} onSave={saveEntry} />}
        {tab === "mgr" && <Manager all={api.all} date={mgrDate} onSave={saveEntry} remove={api.remove} />}
        {tab === "money" && <Income all={api.all} open={(id) => { setTab("book"); setFilter("all"); setOpenId(id); }} />}
        {tab === "vouch" && <Vouchers all={api.all} />}
        {tab === "audit" && <Audit all={api.all} />}
        {tab === "rates" && <Rates />}
        {tab === "set" && <Settings all={api.all} mine={api.mine.filter((b) => b.kind !== "block")} clear={api.clear} />}
      </div>
    </div>
  );
}
