import { useContent } from '../context/ContentContext'

export default function AudienceGrid() {
  const { audiences } = useContent()
  return (
    <section className="audience" id="audience">
      <div className="audience__header">
        <span className="label">Who It&apos;s For</span>
        <h2 className="audience__title">Built for Every Chair</h2>
        <p className="audience__sub">
          One design. Six ways it earns its place behind the chair.
        </p>
      </div>

      <div className="audience__grid">
        {audiences.map(a => (
          <a
            key={a.title}
            href={a.href}
            className="audience__card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="audience__tag">{a.tag}</span>
            <h3 className="audience__card-title">{a.title}</h3>
            <p className="audience__card-desc">{a.desc}</p>
            <span className="audience__link">Learn more →</span>
          </a>
        ))}
      </div>
    </section>
  )
}
