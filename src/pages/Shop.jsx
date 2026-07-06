import { useState, useEffect } from 'react'
import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import { defaultProducts } from '../content'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function Shop() {
  const { addItem } = useCart()
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [addedId,   setAddedId]   = useState(null)

  useEffect(() => {
    if (!API_URL) {
      setProducts(defaultProducts)
      setLoading(false)
      return
    }
    fetch(`${API_URL}/shop/products`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const live = data.products || []
        setProducts(live.length ? live : defaultProducts)
        setLoading(false)
      })
      .catch(() => {
        setProducts(defaultProducts)
        setLoading(false)
      })
  }, [])

  function handleAddToCart(product) {
    addItem(product)
    setAddedId(product.productId)
    setTimeout(() => setAddedId(null), 1500)
  }

  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main className="min-h-[80vh] pb-24">
        <div className="text-center pt-28 px-6 pb-16 border-b border-line">
          <p className="font-body text-[0.6rem] font-semibold tracking-[.3em] uppercase text-magenta mb-4">
            WYRTH CO.
          </p>
          <h1
            className="font-display text-bone mb-4"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
          >
            The Collection
          </h1>
          <p className="text-base text-bone-2 max-w-[480px] mx-auto leading-[1.65]">
            Professional capes built to last.
          </p>
        </div>

        {loading && (
          <div className="text-center px-6 py-16 text-bone-2 text-[0.95rem]">Loading…</div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center px-6 py-16 text-bone-2 text-[0.95rem]">
            No products available yet. Check back soon.
          </div>
        )}

        {products.length > 0 && (
          <div
            className="grid gap-[2px] max-w-[1400px] mx-auto pt-10 px-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
          >
            {products.map(p => {
              const isAdded = addedId === p.productId
              return (
                <article
                  key={p.productId}
                  className="group bg-ink-2 border border-line flex flex-col transition-colors hover:border-line-warm"
                >
                  {p.imageUrl && (
                    <div className="aspect-[4/3] overflow-hidden bg-ink-3">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 ease-brand-out group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <div className="p-8 flex flex-col gap-3 flex-1">
                    <h2 className="font-display text-2xl text-bone">{p.name}</h2>
                    {p.description && (
                      <p className="text-[0.9rem] text-bone-2 leading-[1.6] flex-1">
                        {p.description}
                      </p>
                    )}
                    <p className="font-body text-lg font-semibold text-magenta-lt tracking-[.05em]">
                      {formatPrice(p.priceInCents)}
                    </p>
                    <button
                      className={`btn btn--gold w-full mt-2 ${isAdded ? 'product-cta-added' : ''}`}
                      onClick={() => handleAddToCart(p)}
                    >
                      {isAdded ? '✓ Added to Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
