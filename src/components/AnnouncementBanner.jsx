import { useState, useEffect } from 'react'
import { useContent } from '../context/ContentContext'

const STORAGE_KEY = 'wyrth:announcement-dismissed'

function safeHref(href) {
  if (typeof href !== 'string' || !href) return null
  if (href.startsWith('/')) return href
  try {
    const u = new URL(href)
    return (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') ? href : null
  } catch { return null }
}

export default function AnnouncementBanner() {
  const { announcement } = useContent()
  const message = announcement?.message
  const linkHref = safeHref(announcement?.link)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!message) return
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === message)
    } catch {
      setDismissed(false)
    }
  }, [message])

  function handleDismiss() {
    setDismissed(true)
    try { localStorage.setItem(STORAGE_KEY, message) } catch {}
  }

  if (!message || dismissed) return null

  return (
    <div
      className="bg-magenta text-black text-center px-12 py-2.5 text-[0.65rem] tracking-[.08em] font-semibold relative z-[200]"
      role="banner"
    >
      <span className="inline">
        {linkHref
          ? <a href={linkHref} target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">{message}</a>
          : message
        }
      </span>
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-lg text-black leading-none px-1 opacity-70 transition-opacity hover:opacity-100"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  )
}
