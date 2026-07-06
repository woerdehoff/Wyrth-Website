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

  const navBase = 'fixed inset-x-0 top-0 z-[100] border-b transition-[background,padding,border-color] duration-[400ms] ease-brand'
  const navScrolled = scrolled
    ? 'bg-ink/[.98] pb-4 border-line'
    : 'bg-transparent pb-7 border-transparent'
  const basePt = scrolled ? '1rem' : '1.75rem'

  return (
    <>
    <nav
      className={`${navBase} ${navScrolled}`}
      style={{
        paddingLeft: '5%',
        paddingRight: '5%',
        paddingTop: `max(${basePt}, env(safe-area-inset-top))`,
      }}
    >
      <div className="max-w-[1380px] mx-auto flex items-center gap-8">
        <Link
          to="/"
          className="font-display text-2xl font-medium tracking-[.3em] text-bone shrink-0 transition-colors hover:text-magenta-lt"
        >
          WYRTH
        </Link>

        <ul
          className={
            'items-center gap-10 ' +
            (open
              ? 'flex fixed inset-x-0 top-[60px] bottom-0 bg-ink flex-col justify-center z-[101] overflow-y-auto pb-[env(safe-area-inset-bottom)]'
              : 'hidden') +
            ' md:!static md:!flex md:!flex-row md:!bg-transparent md:!justify-start md:!overflow-visible md:!pb-0 md:!z-auto md:ml-auto'
          }
        >
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <Link
                to={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center min-h-11 px-4 text-xl tracking-[.2em] uppercase text-bone-2 transition-colors hover:text-bone md:min-h-0 md:px-0 md:text-[0.675rem] md:tracking-[.16em] md:font-medium"
              >
                {l.label}
              </Link>
            </li>
          ))}

          {canSignIn && (
            <li className="flex justify-center mt-4 pt-6 border-t border-line md:hidden">
              <button
                className="bg-transparent border border-line-warm text-bone-2 px-6 py-2.5 rounded-sm text-xs font-semibold tracking-[.14em] uppercase transition-colors hover:text-bone hover:border-bone"
                onClick={() => { setSigninOpen(true); setOpen(false) }}
              >
                Sign in
              </button>
            </li>
          )}
          {user && (
            <li className="flex justify-center mt-4 pt-6 border-t border-line md:hidden">
              <button
                onClick={() => { logout(); setOpen(false) }}
                className="flex items-center gap-2.5 bg-transparent border border-magenta text-magenta px-6 py-2.5 rounded-sm text-xs font-semibold tracking-[.14em] uppercase transition-colors hover:bg-magenta hover:text-ink"
              >
                {user.picture && (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-line"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span>Sign Out</span>
              </button>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-3 ml-auto md:ml-0">
          <button
            className="relative bg-transparent border-0 text-bone min-w-11 min-h-11 p-1.5 flex items-center justify-center transition-colors hover:text-magenta cursor-pointer"
            onClick={() => openCart(true)}
            aria-label={`Cart — ${count} item${count !== 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="w-5 h-5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-1 bg-magenta text-ink text-[0.6rem] font-bold min-w-4 h-4 rounded-lg flex items-center justify-center px-[3px] leading-none">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <button
              className="bg-transparent border-0 p-0 rounded-full overflow-hidden flex items-center cursor-pointer"
              onClick={logout}
              title={`Sign out (${user.email})`}
            >
              {user.picture
                ? <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-line" referrerPolicy="no-referrer" />
                : <span className="w-7 h-7 rounded-full flex items-center justify-center bg-magenta text-ink text-xs font-bold border border-line">{user.name?.[0] ?? '?'}</span>
              }
            </button>
          ) : canSignIn ? (
            <button
              className="hidden md:flex bg-transparent border-0 p-1.5 min-w-11 min-h-11 items-center justify-center text-bone transition-colors hover:text-magenta cursor-pointer"
              onClick={() => setSigninOpen(true)}
              aria-label="Sign in"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="w-5 h-5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          ) : null}

          <Link
            to="/shop"
            className="hidden md:inline-flex shrink-0 ml-8 px-6 py-2 text-[0.625rem] font-semibold tracking-[.18em] uppercase border border-magenta text-magenta rounded-sm transition-colors hover:bg-magenta hover:text-ink"
          >
            Buy Now
          </Link>
        </div>

        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-11 h-11 relative z-[102] cursor-pointer bg-transparent border-0"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span className={`block w-6 h-px bg-bone transition-transform duration-[250ms] ease-brand ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
          <span className={`block w-6 h-px bg-bone transition-opacity duration-[250ms] ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-px bg-bone transition-transform duration-[250ms] ease-brand ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
        </button>
      </div>
    </nav>

    {signinOpen && <SignInModal onClose={() => setSigninOpen(false)} />}
    </>
  )
}
