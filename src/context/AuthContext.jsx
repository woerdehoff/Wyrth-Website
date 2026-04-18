import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { GoogleOAuthProvider, googleLogout } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const API_URL          = import.meta.env.VITE_CONTENT_API_URL  || ''

const AuthContext = createContext({ user: null, token: null, login: () => {}, logout: () => {}, sendMagicLink: async () => {}, verifyMagicLink: async () => {} })

function parseJwtPayload(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('wyrth_user') || 'null') } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('wyrth_token') || null)

  // Clear stale/expired token on mount
  useEffect(() => {
    if (token) {
      const payload = parseJwtPayload(token)
      if (!payload || payload.exp < Date.now() / 1000) {
        setToken(null); setUser(null)
        localStorage.removeItem('wyrth_token')
        localStorage.removeItem('wyrth_user')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function login(credential) {
    const payload = parseJwtPayload(credential)
    if (!payload) return
    const userData = { sub: payload.sub, name: payload.name || '', email: payload.email, picture: payload.picture || null }
    setToken(credential)
    setUser(userData)
    localStorage.setItem('wyrth_token', credential)
    localStorage.setItem('wyrth_user', JSON.stringify(userData))
  }

  function logout() {
    googleLogout()
    setToken(null)
    setUser(null)
    localStorage.removeItem('wyrth_token')
    localStorage.removeItem('wyrth_user')
  }

  const sendMagicLink = useCallback(async (email) => {
    if (!API_URL) throw new Error('API not configured')
    const res  = await fetch(`${API_URL}/auth/magic/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send sign-in email')
    return data
  }, [])

  const verifyMagicLink = useCallback(async (token) => {
    if (!API_URL) throw new Error('API not configured')
    const res  = await fetch(`${API_URL}/auth/magic/verify?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Invalid or expired link')
    login(data.jwt)
    return data
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, token, login, logout, sendMagicLink, verifyMagicLink, googleClientId: GOOGLE_CLIENT_ID }}>
      {GOOGLE_CLIENT_ID
        ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
        : children
      }
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
