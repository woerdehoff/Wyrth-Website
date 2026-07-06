import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import SignInModal from './SignInModal'

const NAV_LINKS = [
  { label: 'The Cape', href: '/#cape' },
  { label: 'Barbers',  href: '/barbers' },
  { label: 'Stylists & Colorists', href: '/stylists' },
  { label: 'Features', href: '/#features' },
  { label: 'Contact & Returns', href: '/contact-returns' },
]

export default function Nav() {
  const [scrolled,   setScrolled]   = useState(false)
  const [open,       setOpen]       = useState(false)
  const [signinOpen, setSigninOpen] = useState(false)
  const { user, logout, googleClientId, magicLinkEnabled } = useAuth()
  const { count, setOpen: openCart } = useCart()
  const canSignIn = !user && (googleClientId || magicLinkEnabled)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__inner">
        <Link to="/" className="nav__brand">WYRTH</Link>

        <ul className={`nav__links${open ? ' nav__links--open' : ''}`}>
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <Link to={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
            </li>
          ))}

          {canSignIn && (
            <li className="nav__links-signin">
              <button
                className="nav__email-signin-btn"
                onClick={() => { setSigninOpen(true); setOpen(false) }}
              >
                Sign in
              </button>
            </li>
          )}
          {user && (
            <li className="nav__links-user">
              <button onClick={() => { logout(); setOpen(false) }}>
                {user.picture && <img src={user.picture} alt="" className="nav__avatar" referrerPolicy="no-referrer" />}
                <span>Sign Out</span>
              </button>
            </li>
          )}
        </ul>

        <div className="nav__actions">
          <button
            className="nav__cart-btn"
            onClick={() => openCart(true)}
            aria-label={`Cart — ${count} item${count !== 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {count > 0 && <span className="nav__cart-count">{count}</span>}
          </button>

          {user ? (
            <button className="nav__user-btn" onClick={logout} title={`Sign out (${user.email})`}>
              {user.picture
                ? <img src={user.picture} alt={user.name} className="nav__avatar" referrerPolicy="no-referrer" />
                : <span className="nav__avatar nav__avatar--initials">{user.name?.[0] ?? '?'}</span>
              }
            </button>
          ) : canSignIn ? (
            <button
              className="nav__signin-trigger nav__signin-trigger--icon"
              onClick={() => setSigninOpen(true)}
              aria-label="Sign in"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          ) : null}

          <Link to="/shop" className="nav__cta">Buy Now</Link>
        </div>

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

    {signinOpen && <SignInModal onClose={() => setSigninOpen(false)} />}
    </>
  )
}