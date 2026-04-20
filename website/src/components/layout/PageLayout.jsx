import Navbar from './Navbar'
import Footer from './Footer'
import PageHeader from './PageHeader'

export default function PageLayout({ title, subtitle, breadcrumbs, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}
