import { Link } from 'react-router-dom'
import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function ShopCancel() {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="shop-confirm">
        <div className="shop-confirm__card">
          <div className="shop-confirm__icon shop-confirm__icon--cancel">✕</div>
          <h1 className="shop-confirm__title">Order Cancelled</h1>
          <p className="shop-confirm__sub">
            Your payment was not processed. No charge was made.
          </p>
          <Link to="/shop" className="btn btn--gold shop-confirm__cta">
            Return to Shop
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
