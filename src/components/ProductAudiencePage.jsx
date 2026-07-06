import { useState, useEffect, useRef } from 'react'
import AnnouncementBanner from './AnnouncementBanner'
import Nav from './Nav'
import Footer from './Footer'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

function FaqAccordion({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(null)

  if (!items.length) return null

  return (
    <section
      className="max-w-[720px] mx-auto mt-16 pt-16 border-t border-line"
      aria-label="Frequently asked questions"
    >
      {items.map((item, i) => {
        const isOpen = openIndex === i
        const panelId = `faq-panel-${i}`
        const buttonId = `faq-button-${i}`

        return (
          <div key={item.question} className="border-b border-line">
            <button
              type="button"
              id={buttonId}
              className={`flex items-center justify-between gap-6 w-full py-5 text-left text-[0.95rem] leading-[1.5] transition-colors ${
                isOpen ? 'text-bone' : 'text-bone-2 hover:text-bone'
              }`}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span>{item.question}</span>
              <svg
                viewBox="0 0 12 8"
                fill="none"
                aria-hidden="true"
                className={`shrink-0 w-3 h-2 transition-[transform,color] duration-[250ms] ease-brand ${
                  isOpen ? 'rotate-180 text-bone-2' : 'text-mute'
                }`}
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div id={panelId} role="region" aria-labelledby={buttonId} className="pb-5" hidden={!isOpen}>
              <p className="text-[0.9rem] leading-[1.75] text-bone-2">{item.answer}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function StorySplitSection({ title, body, aside, image, imagePosition = 'right', asideWithImage = false }) {
  if (!title && !body) return null
  const imageLeft = imagePosition === 'left'

  return (
    <section className="py-14 border-b border-line grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-16 items-start">
      <div className={imageLeft ? 'md:order-2' : ''}>
        {title && (
          <h2 className="font-body text-[1.05rem] font-bold text-bone mb-5">{title}</h2>
        )}
        {body && (
          <p className="text-[0.95rem] leading-[1.75] text-bone-2 mb-4">{body}</p>
        )}
        {aside && !asideWithImage && (
          <p className={`text-[0.95rem] leading-[1.75] text-mute ${imageLeft ? 'text-left' : 'text-right'}`}>
            {aside}
          </p>
        )}
      </div>
      {(image || (aside && asideWithImage)) && (
        <div className={`flex flex-col gap-6 ${imageLeft ? 'md:order-1' : ''}`}>
          {aside && asideWithImage && (
            <p className={`text-[0.95rem] leading-[1.75] text-mute ${imageLeft ? 'text-left' : 'text-right'}`}>
              {aside}
            </p>
          )}
          {image && (
            <figure className="overflow-hidden border border-line bg-ink-2">
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className="block w-full aspect-[4/3] object-cover object-center"
              />
            </figure>
          )}
        </div>
      )}
    </section>
  )
}

function PromoVideo({ label, src, poster, tagline, alt }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  if (!src) return null

  function handlePlay() {
    setPlaying(true)
    const video = videoRef.current
    if (!video) return
    video.controls = true
    video.play().catch(() => {})
  }

  return (
    <section
      className="pt-14 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-x-12 items-start"
      aria-label={alt || 'Product video'}
    >
      {label && (
        <span className="text-[0.95rem] font-semibold text-bone pt-1">{label}</span>
      )}
      <div className="relative overflow-hidden border border-line bg-ink-2">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          aria-label={alt || 'Product video'}
          className="block w-full aspect-video object-cover bg-ink-3"
        />
        {!playing && (
          <button
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-ink/55 transition-colors cursor-pointer hover:bg-ink/40 group"
            onClick={handlePlay}
            aria-label="Play video"
          >
            {tagline && (
              <p
                className="font-display font-normal tracking-[.12em] uppercase text-bone text-center leading-[1.4]"
                style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', maxWidth: '20ch' }}
              >
                {tagline}
              </p>
            )}
            <span className="w-16 h-16 text-bone opacity-90 transition-[transform,opacity] duration-200 ease-brand group-hover:scale-[1.06] group-hover:opacity-100">
              <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                <circle cx="32" cy="32" r="31" stroke="currentColor" strokeWidth="2" />
                <path d="M26 20L44 32L26 44V20Z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function ProductAudiencePage({
  brand = 'WYRTH',
  title,
  priceInCents,
  shippingNote,
  installmentNote,
  description,
  images = [],
  showcaseImages = [],
  faq = [],
  problemsSection,
  whyWeCareSection,
  solutionSection,
  drapeSection,
  promoVideo,
  productId,
}) {
  const [product, setProduct] = useState(null)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (!API_URL || !productId) return
    fetch(`${API_URL}/shop/products`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const products = data.products || []
        const match = products.find(p => p.productId === productId)
        if (match) setProduct(match)
      })
      .catch(() => {})
  }, [productId])

  const gallery = images

  const displayPrice = product?.priceInCents ?? priceInCents
  const installmentAmount = displayPrice ? formatPrice(Math.round(displayPrice / 4)) : null

  const solo = gallery.length === 0

  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="min-h-[80vh] pt-28 pb-24 px-6">
        <div
          className={`grid gap-8 md:gap-y-12 md:gap-x-16 items-start mx-auto ${
            solo ? 'grid-cols-1 max-w-[720px]' : 'grid-cols-1 md:grid-cols-2 max-w-[1100px]'
          }`}
        >
          {gallery.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="aspect-[4/5] bg-ink-2 border border-line overflow-hidden">
                <img
                  src={gallery[activeImage].src}
                  alt={gallery[activeImage].alt}
                  className="w-full h-full object-cover"
                />
              </div>
              {gallery.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {gallery.slice(1).map((img, i) => {
                    const index = i + 1
                    const active = index === activeImage
                    return (
                      <button
                        key={img.src}
                        type="button"
                        className={`aspect-square border bg-ink-2 overflow-hidden cursor-pointer transition-colors duration-200 ease-brand p-0 hover:border-magenta ${
                          active ? 'border-magenta' : 'border-line'
                        }`}
                        onClick={() => setActiveImage(index)}
                        aria-label={`View image ${index + 1}`}
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-[0.7rem] font-semibold tracking-[.2em] uppercase text-bone-2 mb-3">
              {brand}
            </p>
            <h1
              className="font-display font-normal leading-[1.25] text-bone-2 mb-5"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)' }}
            >
              {title}
            </h1>

            {displayPrice != null && (
              <p className="text-[1.1rem] font-semibold text-bone mb-2">
                {formatPrice(displayPrice)} USD
              </p>
            )}

            {shippingNote && (
              <p className="text-[0.85rem] text-bone-2 leading-[1.6] mb-2">{shippingNote}</p>
            )}

            {installmentNote && installmentAmount && (
              <p className="text-[0.85rem] text-bone-2 leading-[1.6] mb-2">
                Pay in 4 interest-free installments of {installmentAmount} with{' '}
                <span className="font-semibold text-[#5b9fd4]">shop Pay</span>{' '}
                <a
                  href="/shop"
                  className="text-bone-2 underline underline-offset-2 transition-colors hover:text-bone"
                >
                  Learn more
                </a>
              </p>
            )}

            {description && (
              <p className="text-[0.9rem] leading-[1.75] text-bone-2 pt-6 border-t border-line">
                {description}
              </p>
            )}
          </div>
        </div>

        {showcaseImages.length > 0 && (
          <section
            className="max-w-[1100px] mx-auto mt-16 pt-16 border-t border-line"
            aria-label="The cape in the salon"
          >
            <figure className="overflow-hidden border border-line bg-ink-2 mb-3 group">
              <img
                src={showcaseImages[0].src}
                alt={showcaseImages[0].alt}
                loading="lazy"
                decoding="async"
                className="block w-full aspect-video object-cover object-center transition-transform duration-[400ms] ease-brand group-hover:scale-[1.02]"
              />
            </figure>
            {showcaseImages.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {showcaseImages.slice(1).map(img => (
                  <figure
                    key={img.src}
                    className="overflow-hidden border border-line bg-ink-2 group"
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                      className="block w-full aspect-video object-cover object-center transition-transform duration-[400ms] ease-brand group-hover:scale-[1.02]"
                    />
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}

        <FaqAccordion items={faq} />

        {problemsSection && (
          <section
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-16 max-w-[1100px] mx-auto mt-16 pt-16 border-t border-line items-center"
            aria-labelledby="problems-heading"
          >
            {problemsSection.image && (
              <figure className="overflow-hidden border border-line bg-ink-2">
                <img
                  src={problemsSection.image.src}
                  alt={problemsSection.image.alt}
                  loading="lazy"
                  decoding="async"
                  className="block w-full aspect-[4/5] object-cover object-center"
                />
              </figure>
            )}
            <div>
              <h2
                id="problems-heading"
                className="font-display font-normal leading-[1.2] text-bone-2 mb-7"
                style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
              >
                {problemsSection.title}
              </h2>
              {problemsSection.bullets?.length > 0 && (
                <ul className="list-disc pl-5 space-y-1.5">
                  {problemsSection.bullets.map(item => (
                    <li key={item} className="text-[0.95rem] leading-[1.75] text-bone-2">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <div className="max-w-[1100px] mx-auto mt-16 pt-16 border-t border-line">
          <StorySplitSection {...whyWeCareSection} asideWithImage />
          <StorySplitSection {...solutionSection} />
          <StorySplitSection {...drapeSection} imagePosition="left" />
          <PromoVideo {...promoVideo} />
        </div>
      </main>
      <Footer />
    </>
  )
}
