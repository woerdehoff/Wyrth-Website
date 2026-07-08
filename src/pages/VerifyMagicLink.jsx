import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function VerifyMagicLink() {
  const [searchParams]   = useSearchParams()
  const { verifyMagicLink } = useAuth()
  const navigate         = useNavigate()
  const [status, setStatus] = useState('verifying')
  const [errMsg, setErrMsg] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const token = searchParams.get('token') || ''
    if (!token) {
      setErrMsg('No sign-in token found. The link may be malformed.')
      setStatus('error')
      return
    }

    verifyMagicLink(token)
      .then(() => {
        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 1200)
      })
      .catch(err => {
        setErrMsg(err.message || 'This sign-in link is invalid or has expired.')
        setStatus('error')
      })
  }, [navigate, searchParams, verifyMagicLink])

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-8">
      {status === 'verifying' && (
        <>
          <div
            className="w-9 h-9 border-[3px] border-line rounded-full"
            style={{
              borderTopColor: 'var(--color-magenta)',
              animation: 'spin 0.75s linear infinite',
            }}
            aria-hidden="true"
          />
          <p className="text-base text-bone-2 text-center m-0">Signing you in…</p>
        </>
      )}
      {status === 'success' && (
        <p className="text-base text-magenta text-center m-0">
          You're signed in. Redirecting…
        </p>
      )}
      {status === 'error' && (
        <>
          <p className="text-base text-[#e05c5c] text-center m-0">{errMsg}</p>
          <button
            className="px-6 py-2.5 bg-ink-3 border border-line rounded-sm text-bone font-body text-[0.875rem] cursor-pointer transition-colors hover:bg-ink-4"
            onClick={() => navigate('/', { replace: true })}
          >
            Back to Home
          </button>
        </>
      )}
    </div>
  )
}
