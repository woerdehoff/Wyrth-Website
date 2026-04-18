import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import MagicLinkModal from './MagicLinkModal'

const NAV_LINKS = [
  { label: 'The Cape', href: '/#cape' },
  { label: 'Barbers',  href: '/#audience' },
  { label: 'Stylists', href: '/#audience' },
  { label: 'Features', href: '/#features' },
]

export default function Nav() {
  const [scrolled,   setScrolled]   = useState(false)
  const [open,       setOpen]       = useState(false)
  const [signinOpen, setSigninOpen] = useState(false)
  const [magicOpen,  setMagicOpen]  = useState(false)
  const { user, login, logout, googleClientId } = useAuth()
  const { count, setOpen: openCart } = useCart()
  const signinRef = useRef(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!signinOpen) return
    function handleOutside(e) {
      if (signinRef.current && !signinRef.current.contains(e.target)) {
        setSigninOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [signinOpen])

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
          <li>
            <Link to="/shop" onClick={() => setOpen(false)}>Shop</Link>
          </li>

          {/* Mobile menu: sign-in options */}
          {!user && (
            <>
              {googleClientId && (
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
              <li className="nav__links-signin">
                <button
                  className="nav__email-signin-btn"
                  onClick={() => { setMagicOpen(true); setOpen(false) }}
                >
                  Sign in with Email
                </button>
              </li>
            </>
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

          {/* Signed in: avatar click → sign out */}
          {user ? (
            <button className="nav__user-btn" onClick={logout} title={`Sign out (${user.email})`}>
              {user.picture
                ? <img src={user.picture} alt={user.name} className="nav__avatar" referrerPolicy="no-referrer" />
                : <span className="nav__avatar nav__avatar--initials">{user.name?.[0] ?? '?'}</span>
              }
            </button>
          ) : (
            /* Sign In dropdown */
            <div className="nav__signin-dropdown" ref={signinRef}>
              <button
                className="nav__signin-trigger"
                onClick={() => setSigninOpen(o => !o)}
                aria-expanded={signinOpen}
                aria-haspopup="true"
              >
                Sign In
                <svg className="nav__signin-chevron" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {signinOpen && (
                <div className="nav__signin-menu" role="menu">
                  {googleClientId && (
                    <div className="nav__signin-item">
                      <GoogleLogin
                        onSuccess={resp => { login(resp.credential); setSigninOpen(false) }}
                        onError={() => {}}
                        theme="filled_black"
                        shape="pill"
                        text="signin_with"
                        size="medium"
                        width="100%"
                      />
                    </div>
                  )}
                  <div className="nav__signin-item">
                    <button
                      className="nav__signin-email-btn"
                      onClick={() => { setMagicOpen(true); setSigninOpen(false) }}
                    >
                      <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="1" y="1" width="18" height="14" rx="2"/>
                        <path d="M1 4l9 6 9-6"/>
                      </svg>
                      Sign in with Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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

    {magicOpen && <MagicLinkModal onClose={() => setMagicOpen(false)} />}
    </>
  )
}
