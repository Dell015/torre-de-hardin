"use client";
import { useEffect, useRef } from "react";
import { gsap, initGsap, prefersReduced } from "@/lib/motion";

/** Opening curtain: the logo's tower is revealed from the ground up, then the curtain lifts onto the hero. */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initGsap();
    const el = root.current!;
    const html = document.documentElement;
    const seen = sessionStorage.getItem("tdj-seen") === "1";
    html.classList.add("is-loading");

    const finish = () => {
      html.classList.remove("is-loading");
      (window as any).__tdjReady = true;
      window.dispatchEvent(new Event("tdj:ready"));
      sessionStorage.setItem("tdj-seen", "1");
    };
    if (prefersReduced()) {
      el.style.display = "none";
      finish();
      return;
    }

    const k = seen ? 0.45 : 1;
    const intro = gsap.timeline();
    intro
      .fromTo(
        ".pl-mark",
        { clipPath: "inset(100% 0 0 0)", y: 24 },
        { clipPath: "inset(0% 0 0 0)", y: 0, duration: 2.0 * k, ease: "power3.out" },
        0
      )
      .fromTo(".pl-word span", { yPercent: 115 }, { yPercent: 0, duration: 1.5 * k, stagger: 0.09, ease: "expo.out" }, 0.55 * k)
      .fromTo(".pl-sub", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.3 * k }, 1.0 * k)
      .fromTo(".pl-bar i", { scaleX: 0 }, { scaleX: 1, duration: 2.1 * k, ease: "power2.inOut" }, 0);

    const heroImg = document.getElementById("hero-img") as HTMLImageElement | null;
    const imgReady = new Promise<void>((res) => {
      if (!heroImg || heroImg.complete) return res();
      heroImg.addEventListener("load", () => res(), { once: true });
      heroImg.addEventListener("error", () => res(), { once: true });
      setTimeout(res, 4000);
    });

    let cancelled = false;
    Promise.all([new Promise<void>((r) => intro.eventCallback("onComplete", () => r())), imgReady]).then(() => {
      if (cancelled) return;
      const out = gsap.timeline({ onComplete: () => (el.style.display = "none") });
      out
        .to(".pl-center", { yPercent: -12, opacity: 0, duration: 0.9, ease: "power3.out" }, 0)
        // fast to slow: the curtain leaves quickly, then eases to rest
        .to(el, { yPercent: -100, duration: 1.7, ease: "expo.out" }, 0.15)
        .call(finish, [], 0.5);
    });

    return () => {
      cancelled = true;
      intro.kill();
    };
  }, []);

  return (
    <div className="pl" ref={root} aria-hidden>
      <div className="pl-center">
        <img className="pl-mark" src="/brand/logo-mark-ivory.png" alt="" />
        <p className="pl-word">
          <span>Torre</span> <span>de</span> <span>Jardin</span>
        </p>
        <p className="pl-sub">Naguilian · Isabela</p>
      </div>
      <div className="pl-bar">
        <i />
      </div>
      <noscript>
        <style>{`.pl{display:none!important}[data-reveal]{opacity:1!important}[data-lines]{visibility:visible!important}`}</style>
      </noscript>
    </div>
  );
}
