import PageLayout from '../../components/layout/PageLayout'
import AvaliacoesSection from './AvaliacoesSection'

export default function OpinioesPage() {
  return (
    <PageLayout
      title="Opiniões"
      subtitle="Partilhe a sua experiência e consulte o que dizem os nossos clientes sobre os serviços da AINTAR."
      breadcrumbs={[{ label: 'Clientes', href: '/clientes' }, { label: 'Opiniões' }]}
      seoDescription="Opiniões e avaliações dos clientes AINTAR. Partilhe a sua experiência com os serviços de saneamento."
    >
      <AvaliacoesSection />
    </PageLayout>
  )
}
