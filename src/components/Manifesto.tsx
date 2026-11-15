import Img from "./Img";

const TEXT =
  "Somewhere past the last town, the road loosens into fields and low green hills. Then a white tower, lit like a lantern, tells you that you have arrived. Torre de Jardin is a private resort and event place where the only schedule is the light.";

export default function Manifesto() {
  return (
    <section className="manifesto" id="estate">
      <div className="wrap">
        <div className="chap" data-reveal>
          <span className="chap-no">I</span>
          <span className="label">The road out</span>
          <span className="rule" />
        </div>

        <p className="manifesto-text" data-words>
          {TEXT.split(" ").map((w, i) => (
            <span key={i} className="w">
              {w}{" "}
            </span>
          ))}
        </p>

        <div className="mf-grid">
          <figure className="mf-a">
            <div className="frame" data-mask>
              <Img
                name="aerial-day-b"
                alt="Aerial view of the resort: villas, pool and gardens surrounded by green hills"
                sizes="(min-width: 900px) 62vw, 100vw"
                className="fill"
                data-parallax="7"
              />
            </div>
            <figcaption className="label" data-reveal>
              Plate II — The estate from above
            </figcaption>
          </figure>

          <figure className="mf-b">
            <div className="frame tall" data-mask="right">
              <Img name="tower-violet" alt="The lit tower at night" sizes="(min-width: 900px) 28vw, 70vw" className="fill" />
            </div>
            <figcaption className="label" data-reveal>
              Plate III — The tower, after dark
            </figcaption>
          </figure>

          <dl className="mf-facts">
            <div data-reveal>
              <dt className="label">Where</dt>
              <dd>Naguilian, Isabela. Right off the Junction Naguilian – San Mariano – Palanan Road.</dd>
            </div>
            <div data-reveal data-delay="0.1">
              <dt className="label">What</dt>
              <dd>Private villas, family villas and cabins. A pool, a lawn, a function hall and one very bright tower.</dd>
            </div>
            <div data-reveal data-delay="0.2">
              <dt className="label">How</dt>
              <dd>By reservation only, so the place is never crowded. Choose a date and the owners will confirm.</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
