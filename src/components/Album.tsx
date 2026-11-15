"use client";
import { useEffect, useRef } from "react";
import { gsap, initGsap, prefersReduced } from "@/lib/motion";
import { PLATES } from "@/lib/data";
import Img from "./Img";

/** Horizontal scrollytelling: vertical scroll turns the pages of an album. */
export default function Album() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initGsap();
    if (prefersReduced()) return;
    const ctx = gsap.context(() => {
      const el = track.current!;
      const dist = () => Math.max(0, el.scrollWidth - window.innerWidth + 1);
      const move = gsap.to(el, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + dist() * 1.15,
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      gsap.utils.toArray<HTMLElement>(".plate .fill").forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -7 },
          {
            xPercent: 7,
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement,
              containerAnimation: move,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          }
        );
      });
      gsap.to(".album-bar i", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: () => "+=" + dist() * 1.15, scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="album" id="album" ref={root}>
      <div className="album-head wrap">
        <div className="chap" data-reveal>
          <span className="chap-no">V</span>
          <span className="label">The album</span>
          <span className="rule" />
        </div>
        <h2 className="h2" data-lines>
          Turn the pages <em>slowly.</em>
        </h2>
      </div>
      <div className="album-track" ref={track}>
        <div className="album-lead">
          <p className="lede">
            Pools at noon, a tower at night, long tables in between. Keep scrolling and the album turns.
          </p>
        </div>
        {PLATES.map((p, i) => (
          <figure className={"plate plate-" + p.h} key={p.image}>
            <div className="plate-frame">
              <Img name={p.image} alt={p.caption} className="fill plate-img" sizes="(min-width: 900px) 40vw, 80vw" />
            </div>
            <figcaption className="label">
              Plate {String(i + 4).padStart(2, "0")} — {p.caption}
            </figcaption>
          </figure>
        ))}
        <div className="album-end">
          <p className="script">fin.</p>
        </div>
      </div>
      <div className="album-bar" aria-hidden>
        <i />
      </div>
    </section>
  );
}
