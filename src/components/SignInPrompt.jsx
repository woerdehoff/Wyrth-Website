import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import SignInModal from './SignInModal'

export default function SignInPrompt({
  label = 'Sign in for faster checkout',
  className = '',
  align = 'center',
  animation,
}) {
  const { user, login, googleClientId, magicLinkEnabled } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [focusEmail, setFocusEmail] = useState(false)

  if (user || (!googleClientId && !magicLinkEnabled)) return null

  function openModal(emailFocus = false) {
    setFocusEmail(emailFocus)
    setModalOpen(true)
  }

  const isStart = align === 'start'
  const rootAlign = isStart ? 'items-start' : 'items-center'
  const actionsAlign = isStart ? 'justify-start' : 'justify-center'
  const labelStyles = isStart
    ? 'text-left text-[0.8rem] text-bone-2 leading-normal'
    : 'text-center text-[0.7rem] tracking-[.1em] uppercase text-bone-2 leading-normal'

  return (
    <>
      <div
        className={`flex flex-col gap-2.5 ${rootAlign} ${className}`}
        style={animation ? { animation } : undefined}
      >
        <span className={labelStyles}>{label}</span>
        <div className={`flex flex-wrap items-center gap-2.5 ${actionsAlign}`}>
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
              className="bg-transparent border border-line-warm rounded-full text-bone-2 text-sm px-4 py-2 transition-colors hover:bg-ink-3 hover:text-bone hover:border-bone-2 cursor-pointer"
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
