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
  const [addedId,   setAddedId]   = useState(null) // brief "Added!" feedback

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
      <main className="shop-page">
        <div className="shop-page__header">
          <p className="shop-page__eyebrow">WYRTH CO.</p>
          <h1 className="shop-page__title">The Collection</h1>
          <p className="shop-page__sub">Professional capes built to last.</p>
        </div>

        {loading && <div className="shop-page__state">Loading…</div>}
        {!loading && products.length === 0 && (
          <div className="shop-page__state">No products available yet. Check back soon.</div>
        )}

        {products.length > 0 && (
          <div className="shop-page__grid">
            {products.map(p => (
              <article key={p.productId} className="product-card">
                {p.imageUrl && (
                  <div className="product-card__img-wrap">
                    <img src={p.imageUrl} alt={p.name} className="product-card__img" />
                  </div>
                )}
                <div className="product-card__body">
                  <h2 className="product-card__name">{p.name}</h2>
                  {p.description && <p className="product-card__desc">{p.description}</p>}
                  <p className="product-card__price">{formatPrice(p.priceInCents)}</p>

                  <button
                    className={`btn btn--gold product-card__cta${addedId === p.productId ? ' product-card__cta--added' : ''}`}
                    onClick={() => handleAddToCart(p)}
                  >
                    {addedId === p.productId ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
