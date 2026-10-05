import { useEffect, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import HeroSlider from './components/HeroSlider.jsx'
import { ServiceBands, ServicesOverview } from './components/Services.jsx'
import { LiveMini, MediaArchive, MediaPage, MediaSection } from './components/Media.jsx'
import Login from './components/Login.jsx'
import LivePage from './components/LivePage.jsx'
import AppointmentModal from './appointments/AppointmentModal.jsx'
import Dashboard from './dashboard/Dashboard.jsx'
import Join from './join/Join.jsx'
import Track from './join/Track.jsx'
import { FinalCTA, FloatingWA, Footer, HowItWorks, PartnerSection, WhyChoose } from './components/Sections.jsx'

const MEDIA_ROUTE = /^#\/media\/(.+)$/
const JOIN_ROUTE = /^#\/join\/(track|edit)\/([0-9a-f-]{36})\/([\w-]+)$/

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  const match = hash.match(MEDIA_ROUTE)
  const mediaId = match ? decodeURIComponent(match[1]) : null

  // Hash routing swaps the whole page, so the browser can't scroll to anchors itself.
  useEffect(() => {
    if (mediaId || hash.startsWith('#/')) { window.scrollTo(0, 0); return }
    const el = hash.length > 1 && document.querySelector(hash)
    if (el) el.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [hash, mediaId])

  if (hash === '#/login') return <Login />
  if (hash === '#/join') return <Join />
  const joinRoute = hash.match(JOIN_ROUTE)
  if (joinRoute) {
    const [, mode, id, token] = joinRoute
    return mode === 'track' ? <Track id={id} token={token} /> : <Join resume={{ id, token }} />
  }
  if (hash.startsWith('#/app')) return <Dashboard hash={hash} />

  return (
    <>
      <Navbar />
      {hash === '#/media' ? (
        <MediaArchive />
      ) : hash === '#/live' ? (
        <LivePage />
      ) : mediaId ? (
        <MediaPage id={mediaId} />
      ) : (
        <main>
          <HeroSlider />
          <ServicesOverview />
          <ServiceBands />
          <WhyChoose />
          <MediaSection />
          <HowItWorks />
          <PartnerSection />
          <FinalCTA />
        </main>
      )}
      <Footer />
      <LiveMini hidden={hash === '#/live'} />
      <AppointmentModal />
      <FloatingWA />
    </>
  )
}
