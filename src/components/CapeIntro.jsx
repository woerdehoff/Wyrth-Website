import { useContent } from '../context/ContentContext'

export default function CapeIntro() {
  const { cape } = useContent()
  return (
    <section className="cape" id="cape">
      <div className="cape__grid">

        <div className="cape__image-wrap">
          <img
            className="cape__image"
            src="https://wyrthco.com/cdn/shop/files/764D6C79-E655-4BF0-9785-D406A1C59941_67354133-d0c7-43d3-b000-5b9c5f4b722c.jpg"
            alt="Barber demonstrating the Wyrth cape's lower-neck access technique"
            loading="lazy"
          />
        </div>

        <div className="cape__copy">
          <span className="label">Introducing</span>

          <h2 className="cape__title">
            {cape.titleLine1}<br />
            <em>{cape.titleLine2}</em>
          </h2>

          <p className="cape__body">{cape.body1}</p>
          <p className="cape__body">{cape.body2}</p>

          <div className="cape__stats">
            {cape.stats.map(s => (
              <div key={s.label} className="cape__stat">
                <span className="cape__stat-value">{s.value}</span>
                <span className="cape__stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="cape__badges">
            {cape.badges.map(b => <span key={b} className="badge">{b}</span>)}
          </div>

          <div>
            <a
              href="https://wyrthco.com/products/salon-cape"
              className="btn btn--gold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shop the Cape
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
