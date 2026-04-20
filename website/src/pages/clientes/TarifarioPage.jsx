import { useState, useEffect } from 'react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getDocumentos, fileUrl } from '../../services/cmsApi'

const CAT_TARIFARIO = 3

export default function TarifarioPage() {
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocumentos(CAT_TARIFARIO)
      .then(({ documentos = [] }) => setDocs(documentos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const atual   = docs.find(d => d.ano === Math.max(...docs.map(d => d.ano || 0), 0)) ?? docs[0]
  const historico = docs.filter(d => d !== atual)

  return (
    <PageLayout
      title="Tarifário"
      subtitle="Tarifas em vigor para o serviço de saneamento de águas residuais."
      breadcrumbs={[
        { label: 'Clientes', href: '/clientes' },
        { label: 'Tarifário' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {/* Current tariff highlight */}
          {!loading && atual && (
            <ScrollReveal className="mb-10">
              <div className="rounded-2xl bg-hero-gradient p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold bg-aintar-sky/30 text-aintar-sky px-3 py-1 rounded-full">Em vigor</span>
                </div>
                <h2 className="font-heading font-bold text-2xl mb-2">{atual.titulo}</h2>
                {atual.descricao && <p className="text-white/60 text-sm mb-5">{atual.descricao}</p>}
                {atual.ficheiro_url && (
                  <a
                    href={fileUrl(atual.ficheiro_url)}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aintar-sky text-white
                      text-sm font-semibold hover:bg-white hover:text-aintar-blue transition-all"
                  >
                    Descarregar {atual.titulo}
                  </a>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* Historical documents */}
          {!loading && historico.length > 0 && (
            <ScrollReveal delay={0.2}>
              <h2 className="font-heading font-bold text-aintar-navy text-xl mb-5">Tarifários Anteriores</h2>
              <div className="space-y-3">
                {historico.map((doc) => (
                  <DocumentCard
                    key={doc.pk}
                    title={doc.titulo}
                    year={doc.ano?.toString()}
                    href={fileUrl(doc.ficheiro_url)}
                    fileSize="PDF"
                  />
                ))}
              </div>
            </ScrollReveal>
          )}

          {loading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>}
        </div>
      </section>
    </PageLayout>
  )
}
