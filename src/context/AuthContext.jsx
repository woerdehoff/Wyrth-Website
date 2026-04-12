import { createContext, useContext, useState, useEffect } from 'react'
import { GoogleOAuthProvider, googleLogout } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const AuthContext = createContext({ user: null, token: null, login: () => {}, logout: () => {} })

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
    const userData = { sub: payload.sub, name: payload.name, email: payload.email, picture: payload.picture }
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

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={{ user, token, login, logout, googleClientId: GOOGLE_CLIENT_ID }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  )
}

export const useAuth = () => useContext(AuthContext)
