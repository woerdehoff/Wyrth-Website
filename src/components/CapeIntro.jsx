import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

export default function CapeIntro() {
  const { cape } = useContent()
  return (
    <section
      className="bg-ink-2 py-36"
      id="cape"
      style={{ paddingLeft: '5%', paddingRight: '5%' }}
    >
      <div
        className="max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-start"
        style={{ gap: 'clamp(3rem, 6vw, 7rem)' }}
      >
        <figure className="m-0 bg-white rounded-sm overflow-hidden shadow-[0_1.25rem_3rem_rgba(0,0,0,0.32)]">
          <img
            className="block w-full h-auto aspect-[1721/794]"
            src="/images/wryth-styling-cape.webp"
            alt="WYRTH styling cape shown from the back with hair panel and full drape"
            loading="lazy"
            decoding="async"
          />
        </figure>

        <div className="flex flex-col gap-7">
          <span className="label">Introducing</span>

          <h2
            className="cape-title font-normal leading-[1.15] text-bone"
          >
            {cape.titleLine1}<br />
            <em className="not-italic font-light text-magenta-lt [font-style:italic]">
              {cape.titleLine2}
            </em>
          </h2>

          <p className="text-[0.925rem] text-bone-2 leading-[1.85]">{cape.body1}</p>
          <p className="text-[0.925rem] text-bone-2 leading-[1.85]">{cape.body2}</p>

          <div className="cape-stats grid grid-cols-2 border border-line-warm rounded-sm overflow-hidden">
            {cape.stats.map((s, i) => (
              <div
                key={`${s.value}-${s.label}-${i}`}
                className="flex flex-col gap-1 p-6 bg-ink-3 border-r border-b border-line-warm [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0"
              >
                <span className="font-display text-[2.25rem] font-light text-magenta-lt leading-none tracking-[-.01em]">
                  {s.value}
                </span>
                <span className="text-[0.6rem] font-semibold tracking-[.14em] uppercase text-bone-2">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5">
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
