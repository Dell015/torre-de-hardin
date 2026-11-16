"use client";
import Select from "./Select";
import { useState } from "react";
import { today, type Booking } from "@/lib/bookings";
import { logAction } from "@/lib/adminlog";
import { describe, saveVouchers, useVouchers, usesOf, type Voucher } from "@/lib/vouchers";
import { download, buildXlsx } from "@/lib/xlsx";
import { snap } from "@/lib/history";
import { ConfirmLink } from "./shared";
import DatePicker from "./DatePicker";

const blank = { code: "", kind: "percent" as Voucher["kind"], value: 10, appliesTo: "all" as Voucher["appliesTo"], from: "", until: "", maxUses: "", note: "" };

export default function Vouchers({ all }: { all: Booking[] }) {
  const list = useVouchers();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<string | null>(null);

  const genCode = () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    setF({ ...f, code: Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join("") });
  };
  const save = () => {
    const code = f.code.trim().toUpperCase().replace(/\s+/g, "");
    if (code.length < 3) return setErr("Code needs at least 3 characters.");
    if (list.some((v) => v.code === code && v.id !== edit)) return setErr("That code already exists.");
    if (!(f.value > 0) || (f.kind === "percent" && f.value > 100)) return setErr(f.kind === "percent" ? "Percent must be 1–100." : "Enter an amount above 0.");
    if (f.from && f.until && f.until < f.from) return setErr("Valid-until is before valid-from.");
    const v: Voucher = {
      id: edit || "v-" + Date.now().toString(36),
      code,
      kind: f.kind,
      value: Number(f.value),
      appliesTo: f.appliesTo,
      from: f.from || undefined,
      until: f.until || undefined,
      maxUses: f.maxUses ? Math.max(1, Number(f.maxUses)) : undefined,
      active: edit ? list.find((x) => x.id === edit)?.active ?? true : true,
      note: f.note || undefined,
      createdAt: edit ? list.find((x) => x.id === edit)!.createdAt : new Date().toISOString(),
    };
    snap(`${edit ? "Edited" : "Created"} voucher ${code}`);
    saveVouchers(edit ? list.map((x) => (x.id === edit ? v : x)) : [v, ...list]);
    logAction(`${edit ? "Edited" : "Created"} voucher ${code} (${describe(v)})`, "voucher");
    setF(blank);
    setEdit(null);
    setErr("");
  };
  const toggle = (v: Voucher) => {
    snap(`${v.active ? "Turned off" : "Turned on"} voucher ${v.code}`);
    saveVouchers(list.map((x) => (x.id === v.id ? { ...x, active: !x.active } : x)));
    logAction(`${v.active ? "Turned off" : "Turned on"} voucher ${v.code}`, "voucher");
  };
  const del = (v: Voucher) => {
    snap(`Deleted voucher ${v.code}`);
    saveVouchers(list.filter((x) => x.id !== v.id));
    logAction(`Deleted voucher ${v.code}`, "voucher");
  };
  const startEdit = (v: Voucher) => {
    setEdit(v.id);
    setF({ code: v.code, kind: v.kind, value: v.value, appliesTo: v.appliesTo, from: v.from || "", until: v.until || "", maxUses: v.maxUses ? String(v.maxUses) : "", note: v.note || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const exportUses = () => {
    const rows: (string | number)[][] = [["Voucher", "Discount", "Booking ref", "Guest", "Status", "Amount taken off (PHP)", "Booked on"]];
    all.filter((b) => b.voucher).forEach((b) => rows.push([b.voucher!, b.discountLabel || "", b.ref, b.name, b.status, b.discount || 0, b.createdAt.slice(0, 10)]));
    download(buildXlsx([{ name: "Voucher use", rows }]), `torre-de-jardin-vouchers-${today()}.xlsx`);
  };

  return (
    <div className="ad-pane">
      <h3 className="ad-h" style={{ marginTop: 0 }}>{edit ? "Edit voucher" : "New voucher"}</h3>
      <p className="muted">Guests type the code on the last step of the booking form. Use it for discounts you give to specific people or promos.</p>
      <div className="fields two">
        <label>
          <span className="label">Code</span>
          <span className="voucher-row">
            <input value={f.code} placeholder="e.g. KUMARE10" onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
            <button type="button" className="btn" onClick={genCode}>
              <span>Random</span>
            </button>
          </span>
        </label>
        <label>
          <span className="label">Discount type</span>
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as any })}>
            <option value="percent">Percent off (%)</option>
            <option value="fixed">Fixed amount off (PHP)</option>
          </Select>
        </label>
        <label>
          <span className="label">{f.kind === "percent" ? "Percent" : "Amount (PHP)"}</span>
          <input type="number" min={1} value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} />
        </label>
        <label>
          <span className="label">Works for</span>
          <Select value={f.appliesTo} onChange={(e) => setF({ ...f, appliesTo: e.target.value as any })}>
            <option value="all">Stays and events</option>
            <option value="stay">Stays only</option>
            <option value="event">Events only</option>
          </Select>
        </label>
        <label>
          <span className="label">Can be used from (optional)</span>
          <DatePicker value={f.from} clearable placeholder="No start date" onChange={(e) => setF({ ...f, from: e.target.value })} />
        </label>
        <label>
          <span className="label">Expires after (optional)</span>
          <DatePicker value={f.until} clearable placeholder="No end date" min={f.from || undefined} onChange={(e) => setF({ ...f, until: e.target.value })} />
        </label>
        <label>
          <span className="label">Max number of uses (blank = unlimited)</span>
          <input type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} />
        </label>
        <label>
          <span className="label">Private note (who is it for?)</span>
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </label>
      </div>
      {err && <p className="ad-err">{err}</p>}
      <div className="row">
        <button className="btn btn-solid" onClick={save}>
          <span>{edit ? "Save voucher" : "Create voucher"}</span>
        </button>
        {edit && (
          <button className="btn" onClick={() => { setEdit(null); setF(blank); setErr(""); }}>
            <span>Cancel</span>
          </button>
        )}
      </div>

      <h3 className="ad-h">All vouchers · {list.length}</h3>
      {list.length === 0 ? (
        <p className="muted">No vouchers yet.</p>
      ) : (
        <ul className="ad-list">
          {list.map((v) => {
            const used = usesOf(v.code, all);
            const expired = !!v.until && today() > v.until;
            const spent = !!v.maxUses && used >= v.maxUses;
            return (
              <li key={v.id} className="ad-voucher">
                <div>
                  <b className="code">{v.code}</b>
                  <span className={"ad-tag " + (!v.active || expired || spent ? "full" : "")}>{!v.active ? "Off" : expired ? "Expired" : spent ? "Used up" : "Active"}</span>
                  <small>
                    {describe(v)} · {v.appliesTo === "all" ? "stays & events" : v.appliesTo === "stay" ? "stays only" : "events only"} · used {used}
                    {v.maxUses ? `/${v.maxUses}` : ""}
                    {v.from || v.until ? ` · ${v.from || "…"} → ${v.until || "…"}` : ""}
                    {v.note ? ` · ${v.note}` : ""}
                  </small>
                </div>
                <div className="ad-act">
                  <button className="btn" onClick={() => startEdit(v)}>
                    <span>Edit</span>
                  </button>
                  <button className="btn" onClick={() => toggle(v)}>
                    <span>{v.active ? "Turn off" : "Turn on"}</span>
                  </button>
                  <ConfirmLink label="Delete" yes="Yes, delete voucher" onConfirm={() => del(v)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {all.some((b) => b.voucher) && (
        <div className="row">
          <button className="btn" onClick={exportUses}>
            <span>Export voucher use (Excel)</span>
          </button>
        </div>
      )}
    </div>
  );
}
