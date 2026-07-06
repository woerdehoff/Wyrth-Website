import { useAuth } from '../context/AuthContext'
import SignInPrompt from './SignInPrompt'

const SHOP = [
  { label: 'The Cape',     href: '/shop' },
  { label: 'For Barbers',  href: '/barbers' },
  { label: 'Bundles',      href: '/shop' },
  { label: 'Custom Capes', href: '/shop' },
]

const POLICIES = [
  { label: 'Privacy Policy',    href: '/privacy-policy' },
  { label: 'Refund Policy',     href: '/refund-policy' },
  { label: 'Shipping Policy',   href: '/shipping-policy' },
  { label: 'Terms of Service',  href: '/terms-of-service' },
  { label: 'Contact & Returns', href: '/contact-returns' },
]

export default function Footer() {
  const { user, logout, googleClientId, magicLinkEnabled } = useAuth()
  const canSignIn = !user && (googleClientId || magicLinkEnabled)

  return (
    <footer className="footer">
      <div className="footer__inner">

        <div className="footer__brand">
          <div className="footer__logo">WYRTH</div>
          <p className="footer__tagline">
            Elevate your tools,<br />elevate your worth.
          </p>
          <span className="badge">Woman-Owned</span>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">Shop</h4>
          <ul>
            {SHOP.map(l => (
              <li key={l.label}>
                <a href={l.href}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">Policies</h4>
          <ul>
            {POLICIES.map(l => (
              <li key={l.label}>
                <a href={l.href}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">Account</h4>
          {user ? (
            <div className="footer__account">
              <p className="footer__account-name">{user.name || user.email}</p>
              <button className="footer__signout" onClick={logout}>Sign Out</button>
            </div>
          ) : canSignIn ? (
            <div className="footer__account">
              <SignInPrompt label="Sign in to save your cart and check out faster." />
            </div>
          ) : (
            <p className="footer__account-hint">Account sign-in coming soon.</p>
          )}
        </div>

      </div>

      <div className="footer__bottom">
        <span>© 2026 WYRTH. All rights reserved.</span>
        <a href="/">
          wyrthco.com
        </a>
      </div>

    </footer>
  )
}