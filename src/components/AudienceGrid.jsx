import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const AUDIENCE_ROUTES = {
  Barbers:   '/barbers',
  Stylists:  '/stylists',
  Colorists: '/stylists',
  Clients:   '/stylists',
}

function audienceId(title) {
  return `audience-${title.toLowerCase().replace(/\s+/g, '-')}`
}

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
        {audiences.map(a => {
          const href = AUDIENCE_ROUTES[a.title] ?? a.href
          const isInternal = href?.startsWith('/')
          const Card = isInternal ? Link : 'a'
          const cardProps = isInternal
            ? { to: href }
            : { href, target: '_blank', rel: 'noopener noreferrer' }

          return (
            <Card
              key={a.title}
              id={audienceId(a.title)}
              className="audience__card"
              {...cardProps}
            >
              <span className="audience__tag">{a.tag}</span>
              <h3 className="audience__card-title">{a.title}</h3>
              <p className="audience__card-desc">{a.desc}</p>
              <span className="audience__link">Learn more →</span>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
