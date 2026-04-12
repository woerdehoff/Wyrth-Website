import { createContext, useContext, useState, useEffect } from 'react'
import { defaultContent } from '../content'

const ContentContext = createContext({ content: defaultContent, setContent: () => {} })

const CLOUDFRONT_URL     = import.meta.env.VITE_CLOUDFRONT_URL
const CONTENT_API_URL    = import.meta.env.VITE_CONTENT_API_URL

export function ContentProvider({ children }) {
  const [content, setContent] = useState(defaultContent)

  useEffect(() => {
    // Try to load live content from the API (bypasses CloudFront cache)
    const url = CONTENT_API_URL
      ? `${CONTENT_API_URL}/content`
      : CLOUDFRONT_URL
        ? `${CLOUDFRONT_URL}/content.json?_=${Date.now()}`
        : null

    if (!url) return

    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContent(data) })
      .catch(() => {}) // silently fall back to defaults
  }, [])

  return (
    <ContentContext.Provider value={{ content, setContent }}>
      {children}
    </ContentContext.Provider>
  )
}

export const useContent       = () => useContext(ContentContext).content
export const useContentSetter = () => useContext(ContentContext).setContent
