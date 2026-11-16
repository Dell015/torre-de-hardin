"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, initGsap, prefersReduced } from "@/lib/motion";

/** Lenis inertia scroll wired into GSAP's ticker so ScrollTrigger stays in sync. */
export default function SmoothScroll() {
  const path = usePathname();
  const admin = path?.startsWith("/admin");
  useEffect(() => {
    initGsap();
    if (prefersReduced() || admin) return; // admin uses normal native scrolling
    const lenis = new Lenis({
      duration: 1.35,
      // exponential ease-out: quick to respond, slow to settle
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    (window as any).__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete (window as any).__lenis;
    };
  }, [admin]);
  return null;
}
