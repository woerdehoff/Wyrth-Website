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
      <main className="min-h-[80vh] flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-[440px] w-full px-10 py-14 border border-line bg-ink-2">
          <div className="text-[2.5rem] text-magenta mb-6 leading-none">✓</div>
          <h1 className="font-display text-[2.25rem] text-bone mb-4">Order Confirmed</h1>
          <p className="text-[0.95rem] text-bone-2 leading-[1.65] mb-4">
            Thank you for your purchase. You'll receive a confirmation email shortly.
          </p>
          {sessionId && (
            <p className="text-[0.75rem] text-bone-2 tracking-[.1em] font-body mb-2">
              Order ref: <span className="text-bone-2 font-semibold">{sessionId.slice(-12).toUpperCase()}</span>
            </p>
          )}
          <Link to="/shop" className="btn btn--gold mt-6">
            Back to Shop
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
