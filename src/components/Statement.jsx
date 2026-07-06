import { useContent } from '../context/ContentContext'

export default function Statement() {
  const { statement } = useContent()
  return (
    <section
      className="bg-ink py-20 md:py-44 border-t border-b border-line-warm"
      style={{ paddingLeft: '5%', paddingRight: '5%' }}
    >
      <div className="max-w-[820px] mx-auto text-center flex flex-col items-center gap-8">
        <div
          className="w-px h-14 mb-2"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-magenta))' }}
        />

        <span className="label">The Philosophy</span>

        <blockquote className="statement-quote font-display font-light leading-[1.35] text-bone italic">
          &ldquo;{statement.quote}&rdquo;
        </blockquote>

        <p className="font-body text-[0.7rem] font-semibold tracking-[.3em] text-mute">
          — WYRTH
        </p>

        <a href="/shop" className="btn btn--gold">
          Shop the Cape
        </a>
      </div>
    </section>
  )
}
