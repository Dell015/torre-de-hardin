import { RESORT } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="footer" id="footer" data-dark>
      <div className="wrap">
        <div className="ft-top">
          <img className="ft-logo" src="/brand/logo-full-ivory.png" alt="Torre de Jardin — Resort & Event Place" />
          <p className="ft-tag">
            The city is far. <em>That is the point.</em>
          </p>
        </div>

        <div className="ft-cols">
          <div>
            <span className="label">Visit</span>
            <p>{RESORT.address}</p>
            <a href={RESORT.maps} target="_blank" rel="noreferrer">
              Open in Maps
            </a>
          </div>
          <div>
            <span className="label">Call</span>
            {RESORT.phones.map((p) => (
              <a key={p.tel} href={`tel:${p.tel}`}>
                {p.label}
              </a>
            ))}
          </div>
          <div>
            <span className="label">Follow</span>
            <a href={RESORT.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href={RESORT.messenger} target="_blank" rel="noreferrer">
              Message us
            </a>
          </div>
          <div>
            <span className="label">Hours</span>
            <p>
              Check-in {RESORT.checkIn}
              <br />
              Check-out {RESORT.checkOut}
            </p>
          </div>
        </div>

        <div className="ft-base">
          <p>© {new Date().getFullYear()} Torre de Jardin · {RESORT.descriptor}</p>
          <p className="muted">Aerial photography by Keyem Photography. Prototype — rates and policies shown are placeholders.</p>
        </div>
      </div>
    </footer>
  );
}
