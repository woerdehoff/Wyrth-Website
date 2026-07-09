import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import SignInPrompt from './SignInPrompt'

export default function Hero() {
  const { hero } = useContent()

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-cover min-h-[100dvh]"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(6,6,6,0.65) 0%, rgba(6,6,6,0.78) 55%, rgba(6,6,6,1) 100%), url('/images/cape-barber.webp')",
        backgroundPosition: 'center 25%',
      }}
    >
      <div
        className="relative z-[1] text-center w-full max-w-[900px] pt-24 pb-16 md:pt-40 md:pb-24"
        style={{ paddingLeft: '5%', paddingRight: '5%' }}
      >
        <p
          className="font-body text-[0.7rem] font-semibold tracking-[.35em] uppercase text-magenta mb-7"
          style={{ animation: 'fadeUp 0.8s var(--ease-out) 0.2s both' }}
        >
          {hero.eyebrow}
        </p>

        <h1
          className="hero-title font-display font-light leading-[0.88] text-bone"
          style={{ animation: 'fadeUp 0.9s var(--ease-out) 0.4s both' }}
        >
          WYRTH
        </h1>

        <div
          className="w-14 h-px bg-magenta mx-auto my-9 origin-center"
          style={{ animation: 'growX 0.7s var(--ease-out) 0.9s both' }}
        />

        <p
          className="font-display font-light italic text-bone-2 mb-3"
          style={{
            fontSize: 'clamp(1.15rem, 2.5vw, 1.75rem)',
            animation: 'fadeUp 0.8s var(--ease-out) 1.1s both',
          }}
        >
          {hero.sub}
        </p>
        <p
          className="text-[0.725rem] tracking-[.12em] text-bone-2 mb-12"
          style={{ animation: 'fadeUp 0.8s var(--ease-out) 1.3s both' }}
        >
          {hero.tagline}
        </p>

        <div
          className="flex flex-wrap justify-center gap-4"
          style={{ animation: 'fadeUp 0.8s var(--ease-out) 1.5s both' }}
        >
          <Link to="/shop" className="btn btn--gold">Shop the Cape</Link>
          <a href="#cape" className="btn btn--ghost">Learn More</a>
        </div>

        <SignInPrompt
          align="center"
          className="mt-5"
          animation="fadeUp 0.8s var(--ease-out) 1.8s both"
        />
      </div>

      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-3"
        style={{ animation: 'fadeIn 1s var(--ease-out) 2.2s both' }}
      >
        <span
          className="block w-px h-11"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--color-magenta))',
            animation: 'pulse 2.5s ease-in-out 2.5s infinite',
          }}
        />
        <span className="text-[0.7rem] tracking-[.3em] text-bone-2">SCROLL</span>
      </div>
    </section>
  )
}
