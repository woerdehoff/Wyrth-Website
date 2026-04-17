import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ContentProvider } from './context/ContentContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import CartDrawer from './components/CartDrawer'
import AnnouncementBanner from './components/AnnouncementBanner'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CapeIntro from './components/CapeIntro'
import AudienceGrid from './components/AudienceGrid'
import Features from './components/Features'
import Statement from './components/Statement'
import Footer from './components/Footer'
import Admin from './pages/Admin'
import Shop from './pages/Shop'
import ShopSuccess from './pages/ShopSuccess'
import ShopCancel from './pages/ShopCancel'
import PrivacyPolicy from './pages/PrivacyPolicy'
import RefundPolicy from './pages/RefundPolicy'
import ShippingPolicy from './pages/ShippingPolicy'
import TermsOfService from './pages/TermsOfService'

function PublicSite() {
  return (
    <>
      <AnnouncementBanner />
      <Nav />
      <main>
        <Hero />
        <CapeIntro />
        <AudienceGrid />
        <Features />
        <Statement />
      </main>
      <Footer />
    </>
  )
}

function ScrollToHash() {
  const location = useLocation()

  useEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash) return
    
    setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }, [location.hash])
  
  return null
}

function PageTracker() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return
    const url = import.meta.env.VITE_CONTENT_API_URL
    if (!url) return

    fetch(`${url}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: location.pathname }),
      keepalive: true,
    }).catch(() => {})
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ContentProvider>
          <ScrollToHash />
          <PageTracker />
          <Routes>
            <Route path="/admin"            element={<Admin />} />
            <Route path="/shop/success"     element={<ShopSuccess />} />
            <Route path="/shop/cancel"      element={<ShopCancel />} />
            <Route path="/shop"             element={<Shop />} />
            <Route path="/privacy-policy"   element={<PrivacyPolicy />} />
            <Route path="/refund-policy"    element={<RefundPolicy />} />
            <Route path="/shipping-policy"  element={<ShippingPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="*"                 element={<PublicSite />} />
          </Routes>
          <CartDrawer />
        </ContentProvider>
      </CartProvider>
    </AuthProvider>
  )
}
