import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import SignInModal from './SignInModal'

export default function SignInPrompt({ label = 'Sign in for faster checkout', className = '' }) {
  const { user, login, googleClientId, magicLinkEnabled } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [focusEmail, setFocusEmail] = useState(false)

  if (user || (!googleClientId && !magicLinkEnabled)) return null

  function openModal(emailFocus = false) {
    setFocusEmail(emailFocus)
    setModalOpen(true)
  }

  return (
    <>
      <div className={`signin-prompt${className ? ` ${className}` : ''}`}>
        <span className="signin-prompt__label">{label}</span>
        <div className="signin-prompt__actions">
          {googleClientId && (
            <GoogleLogin
              onSuccess={resp => login(resp.credential)}
              onError={() => {}}
              theme="filled_black"
              shape="pill"
              text="signin_with"
              size="medium"
            />
          )}
          {magicLinkEnabled && (
            <button
              type="button"
              className="signin-prompt__email-btn"
              onClick={() => openModal(true)}
            >
              Sign in with Email
            </button>
          )}

        </div>
      </div>

      {modalOpen && (
        <SignInModal
          onClose={() => setModalOpen(false)}
          focusEmail={focusEmail}
        />
      )}
    </>
  )
}