"use client";
import { useEffect, useRef } from "react";
import { gsap, initGsap, prefersReduced } from "@/lib/motion";
import Img from "./Img";

/** Full-bleed night interlude: the tower fills the frame while two lines of copy rise out of the dark. */
export default function Nightfall() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    initGsap();
    if (prefersReduced()) return;
    const q = gsap.utils.selector(root);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=180%", pin: true, scrub: 0.8, anticipatePin: 1 },
      });
      tl.fromTo(q(".nf-img"), { scale: 1.14, yPercent: 3 }, { scale: 1.0, yPercent: -1, duration: 3 }, 0)
        .fromTo(q(".nf-a"), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.25)
        .to(q(".nf-a"), { autoAlpha: 0, y: -40, duration: 0.5, ease: "power2.in" }, 1.35)
        .fromTo(q(".nf-b"), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, 1.75)
        .fromTo(q(".nf-dark"), { opacity: 0.1 }, { opacity: 0.55, duration: 3 }, 0);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="night" ref={root} data-dark>
      <div className="night-media">
        <Img name="tower-bloom" alt="The tower glowing violet behind blooming bougainvillea" className="fill nf-img" sizes="100vw" pos="2% 18%" />
        <div className="night-dark nf-dark" />
      </div>
      <div className="night-copy">
        <div className="nf-a">
          <p className="label">After dark</p>
          <h2 className="h1">
            The tower takes <em>over.</em>
          </h2>
        </div>
        <div className="nf-b">
          <p className="label">Visible long before you arrive</p>
          <h2 className="h1">
            You will not <em>miss</em> the turn.
          </h2>
        </div>
      </div>
    </section>
  );
}
