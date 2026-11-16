"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { useSettings } from "@/lib/settings";
import { logAction } from "@/lib/adminlog";
import Dashboard from "./Dashboard";
import Bookings from "./Bookings";
import Rates from "./Rates";
import Settings from "./Settings";

const TABS = [
  ["dash", "Overview"],
  ["book", "Bookings"],
  ["rates", "Rates & rooms"],
  ["set", "Settings"],
] as const;
const AUTH = "tdj.admin.ok";

export default function AdminApp() {
  const { s } = useSettings();
  const api = useBookings();
  const [ok, setOk] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);
  const [tab, setTab] = useState<string>("dash");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setOk(sessionStorage.getItem(AUTH) === "1");
    } catch {
      setOk(false);
    }
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === s.pin) {
      try {
        sessionStorage.setItem(AUTH, "1");
      } catch {}
      logAction("Signed in");
      setOk(true);
    } else {
      setBad(true);
      setPin("");
    }
  };
  const out = () => {
    try {
      sessionStorage.removeItem(AUTH);
    } catch {}
    setOk(false);
  };
  const go = (t: string) => {
    const [a, f] = t.split(":");
    setTab(a);
    setFilter(f || "all");
    setOpenId(null);
  };
  const openBooking = (id: string) => {
    setTab("book");
    setOpenId(id);
  };

  if (ok === null) return <div className="admin" />;

  if (!ok)
    return (
      <div className="admin">
        <div className="wrap ad-login">
          <div className="chap">
            <span className="chap-no">∗</span>
            <span className="label">Owners only</span>
            <span className="rule" />
          </div>
          <h1 className="h2">
            The owners' <em>desk.</em>
          </h1>
          <form onSubmit={login}>
            <label>
              <span className="label">PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setBad(false);
                }}
              />
            </label>
            {bad && <p className="ad-err">That PIN is not right.</p>}
            <div className="row">
              <button className="btn btn-solid" type="submit">
                <span>Enter</span>
              </button>
              <Link className="btn" href="/">
                <span>Back to site</span>
              </Link>
            </div>
            <p className="muted small">Demo PIN: <b>1234</b>. The live version uses a private account login.</p>
          </form>
        </div>
      </div>
    );

  return (
    <div className="admin">
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
            <Link className="link small" href="/">
              <span>View site</span>
            </Link>
            <button className="link small" onClick={out}>
              <span>Sign out</span>
            </button>
          </div>
        </div>

        <nav className="ad-tabs" aria-label="Admin sections">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => go(k)}>
              {l}
              {k === "book" && api.mine.some((b) => b.status === "pending") && <i className="dot" />}
            </button>
          ))}
        </nav>

        {tab === "dash" && <Dashboard all={api.all} open={openBooking} go={go} />}
        {tab === "book" && <Bookings api={api} initialFilter={filter} openId={openId} onClose={() => setOpenId(null)} />}
        {tab === "rates" && <Rates all={api.all} add={api.add} remove={api.remove} />}
        {tab === "set" && <Settings all={api.all} mine={api.mine.filter((b) => b.kind !== "block")} clear={api.clear} />}
      </div>
    </div>
  );
}
