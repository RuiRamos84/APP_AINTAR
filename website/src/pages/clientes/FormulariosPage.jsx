import { useState, useEffect } from 'react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getDocumentos, fileUrl } from '../../services/cmsApi'

const CAT_FORMULARIOS = 1

export default function FormulariosPage() {
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocumentos(CAT_FORMULARIOS)
      .then(({ documentos = [] }) => setDocs(documentos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Agrupar por subcategoria
  const grupos = docs.reduce((acc, doc) => {
    const key = doc.subcategoria || 'Geral'
    if (!acc[key]) acc[key] = []
    acc[key].push(doc)
    return acc
  }, {})

  return (
    <PageLayout
      title="Formulários e Documentos"
      subtitle="Descarregue os formulários e documentos necessários para os seus pedidos junto da AINTAR."
      breadcrumbs={[
        { label: 'Clientes', href: '/clientes' },
        { label: 'Formulários' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {loading && (
            <div className="space-y-6">
              {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          )}

          {!loading && (
            <div className="space-y-10">
              {Object.entries(grupos).map(([grupo, items], i) => (
                <ScrollReveal key={grupo} delay={i * 0.1}>
                  <h2 className="font-heading font-bold text-aintar-navy text-lg mb-1 flex items-center gap-3">
                    <span className="w-1 h-6 rounded-full bg-aintar-sky" />
                    {grupo}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {items.map((doc) => (
                      <DocumentCard
                        key={doc.pk}
                        title={doc.titulo}
                        subtitle={doc.descricao}
                        year={doc.ano?.toString()}
                        href={fileUrl(doc.ficheiro_url)}
                        fileSize="PDF"
                      />
                    ))}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          <ScrollReveal delay={0.3} className="mt-10">
            <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10">
              <p className="text-sm text-gray-600 leading-relaxed">
                Os formulários devidamente preenchidos devem ser entregues na sede da AINTAR em Carregal do Sal,
                enviados por email para{' '}
                <a href="mailto:geral@aintar.pt" className="text-aintar-blue font-medium hover:underline">geral@aintar.pt</a>{' '}
                ou submetidos através da{' '}
                <a href="https://app.aintar.pt" target="_blank" rel="noopener noreferrer"
                  className="text-aintar-blue font-medium hover:underline">Área de Cliente</a>.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
