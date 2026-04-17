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
          href="/shop"
          className="btn btn--gold"
        >
          Shop the Cape
        </a>
      </div>
    </section>
  )
}
