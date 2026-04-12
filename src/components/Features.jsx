import { useContent } from '../context/ContentContext'

export default function Features() {
  const { features } = useContent()
  return (
    <section className="features" id="features">
      <div className="features__inner">
        <div className="features__header">
          <span className="label">The Details</span>
          <h2 className="features__title">Why Wyrth Works</h2>
          <p className="features__sub">
            Every decision in this cape is intentional. Here&apos;s what makes it different.
          </p>
        </div>

        <div className="features__grid">
          {features.map(f => (
            <div key={f.num} className="feature">
              <span className="feature__num">{f.num}</span>
              <h3 className="feature__title">{f.title}</h3>
              <p className="feature__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
