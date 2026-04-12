import { useState, useEffect } from 'react'

const NAV_LINKS = [
  { label: 'The Cape', href: '#cape' },
  { label: 'Barbers',  href: '#audience' },
  { label: 'Stylists', href: '#audience' },
  { label: 'Features', href: '#features' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__inner">
        <a href="#" className="nav__brand">WYRTH</a>

        <ul className={`nav__links${open ? ' nav__links--open' : ''}`}>
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <a href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
            </li>
          ))}
        </ul>

        <a
          href="https://wyrthco.com/products/salon-cape"
          className="nav__cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy Now
        </a>

        <button
          className={`nav__hamburger${open ? ' nav__hamburger--open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  )
}
