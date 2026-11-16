"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap, initGsap, scrollToId, lockScroll, ScrollTrigger } from "@/lib/motion";
import { RESORT } from "@/lib/data";
import { useBooking } from "./BookingProvider";

const LINKS = [
  { id: "estate", no: "I", label: "The Estate" },
  { id: "day", no: "II", label: "A Day Here" },
  { id: "stay", no: "III", label: "Stay" },
  { id: "gather", no: "IV", label: "Gather" },
  { id: "album", no: "V", label: "The Album" },
  { id: "visit", no: "VI", label: "Visit" },
];

export default function Header() {
  const path = usePathname();
  if (path?.startsWith("/admin")) return null;
  return <SiteHeader />;
}

function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const { openBooking } = useBooking();
  const [menu, setMenu] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>();

  /* menu choreography */
  useEffect(() => {
    initGsap();
    const el = panel.current!;
    gsap.set(el, { clipPath: "inset(0 0 100% 0)", visibility: "hidden" });
    const t = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    t.set(el, { visibility: "visible" })
      .to(el, { clipPath: "inset(0 0 0% 0)", duration: 1.3 }, 0)
      .fromTo(".mn-link span", { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: 0.07 }, 0.18)
      .fromTo(".mn-foot > *", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: 0.06 }, 0.5)
      .fromTo(".mn-art", { opacity: 0, scale: 1.06 }, { opacity: 0.09, scale: 1, duration: 1.8 }, 0.2);
    tl.current = t;
    return () => {
      t.kill();
    };
  }, []);

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (menu) {
      lockScroll(true);
      t.timeScale(1).play();
    } else {
      t.timeScale(1.9).reverse();
      const done = setTimeout(() => lockScroll(false), 400);
      return () => clearTimeout(done);
    }
  }, [menu]);

  /* hide on scroll down, show on up; flip colour over dark sections */
  useEffect(() => {
    initGsap();
    const el = bar.current!;
    let last = 0;
    let raf = 0;
    // Which dark section sits under the header? getBoundingClientRect is pin-aware, unlike precomputed triggers.
    const update = () => {
      const y = window.scrollY;
      const hide = y > last && y > 240 && !menu;
      el.classList.toggle("is-hidden", hide);
      el.classList.toggle("is-solid", y > 80);
      last = y;
      const darks = document.querySelectorAll<HTMLElement>("[data-dark]");
      let over = "light";
      darks.forEach((d) => {
        const r = d.getBoundingClientRect();
        if (r.top <= 36 && r.bottom >= 36) over = "dark";
      });
      if (el.dataset.over !== over) el.dataset.over = over;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname, menu]);

  useEffect(() => {
    const onReady = () => {
      gsap.fromTo(bar.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1.4, delay: 0.4 });
    };
    if ((window as any).__tdjReady) onReady();
    else {
      gsap.set(bar.current, { opacity: 0 });
      window.addEventListener("tdj:ready", onReady, { once: true });
    }
    return () => window.removeEventListener("tdj:ready", onReady);
  }, []);

  const go = (id: string) => {
    setMenu(false);
    if (home) setTimeout(() => scrollToId(id), 450);
  };

  return (
    <>
      <header className={"hdr" + (menu ? " menu-open" : "")} ref={bar} data-over="dark">
        <Link href="/" className="hdr-brand" onClick={() => setMenu(false)} aria-label="Torre de Jardin — home">
          <img src="/brand/logo-mark-ink.png" alt="" className="b-ink" />
          <img src="/brand/logo-mark-ivory.png" alt="" className="b-ivory" />
          <span>Torre de Jardin</span>
        </Link>
        <div className="hdr-right">
          <button className="hdr-reserve" onClick={() => openBooking()}>
            <span>Reserve</span>
          </button>
          <button className="hdr-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu">
            <span className="mn-label">{menu ? "Close" : "Menu"}</span>
            <i />
            <i />
          </button>
        </div>
      </header>

      <div className="mn" ref={panel} data-lenis-prevent>
        <img className="mn-art" src="/brand/logo-mark-ivory.png" alt="" />
        <nav className="mn-nav">
          {LINKS.map((l) =>
            home ? (
              <a key={l.id} className="mn-link" href={`#${l.id}`} onClick={(e) => (e.preventDefault(), go(l.id))}>
                <span>
                  <sup>{l.no}</sup>
                  {l.label}
                </span>
              </a>
            ) : (
              <Link key={l.id} className="mn-link" href={`/#${l.id}`} onClick={() => setMenu(false)}>
                <span>
                  <sup>{l.no}</sup>
                  {l.label}
                </span>
              </Link>
            )
          )}
        </nav>
        <div className="mn-foot">
          <button
            className="btn btn-ivory"
            onClick={() => {
              setMenu(false);
              setTimeout(() => openBooking(), 500);
            }}
          >
            <span>Reserve a date</span>
          </button>
          <div>
            <span className="label">Call</span>
            {RESORT.phones.map((p) => (
              <a key={p.tel} href={`tel:${p.tel}`}>
                {p.label}
              </a>
            ))}
          </div>
          <div>
            <span className="label">Follow</span>
            <a href={RESORT.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href={RESORT.messenger} target="_blank" rel="noreferrer">
              Messenger
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
