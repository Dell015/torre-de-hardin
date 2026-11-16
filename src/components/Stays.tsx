"use client";
import { useSettings, rateOf } from "@/lib/settings";
import { useRef, useState } from "react";
import { STAYS, type Stay } from "@/lib/data";
import { peso } from "@/lib/bookings";
import Img from "./Img";
import { useBooking } from "./BookingProvider";

function Strip({ stay }: { stay: Stay }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const go = (n: number) => {
    const el = ref.current!;
    const t = (n + stay.images.length) % stay.images.length;
    el.scrollTo({ left: t * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="strip-wrap">
      <div
        className="strip"
        ref={ref}
        data-lenis-prevent-wheel
        onScroll={(e) => {
          const el = e.currentTarget;
          setI(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {stay.images.map((im, k) => (
          <div className="strip-slide" key={im.name}>
            <Img
              name={im.name}
              alt={im.alt}
              sizes="(min-width: 900px) 52vw, 100vw"
              className="fill"
              pos={im.pos}
              priority={false}
            />
          </div>
        ))}
      </div>
      <div className="strip-ui">
        <span className="label">
          {String(i + 1).padStart(2, "0")} / {String(stay.images.length).padStart(2, "0")}
        </span>
        <div>
          <button onClick={() => go(i - 1)} aria-label="Previous photo">
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
              <path d="M22 5H1M5 1L1 5l4 4" />
            </svg>
          </button>
          <button onClick={() => go(i + 1)} aria-label="Next photo">
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
              <path d="M0 5h21M17 1l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Stays() {
  useSettings();
  const { openBooking } = useBooking();
  return (
    <section className="stays" id="stay">
      <div className="wrap">
        <div className="chap" data-reveal>
          <span className="chap-no">III</span>
          <span className="label">Where you will sleep</span>
          <span className="rule" />
        </div>
        <h2 className="h2 stays-head" data-lines>
          Three kinds of quiet, <em>one</em> pool to share.
        </h2>

        {STAYS.map((s, idx) => (
          <article className={"stay" + (idx % 2 ? " flip" : "")} key={s.id}>
            <div className="stay-media" data-reveal>
              <Strip stay={s} />
            </div>
            <div className="stay-info">
              <p className="stay-no" data-reveal>
                <span>{s.no}</span>
                <span className="label">{s.kicker}</span>
              </p>
              <h3 className="h3" data-lines>
                {s.name}
              </h3>
              <p className="lede" data-reveal>
                {s.blurb}
              </p>
              <dl className="specs" data-reveal>
                <div>
                  <dt className="label">Sleeps</dt>
                  <dd>{s.sleeps}</dd>
                </div>
                <div>
                  <dt className="label">Beds</dt>
                  <dd>{s.beds}</dd>
                </div>
                <div>
                  <dt className="label">From</dt>
                  <dd>
                    {peso(rateOf(s.id))} <small>/ night</small>
                  </dd>
                </div>
              </dl>
              <ul className="tags" data-reveal>
                {s.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className="link" onClick={() => openBooking({ mode: "stay", unit: s.id })} data-reveal>
                <span>Reserve the {s.name}</span>
                <svg width="30" height="10" viewBox="0 0 30 10" fill="none" stroke="currentColor">
                  <path d="M0 5h29M25 1l4 4-4 4" />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="estate-block" data-dark>
        <div className="estate-media" data-parallax-wrap>
          <Img name="aerial-day-a" alt="The entire estate seen from above" className="fill" data-parallax="9" sizes="100vw" />
          <div className="estate-shade" />
        </div>
        <div className="wrap estate-copy">
          <p className="label" data-reveal>
            Or take all of it
          </p>
          <h3 className="h2" data-lines>
            The whole estate, <em>yours alone.</em>
          </h3>
          <p className="lede" data-reveal>
            Every villa, the pool, the lawn and the hall, closed to everyone else for as long as you are here. For
            reunions that run all weekend and weddings that should feel like home.
          </p>
          <button className="btn btn-ivory" onClick={() => openBooking({ mode: "stay", unit: "estate" })} data-reveal>
            <span>Ask for your dates</span>
          </button>
        </div>
      </div>
    </section>
  );
}
