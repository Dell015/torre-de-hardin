"use client";
import { useEffect, useRef } from "react";
import { gsap, initGsap, prefersReduced } from "@/lib/motion";

/** Opening curtain: the logo's tower is revealed from the ground up, then the curtain lifts onto the hero. */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    // The mark grows from the roots upward: each pixel has a "growth time" (low and central first,
    // outer branches and tips last) and fades in as the growth front passes it.
    const cv = canvasRef.current!;
    const img = new Image();
    img.src = "/brand/logo-mark-ivory.png";
    const grow = { p: 0 };
    let draw: (() => void) | null = null;
    img.onload = () => {
      const w = (cv.width = img.naturalWidth);
      const h = (cv.height = img.naturalHeight);
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const src = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const order = new Float32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const n = Math.sin(x * 0.045 + y * 0.021) * Math.cos(y * 0.037 - x * 0.016);
          order[y * w + x] = (1 - y / h) * 0.74 + (Math.abs(x - w / 2) / (w / 2)) * 0.2 + n * 0.035;
        }
      const F = 0.16;
      draw = () => {
        const d = src.data, o = out.data;
        for (let i = 0, j = 0; i < order.length; i++, j += 4) {
          let t = (grow.p - order[i]) / F;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          t = t * t * (3 - 2 * t);
          o[j] = d[j]; o[j + 1] = d[j + 1]; o[j + 2] = d[j + 2]; o[j + 3] = d[j + 3] * t;
        }
        ctx.putImageData(out, 0, 0);
      };
      draw();
    };
    intro
      .to(grow, { p: 1.1, duration: 2.6 * k, ease: "power2.out", onUpdate: () => draw && draw() }, 0)
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
        <canvas className="pl-mark" ref={canvasRef} width={700} height={630} />
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
