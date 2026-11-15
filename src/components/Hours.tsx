"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, initGsap } from "@/lib/motion";
import { HOURS } from "@/lib/data";
import Img from "./Img";

/**
 * Pinned scrollytelling: one day at the resort, morning to night.
 * Scroll scrubs a timeline that cross-fades the scene and swaps the copy,
 * then snaps to each hour with an ease-out settle.
 */
export default function Hours() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    initGsap();
    const q = gsap.utils.selector(root);
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      const bgs = q(".hr-bg");
      const txt = q(".hr-text");
      const dots = q(".hr-dot");
      const clock = q(".hr-clock b");
      const SEG = 1.8;
      const HOLD = 1.05; // each hour rests fully formed before the next transition begins
      gsap.set(bgs.slice(1), { opacity: 0 });
      gsap.set(txt.slice(1), { autoAlpha: 0, y: 40 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=340%",
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
        },
        onUpdate: () => {
          const i = Math.min(HOURS.length - 1, Math.max(0, Math.floor(tl.time() / SEG + 0.22)));
          dots.forEach((d, k) => d.classList.toggle("on", k === i));
        },
      });

      HOURS.forEach((_, i) => {
        tl.addLabel("h" + i, i * SEG);
        if (i === HOURS.length - 1) return;
        const t0 = i * SEG + HOLD;
        tl.to(txt[i], { autoAlpha: 0, y: -36, duration: 0.45, ease: "power2.in" }, t0)
          .to(bgs[i].querySelector("img"), { scale: 1.12, duration: SEG - 0.4 }, i * SEG)
          .fromTo(bgs[i + 1], { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.inOut" }, t0)
          .fromTo(bgs[i + 1].querySelector("img"), { scale: 1.18 }, { scale: 1.0, duration: SEG }, t0)
          .to(txt[i + 1], { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" }, t0 + 0.45)
          .to(".hr-rail i", { scaleY: (i + 1) / (HOURS.length - 1), duration: 0.9, ease: "power1.inOut" }, t0);
      });
      tl.to({}, { duration: 0.9 }, (HOURS.length - 1) * SEG);
      dots[0]?.classList.add("on");
      void clock;
    }, root);
    return () => {
      ctx.revert();
      mm.revert();
    };
  }, []);

  return (
    <section className="hours" id="day" ref={root} data-dark>
      <div className="hr-stage">
        {HOURS.map((h, i) => (
          <div className="hr-bg" key={h.no} aria-hidden={i > 0}>
            <Img name={h.image} alt="" sizes="100vw" className="fill" pos={h.pos} />
          </div>
        ))}
        <div className="hr-shade" />

        <div className="hr-top">
          <div className="chap light">
            <span className="chap-no">II</span>
            <span className="label">A day, as it goes</span>
            <span className="rule" />
          </div>
        </div>

        <div className="hr-rail" aria-hidden>
          <i />
          {HOURS.map((h) => (
            <span key={h.no} className="hr-dot">
              <b>{h.no}</b>
              <em>{h.time}</em>
            </span>
          ))}
        </div>

        <div className="hr-copy">
          {HOURS.map((h, i) => (
            <div className="hr-text" key={h.no}>
              <p className="hr-clock label">
                <b>{h.no}</b> {h.time} · {h.clock}
              </p>
              <h2>{h.head}</h2>
              <p className="hr-body">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
