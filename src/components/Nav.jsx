import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const NAV_LINKS = [
  { label: 'The Cape', href: '/#cape' },
  { label: 'Barbers',  href: '/#audience' },
  { label: 'Stylists', href: '/#audience' },
  { label: 'Features', href: '/#features' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)
  const { user, login, logout, googleClientId } = useAuth()
  const { count, setOpen: openCart } = useCart()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__inner">
        <Link to="/" className="nav__brand">WYRTH</Link>

        <ul className={`nav__links${open ? ' nav__links--open' : ''}`}>
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <Link to={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
            </li>
          ))}
          <li>
            <Link to="/shop" onClick={() => setOpen(false)}>Shop</Link>
          </li>

          {/* Mobile menu: sign-in / user info */}
          {!user && googleClientId && (
            <li className="nav__links-signin">
              <GoogleLogin
                onSuccess={resp => { login(resp.credential); setOpen(false) }}
                onError={() => {}}
                theme="filled_black"
                shape="pill"
                text="signin_with"
                size="large"
              />
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
          {/* Cart icon */}
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

          {/* Signed in: avatar + sign-out. Signed out: compact Google login */}
          {user ? (
            <button className="nav__user-btn" onClick={logout} title={`Sign out (${user.email})`}>
              {user.picture
                ? <img src={user.picture} alt={user.name} className="nav__avatar" referrerPolicy="no-referrer" />
                : <span className="nav__avatar nav__avatar--initials">{user.name?.[0] ?? '?'}</span>
              }
            </button>
          ) : googleClientId ? (
            <div className="nav__signin">
              <GoogleLogin
                onSuccess={resp => login(resp.credential)}
                onError={() => {}}
                theme="filled_black"
                shape="pill"
                text="signin"
                size="medium"
              />
            </div>
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
  )
}
