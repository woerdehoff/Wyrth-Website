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
]

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

  // Load current live content on mount
  useEffect(() => {
    if (!CONTENT_API_URL) return
    setStatus('loading')
    fetch(`${CONTENT_API_URL}/content`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDraft(data); setStatus(null) })
      .catch(() => setStatus(null))
  }, [])

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
          <span className="admin__user">{account?.name ?? account?.username}</span>
          <button className="admin__publish btn btn--gold" onClick={handlePublish} disabled={status === 'saving' || status === 'loading'}>
            Publish
          </button>
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
