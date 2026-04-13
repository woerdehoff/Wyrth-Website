import React, { useState, useEffect } from 'react'
import { useMsal, useIsAuthenticated, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'
import { defaultContent } from '../content'

const CONTENT_API_URL = import.meta.env.VITE_CONTENT_API_URL

// ── Field primitives ─────────────────────────────────────────────────

function Field({ label, value, onChange, onBlur, rows, hint, prefix, tip }) {
  return (
    <div className="afield">
      <label className="afield__label">
        {label}
        {tip && <Tip text={tip} />}
      </label>
      {hint && <p className="afield__hint">{hint}</p>}
      {rows ? (
        <textarea className="afield__input afield__input--ta" rows={rows} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
      ) : prefix ? (
        <div className="afield__prefix-wrap">
          <span className="afield__prefix">{prefix}</span>
          <input className="afield__input afield__input--prefixed" type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
        </div>
      ) : (
        <input className="afield__input" type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
      )}
    </div>
  )
}

function ImageField({ label, value, onChange, onUpload }) {
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [fileName,   setFileName]   = useState('')
  const [dragOver,   setDragOver]   = useState(false)
  const [uploadErr,  setUploadErr]  = useState('')
  const fileInputRef = React.useRef(null)

  const MAX_MB = 5
  const MAX_BYTES = MAX_MB * 1024 * 1024

  async function handleFile(file) {
    if (!file || !onUpload) return
    if (file.size > MAX_BYTES) {
      setUploadErr(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_MB} MB.`)
      return
    }
    setUploading(true)
    setProgress(0)
    setUploadErr('')
    setFileName(file.name)
    // Simulate progress ticks while upload runs
    const ticker = setInterval(() => setProgress(p => Math.min(p + 12, 88)), 180)
    try {
      const url = await onUpload(file)
      clearInterval(ticker)
      setProgress(100)
      setTimeout(() => setProgress(0), 800)
      if (url) onChange(url)
    } catch (err) {
      clearInterval(ticker)
      setProgress(0)
      setUploadErr(err?.message || 'Upload failed')
    }
    setUploading(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file?.type?.startsWith('image/')) handleFile(file)
  }

  function handleDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setDragOver(false)
  }

  function handleFileInput(e) {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  return (
    <div className="afield">
      <label className="afield__label">{label}</label>
      <div
        className={`afield__dropzone${dragOver ? ' afield__dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="afield__img-preview">
            <img src={value} alt="Preview" />
            <div className="afield__img-actions">
              <button type="button" className="afield__img-replace" onClick={() => fileInputRef.current?.click()}>Replace</button>
              <button type="button" className="afield__img-remove" onClick={() => { onChange(''); setFileName('') }}>✕</button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
          </div>
        ) : (
          <div className="afield__drop-cta">
            {uploading
              ? <span>Uploading {fileName}…</span>
              : <><span>Drop image here or <span className="afield__drop-link">click to upload</span></span><span className="afield__drop-hint">Max {MAX_MB} MB</span></>
            }
            {!uploading && <input type="file" accept="image/*" onChange={handleFileInput} className="afield__file-input" />}
          </div>
        )}
        {uploading && progress > 0 && (
          <div className="afield__progress">
            <div className="afield__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {fileName && !uploading && !uploadErr && <p className="afield__hint afield__hint--ok">✓ {fileName}</p>}
      {uploadErr && <p className="afield__hint afield__hint--err">{uploadErr}</p>}
      <input className="afield__input" type="text" value={value} onChange={e => { onChange(e.target.value); setFileName('') }} placeholder="…or paste an image URL" style={{ marginTop: '0.5rem' }} />
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

// ── Utilities ────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function Spinner() {
  return <span className="admin-spinner" aria-hidden="true" />
}

// ── Toast system ──────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span>{t.message}</span>
          <button className="toast__close" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <div className="amodal-overlay" role="dialog" aria-modal="true">
      <div className="amodal">
        <h2 className="amodal__title">{title}</h2>
        <p className="amodal__body">{body}</p>
        <div className="amodal__actions">
          <button className="btn btn--outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────

function Tip({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="atip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className="atip__icon" aria-label="Help">?</span>
      {open && <span className="atip__bubble" role="tooltip">{text}</span>}
    </span>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '⌂',  group: 'overview' },
  { id: 'announcement', label: 'Announcement', icon: '📣', group: 'content'  },
  { id: 'hero',         label: 'Hero',         icon: '✦',  group: 'content'  },
  { id: 'cape',         label: 'The Cape',     icon: '◈',  group: 'content'  },
  { id: 'audiences',   label: 'Audiences',    icon: '◉',  group: 'content'  },
  { id: 'features',    label: 'Features',     icon: '◧',  group: 'content'  },
  { id: 'statement',   label: 'Statement',    icon: '❝',  group: 'content'  },
  { id: 'products',    label: 'Products',     icon: '▣',  group: 'shop'     },
  { id: 'orders',      label: 'Orders',       icon: '◻',  group: 'shop'     },
]

const SHOP_TABS = new Set(['products', 'orders'])
const CONTENT_TABS = new Set(['announcement', 'hero', 'cape', 'audiences', 'features', 'statement'])

// ── Section editors ───────────────────────────────────────────────────

function DashboardTab({ products, orders, hasChanges, onGoTo }) {
  const activeProducts  = products?.filter(p => p.active) ?? []
  const totalRevenue    = orders?.reduce((s, o) => s + (o.amountTotal || 0), 0) ?? 0
  const recentOrders    = orders?.slice(0, 5) ?? []

  return (
    <section className="atab">
      <h2 className="atab__title">Dashboard</h2>
      <p className="atab__desc">Welcome back. Here's a quick look at your site.</p>

      <div className="dash__stats">
        <div className="dash__stat">
          <span className="dash__stat-value">{products === null ? '—' : products.length}</span>
          <span className="dash__stat-label">Total Products</span>
        </div>
        <div className="dash__stat">
          <span className="dash__stat-value">{products === null ? '—' : activeProducts.length}</span>
          <span className="dash__stat-label">Active in Shop</span>
        </div>
        <div className="dash__stat">
          <span className="dash__stat-value">{orders === null ? '—' : orders.length}</span>
          <span className="dash__stat-label">Total Orders</span>
        </div>
        <div className="dash__stat">
          <span className="dash__stat-value">{orders === null ? '—' : `$${(totalRevenue / 100).toFixed(2)}`}</span>
          <span className="dash__stat-label">Total Revenue</span>
        </div>
      </div>

      <div className="atab__group">
        <h3 className="atab__group-title">Quick Actions</h3>
        <div className="dash__actions">
          <button className="dash__action-btn" onClick={() => onGoTo('products')}>
            <span className="dash__action-icon">▣</span>
            <span className="dash__action-label">Add Product</span>
          </button>
          <button className="dash__action-btn" onClick={() => onGoTo('orders')}>
            <span className="dash__action-icon">◻</span>
            <span className="dash__action-label">View Orders</span>
          </button>
          <button className="dash__action-btn" onClick={() => onGoTo('announcement')}>
            <span className="dash__action-icon">📣</span>
            <span className="dash__action-label">Edit Content</span>
          </button>
        </div>
        {hasChanges && (
          <p className="dash__changes-notice">⚠ You have unpublished content changes. Click <strong>Publish</strong> in the top-right when ready.</p>
        )}
      </div>

      {recentOrders.length > 0 && (
        <div className="atab__group">
          <h3 className="atab__group-title">Recent Orders</h3>
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.orderId}>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.customerName || o.customerEmail || '—'}</td>
                    <td>${(o.amountTotal / 100).toFixed(2)}</td>
                    <td><span className={`order-status order-status--${o.status}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders?.length > 5 && (
            <button className="dash__view-all" onClick={() => onGoTo('orders')}>View all {orders.length} orders →</button>
          )}
        </div>
      )}
    </section>
  )
}

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
          {draft.announcement.message && (
            <div className="atab__preview">
              <span className="atab__preview-label">Preview</span>
              <div className="preview-announcement">
                {draft.announcement.link
                  ? <a href={draft.announcement.link} target="_blank" rel="noopener noreferrer">{draft.announcement.message}</a>
                  : draft.announcement.message}
              </div>
            </div>
          )}
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
      <Field label="Eyebrow"      tip="The small text that appears above the large WYRTH heading on the homepage." value={draft.hero.eyebrow} onChange={v => set('eyebrow', v)} />
      <Field label="Sub-headline" tip="The main line of copy displayed below the gold divider line." value={draft.hero.sub}     onChange={v => set('sub', v)} />
      <Field label="Tagline"      tip="A shorter secondary line shown beneath the sub-headline." value={draft.hero.tagline} onChange={v => set('tagline', v)} />
      <div className="atab__preview">
        <span className="atab__preview-label">Preview</span>
        <div className="preview-hero">
          <p className="preview-hero__eyebrow">{draft.hero.eyebrow}</p>
          <h1 className="preview-hero__title">WYRTH</h1>
          <div className="preview-hero__divider" />
          <p className="preview-hero__sub">{draft.hero.sub}</p>
          <p className="preview-hero__tagline">{draft.hero.tagline}</p>
        </div>
      </div>
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
      <div className="atab__preview">
        <span className="atab__preview-label">Preview</span>
        <div className="preview-cape">
          <p className="preview-cape__title">
            {draft.cape.titleLine1} <em>{draft.cape.titleLine2}</em>
          </p>
          <div className="preview-cape__stats">
            {draft.cape.stats.map((s, i) => (
              <span key={i} className="preview-cape__stat"><strong>{s.value}</strong> {s.label}</span>
            ))}
          </div>
          <div className="preview-cape__badges">
            {draft.cape.badges.filter(Boolean).map((b, i) => (
              <span key={i} className="preview-cape__badge">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AudiencesTab({ draft, setDraft }) {
  function set(i, field, value) {
    const audiences = draft.audiences.map((a, ai) => ai === i ? { ...a, [field]: value } : a)
    setDraft(d => ({ ...d, audiences }))
  }
  function move(i, dir) {
    const arr = [...draft.audiences]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setDraft(d => ({ ...d, audiences: arr }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Audience Cards</h2>
      {draft.audiences.map((a, i) => (
        <div key={i} className="atab__card atab__card--reorderable">
          <div className="atab__card-header">
            <h3 className="atab__card-title">{a.title || `Card ${i + 1}`}</h3>
            <div className="atab__reorder-btns">
              <button type="button" className="atab__reorder-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">▲</button>
              <button type="button" className="atab__reorder-btn" onClick={() => move(i, 1)} disabled={i === draft.audiences.length - 1} title="Move down">▼</button>
            </div>
          </div>
          <Field label="For-label (e.g. FOR THE)" value={a.tag}   onChange={v => set(i, 'tag',   v)} />
          <Field label="Title"                    value={a.title} onChange={v => set(i, 'title', v)} />
          <Field label="Description"              value={a.desc}  onChange={v => set(i, 'desc',  v)} rows={3} />
        </div>
      ))}
      <div className="atab__preview">
        <span className="atab__preview-label">Preview</span>
        <div className="preview-audiences">
          {draft.audiences.map((a, i) => (
            <div key={i} className="preview-audiences__card">
              <span className="preview-audiences__tag">{a.tag}</span>
              <strong>{a.title}</strong>
              <p>{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesTab({ draft, setDraft }) {
  function set(i, field, value) {
    const features = draft.features.map((f, fi) => fi === i ? { ...f, [field]: value } : f)
    setDraft(d => ({ ...d, features }))
  }
  function move(i, dir) {
    const arr = [...draft.features]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setDraft(d => ({ ...d, features: arr }))
  }
  return (
    <section className="atab">
      <h2 className="atab__title">Feature Cards</h2>
      {draft.features.map((f, i) => (
        <div key={i} className="atab__card atab__card--reorderable">
          <div className="atab__card-header">
            <h3 className="atab__card-title">{f.num} — {f.title}</h3>
            <div className="atab__reorder-btns">
              <button type="button" className="atab__reorder-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">▲</button>
              <button type="button" className="atab__reorder-btn" onClick={() => move(i, 1)} disabled={i === draft.features.length - 1} title="Move down">▼</button>
            </div>
          </div>
          <Field label="Title"       value={f.title} onChange={v => set(i, 'title', v)} />
          <Field label="Description" value={f.desc}  onChange={v => set(i, 'desc',  v)} rows={3} />
        </div>
      ))}
      <div className="atab__preview">
        <span className="atab__preview-label">Preview</span>
        <div className="preview-features">
          {draft.features.map((f, i) => (
            <div key={i} className="preview-features__card">
              <span className="preview-features__num">{f.num}</span>
              <strong>{f.title}</strong>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
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
      <div className="atab__preview">
        <span className="atab__preview-label">Preview</span>
        <div className="preview-statement">
          <blockquote>&ldquo;{draft.statement.quote}&rdquo;</blockquote>
          <p>— WYRTH</p>
        </div>
      </div>
    </section>
  )
}

// ── Shop: Products tab ────────────────────────────────────────────────

const EMPTY_PRODUCT = { productId: '', name: '', description: '', priceDollars: '', imageUrl: '', active: true }

function ProductsTab({ products, onSave, onDelete, status, onUploadImage }) {
  const [form,          setForm]          = useState(EMPTY_PRODUCT)
  const [editing,       setEditing]       = useState(false)
  const [formError,     setFormError]     = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [toggling,      setToggling]      = useState(new Set())  // productIds currently being toggled

  async function toggleActive(p) {
    setToggling(s => new Set(s).add(p.productId))
    await onSave({ ...p, active: !p.active })
    setToggling(s => { const n = new Set(s); n.delete(p.productId); return n })
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleNameChange(v) {
    setForm(f => editing ? { ...f, name: v } : { ...f, name: v, productId: slugify(v) })
  }

  function handlePriceChange(raw) {
    // Allow only digits and a single decimal point
    const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    set('priceDollars', cleaned)
  }

  function handlePriceBlur() {
    const val = parseFloat(form.priceDollars)
    if (!isNaN(val) && val > 0) set('priceDollars', val.toFixed(2))
  }

  function startEdit(p) {
    setForm({ ...p, priceDollars: (p.priceInCents / 100).toFixed(2) })
    setEditing(true)
  }

  function cancelEdit() {
    setForm(EMPTY_PRODUCT)
    setEditing(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cents = Math.round(parseFloat(form.priceDollars) * 100)
    if (!form.name)       { setFormError('Name is required.'); return }
    if (!form.priceDollars || isNaN(cents) || cents <= 0) { setFormError('Please enter a valid price.'); return }
    setFormError('')
    await onSave({ ...form, priceInCents: cents })
    setForm(EMPTY_PRODUCT)
    setEditing(false)
  }

  return (
    <section className="atab">
      <h2 className="atab__title">{editing ? 'Edit Product' : 'Add Product'}</h2>
      <p className="atab__desc">Products are stored in DynamoDB and shown on the /shop page.</p>

      <div className="products-tab__layout">
        <div className="products-tab__form">
          <form onSubmit={handleSubmit}>
            {editing && (
              <p className="afield__hint" style={{ marginBottom: '1rem' }}>
                Editing ID: <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{form.productId}</code>
              </p>
            )}
            <Field label="Name" value={form.name} onChange={handleNameChange} tip="The product name shown in the shop and on the purchase page." />
            <Field label="Description" value={form.description} onChange={v => set('description', v)} rows={3} tip="A short description of the product. A few sentences works best." />
            <Field label="Price" value={form.priceDollars} onChange={handlePriceChange} onBlur={handlePriceBlur}
              hint="Enter in dollars, e.g. 59.99" prefix="$" tip="The price customers will pay. Enter as dollars and cents, like 59.99." />
            <ImageField label="Image" value={form.imageUrl} onChange={v => set('imageUrl', v)} onUpload={onUploadImage} />
            <Toggle label="Active (visible in shop)" checked={form.active} onChange={v => set('active', v)} />
            <div className="atab__actions">
              {formError && <p className="atab__form-err">{formError}</p>}
              <button type="submit" className="btn btn--gold" disabled={status === 'saving'}>
                {status === 'saving'
                  ? <><Spinner />{editing ? 'Saving…' : 'Saving…'}</>
                  : (editing ? 'Update Product' : 'Add Product')}
              </button>
              {editing && (
                <button type="button" className="btn btn--outline" onClick={cancelEdit}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Live product card preview */}
        {(form.name || form.imageUrl || form.priceDollars) && (
          <div className="products-tab__preview">
            <p className="atab__preview-label" style={{ position: 'static', marginBottom: '0.5rem', display: 'block' }}>Preview</p>
            <div className="preview-product-card">
              {form.imageUrl
                ? <div className="preview-product-card__img-wrap"><img src={form.imageUrl} alt={form.name} /></div>
                : <div className="preview-product-card__img-wrap preview-product-card__img-wrap--empty"><span>No image</span></div>
              }
              <div className="preview-product-card__body">
                <p className="preview-product-card__name">{form.name || 'Product Name'}</p>
                {form.description && <p className="preview-product-card__desc">{form.description}</p>}
                {form.priceDollars && <p className="preview-product-card__price">${parseFloat(form.priceDollars || 0).toFixed(2)}</p>}
                <span className={`product-admin-row__badge product-admin-row__badge--${form.active ? 'active' : 'off'}`} style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                  {form.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {products === null && <p className="atab__desc" style={{ marginTop: '2rem' }}>Loading products…</p>}
      {products?.length === 0 && <p className="atab__desc" style={{ marginTop: '2rem' }}>No products yet. Add one above.</p>}

      {products?.length > 0 && (
        <div className="atab__group" style={{ marginTop: '2.5rem' }}>
          <h3 className="atab__group-title">Current Products ({products.length})</h3>
          {products.map(p => (
            <div key={p.productId} className={`product-admin-row${!p.active ? ' product-admin-row--inactive' : ''}`}>
              {p.imageUrl
                ? <div className="product-admin-row__img"><img src={p.imageUrl} alt={p.name} /></div>
                : <div className="product-admin-row__img product-admin-row__img--empty"><span>No img</span></div>
              }
              <div className="product-admin-row__info">
                <span className="product-admin-row__name">{p.name}</span>
                <span className="product-admin-row__price">${(p.priceInCents / 100).toFixed(2)}</span>
                <span className={`product-admin-row__badge product-admin-row__badge--${p.active ? 'active' : 'off'}`}>
                  {p.active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="product-admin-row__actions">
                <button
                  className={`btn btn--sm${p.active ? ' btn--outline' : ' btn--gold'}`}
                  onClick={() => toggleActive(p)}
                  disabled={toggling.has(p.productId)}
                  title={p.active ? 'Hide from shop (out of stock)' : 'Show in shop'}
                >
                  {toggling.has(p.productId) ? <Spinner /> : (p.active ? 'Hide' : 'Show')}
                </button>
                <button className="btn btn--sm" onClick={() => startEdit(p)}>Edit</button>
                <button className="btn btn--sm btn--danger" onClick={() => setPendingDelete(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Delete Product"
          body={<>Are you sure you want to delete <strong>{pendingDelete.name}</strong>? This cannot be undone.</>}
          confirmLabel="Yes, Delete"
          onConfirm={() => { onDelete(pendingDelete.productId); setPendingDelete(null) }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}

// ── Shop: Orders tab ──────────────────────────────────────────────────

function OrdersTab({ orders }) {
  const [search,      setSearch]      = useState('')
  const [expandedId,  setExpandedId]  = useState(null)

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

  const q = search.toLowerCase().trim()
  const visible = q
    ? orders.filter(o =>
        (o.customerName  || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q) ||
        (o.orderId       || '').toLowerCase().includes(q) ||
        (o.status        || '').toLowerCase().includes(q)
      )
    : orders

  return (
    <section className="atab">
      <div className="orders-header">
        <h2 className="atab__title" style={{ marginBottom: 0 }}>Orders ({orders.length})</h2>
        <input
          className="orders-search"
          type="search"
          placeholder="Search by name, email, or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {visible.length === 0 && <p className="atab__desc" style={{ marginTop: '1rem' }}>No orders match "{search}".</p>}
      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(o => {
              const expanded = expandedId === o.orderId
              return (
                <React.Fragment key={o.orderId}>
                  <tr
                    className={`orders-table__row${expanded ? ' orders-table__row--expanded' : ''}`}
                    onClick={() => setExpandedId(expanded ? null : o.orderId)}
                  >
                    <td className="orders-table__chevron">{expanded ? '▾' : '▸'}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.customerName || '—'}</td>
                    <td>{o.customerEmail || '—'}</td>
                    <td>${(o.amountTotal / 100).toFixed(2)}</td>
                    <td><span className={`order-status order-status--${o.status}`}>{o.status}</span></td>
                  </tr>
                  {expanded && (
                    <tr className="orders-table__detail-row">
                      <td colSpan={6}>
                        <div className="order-detail">
                          <div className="order-detail__row">
                            <span className="order-detail__label">Order ID</span>
                            <span className="order-detail__value order-detail__value--mono">{o.orderId}</span>
                          </div>
                          {o.stripeSessionId && (
                            <div className="order-detail__row">
                              <span className="order-detail__label">Stripe Session</span>
                              <a
                                className="order-detail__link"
                                href={`https://dashboard.stripe.com/payments/${o.stripeSessionId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View in Stripe ↗
                              </a>
                            </div>
                          )}
                          {o.shippingAddress && (
                            <div className="order-detail__row">
                              <span className="order-detail__label">Ship To</span>
                              <span className="order-detail__value">
                                {[o.shippingAddress.line1, o.shippingAddress.line2, o.shippingAddress.city, o.shippingAddress.state, o.shippingAddress.postal_code, o.shippingAddress.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          {o.lineItems?.length > 0 && (
                            <div className="order-detail__row order-detail__row--items">
                              <span className="order-detail__label">Items</span>
                              <ul className="order-detail__items">
                                {o.lineItems.map((item, li) => (
                                  <li key={li}>{item.description || item.name} × {item.quantity} — ${((item.amount_total || item.price) / 100).toFixed(2)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="order-detail__row">
                            <span className="order-detail__label">Created</span>
                            <span className="order-detail__value">{new Date(o.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
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

  const [draft,       setDraft]       = useState(defaultContent)
  const [liveContent, setLiveContent] = useState(null)
  const [activeTab,   setActiveTab]   = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [status,      setStatus]      = useState(null) // null | 'loading' | 'saving' | 'saved' | 'error'
  const [errorMsg,    setErrorMsg]    = useState('')

  // Shop state
  const [products,    setProducts]    = useState(null)
  const [orders,      setOrders]      = useState(null)
  const [shopStatus,  setShopStatus]  = useState(null)
  const [shopError,   setShopError]   = useState('')

  // Toasts
  const [toasts, setToasts] = useState([])
  function addToast(message, type = 'success') {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, message, type }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }
  function removeToast(id) {
    setToasts(ts => ts.filter(t => t.id !== id))
  }

  // Track whether draft has changed from live
  const hasChanges = liveContent && JSON.stringify(draft) !== JSON.stringify(liveContent)

  // Unsaved changes warning
  useEffect(() => {
    function handler(e) {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // Load current live content on mount
  useEffect(() => {
    if (!CONTENT_API_URL) return
    setStatus('loading')
    fetch(`${CONTENT_API_URL}/content`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setDraft(data)
          setLiveContent(JSON.parse(JSON.stringify(data)))
        }
        setStatus(null)
      })
      .catch(() => setStatus(null))
  }, [])

  // Lazy-load shop data when tab first opened
  useEffect(() => {
    if ((activeTab === 'products' || activeTab === 'dashboard') && products === null) loadProducts()
    if ((activeTab === 'orders'   || activeTab === 'dashboard') && orders === null)   loadOrders()
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
      addToast('Product saved!', 'success')
      loadProducts()
    } catch (err) {
      setShopError(err.message)
      addToast(err.message, 'error')
      setShopStatus(null)
    }
  }

  async function deleteProduct(productId) {
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
      addToast('Product deleted.', 'success')
      loadProducts()
    } catch (err) {
      setShopError(err.message)
      addToast(err.message, 'error')
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
      setLiveContent(JSON.parse(JSON.stringify(draft)))
      addToast('Changes published!', 'success')
      setTimeout(() => setStatus(null), 4000)
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
      addToast(err.message, 'error')
    }
  }

  function handleRevert() {
    if (!liveContent) return
    if (!window.confirm('Revert all changes to the last published version?')) return
    setDraft(JSON.parse(JSON.stringify(liveContent)))
    addToast('Reverted to last published version.', 'info')
  }

  async function uploadImage(file) {
    if (!CONTENT_API_URL) return null
    const token = await getToken()
    // Get presigned URL from Lambda
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const res = await fetch(`${CONTENT_API_URL}/shop/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ext, contentType: file.type }),
    })
    if (!res.ok) throw new Error('Failed to get upload URL')
    const { uploadUrl, publicUrl } = await res.json()
    // Upload directly to S3
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    return publicUrl
  }

  function handleLogout() {
    instance.logoutRedirect()
  }

  function navigate(tabId) {
    setActiveTab(tabId)
    setSidebarOpen(false)
  }

  const tabMap = {
    dashboard:    <DashboardTab    products={products} orders={orders} hasChanges={hasChanges} onGoTo={navigate} />,
    announcement: <AnnouncementTab draft={draft} setDraft={setDraft} />,
    hero:         <HeroTab         draft={draft} setDraft={setDraft} />,
    cape:         <CapeTab         draft={draft} setDraft={setDraft} />,
    audiences:    <AudiencesTab    draft={draft} setDraft={setDraft} />,
    features:     <FeaturesTab     draft={draft} setDraft={setDraft} />,
    statement:    <StatementTab    draft={draft} setDraft={setDraft} />,
    products:     <ProductsTab     products={products} onSave={saveProduct} onDelete={deleteProduct} status={shopStatus} onUploadImage={uploadImage} />,
    orders:       <OrdersTab       orders={orders} />,
  }

  // group tabs for sidebar
  const tabGroups = [
    { label: null,      tabs: TABS.filter(t => t.group === 'overview') },
    { label: 'Content', tabs: TABS.filter(t => t.group === 'content')  },
    { label: 'Shop',    tabs: TABS.filter(t => t.group === 'shop')     },
  ]

  function SidebarNav() {
    return (
      <nav className={`admin__sidebar${sidebarOpen ? ' admin__sidebar--open' : ''}`}>
        {/* Mobile close */}
        <button className="admin__sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>

        {tabGroups.map((g, gi) => (
          <div key={gi} className="admin__nav-group">
            {g.label && <p className="admin__nav-group-label">{g.label}</p>}
            {g.tabs.map(t => {
              const isDirty = hasChanges && CONTENT_TABS.has(t.id)
              return (
                <button
                  key={t.id}
                  className={`admin__nav-item${activeTab === t.id ? ' admin__nav-item--active' : ''}`}
                  onClick={() => navigate(t.id)}
                >
                  <span className="admin__nav-icon">{t.icon}</span>
                  <span className="admin__nav-label">{t.label}</span>
                  {isDirty && <span className="admin__nav-dot" title="Unsaved changes" />}
                </button>
              )
            })}
          </div>
        ))}

        <div className="admin__sidebar-footer">
          <button className="admin__logout" onClick={handleLogout}>Sign out</button>
        </div>
      </nav>
    )
  }

  return (
    <div className={`admin${sidebarOpen ? ' admin--sidebar-open' : ''}`}>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <header className="admin__header">
        <div className="admin__header-left">
          <button className="admin__hamburger" aria-label="Open menu" onClick={() => setSidebarOpen(s => !s)}>
            <span /><span /><span />
          </button>
          <a href="/" className="admin__brand">WYRTH</a>
          <span className="admin__header-sep">/</span>
          <span className="admin__header-page">{TABS.find(t => t.id === activeTab)?.label ?? 'Admin'}</span>
        </div>
        <div className="admin__header-right">
          {status === 'loading' && <span className="admin__status admin__status--muted">Loading…</span>}
          {status === 'error'   && <span className="admin__status admin__status--err" title={errorMsg}>✗ {errorMsg}</span>}
          {shopError && SHOP_TABS.has(activeTab) && <span className="admin__status admin__status--err">{shopError}</span>}
          <span className="admin__user">{account?.name ?? account?.username}</span>
          {!SHOP_TABS.has(activeTab) && activeTab !== 'dashboard' && (
            <>
              {hasChanges && (
                <button className="admin__revert btn btn--outline" onClick={handleRevert}>Revert</button>
              )}
              <button className="admin__publish btn btn--gold" onClick={handlePublish} disabled={status === 'saving' || status === 'loading'}>
                {status === 'saving' ? <><Spinner />Publishing…</> : (hasChanges ? '● Publish' : 'Publish')}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="admin__sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="admin__shell">
        <SidebarNav />
        <main className="admin__body">
          {tabMap[activeTab]}
        </main>
      </div>
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
