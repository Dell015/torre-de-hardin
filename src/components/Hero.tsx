"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, initGsap, scrollToId, prefersReduced } from "@/lib/motion";
import { RESORT } from "@/lib/data";
import Img from "./Img";
import { useBooking } from "./BookingProvider";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const { openBooking } = useBooking();

  useEffect(() => {
    initGsap();
    const reduced = prefersReduced();
    const q = gsap.utils.selector(root);
    const ctx = gsap.context(() => {
      gsap.set(q(".ln-in"), { yPercent: 118 });
      gsap.set(q(".hero-fade"), { opacity: 0, y: 18 });
      gsap.set(q(".hero-img"), { scale: 1.22 });

      const play = () => {
        const t = gsap.timeline({ defaults: { ease: "expo.out" } });
        t.to(q(".hero-img"), { scale: 1.04, duration: 3.4 }, 0)
          .to(q(".ln-in"), { yPercent: 0, duration: 1.9, stagger: 0.14 }, 0.1)
          .to(q(".hero-fade"), { opacity: 1, y: 0, duration: 1.6, stagger: 0.1 }, 0.7)
          .fromTo(q(".hero-cue i"), { scaleY: 0 }, { scaleY: 1, duration: 1.8, transformOrigin: "top" }, 1.0);
      };
      if (reduced) {
        gsap.set(q(".ln-in"), { yPercent: 0 });
        gsap.set(q(".hero-fade"), { opacity: 1, y: 0 });
        gsap.set(q(".hero-img"), { scale: 1.04 });
      } else if ((window as any).__tdjReady) play();
      else window.addEventListener("tdj:ready", play, { once: true });

      if (!reduced) {
        const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
        gsap.to(q(".hero-media"), { yPercent: 16, ease: "none", scrollTrigger: st });
        gsap.to(q(".hero-copy"), { yPercent: -14, opacity: 0.0, ease: "none", scrollTrigger: { ...st, end: "70% top" } });
        gsap.to(q(".hero-shade"), { opacity: 0.55, ease: "none", scrollTrigger: st });
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={root} data-dark>
      <div className="hero-media">
        <Img
          id="hero-img"
          name="sunset"
          alt="Golden hour over the pool at Torre de Jardin, with palms and a white moon chair"
          className="hero-img"
          sizes="100vw"
          priority
          pos="50% 40%"
        />
        <div className="hero-shade" />
      </div>

      <div className="hero-copy">
        <p className="label hero-fade hero-kick">
          <span>Naguilian, Isabela</span>
          <span className="rule" />
          <span>Villas · Pool · Gardens · Events</span>
        </p>
        <h1 className="hero-title" aria-label={RESORT.tagline}>
          <span className="ln">
            <span className="ln-in">
              The city is <em>far.</em>
            </span>
          </span>
          <span className="ln">
            <span className="ln-in">
              That is the <em>point.</em>
            </span>
          </span>
        </h1>
        <div className="hero-actions hero-fade">
          <button className="btn btn-ivory" onClick={() => openBooking()}>
            <span>Check availability</span>
          </button>
          <button className="btn btn-ghost" onClick={() => scrollToId("estate")}>
            <span>Begin the walk</span>
          </button>
        </div>
      </div>

      <div className="hero-cue hero-fade" aria-hidden>
        <span>Scroll</span>
        <i />
      </div>
      <p className="hero-plate hero-fade label">Plate I — The pool, 5:42 PM</p>
    </section>
  );
}
