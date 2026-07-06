import { Link } from 'react-router-dom'
import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function ContactReturns() {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="max-w-[1100px] mx-auto px-6 pt-24 pb-32 text-bone">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-ink-2 border border-line rounded p-8">
            <p className="text-[0.75rem] font-medium text-bone-2 mb-1.5">Returns</p>
            <p className="text-[0.9rem] text-bone-2 mb-6">
              Please email{' '}
              <a
                href="mailto:returns@wyrthco.com"
                className="text-magenta-lt underline underline-offset-[3px] transition-colors hover:text-bone"
              >
                returns@wyrthco.com
              </a>
            </p>
            <h1 className="font-body text-[1.05rem] font-semibold text-bone mb-5">
              30 day refund policy
            </h1>
            {[
              "We carefully selected materials, put our product through 9 months of quality control, and one year of testing before rolling out sales. We are confident you'll be happy with the longevity, durability, and feel of the Wyrth cape.",
              "We understand things happen, therefore we accept returns within 30 days of the shipment delivery for manufacturer defects only.",
              "All returns must be unwashed, unused, and in original packaging. Please inspect items upon arrival including, but not limited to: stitching, snaps, logo, fabric, and tags.",
            ].map((text, i) => (
              <p key={i} className="text-[0.9rem] leading-[1.75] text-bone-2 mb-3.5">
                {text}
              </p>
            ))}
            <p className="text-[0.9rem] leading-[1.75] text-bone-2 mb-3.5">
              To start the return or to report a damaged item, please email us at{' '}
              <a
                href="mailto:returns@wyrthco.com"
                className="text-magenta-lt underline underline-offset-[3px] transition-colors hover:text-bone"
              >
                returns@wyrthco.com
              </a>. We ask that you include pictures and a description of the damage items. We will send you a shipping label once the return has been accepted. Items returned without being first accepted will not be refunded.
            </p>
            <p className="text-[0.9rem] leading-[1.75] text-bone-2">
              Once we receive your returned item, we will email you and issue a refund. Refunds can take a couple days to reach your bank account.
            </p>
          </section>

          <section className="bg-ink-2 border border-line rounded p-8">
            <h2 className="font-body text-[1.05rem] font-semibold text-bone mb-5">
              For general questions
            </h2>
            <p className="text-[0.9rem] text-bone-2 mb-6">
              Please email{' '}
              <a
                href="mailto:contact@wyrthco.com"
                className="text-magenta-lt underline underline-offset-[3px] transition-colors hover:text-bone"
              >
                contact@wyrthco.com
              </a>
            </p>
            <p className="text-[0.9rem] leading-[1.75] text-bone-2 italic mt-4">
              *Thank you for your patience and grace while our small business gets up and running
            </p>
          </section>
        </div>

        <div className="flex justify-center mt-12">
          <Link to="/shop" className="btn btn--gold min-w-40 justify-center">
            Buy
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
