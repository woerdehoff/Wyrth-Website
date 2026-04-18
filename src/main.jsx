import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

document.title = __APP_TITLE__
import { BrowserRouter } from 'react-router-dom'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './auth/msalConfig'
import './index.css'
import App from './App.jsx'

const msalInstance = new PublicClientApplication(msalConfig)

msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  )
})
