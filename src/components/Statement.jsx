import { useContent } from '../context/ContentContext'

export default function Statement() {
  const { statement } = useContent()
  return (
    <section className="statement">
      <div className="statement__inner">
        <div className="statement__ornament" />

        <span className="label">The Philosophy</span>

        <blockquote className="statement__quote">
          &ldquo;{statement.quote}&rdquo;
        </blockquote>

        <p className="statement__attr">— WYRTH</p>

        <a
          href="https://wyrthco.com/products/salon-cape"
          className="btn btn--gold"
          target="_blank"
          rel="noopener noreferrer"
        >
          Shop the Cape
        </a>
      </div>
    </section>
  )
}
