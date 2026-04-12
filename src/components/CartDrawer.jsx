import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function CartDrawer() {
  const { items, count, total, open, setOpen, removeItem, updateQty, clearCart } = useCart()
  const overlayRef = useRef(null)

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
            <p>Your cart is empty.</p>
            <button className="btn btn--gold" onClick={() => setOpen(false)}>Continue Shopping</button>
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
                    <div className="cart-item__qty">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
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
              <Link
                to="/shop/checkout-redirect"
                className="btn btn--gold cart-drawer__checkout"
                onClick={() => {
                  setOpen(false)
                  // POC: send them to Shopify until Stripe is wired in
                  window.location.href = 'https://wyrthco.com/products/salon-cape'
                }}
              >
                Checkout
              </Link>
              <button className="cart-drawer__clear" onClick={clearCart}>Clear cart</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
