import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

const SHOP = [
  { label: 'The Cape',     href: 'https://wyrthco.com/products/salon-cape' },
  { label: 'For Barbers',  href: 'https://wyrthco.com/pages/barber-cape' },
  { label: 'Bundles',      href: 'https://wyrthco.com/pages/bundles' },
  { label: 'Custom Capes', href: 'https://wyrthco.com/pages/custom-logo-capes' },
]

const POLICIES = [
  { label: 'Privacy Policy',   href: 'https://wyrthco.com/policies/privacy-policy' },
  { label: 'Refund Policy',    href: 'https://wyrthco.com/policies/refund-policy' },
  { label: 'Shipping Policy',  href: 'https://wyrthco.com/policies/shipping-policy' },
  { label: 'Terms of Service', href: 'https://wyrthco.com/policies/terms-of-service' },
]

export default function Footer() {
  const { user, login, logout, googleClientId } = useAuth()

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
                <a href={l.href} target="_blank" rel="noopener noreferrer">
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
                <a href={l.href} target="_blank" rel="noopener noreferrer">
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
          ) : googleClientId ? (
            <div className="footer__account">
              <p className="footer__account-hint">Sign in to save your cart and check out faster.</p>
              <GoogleLogin
                onSuccess={resp => login(resp.credential)}
                onError={() => {}}
                theme="filled_black"
                shape="rectangular"
                text="signin_with"
                size="medium"
              />
            </div>
          ) : (
            <p className="footer__account-hint">Account sign-in coming soon.</p>
          )}
        </div>

      </div>

      <div className="footer__bottom">
        <span>© 2026 WYRTH. All rights reserved.</span>
        <a href="https://wyrthco.com" target="_blank" rel="noopener noreferrer">
          wyrthco.com
        </a>
      </div>
    </footer>
  )
}
