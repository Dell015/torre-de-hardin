"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RESORT } from "@/lib/data";
import { useBooking } from "./BookingProvider";

/** Mobile-first sticky bar: always one tap from booking or calling. */
export default function ReserveBar() {
  const { openBooking, open } = useBooking();
  const [show, setShow] = useState(false);
  const path = usePathname();
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const foot = document.getElementById("footer");
        const nearFoot = foot ? foot.getBoundingClientRect().top < window.innerHeight * 0.6 : false;
        setShow(y > window.innerHeight * 0.75 && !nearFoot);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (path?.startsWith("/admin")) return null;
  return (
    <div className={"rbar" + (show && !open ? " on" : "")}>
      <button className="rbar-main" onClick={() => openBooking()}>
        <span>Check availability</span>
        <svg width="26" height="10" viewBox="0 0 26 10" fill="none" stroke="currentColor">
          <path d="M0 5h25M21 1l4 4-4 4" />
        </svg>
      </button>
      <a className="rbar-call" href={`tel:${RESORT.phones[0].tel}`} aria-label="Call the resort">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
        </svg>
      </a>
    </div>
  );
}
