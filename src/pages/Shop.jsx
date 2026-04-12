import { useState, useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import AnnouncementBanner from '../components/AnnouncementBanner'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function Shop() {
  const { user, token, login, googleClientId } = useAuth()
  const { addItem } = useCart()
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [addedId,   setAddedId]   = useState(null) // brief "Added!" feedback

  useEffect(() => {
    if (!API_URL) { setLoading(false); return }
    fetch(`${API_URL}/shop/products`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setProducts(data.products || []); setLoading(false) })
      .catch(() => { setError('Unable to load products.'); setLoading(false) })
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
          <p className="shop-page__sub">Professional capes with a patent-pending design. Built to last.</p>
        </div>

        {loading && <div className="shop-page__state">Loading…</div>}
        {error   && <div className="shop-page__state shop-page__state--err">{error}</div>}
        {!loading && !error && products.length === 0 && (
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

                  {user ? (
                    <button
                      className={`btn btn--gold product-card__cta${addedId === p.productId ? ' product-card__cta--added' : ''}`}
                      onClick={() => handleAddToCart(p)}
                    >
                      {addedId === p.productId ? '✓ Added to Cart' : 'Add to Cart'}
                    </button>
                  ) : (
                    <div className="product-card__login">
                      <p className="product-card__login-hint">Sign in to add to cart</p>
                      {googleClientId ? (
                        <GoogleLogin
                          onSuccess={resp => login(resp.credential)}
                          onError={() => {}}
                          theme="filled_black"
                          shape="rectangular"
                          text="signin_with"
                          size="large"
                        />
                      ) : (
                        <p className="product-card__login-hint product-card__login-hint--muted">
                          Google login not configured yet.
                        </p>
                      )}
                    </div>
                  )}
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
