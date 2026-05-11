import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getPublicacoes, fileUrl } from '../../services/cmsApi'

export default function EditaisPage() {
  const [grupos, setGrupos] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicacoes()
      .then(({ publicacoes = [] }) => {
        const g = {}
        publicacoes.forEach(p => {
          const ano = p.ano?.toString()
            ?? (p.data_publicacao ? new Date(p.data_publicacao).getFullYear().toString() : 'Sem data')
          if (!g[ano]) g[ano] = []
          g[ano].push(p)
        })
        setGrupos(g)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const anos = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  return (
    <PageLayout
      title="Editais"
      subtitle="Publicações oficiais, tolerâncias de ponto e documentos de carácter obrigatório da AINTAR."
      breadcrumbs={[
        { label: 'Comunicação' },
        { label: 'Editais' },
      ]}
      seoDescription="Editais e publicações oficiais da AINTAR."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {loading && (
            <div className="space-y-10">
              {[1, 2].map(i => (
                <div key={i} className="space-y-3">
                  <div className="h-9 w-24 bg-gray-100 rounded-xl animate-pulse" />
                  {[1, 2, 3].map(j => <div key={j} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ))}
            </div>
          )}

          {!loading && anos.length === 0 && (
            <div className="rounded-2xl bg-aintar-light border border-gray-100 p-10 text-center">
              <p className="text-gray-400 text-sm">Nenhum edital publicado de momento.</p>
            </div>
          )}

          {!loading && anos.length > 0 && (
            <div className="space-y-10">
              {anos.map((ano, i) => (
                <ScrollReveal key={ano} delay={i * 0.1}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-aintar-blue/10 flex items-center justify-center">
                      <FileText size={16} className="text-aintar-blue" />
                    </div>
                    <h2 className="font-heading font-bold text-aintar-navy text-lg">{ano}</h2>
                  </div>
                  <div className="space-y-2.5">
                    {grupos[ano].map(doc => (
                      <DocumentCard
                        key={doc.pk}
                        title={doc.titulo}
                        subtitle={doc.referencia_dr}
                        year={doc.data_publicacao ? new Date(doc.data_publicacao).toLocaleDateString('pt-PT') : undefined}
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
              <p className="text-sm text-gray-600">
                Para aceder aos editais publicados no Diário da República visite{' '}
                <a href="https://dre.pt" target="_blank" rel="noopener noreferrer"
                  className="text-aintar-blue font-medium hover:underline">dre.pt</a>.
                Para outras publicações oficiais contacte{' '}
                <a href="mailto:geral@aintar.pt" className="text-aintar-blue font-medium hover:underline">geral@aintar.pt</a>.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
