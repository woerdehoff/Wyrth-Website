import { Routes, Route } from 'react-router-dom'
import { ContentProvider } from './context/ContentContext'
import AnnouncementBanner from './components/AnnouncementBanner'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CapeIntro from './components/CapeIntro'
import AudienceGrid from './components/AudienceGrid'
import Features from './components/Features'
import Statement from './components/Statement'
import Footer from './components/Footer'
import Admin from './pages/Admin'

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
    <ContentProvider>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="*"     element={<PublicSite />} />
      </Routes>
    </ContentProvider>
  )
}
