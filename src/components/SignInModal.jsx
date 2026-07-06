import { useState, useEffect, useRef } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 20 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-[15px] h-3 opacity-60"
    >
      <rect x="1" y="1" width="18" height="14" rx="2"/>
      <path d="M1 4l9 6 9-6"/>
    </svg>
  )
}

export default function SignInModal({ onClose, focusEmail = false }) {
  const { login, sendMagicLink, googleClientId, magicLinkEnabled } = useAuth()
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState('idle')
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

  const btnClass =
    'w-full px-5 py-2.5 bg-magenta text-black border-0 rounded-sm text-[0.875rem] font-semibold cursor-pointer transition-opacity hover:opacity-[0.88] disabled:opacity-[0.45] disabled:cursor-default'

  return (
    <div
      className="fixed inset-0 bg-black/[.72] z-[500] flex items-center justify-center p-4"
      style={{ animation: 'modal-fade 0.18s ease both' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
    >
      <div
        className="bg-ink-2 border border-line rounded-sm px-8 pt-8 pb-7 max-w-[400px] w-full relative"
        style={{ animation: 'modal-up 0.2s ease both' }}
      >
        <button
          className="absolute top-3 right-3.5 bg-transparent border-0 text-bone-2 text-[1.35rem] leading-none cursor-pointer p-0 transition-colors hover:text-bone"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {status === 'sent' ? (
          <>
            <h2 className="font-display text-[1.35rem] font-normal text-bone m-0 mb-2.5" id="signin-modal-title">
              Check your email
            </h2>
            <p className="text-[0.875rem] text-bone-2 leading-[1.65] m-0 mb-5">
              We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes.
            </p>
            <button className={btnClass} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 className="font-display text-[1.35rem] font-normal text-bone m-0 mb-2.5" id="signin-modal-title">
              Sign in
            </h2>
            <p className="text-[0.875rem] text-bone-2 leading-[1.65] m-0 mb-5">
              No password needed — choose how you'd like to sign in.
            </p>

            {googleClientId && (
              <div className="flex justify-center mb-1">
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
              <div
                className="flex items-center gap-3 my-4 text-bone-2 text-xs uppercase tracking-[.08em]"
                aria-hidden="true"
              >
                <span className="flex-1 h-px bg-line" />
                <span>or</span>
                <span className="flex-1 h-px bg-line" />
              </div>
            )}

            {magicLinkEnabled && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <label
                  className="flex items-center gap-2 text-[0.8rem] text-bone-2 font-medium"
                  htmlFor="signin-email"
                >
                  <EmailIcon />
                  Sign in with Email
                </label>
                <input
                  ref={inputRef}
                  id="signin-email"
                  type="email"
                  className="w-full px-3.5 py-2.5 bg-ink-3 border border-line rounded-sm text-bone text-[0.9rem] font-body box-border outline-none transition-colors focus:border-magenta placeholder:text-bone-2"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={status === 'loading'}
                  autoComplete="email"
                />
                {status === 'error' && (
                  <p className="text-[0.8rem] text-[#e05c5c] m-0" role="alert">
                    {errMsg}
                  </p>
                )}
                <button
                  type="submit"
                  className={btnClass}
                  disabled={status === 'loading' || !email}
                >
                  {status === 'loading' ? 'Sending…' : 'Send Sign-In Link'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
