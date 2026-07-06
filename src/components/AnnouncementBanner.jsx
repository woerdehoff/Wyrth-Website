import { useState, useEffect } from 'react'
import { useContent } from '../context/ContentContext'

const STORAGE_KEY = 'wyrth:announcement-dismissed'

export default function AnnouncementBanner() {
  const { announcement } = useContent()
  const message = announcement?.message
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
    <div className="announcement" role="banner">
      <span className="announcement__text">
        {announcement.link
          ? <a href={announcement.link} target="_blank" rel="noopener noreferrer">{message}</a>
          : message
        }
      </span>
      <button
        className="announcement__close"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  )
}
