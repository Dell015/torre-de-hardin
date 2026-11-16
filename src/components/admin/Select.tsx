"use client";
import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";

interface Opt {
  value: string;
  label: string;
  group?: string;
}

/** Walk <option>/<optgroup> children (also inside arrays/fragments) into a flat list. */
function parse(children: ReactNode, group?: string, out: Opt[] = []): Opt[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<any>;
    if (el.type === "optgroup") parse(el.props.children, el.props.label, out);
    else if (el.type === "option") {
      const label = Children.toArray(el.props.children).join("");
      out.push({ value: String(el.props.value ?? label), label, group });
    } else if (el.props?.children) parse(el.props.children, group, out);
  });
  return out;
}

/**
 * Drop-in replacement for <select>: same props/children, but with a styled list.
 * onChange receives { target: { value } } like a normal change event.
 */
export default function Select({
  value,
  onChange,
  children,
  className = "",
  ...rest
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  [k: string]: any;
}) {
  const opts = useMemo(() => parse(children), [children]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, up: false, max: 288 });
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const cur = opts.find((o) => o.value === String(value));

  const place = () => {
    const r = btn.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    setPos({ top: up ? r.top : r.bottom, left: r.left, width: r.width, up, max: Math.min(320, up ? above : below) });
  };
  const show = () => {
    setActive(Math.max(0, opts.findIndex((o) => o.value === String(value))));
    place();
    setOpen(true);
  };
  const pick = (o: Opt) => {
    onChange({ target: { value: o.value } });
    setOpen(false);
    btn.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", away);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const key = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(opts.length - 1, a + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), opts[active] && pick(opts[active]));
    else if (e.key === "Tab") setOpen(false);
  };

  let lastGroup: string | undefined;
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={"sel " + className}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={key}
        {...rest}
      >
        <span>{cur?.label ?? "Select…"}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden>
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          role="listbox"
          className="sel-list"
          style={{ left: pos.left, width: pos.width, maxHeight: pos.max, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}
        >
          {opts.map((o, i) => {
            const head = o.group && o.group !== lastGroup ? <li key={"g" + o.group} className="sel-group" role="presentation">{o.group}</li> : null;
            lastGroup = o.group;
            return (
              <span key={o.value + i} style={{ display: "contents" }}>
                {head}
                <li
                  role="option"
                  aria-selected={o.value === String(value)}
                  data-active={i === active}
                  className={"sel-opt" + (o.value === String(value) ? " on" : "") + (i === active ? " act" : "")}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                >
                  <span>{o.label}</span>
                  {o.value === String(value) && (
                    <svg width="14" height="11" viewBox="0 0 14 11" aria-hidden>
                      <path d="M1 5.5l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </li>
              </span>
            );
          })}
        </ul>
      )}
    </>
  );
}
