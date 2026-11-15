"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, initGsap } from "@/lib/motion";
import { OCCASIONS } from "@/lib/data";
import Img from "./Img";
import { useBooking } from "./BookingProvider";

const TYPE_MAP: Record<string, string> = {
  Weddings: "Wedding",
  "Birthdays & Debuts": "Birthday / Debut",
  Christenings: "Christening",
  "Family Reunions": "Family reunion",
  "Retreats & Team Days": "Corporate / Team day",
  "Proposals & Quiet Nights": "Proposal / Intimate dinner",
};

export default function Gather() {
  const { openBooking } = useBooking();
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initGsap();
    if (!stage.current) return;
    const imgs = stage.current.querySelectorAll<HTMLElement>(".g-img");
    imgs.forEach((el, i) => {
      gsap.to(el, {
        opacity: i === active ? 1 : 0,
        scale: i === active ? 1 : 1.08,
        duration: i === active ? 1.6 : 0.9,
        ease: "expo.out",
        overwrite: true,
      });
    });
  }, [active]);

  return (
    <section className="gather" id="gather">
      <div className="wrap">
        <div className="chap" data-reveal>
          <span className="chap-no">IV</span>
          <span className="label">Occasions</span>
          <span className="rule" />
        </div>
        <h2 className="h2" data-lines>
          Every occasion deserves <em>a long table.</em>
        </h2>

        <div className="g-layout">
          <ol className="g-list">
            {OCCASIONS.map((o, i) => (
              <li key={o.name} className={i === active ? "on" : ""}>
                <button
                  className="g-item"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => window.matchMedia("(hover:hover)").matches && setActive(i)}
                  aria-expanded={i === active}
                >
                  <span className="g-no">{o.no}</span>
                  <span className="g-name">{o.name}</span>
                  <span className="g-plus" aria-hidden />
                </button>
                <div className="g-panel">
                  <div className="g-panel-in">
                    <div className="g-m-img">
                      <Img name={o.image} alt={o.name} sizes="100vw" className="fill" />
                    </div>
                    <p>{o.line}</p>
                    <button
                      className="link"
                      onClick={() => openBooking({ mode: "event", eventType: TYPE_MAP[o.name] })}
                    >
                      <span>Hold a date for {o.name.toLowerCase()}</span>
                      <svg width="30" height="10" viewBox="0 0 30 10" fill="none" stroke="currentColor">
                        <path d="M0 5h29M25 1l4 4-4 4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="g-stage" ref={stage} aria-hidden>
            <div className="frame">
              {OCCASIONS.map((o, i) => (
                <div className="g-img" key={o.name} style={{ opacity: i === 0 ? 1 : 0 }}>
                  <Img name={o.image} alt="" sizes="40vw" className="fill" />
                </div>
              ))}
            </div>
            <p className="label g-cap">{OCCASIONS[active].name}</p>
          </div>
        </div>

        <div className="hall">
          <div className="hall-media">
            <div className="frame" data-mask>
              <Img
                name="hall-b"
                alt="The function hall with warm timber ceiling, ivy walls and round tables"
                sizes="(min-width: 900px) 55vw, 100vw"
                className="fill"
                data-parallax="6"
              />
            </div>
            <div className="hall-small" data-mask="right">
              <Img name="hall-a" alt="Function hall seating" sizes="30vw" className="fill" />
            </div>
          </div>
          <div className="hall-copy">
            <p className="label" data-reveal>
              The function hall
            </p>
            <h3 className="h3" data-lines>
              Warm timber, living-green walls, cool air.
            </h3>
            <p className="lede" data-reveal>
              An air-conditioned hall that opens to the garden and the pool. It holds a seated dinner for up to x
              guests, and it is booked by reservation so your date is truly yours.
            </p>
            <button className="btn btn-solid" onClick={() => openBooking({ mode: "event" })} data-reveal>
              <span>Reserve the hall</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
