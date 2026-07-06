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

function FooterLink({ href, label }) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex items-center min-h-11 -mx-1 px-1 text-[0.875rem] text-bone-2 transition-colors hover:text-bone"
      >
        {label}
      </a>
    </li>
  )
}

export default function Footer() {
  const { user, logout, googleClientId, magicLinkEnabled } = useAuth()
  const canSignIn = !user && (googleClientId || magicLinkEnabled)

  return (
    <footer className="bg-ink-2 border-t border-line">
      <div
        className="max-w-[1300px] mx-auto py-22 grid gap-11 grid-cols-1 md:grid-cols-2 md:gap-x-8 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-18"
        style={{ paddingLeft: '5%', paddingRight: '5%' }}
      >
        <div className="flex flex-col gap-5 md:col-span-2 lg:col-span-1">
          <div className="font-display text-3xl font-normal tracking-[.3em] text-bone">WYRTH</div>
          <p className="text-[0.875rem] text-bone-2 leading-[1.85]">
            Elevate your tools,<br />elevate your worth.
          </p>
          <span className="badge self-start">Woman-Owned</span>
        </div>

        <div>
          <h4 className="font-body text-[0.7rem] font-semibold tracking-[.22em] uppercase text-bone-2 mb-6">
            Shop
          </h4>
          <ul className="flex flex-col">
            {SHOP.map(l => <FooterLink key={l.label} {...l} />)}
          </ul>
        </div>

        <div>
          <h4 className="font-body text-[0.7rem] font-semibold tracking-[.22em] uppercase text-bone-2 mb-6">
            Policies
          </h4>
          <ul className="flex flex-col">
            {POLICIES.map(l => <FooterLink key={l.label} {...l} />)}
          </ul>
        </div>

        <div>
          <h4 className="font-body text-[0.7rem] font-semibold tracking-[.22em] uppercase text-bone-2 mb-6">
            Account
          </h4>
          {user ? (
            <div className="flex flex-col gap-3">
              <p className="text-[0.875rem] text-bone-2">{user.name || user.email}</p>
              <button
                onClick={logout}
                className="bg-transparent border border-line-warm text-bone-2 min-h-11 px-4 text-[0.65rem] font-semibold tracking-[.14em] uppercase cursor-pointer rounded-sm transition-colors self-start hover:text-magenta hover:border-magenta"
              >
                Sign Out
              </button>
            </div>
          ) : canSignIn ? (
            <SignInPrompt align="start" label="Sign in to save your cart and check out faster." />
          ) : (
            <p className="text-[0.8rem] text-bone-2 leading-[1.6] max-w-[200px]">
              Account sign-in coming soon.
            </p>
          )}
        </div>
      </div>

      <div
        className="max-w-[1300px] mx-auto py-6 border-t border-line text-[0.675rem] text-mute tracking-[.06em] flex flex-wrap justify-between items-center gap-3"
        style={{ paddingLeft: '5%', paddingRight: '5%' }}
      >
        <span>© 2026 WYRTH. All rights reserved.</span>
        <a href="/" className="text-mute transition-colors hover:text-bone-2">wyrthco.com</a>
      </div>
    </footer>
  )
}
