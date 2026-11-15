"use client";
import { useEffect } from "react";
import { gsap, ScrollTrigger, initGsap, prefersReduced } from "@/lib/motion";
import { SplitText } from "gsap/SplitText";

/**
 * Declarative scroll choreography. Mark up elements with:
 *   data-reveal            fade + rise
 *   data-lines             masked line-by-line headline reveal
 *   data-mask              image curtain reveal (put on the wrapper; inner <img> settles from a zoom)
 *   data-parallax="n"      inner image drifts ±n% against the scroll
 *   data-words             words ignite as you read (scrubbed)
 * Every ease is exponential-out: quick to start, slow to settle.
 */
export default function Motion() {
  useEffect(() => {
    initGsap();
    gsap.registerPlugin(SplitText);
    const reduced = prefersReduced();
    let ctx: gsap.Context | undefined;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        if (reduced) {
          gsap.set("[data-reveal],[data-lines],[data-words] .w", { opacity: 1, visibility: "visible" });
          return;
        }

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          const d = Number(el.dataset.delay || 0);
          gsap.fromTo(
            el,
            { y: 38, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.6, delay: d, scrollTrigger: { trigger: el, start: "top 90%", once: true } }
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            linesClass: "sl",
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 112,
                duration: 1.5,
                stagger: 0.1,
                ease: "expo.out",
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              });
            },
          });
          gsap.set(el, { visibility: "visible" });
        });

        gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el) => {
          const img = el.querySelector("img");
          const dir = el.dataset.mask === "right" ? "inset(0 0 0 100%)" : el.dataset.mask === "left" ? "inset(0 100% 0 0)" : "inset(100% 0 0 0)";
          const st = { trigger: el, start: "top 86%", once: true };
          gsap.fromTo(el, { clipPath: dir }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "expo.out", scrollTrigger: st });
          if (img) gsap.fromTo(img, { scale: 1.32 }, { scale: 1, duration: 2.4, ease: "expo.out", scrollTrigger: st });
        });

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          const s = Number(el.dataset.parallax || 8);
          gsap.fromTo(
            el,
            { yPercent: -s },
            {
              yPercent: s,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-words]").forEach((el) => {
          const words = el.querySelectorAll(".w");
          gsap.fromTo(
            words,
            { opacity: 0.13 },
            {
              opacity: 1,
              ease: "none",
              stagger: 0.12,
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 52%", scrub: 0.6 },
            }
          );
        });
      });
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };

    (document as any).fonts?.ready.then(() => requestAnimationFrame(setup)) ?? setup();
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      ctx?.revert();
    };
  }, []);
  return null;
}
