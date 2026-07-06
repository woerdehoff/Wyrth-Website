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
    <section
      className="bg-ink py-36"
      id="audience"
      style={{ paddingLeft: '5%', paddingRight: '5%' }}
    >
      <div className="max-w-[1300px] mx-auto mb-18 flex flex-col gap-5">
        <span className="label">Who It&apos;s For</span>
        <h2 className="audience-title font-normal text-bone">Built for Every Chair</h2>
        <p className="text-[0.9rem] text-bone-2 tracking-[.03em]">
          One design. Six ways it earns its place behind the chair.
        </p>
      </div>

      <div className="max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line rounded overflow-hidden">
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
              className="group scroll-mt-24 bg-ink-2 px-10 py-11 flex flex-col gap-3 border-t-[3px] border-transparent transition-[background,border-top-color] duration-300 ease-brand hover:bg-ink-3 hover:border-t-magenta"
              {...cardProps}
            >
              <span className="font-body text-[0.7rem] font-semibold tracking-[.22em] uppercase text-mute">
                {a.tag}
              </span>
              <h3 className="font-display text-[1.85rem] font-normal text-bone leading-[1.05]">
                {a.title}
              </h3>
              <p className="text-[0.85rem] text-bone-2 leading-[1.8] flex-1">
                {a.desc}
              </p>
              <span className="font-body text-[0.6rem] font-semibold tracking-[.16em] uppercase text-magenta transition-[letter-spacing] duration-[250ms] ease-brand group-hover:tracking-[.24em]">
                Learn more →
              </span>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
