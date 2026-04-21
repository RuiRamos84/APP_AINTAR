import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import AlertBanner from '../components/ui/AlertBanner'
import HeroSection from '../components/sections/HeroSection'
import StatsSection from '../components/sections/StatsSection'
import AboutSection from '../components/sections/AboutSection'
import ServicesSection from '../components/sections/ServicesSection'
import MunicipalitiesSection from '../components/sections/MunicipalitiesSection'
import NewsSection from '../components/sections/NewsSection'
import PortalSection from '../components/sections/PortalSection'
import ContactSection from '../components/sections/ContactSection'
import FloatingScrollIndicator from '../components/ui/FloatingScrollIndicator'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <AlertBanner />
      <main>
        <HeroSection />
        <AboutSection />
        <StatsSection />
        <ServicesSection />
        <MunicipalitiesSection />
        <NewsSection />
        <PortalSection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingScrollIndicator />
    </div>
  )
}
