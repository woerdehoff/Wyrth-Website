import { useContent } from '../context/ContentContext'

export default function Hero() {
  const { hero } = useContent()
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="hero__eyebrow">{hero.eyebrow}</p>

        <h1 className="hero__title">WYRTH</h1>

        <div className="hero__divider" />

        <p className="hero__sub">{hero.sub}</p>
        <p className="hero__tagline">{hero.tagline}</p>

        <div className="hero__actions">
          <a
            href="https://wyrthco.com/products/salon-cape"
            className="btn btn--gold"
            target="_blank"
            rel="noopener noreferrer"
          >
            Shop the Cape
          </a>
          <a href="#cape" className="btn btn--ghost">
            Learn More
          </a>
        </div>
      </div>

      <div className="hero__scroll">
        <span className="hero__scroll-line" />
        <span className="hero__scroll-text">SCROLL</span>
      </div>
    </section>
  )
}
