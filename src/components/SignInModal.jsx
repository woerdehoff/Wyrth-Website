import { useState, useEffect, useRef } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

function EmailIcon() {
  return (
    <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="18" height="14" rx="2"/>
      <path d="M1 4l9 6 9-6"/>
    </svg>
  )
}

export default function SignInModal({ onClose, focusEmail = false }) {
  const { login, sendMagicLink, googleClientId, magicLinkEnabled } = useAuth()
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent | error
  const [errMsg, setErrMsg] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (focusEmail) inputRef.current?.focus()
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, focusEmail])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      await sendMagicLink(email)
      setStatus('sent')
    } catch (err) {
      setErrMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function handleGoogleSuccess(resp) {
    login(resp.credential)
    onClose()
  }

  return (
    <div
      className="signin-modal__overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
    >
      <div className="signin-modal">
        <button className="signin-modal__close" onClick={onClose} aria-label="Close">×</button>

        {status === 'sent' ? (
          <>
            <h2 className="signin-modal__title" id="signin-modal-title">Check your email</h2>
            <p className="signin-modal__body">
              We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes.
            </p>
            <button className="signin-modal__btn" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 className="signin-modal__title" id="signin-modal-title">Sign in</h2>
            <p className="signin-modal__body">
              No password needed — choose how you'd like to sign in.
            </p>

            {googleClientId && (
              <div className="signin-modal__google">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {}}
                  theme="filled_black"
                  shape="pill"
                  text="signin_with"
                  size="large"
                  width="100%"
                />
              </div>
            )}

            {googleClientId && magicLinkEnabled && (
              <div className="signin-modal__divider" aria-hidden="true">
                <span>or</span>
              </div>
            )}

            {magicLinkEnabled && <form onSubmit={handleSubmit} className="signin-modal__form">
              <label className="signin-modal__label" htmlFor="signin-email">
                <EmailIcon />
                Sign in with Email
              </label>
              <input
                ref={inputRef}
                id="signin-email"
                type="email"
                className="signin-modal__input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
                autoComplete="email"
              />
              {status === 'error' && (
                <p className="signin-modal__error" role="alert">{errMsg}</p>
              )}
              <button
                type="submit"
                className="signin-modal__btn"
                disabled={status === 'loading' || !email}
              >
                {status === 'loading' ? 'Sending…' : 'Send Sign-In Link'}
              </button>
            </form>}
          </>
        )}
      </div>
    </div>
  )
}