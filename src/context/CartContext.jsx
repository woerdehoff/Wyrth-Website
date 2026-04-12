import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'

const API_URL = import.meta.env.VITE_CONTENT_API_URL

const CartContext = createContext({
  items: [], count: 0, total: 0,
  open: false, setOpen: () => {},
  addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
})

export function CartProvider({ children }) {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [open,  setOpen]  = useState(false)
  const syncTimer = useRef(null)

  // Fetch cart from DynamoDB when user logs in
  useEffect(() => {
    if (token && API_URL) {
      fetch(`${API_URL}/shop/cart`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.items) setItems(data.items) })
        .catch(() => {})
    } else if (!token) {
      setItems([])
    }
  }, [token])

  // Debounced sync to DynamoDB — fires 1s after last cart change
  const scheduleSync = useCallback((nextItems) => {
    if (!token || !API_URL) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      fetch(`${API_URL}/shop/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: nextItems }),
      }).catch(() => {})
    }, 1000)
  }, [token])

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.productId)
      const next = existing
        ? prev.map(i => i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, {
            productId:    product.productId,
            name:         product.name,
            priceInCents: product.priceInCents,
            imageUrl:     product.imageUrl || '',
            quantity:     1,
          }]
      scheduleSync(next)
      return next
    })
    setOpen(true)
  }

  function removeItem(productId) {
    setItems(prev => {
      const next = prev.filter(i => i.productId !== productId)
      scheduleSync(next)
      return next
    })
  }

  function updateQty(productId, qty) {
    if (qty < 1) { removeItem(productId); return }
    setItems(prev => {
      const next = prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
      scheduleSync(next)
      return next
    })
  }

  function clearCart() {
    setItems([])
    scheduleSync([])
  }

  const count = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + i.priceInCents * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, count, total, open, setOpen, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
