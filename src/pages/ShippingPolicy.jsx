import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function ShippingPolicy() {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="prose-policy max-w-[760px] mx-auto px-6 pt-24 pb-32 text-bone">
        <h1>Shipping Policy</h1>

        <h2>Free US Shipping</h2>
        <p>We offer free standard shipping on all orders within the United States.</p>
        <p>For questions about your order or shipment, please reach out to us at <a href="mailto:contact@wyrthco.com">contact@wyrthco.com</a>.</p>
      </main>
      <Footer />
    </>
  )
}
