import { Link } from 'react-router-dom'
import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function ContactReturns() {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="contact-returns-page">
        <div className="contact-returns-page__grid">
          <section className="contact-returns-page__panel">
            <p className="contact-returns-page__label">Returns</p>
            <p className="contact-returns-page__email-hint">
              Please email <a href="mailto:returns@wyrthco.com">returns@wyrthco.com</a>
            </p>
            <h1 className="contact-returns-page__heading">30 day refund policy</h1>
            <p>
              We carefully selected materials, put our product through 9 months of quality control,
              and one year of testing before rolling out sales. We are confident you&apos;ll be happy
              with the longevity, durability, and feel of the Wyrth cape.
            </p>
            <p>
              We understand things happen, therefore we accept returns within 30 days of the shipment
              delivery for manufacturer defects only.
            </p>
            <p>
              All returns must be unwashed, unused, and in original packaging. Please inspect items
              upon arrival including, but not limited to: stitching, snaps, logo, fabric, and tags.
            </p>
            <p>
              To start the return or to report a damaged item, please email us at{' '}
              <a href="mailto:returns@wyrthco.com">returns@wyrthco.com</a>. We ask that you include
              pictures and a description of the damage items. We will send you a shipping label once
              the return has been accepted. Items returned without being first accepted will not be
              refunded.
            </p>
            <p>
              Once we receive your returned item, we will email you and issue a refund. Refunds can
              take a couple days to reach your bank account.
            </p>
          </section>

          <section className="contact-returns-page__panel">
            <h2 className="contact-returns-page__heading">For general questions</h2>
            <p className="contact-returns-page__email-hint">
              Please email <a href="mailto:contact@wyrthco.com">contact@wyrthco.com</a>
            </p>
            <p className="contact-returns-page__note">
              *Thank you for your patience and grace while our small business gets up and running
            </p>
          </section>
        </div>

        <div className="contact-returns-page__cta">
          <Link to="/shop" className="btn btn--gold">Buy</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}