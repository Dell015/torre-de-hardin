"use client";
import { useState } from "react";
import { AMENITIES, POLICIES, RESORT } from "@/lib/data";
import Img from "./Img";
import { useBooking } from "./BookingProvider";

export default function Visit() {
  const { openBooking } = useBooking();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="visit" id="visit">
      <div className="wrap">
        <div className="chap" data-reveal>
          <span className="chap-no">VI</span>
          <span className="label">Before you come</span>
          <span className="rule" />
        </div>
        <h2 className="h2" data-lines>
          Finding us is the <em>easy part.</em>
        </h2>

        <div className="visit-grid">
          <div className="visit-a">
            <div className="addr" data-reveal>
              <span className="label">Address</span>
              <p>{RESORT.address}</p>
              <div className="row">
                <a className="btn" href={RESORT.maps} target="_blank" rel="noreferrer">
                  <span>Open in Maps</span>
                </a>
                <a className="btn" href={`tel:${RESORT.phones[0].tel}`}>
                  <span>Call us</span>
                </a>
              </div>
            </div>

            <div className="times" data-reveal>
              <div>
                <span className="label">Check-in</span>
                <b>{RESORT.checkIn}</b>
              </div>
              <div>
                <span className="label">Check-out</span>
                <b>{RESORT.checkOut}</b>
              </div>
            </div>

            <div data-reveal>
              <span className="label">On the grounds</span>
              <ul className="amen">
                {AMENITIES.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="visit-b">
            <div className="visit-img frame" data-mask="right">
              <Img name="hall-entrance" alt="The entrance to the function hall and reception" className="fill" sizes="(min-width: 900px) 30vw, 70vw" data-parallax="5" />
            </div>
            <ul className="faq" data-reveal>
              {POLICIES.map((p, i) => (
                <li key={p.q} className={open === i ? "on" : ""}>
                  <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                    <span>{p.q}</span>
                    <i aria-hidden />
                  </button>
                  <div className="faq-a">
                    <p>{p.a}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="cta-band" data-reveal>
          <p className="cta-line">
            Ready when <em>you</em> are.
          </p>
          <button className="btn btn-solid" onClick={() => openBooking()}>
            <span>Reserve your dates</span>
          </button>
        </div>
      </div>
    </section>
  );
}
