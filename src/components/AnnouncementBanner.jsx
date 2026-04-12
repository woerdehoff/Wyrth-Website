import { useState } from 'react'
import { useContent } from '../context/ContentContext'

export default function AnnouncementBanner() {
  const { announcement } = useContent()
  const [dismissed, setDismissed] = useState(false)

  if (!announcement?.message || dismissed) return null

  return (
    <div className="announcement" role="banner">
      <span className="announcement__text">
        {announcement.link
          ? <a href={announcement.link} target="_blank" rel="noopener noreferrer">{announcement.message}</a>
          : announcement.message
        }
      </span>
      <button
        className="announcement__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  )
}
