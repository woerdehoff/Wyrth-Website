import { useState, useEffect } from 'react'
import { useMsal, useIsAuthenticated, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'
import { defaultContent } from '../content'

const CONTENT_API_URL = import.meta.env.VITE_CONTENT_API_URL

// ── Field primitives ─────────────────────────────────────────────────

function Field({ label, value, onChange, rows, hint }) {
  return (
    <div className="afield">
      <label className="afield__label">{label}</label>
      {hint && <p className="afield__hint">{hint}</p>}
      {rows
        ? <textarea className="afield__input afield__input--ta" rows={rows} value={value} onChange={e => onChange(e.target.value)} />
        : <input    className="afield__input"                  type="text"  value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="atoggle">
      <span className="atoggle__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`atoggle__btn${checked ? ' atoggle__btn--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="atoggle__thumb" />
      </button>
    </label>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'announcement', label: 'Announcement' },
  { id: 'hero',         label: 'Hero' },
  { id: 'cape',         label: 'The Cape' },
  { id: 'audiences',   label: 'Audiences' },
  { id: 'features',    label: 'Features' },
  { id: 'statement',   label: 'Statement' },
  { id: 'products',    label: 'Products' },
  { id: 'orders',      label: 'Orders' },
]

const SHOP_TABS = new Set(['products', 'orders'])

// ── Section editors ───────────────────────────────────────────────────

function AnnouncementTab({ draft, setDraft }) {
  const on = !!draft.announcement
  function toggle(v) {
    setDraft(d => ({ ...d, announcement: v ? { message: '', link: '' } : null }))
  }
  function set(field, value) {
    setDraft(d => ({ ...d, announcement: { ...d.announcement, [field]: value } }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Announcement Banner</h2>
      <p className="atab__desc">Displays a dismissible banner at the top of the site. Use it for sales, new drops, or news.</p>
      <Toggle label="Show banner" checked={on} onChange={toggle} />
      {on && (
        <>
          <Field label="Message" value={draft.announcement.message} onChange={v => set('message', v)} rows={2} />
          <Field label="Link URL (optional)" value={draft.announcement.link || ''} onChange={v => set('link', v)} hint="Leave blank for no link." />
        </>
      )}
    </section>
  )
}

function HeroTab({ draft, setDraft }) {
  function set(field, value) {
    setDraft(d => ({ ...d, hero: { ...d.hero, [field]: value } }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Hero Section</h2>
      <Field label="Eyebrow (small text above WYRTH)"  value={draft.hero.eyebrow} onChange={v => set('eyebrow', v)} />
      <Field label="Sub-headline (below the divider line)" value={draft.hero.sub}     onChange={v => set('sub', v)} />
      <Field label="Tagline (smaller secondary line)"  value={draft.hero.tagline} onChange={v => set('tagline', v)} />
    </section>
  )
}

function CapeTab({ draft, setDraft }) {
  function set(field, value) {
    setDraft(d => ({ ...d, cape: { ...d.cape, [field]: value } }))
  }
  function setStat(i, field, value) {
    const stats = draft.cape.stats.map((s, si) => si === i ? { ...s, [field]: value } : s)
    setDraft(d => ({ ...d, cape: { ...d.cape, stats } }))
  }
  function setBadge(i, value) {
    const badges = draft.cape.badges.map((b, bi) => bi === i ? value : b)
    setDraft(d => ({ ...d, cape: { ...d.cape, badges } }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">The Cape Section</h2>
      <div className="atab__group">
        <h3 className="atab__group-title">Title</h3>
        <Field label="Line 1" value={draft.cape.titleLine1} onChange={v => set('titleLine1', v)} />
        <Field label="Line 2 (italic / gold)" value={draft.cape.titleLine2} onChange={v => set('titleLine2', v)} />
      </div>
      <div className="atab__group">
        <h3 className="atab__group-title">Body Copy</h3>
        <Field label="Paragraph 1" value={draft.cape.body1} onChange={v => set('body1', v)} rows={4} />
        <Field label="Paragraph 2" value={draft.cape.body2} onChange={v => set('body2', v)} rows={4} />
      </div>
      <div className="atab__group">
        <h3 className="atab__group-title">Stats</h3>
        {draft.cape.stats.map((s, i) => (
          <div key={i} className="atab__row">
            <Field label="Value" value={s.value} onChange={v => setStat(i, 'value', v)} />
            <Field label="Label" value={s.label} onChange={v => setStat(i, 'label', v)} />
          </div>
        ))}
      </div>
      <div className="atab__group">
        <h3 className="atab__group-title">Badges</h3>
        {draft.cape.badges.map((b, i) => (
          <Field key={i} label={`Badge ${i + 1}`} value={b} onChange={v => setBadge(i, v)} />
        ))}
      </div>
    </section>
  )
}

function AudiencesTab({ draft, setDraft }) {
  function set(i, field, value) {
    const audiences = draft.audiences.map((a, ai) => ai === i ? { ...a, [field]: value } : a)
    setDraft(d => ({ ...d, audiences }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Audience Cards</h2>
      {draft.audiences.map((a, i) => (
        <div key={i} className="atab__card">
          <h3 className="atab__card-title">{a.title}</h3>
          <Field label="For-label (e.g. FOR THE)" value={a.tag}   onChange={v => set(i, 'tag',   v)} />
          <Field label="Title"                    value={a.title} onChange={v => set(i, 'title', v)} />
          <Field label="Description"              value={a.desc}  onChange={v => set(i, 'desc',  v)} rows={3} />
        </div>
      ))}
    </section>
  )
}

function FeaturesTab({ draft, setDraft }) {
  function set(i, field, value) {
    const features = draft.features.map((f, fi) => fi === i ? { ...f, [field]: value } : f)
    setDraft(d => ({ ...d, features }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Feature Cards</h2>
      {draft.features.map((f, i) => (
        <div key={i} className="atab__card">
          <h3 className="atab__card-title">{f.num} — {f.title}</h3>
          <Field label="Title"       value={f.title} onChange={v => set(i, 'title', v)} />
          <Field label="Description" value={f.desc}  onChange={v => set(i, 'desc',  v)} rows={3} />
        </div>
      ))}
    </section>
  )
}

function StatementTab({ draft, setDraft }) {
  function set(value) {
    setDraft(d => ({ ...d, statement: { quote: value } }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Statement Quote</h2>
      <p className="atab__desc">The large italic pull-quote displayed in the Statement section. Do not include quotation marks — they are added automatically.</p>
      <Field label="Quote text" value={draft.statement.quote} onChange={set} rows={3} />
    </section>
  )
}

// ── Shop: Products tab ────────────────────────────────────────────────

const EMPTY_PRODUCT = { productId: '', name: '', description: '', priceInCents: '', imageUrl: '', active: true }

function ProductsTab({ products, onSave, onDelete, status }) {
  const [form,    setForm]    = useState(EMPTY_PRODUCT)
  const [editing, setEditing] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function startEdit(p) {
    setForm({ ...p, priceInCents: String(p.priceInCents) })
    setEditing(true)
  }

  function cancelEdit() {
    setForm(EMPTY_PRODUCT)
    setEditing(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cents = Math.round(parseFloat(form.priceInCents) * 100)
    if (!form.productId || !form.name || !cents) return
    await onSave({ ...form, priceInCents: cents })
    setForm(EMPTY_PRODUCT)
    setEditing(false)
  }

  return (
    <section className="atab">
      <h2 className="atab__title">{editing ? 'Edit Product' : 'Add Product'}</h2>
      <p className="atab__desc">Products are stored in DynamoDB and shown on the /shop page.</p>
      <form onSubmit={handleSubmit}>
        <Field label="Product ID (slug, e.g. capsule-cape)" value={form.productId} onChange={v => set('productId', v)}
          hint="Lowercase letters, numbers, hyphens. This is the unique key — it will be normalised on save." />
        <Field label="Name" value={form.name} onChange={v => set('name', v)} />
        <Field label="Description" value={form.description} onChange={v => set('description', v)} rows={3} />
        <Field label="Price (in cents — e.g. 8900 = $89.00)" value={form.priceInCents} onChange={v => set('priceInCents', v)}
          hint="Enter the price in cents. $89.00 = 8900" />
        <Field label="Image URL" value={form.imageUrl} onChange={v => set('imageUrl', v)} />
        <Toggle label="Active (visible in shop)" checked={form.active} onChange={v => set('active', v)} />
        <div className="atab__actions">
          <button type="submit" className="btn btn--gold" disabled={status === 'saving'}>
            {editing ? 'Update Product' : 'Add Product'}
          </button>
          {editing && (
            <button type="button" className="btn btn--outline" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </form>

      {products === null && <p className="atab__desc" style={{ marginTop: '2rem' }}>Loading products…</p>}
      {products?.length === 0 && <p className="atab__desc" style={{ marginTop: '2rem' }}>No products yet. Add one above.</p>}

      {products?.length > 0 && (
        <div className="atab__group" style={{ marginTop: '2.5rem' }}>
          <h3 className="atab__group-title">Existing Products</h3>
          {products.map(p => (
            <div key={p.productId} className="product-admin-row">
              <div className="product-admin-row__info">
                <span className="product-admin-row__name">{p.name}</span>
                <span className="product-admin-row__price">${(p.priceInCents / 100).toFixed(2)}</span>
                <span className={`product-admin-row__badge product-admin-row__badge--${p.active ? 'active' : 'off'}`}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="product-admin-row__actions">
                <button className="btn btn--sm" onClick={() => startEdit(p)}>Edit</button>
                <button className="btn btn--sm btn--danger" onClick={() => onDelete(p.productId)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Shop: Orders tab ──────────────────────────────────────────────────

function OrdersTab({ orders }) {
  if (orders === null) {
    return (
      <section className="atab">
        <h2 className="atab__title">Orders</h2>
        <p className="atab__desc">Loading orders…</p>
      </section>
    )
  }
  if (orders.length === 0) {
    return (
      <section className="atab">
        <h2 className="atab__title">Orders</h2>
        <p className="atab__desc">No orders yet.</p>
      </section>
    )
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Orders ({orders.length})</h2>
      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.orderId}>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>{o.customerName || '—'}</td>
                <td>{o.customerEmail || '—'}</td>
                <td>${(o.amountTotal / 100).toFixed(2)}</td>
                <td><span className={`order-status order-status--${o.status}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Login page ────────────────────────────────────────────────────────

function LoginPage() {
  const { instance } = useMsal()
  function handleLogin() {
    instance.loginRedirect(loginRequest)
  }
  return (
    <div className="alogin">
      <div className="alogin__card">
        <div className="alogin__logo">WYRTH</div>
        <h1 className="alogin__heading">Admin Portal</h1>
        <p className="alogin__sub">Sign in with your Microsoft account to manage site content.</p>
        <button className="btn btn--gold" onClick={handleLogin}>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  )
}

// ── Main admin panel ──────────────────────────────────────────────────

function AdminPanel() {
  const { instance, accounts } = useMsal()
  const account = accounts[0]

  const [draft,     setDraft]     = useState(defaultContent)
  const [activeTab, setActiveTab] = useState('announcement')
  const [status,    setStatus]    = useState(null) // null | 'loading' | 'saving' | 'saved' | 'error'
  const [errorMsg,  setErrorMsg]  = useState('')

  // Shop state
  const [products,    setProducts]    = useState(null)
  const [orders,      setOrders]      = useState(null)
  const [shopStatus,  setShopStatus]  = useState(null)
  const [shopError,   setShopError]   = useState('')

  // Load current live content on mount
  useEffect(() => {
    if (!CONTENT_API_URL) return
    setStatus('loading')
    fetch(`${CONTENT_API_URL}/content`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDraft(data); setStatus(null) })
      .catch(() => setStatus(null))
  }, [])

  // Lazy-load shop data when tab first opened
  useEffect(() => {
    if (activeTab === 'products' && products === null) loadProducts()
    if (activeTab === 'orders'   && orders === null)   loadOrders()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Token helper ───────────────────────────────────────────────────
  async function getToken() {
    try {
      const res = await instance.acquireTokenSilent({ ...loginRequest, account })
      return res.idToken
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({ ...loginRequest, account })
      }
      throw e
    }
  }

  // ── Products API ───────────────────────────────────────────────────
  async function loadProducts() {
    setShopError('')
    try {
      const token = await getToken()
      const res = await fetch(`${CONTENT_API_URL}/shop/products/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setProducts(data.products || [])
    } catch (err) {
      setShopError(err.message)
      setProducts([])
    }
  }

  async function saveProduct(product) {
    setShopStatus('saving')
    setShopError('')
    try {
      const token = await getToken()
      const res = await fetch(`${CONTENT_API_URL}/shop/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(product),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setShopStatus(null)
      loadProducts()
    } catch (err) {
      setShopError(err.message)
      setShopStatus(null)
    }
  }

  async function deleteProduct(productId) {
    if (!window.confirm(`Delete product "${productId}"? This cannot be undone.`)) return
    setShopStatus('saving')
    setShopError('')
    try {
      const token = await getToken()
      const res = await fetch(`${CONTENT_API_URL}/shop/products/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setShopStatus(null)
      loadProducts()
    } catch (err) {
      setShopError(err.message)
      setShopStatus(null)
    }
  }

  // ── Orders API ─────────────────────────────────────────────────────
  async function loadOrders() {
    setShopError('')
    try {
      const token = await getToken()
      const res = await fetch(`${CONTENT_API_URL}/shop/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setOrders(data.orders || [])
    } catch (err) {
      setShopError(err.message)
      setOrders([])
    }
  }

  async function handlePublish() {
    setStatus('saving')
    setErrorMsg('')
    try {
      let tokenRes
      try {
        tokenRes = await instance.acquireTokenSilent({ ...loginRequest, account })
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError) {
          await instance.acquireTokenRedirect({ ...loginRequest, account })
          return
        }
        throw e
      }

      const res = await fetch(`${CONTENT_API_URL}/content`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${tokenRes.idToken}`,
        },
        body: JSON.stringify({ content: draft }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      setStatus('saved')
      setTimeout(() => setStatus(null), 4000)
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  function handleLogout() {
    instance.logoutRedirect()
  }

  const tabMap = {
    announcement: <AnnouncementTab draft={draft} setDraft={setDraft} />,
    hero:         <HeroTab         draft={draft} setDraft={setDraft} />,
    cape:         <CapeTab         draft={draft} setDraft={setDraft} />,
    audiences:    <AudiencesTab    draft={draft} setDraft={setDraft} />,
    features:     <FeaturesTab     draft={draft} setDraft={setDraft} />,
    statement:    <StatementTab    draft={draft} setDraft={setDraft} />,
    products:     <ProductsTab     products={products} onSave={saveProduct} onDelete={deleteProduct} status={shopStatus} />,
    orders:       <OrdersTab       orders={orders} />,
  }

  return (
    <div className="admin">
      {/* Header */}
      <header className="admin__header">
        <div className="admin__header-left">
          <a href="/" className="admin__brand">WYRTH</a>
          <span className="admin__header-sep">/</span>
          <span className="admin__header-page">Admin</span>
        </div>
        <div className="admin__header-right">
          {status === 'loading' && <span className="admin__status admin__status--muted">Loading content…</span>}
          {status === 'saving'  && <span className="admin__status admin__status--muted">Publishing…</span>}
          {status === 'saved'   && <span className="admin__status admin__status--ok">✓ Published</span>}
          {status === 'error'   && <span className="admin__status admin__status--err" title={errorMsg}>✗ Error: {errorMsg}</span>}
          {shopError && SHOP_TABS.has(activeTab) && <span className="admin__status admin__status--err">{shopError}</span>}
          {shopStatus === 'saving' && SHOP_TABS.has(activeTab) && <span className="admin__status admin__status--muted">Saving…</span>}
          <span className="admin__user">{account?.name ?? account?.username}</span>
          {!SHOP_TABS.has(activeTab) && (
            <button className="admin__publish btn btn--gold" onClick={handlePublish} disabled={status === 'saving' || status === 'loading'}>
              Publish
            </button>
          )}
          <button className="admin__logout" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="admin__tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`admin__tab${activeTab === t.id ? ' admin__tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="admin__body">
        {tabMap[activeTab]}
      </main>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────

export default function Admin() {
  return (
    <>
      <AuthenticatedTemplate><AdminPanel /></AuthenticatedTemplate>
      <UnauthenticatedTemplate><LoginPage /></UnauthenticatedTemplate>
    </>
  )
}
