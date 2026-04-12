import { Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ContentProvider>
          <Routes>
            <Route path="/admin"         element={<Admin />} />
            <Route path="/shop/success"  element={<ShopSuccess />} />
            <Route path="/shop/cancel"   element={<ShopCancel />} />
            <Route path="/shop"          element={<Shop />} />
            <Route path="*"              element={<PublicSite />} />
          </Routes>
          <CartDrawer />
        </ContentProvider>
      </CartProvider>
    </AuthProvider>
  )
}
