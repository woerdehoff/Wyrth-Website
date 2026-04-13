import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function CartDrawer() {
  const { user, login, logout, googleClientId, token } = useAuth()
  const { items, count, total, open, setOpen, removeItem, updateQty, clearCart } = useCart()
  const overlayRef = useRef(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError,   setCheckoutError]   = useState(null)

  async function handleCheckout() {
    if (!API_URL) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res  = await fetch(`${API_URL}/shop/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setCheckoutError(err.message || 'Something went wrong. Please try again.')
      setCheckoutLoading(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={`cart-overlay${open ? ' cart-overlay--open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className={`cart-drawer${open ? ' cart-drawer--open' : ''}`} aria-label="Shopping cart">
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">Your Cart {count > 0 && <span className="cart-drawer__count">{count}</span>}</h2>
          <button className="cart-drawer__close" onClick={() => setOpen(false)} aria-label="Close cart">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            {!user ? (
              <>
                <p className="cart-drawer__empty-title">Sign in to shop</p>
                <p className="cart-drawer__empty-sub">Use your Google account to add items and save your cart.</p>
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
                  <p className="cart-drawer__empty-sub">Google login not configured yet.</p>
                )}
                <Link to="/shop" className="cart-drawer__empty-link" onClick={() => setOpen(false)}>Browse the collection →</Link>
              </>
            ) : (
              <>
                <p>Your cart is empty.</p>
                <Link to="/shop" className="btn btn--gold" onClick={() => setOpen(false)}>Shop the Cape</Link>
              </>
            )}
          </div>
        ) : (
          <>
            <ul className="cart-drawer__items">
              {items.map(item => (
                <li key={item.productId} className="cart-item">
                  {item.imageUrl && (
                    <div className="cart-item__img-wrap">
                      <img src={item.imageUrl} alt={item.name} className="cart-item__img" />
                    </div>
                  )}
                  <div className="cart-item__info">
                    <p className="cart-item__name">{item.name}</p>
                    <p className="cart-item__price">{formatPrice(item.priceInCents)}</p>
                    <div className="cart-item__qty cart-item__controls">
                      <button className="cart-item__qty-btn" onClick={() => updateQty(item.productId, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                      <span className="cart-item__qty">{item.quantity}</span>
                      <button className="cart-item__qty-btn" onClick={() => updateQty(item.productId, item.quantity + 1)} aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <button
                    className="cart-item__remove"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.name}`}
                  >✕</button>
                </li>
              ))}
            </ul>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="cart-drawer__shipping">Free U.S. shipping</p>
              {checkoutError && (
                <p className="cart-drawer__checkout-err">{checkoutError}</p>
              )}
              <button
                className="btn btn--gold cart-drawer__checkout"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Redirecting…' : 'Checkout'}
              </button>
              <button className="cart-drawer__clear" onClick={clearCart}>Clear cart</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
