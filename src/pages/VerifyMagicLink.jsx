import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function VerifyMagicLink() {
  const [searchParams]   = useSearchParams()
  const { verifyMagicLink } = useAuth()
  const navigate         = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="verify-magic">
      {status === 'verifying' && (
        <>
          <div className="verify-magic__spinner" aria-hidden="true" />
          <p className="verify-magic__msg">Signing you in…</p>
        </>
      )}
      {status === 'success' && (
        <p className="verify-magic__msg verify-magic__msg--ok">
          You're signed in. Redirecting…
        </p>
      )}
      {status === 'error' && (
        <>
          <p className="verify-magic__msg verify-magic__msg--err">{errMsg}</p>
          <button className="verify-magic__back" onClick={() => navigate('/', { replace: true })}>
            Back to Home
          </button>
        </>
      )}
    </div>
  )
}
