"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let ready = false;
export function initGsap() {
  if (ready || typeof window === "undefined") return gsap;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "expo.out" });
  ready = true;
  return gsap;
}

export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function getLenis(): any {
  return typeof window !== "undefined" ? (window as any).__lenis : undefined;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: "smooth" });
}

let locks = 0;
export function lockScroll(on: boolean) {
  locks = Math.max(0, locks + (on ? 1 : -1));
  const lenis = getLenis();
  const html = document.documentElement;
  if (locks > 0) {
    lenis?.stop();
    html.classList.add("no-scroll");
  } else {
    lenis?.start();
    html.classList.remove("no-scroll");
  }
}

export { gsap, ScrollTrigger };
