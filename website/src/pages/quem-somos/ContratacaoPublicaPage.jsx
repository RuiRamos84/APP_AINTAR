import { useState, useEffect } from 'react'
import { ExternalLink, ShoppingCart } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getPublicacoes, fileUrl } from '../../services/cmsApi'

const norm = s => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? ''

export default function ContratacaoPublicaPage() {
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicacoes()
      .then(({ publicacoes = [] }) => {
        // Filtrar publicações de contratação pública pelo tipo ou subtipo
        const contratacao = publicacoes.filter(p =>
          norm(p.tipo).includes('contrat') || norm(p.subtipo).includes('contrat')
        )
        setDocs(contratacao)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout
      title="Contratação Pública"
      subtitle="Publicação de contratos e procedimentos de contratação pública da AINTAR."
      breadcrumbs={[
        { label: 'Quem Somos', href: '/quem-somos' },
        { label: 'Contratação Pública' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {/* Portal BASE — sempre visível */}
          <ScrollReveal className="mb-10">
            <div className="p-6 rounded-2xl bg-aintar-light border border-aintar-blue/10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-aintar-blue/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={22} className="text-aintar-blue" />
              </div>
              <div className="flex-grow">
                <h3 className="font-heading font-bold text-aintar-navy text-base mb-1">Portal BASE — Contratos Públicos</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  A AINTAR publica todos os seus contratos públicos no Portal BASE, em cumprimento da legislação aplicável.
                </p>
              </div>
              <a
                href="https://www.base.gov.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-aintar-blue text-white
                  text-sm font-semibold hover:bg-aintar-blueMid transition-colors flex-shrink-0"
              >
                Aceder ao BASE
                <ExternalLink size={14} />
              </a>
            </div>
          </ScrollReveal>

          {/* Documentos publicados */}
          <ScrollReveal delay={0.1}>
            <h2 className="font-heading font-bold text-aintar-navy text-xl mb-6">Documentos Publicados</h2>

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            )}

            {!loading && docs.length === 0 && (
              <div className="rounded-2xl border border-gray-100 bg-aintar-light p-8 text-center">
                <p className="text-gray-400 text-sm">Os contratos estão disponíveis no portal BASE.gov.pt</p>
                <p className="text-gray-400 text-sm mt-1">
                  Para informações adicionais contacte{' '}
                  <a href="mailto:geral@aintar.pt" className="text-aintar-blue hover:underline font-medium">geral@aintar.pt</a>
                </p>
              </div>
            )}

            {!loading && docs.length > 0 && (
              <div className="space-y-3">
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.pk}
                    title={doc.titulo}
                    subtitle={doc.referencia_dr}
                    year={doc.data_publicacao ? new Date(doc.data_publicacao).toLocaleDateString('pt-PT') : doc.ano?.toString()}
                    href={fileUrl(doc.ficheiro_url)}
                    fileSize="PDF"
                  />
                ))}
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
