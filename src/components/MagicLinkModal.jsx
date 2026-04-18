import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function MagicLinkModal({ onClose }) {
  const { sendMagicLink } = useAuth()
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState('idle') // idle | loading | sent | error
  const [errMsg,  setErrMsg]  = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()

    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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

  return (
    <div
      className="magic-modal__overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="magic-modal-title"
    >
      <div className="magic-modal">
        <button className="magic-modal__close" onClick={onClose} aria-label="Close">×</button>

        {status === 'sent' ? (
          <>
            <h2 className="magic-modal__title" id="magic-modal-title">Check your email</h2>
            <p className="magic-modal__body">
              We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes.
            </p>
            <button className="magic-modal__btn" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 className="magic-modal__title" id="magic-modal-title">Sign in with Email</h2>
            <p className="magic-modal__body">
              Enter your email and we'll send you a secure sign-in link — no password needed.
            </p>
            <form onSubmit={handleSubmit} className="magic-modal__form">
              <input
                ref={inputRef}
                type="email"
                className="magic-modal__input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
                autoComplete="email"
              />
              {status === 'error' && (
                <p className="magic-modal__error" role="alert">{errMsg}</p>
              )}
              <button
                type="submit"
                className="magic-modal__btn"
                disabled={status === 'loading' || !email}
              >
                {status === 'loading' ? 'Sending…' : 'Send Sign-In Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
