import Navbar from './Navbar'
import Footer from './Footer'
import PageHeader from './PageHeader'
import SeoHead from '../ui/SeoHead'

export default function PageLayout({ title, subtitle, breadcrumbs, seoDescription, seoImage, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead title={title} description={seoDescription} image={seoImage} />
      <Navbar />
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}
