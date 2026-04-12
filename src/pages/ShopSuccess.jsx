import { useSearchParams, Link } from 'react-router-dom'
import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function ShopSuccess() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')

  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="shop-confirm">
        <div className="shop-confirm__card">
          <div className="shop-confirm__icon">✓</div>
          <h1 className="shop-confirm__title">Order Confirmed</h1>
          <p className="shop-confirm__sub">
            Thank you for your purchase. You'll receive a confirmation email shortly.
          </p>
          {sessionId && (
            <p className="shop-confirm__ref">
              Order ref: <span>{sessionId.slice(-12).toUpperCase()}</span>
            </p>
          )}
          <Link to="/shop" className="btn btn--gold shop-confirm__cta">
            Back to Shop
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
