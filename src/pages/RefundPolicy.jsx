import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function RefundPolicy() {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="policy-page">
        <h1 className="policy-page__title">Refund Policy</h1>

        <h2>30 Day Refund Policy</h2>
        <p>We accept returns within 30 days of the shipment delivery for manufacturer defects only.</p>
        <p>All returns must be unwashed, unused, and in original packaging. Please inspect items upon arrival including, but not limited to: stitching, snaps, logo, fabric, and tags.</p>
        <p>To start the return or to report a damaged item, please email us at <a href="mailto:returns@wyrthco.com">returns@wyrthco.com</a>. We ask that you include pictures and a description of the damaged items. We will send you a shipping label once the return has been accepted. Items returned without being first accepted will not be refunded.</p>
        <p>Once we receive your returned item, we will email you and issue a refund. Refunds can take a couple days to reach your bank account.</p>
      </main>
      <Footer />
    </>
  )
}
