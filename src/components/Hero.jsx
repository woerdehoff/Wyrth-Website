import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useContent } from '../context/ContentContext'
import { useAuth } from '../context/AuthContext'

export default function Hero() {
  const { hero } = useContent()
  const { user, login, googleClientId } = useAuth()

  return (
    <section className="hero">
      <div className="hero__content">
        <p className="hero__eyebrow">{hero.eyebrow}</p>

        <h1 className="hero__title">WYRTH</h1>

        <div className="hero__divider" />

        <p className="hero__sub">{hero.sub}</p>
        <p className="hero__tagline">{hero.tagline}</p>

        <div className="hero__actions">
          <Link to="/shop" className="btn btn--gold">
            Shop the Cape
          </Link>
          <a href="#cape" className="btn btn--ghost">
            Learn More
          </a>
        </div>

        {!user && googleClientId && (
          <div className="hero__signin">
            <span className="hero__signin-label">Sign in for faster checkout</span>
            <GoogleLogin
              onSuccess={resp => login(resp.credential)}
              onError={() => {}}
              theme="filled_black"
              shape="pill"
              text="signin"
              size="medium"
            />
          </div>
        )}
      </div>

      <div className="hero__scroll">
        <span className="hero__scroll-line" />
        <span className="hero__scroll-text">SCROLL</span>
      </div>
    </section>
  )
}
