import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function CartDrawer() {
  const { token } = useAuth()
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

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-[199] transition-[background] duration-300 ease-out ${
          open ? 'bg-black/55 pointer-events-auto' : 'bg-transparent pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-ink border-l border-line z-[200] flex flex-col will-change-transform transition-transform duration-[320ms] ease-[cubic-bezier(.4,0,.2,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-line">
          <h2 className="font-display text-[1.35rem] font-medium tracking-[.06em] text-bone">
            Your Cart {count > 0 && <span className="text-xs text-bone-2 ml-2">{count}</span>}
          </h2>
          <button
            className="bg-transparent border-0 text-bone-2 text-2xl leading-none min-w-11 min-h-11 flex items-center justify-center p-0 cursor-pointer transition-colors hover:text-bone"
            onClick={() => setOpen(false)}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8 text-center text-bone-2 text-[0.9rem] tracking-[.04em]">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="btn btn--gold" onClick={() => setOpen(false)}>
              Shop the Cape
            </Link>
          </div>
        ) : (
          <>
            <ul
              className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5"
              style={{ overscrollBehavior: 'contain' }}
            >
              {items.map(item => (
                <li key={item.productId} className="grid grid-cols-[72px_1fr] gap-3.5 items-start">
                  {item.imageUrl && (
                    <div className="w-[72px] h-[72px] rounded-[3px] overflow-hidden bg-ink-2">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="text-[0.82rem] tracking-[.05em] text-bone font-medium uppercase">
                      {item.name}
                    </p>
                    <p className="text-[0.82rem] text-magenta">
                      {formatPrice(item.priceInCents)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        className="bg-ink-3 border border-line text-bone w-11 h-11 flex items-center justify-center text-lg leading-none rounded-sm cursor-pointer transition-colors hover:bg-ink-4"
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="text-[0.82rem] text-bone min-w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        className="bg-ink-3 border border-line text-bone w-11 h-11 flex items-center justify-center text-lg leading-none rounded-sm cursor-pointer transition-colors hover:bg-ink-4"
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <button
                        className="bg-transparent border-0 text-bone-2 cursor-pointer text-base ml-auto min-w-11 min-h-11 flex items-center justify-center transition-colors hover:text-bone"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div
              className="px-6 pt-5 border-t border-line flex flex-col gap-3"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-between text-[0.9rem] text-bone tracking-[.06em]">
                <span>Total</span>
                <span className="text-magenta font-medium">{formatPrice(total)}</span>
              </div>
              <p className="text-[0.72rem] text-bone-2 tracking-[.04em] text-center uppercase">
                Free U.S. shipping
              </p>
              {checkoutError && (
                <p className="text-[0.72rem] text-[#e07070] leading-normal">{checkoutError}</p>
              )}
              <button
                className="w-full px-6 py-3.5 bg-magenta text-ink border-0 font-body text-[0.72rem] font-semibold tracking-[.14em] uppercase cursor-pointer transition-[background,opacity] hover:bg-magenta-lt disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Redirecting…' : 'Checkout'}
              </button>
              <button
                className="bg-transparent border-0 text-bone-2 text-[0.7rem] tracking-[.08em] uppercase cursor-pointer text-center py-1 transition-colors hover:text-bone"
                onClick={clearCart}
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
