import { useState, useEffect, useRef } from 'react'
import AnnouncementBanner from './AnnouncementBanner'
import Nav from './Nav'
import Footer from './Footer'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

function FaqAccordion({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(null)

  if (!items.length) return null

  return (
    <section className="product-audience-page__faq" aria-label="Frequently asked questions">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        const panelId = `faq-panel-${i}`
        const buttonId = `faq-button-${i}`

        return (
          <div key={item.question} className={`product-audience-page__faq-item${isOpen ? ' product-audience-page__faq-item--open' : ''}`}>
            <button
              type="button"
              id={buttonId}
              className="product-audience-page__faq-trigger"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span>{item.question}</span>
              <svg className="product-audience-page__faq-chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="product-audience-page__faq-panel"
              hidden={!isOpen}
            >
              <p>{item.answer}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function StorySplitSection({ title, body, aside, image, imagePosition = 'right', asideWithImage = false }) {
  if (!title && !body) return null

  return (
    <section className={`product-audience-page__story${imagePosition === 'left' ? ' product-audience-page__story--image-left' : ''}`}>
      <div className="product-audience-page__story-copy">
        {title && <h2 className="product-audience-page__story-title">{title}</h2>}
        {body && <p className="product-audience-page__story-body">{body}</p>}
        {aside && !asideWithImage && <p className="product-audience-page__story-aside">{aside}</p>}
      </div>
      {(image || (aside && asideWithImage)) && (
        <div className="product-audience-page__story-media">
          {aside && asideWithImage && <p className="product-audience-page__story-aside">{aside}</p>}
          {image && (
            <figure className="product-audience-page__story-figure">
              <img src={image.src} alt={image.alt} />
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
    <section className="product-audience-page__video-block" aria-label={alt || 'Product video'}>
      {label && <span className="product-audience-page__video-label">{label}</span>}
      <div className="product-audience-page__video-wrap">
        <video
          ref={videoRef}
          className="product-audience-page__video"
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          aria-label={alt || 'Product video'}
        />
        {!playing && (
          <button
            type="button"
            className="product-audience-page__video-play"
            onClick={handlePlay}
            aria-label="Play video"
          >
            {tagline && <p className="product-audience-page__video-tagline">{tagline}</p>}
            <span className="product-audience-page__video-play-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none">
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

  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="product-audience-page">
        <div className={`product-audience-page__layout${gallery.length === 0 ? ' product-audience-page__layout--solo' : ''}`}>
          {gallery.length > 0 && (
            <div className="product-audience-page__gallery">
              <div className="product-audience-page__main-img">
                <img src={gallery[activeImage].src} alt={gallery[activeImage].alt} />
              </div>
              {gallery.length > 1 && (
                <div className="product-audience-page__thumbs">
                  {gallery.slice(1).map((img, i) => {
                    const index = i + 1
                    return (
                      <button
                        key={img.src}
                        type="button"
                        className={`product-audience-page__thumb${index === activeImage ? ' product-audience-page__thumb--active' : ''}`}
                        onClick={() => setActiveImage(index)}
                        aria-label={`View image ${index + 1}`}
                      >
                        <img src={img.src} alt={img.alt} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="product-audience-page__info">
            <p className="product-audience-page__brand">{brand}</p>
            <h1 className="product-audience-page__title">{title}</h1>

            {displayPrice != null && (
              <p className="product-audience-page__price">{formatPrice(displayPrice)} USD</p>
            )}

            {shippingNote && (
              <p className="product-audience-page__note">{shippingNote}</p>
            )}

            {installmentNote && installmentAmount && (
              <p className="product-audience-page__installment">
                Pay in 4 interest-free installments of {installmentAmount} with{' '}
                <span className="product-audience-page__shop-pay">shop Pay</span>
                {' '}<a href="/shop">Learn more</a>
              </p>
            )}

            {description && (
              <p className="product-audience-page__desc">{description}</p>
            )}
          </div>
        </div>

        {showcaseImages.length > 0 && (
          <section className="product-audience-page__showcase" aria-label="The cape in the salon">
            <figure className="product-audience-page__showcase-hero">
              <img src={showcaseImages[0].src} alt={showcaseImages[0].alt} />
            </figure>
            {showcaseImages.length > 1 && (
              <div className="product-audience-page__showcase-grid">
                {showcaseImages.slice(1).map(img => (
                  <figure key={img.src} className="product-audience-page__showcase-item">
                    <img src={img.src} alt={img.alt} />
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}

        <FaqAccordion items={faq} />

        {problemsSection && (
          <section className="product-audience-page__problems" aria-labelledby="problems-heading">
            {problemsSection.image && (
              <figure className="product-audience-page__problems-figure">
                <img src={problemsSection.image.src} alt={problemsSection.image.alt} />
              </figure>
            )}
            <div className="product-audience-page__problems-content">
              <h2 id="problems-heading" className="product-audience-page__problems-title">
                {problemsSection.title}
              </h2>
              {problemsSection.bullets?.length > 0 && (
                <ul className="product-audience-page__problems-list">
                  {problemsSection.bullets.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <div className="product-audience-page__story-group">
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