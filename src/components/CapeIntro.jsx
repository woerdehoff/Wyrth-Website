import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

export default function CapeIntro() {
  const { cape } = useContent()
  return (
    <section className="cape" id="cape">
      <div className="cape__grid">

        <figure className="cape__visual">
          <img
            className="cape__image"
            src="/images/wryth-styling-cape.webp"
            alt="WYRTH styling cape shown from the back with hair panel and full drape"
            loading="lazy"
          />
        </figure>

        <div className="cape__copy">
          <span className="label">Introducing</span>

          <h2 className="cape__title">
            {cape.titleLine1}<br />
            <em>{cape.titleLine2}</em>
          </h2>

          <p className="cape__body">{cape.body1}</p>
          <p className="cape__body">{cape.body2}</p>

          <div className="cape__stats">
            {cape.stats.map((s, i) => (
              <div key={`${s.value}-${s.label}-${i}`} className="cape__stat">
                <span className="cape__stat-value">{s.value}</span>
                <span className="cape__stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="cape__badges">
            {cape.badges.map(b => <span key={b} className="badge">{b}</span>)}
          </div>

          <div>
            <Link to="/shop" className="btn btn--gold">
              Shop the Cape
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
