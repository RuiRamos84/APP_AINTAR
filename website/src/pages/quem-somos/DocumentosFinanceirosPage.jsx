import { useState, useEffect } from 'react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getProcessosFinanceiros, fileUrl } from '../../services/cmsApi'

const CORES = ['aintar-blue', 'aintar-teal', 'aintar-sky']

export default function DocumentosFinanceirosPage() {
  const [grupos, setGrupos] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProcessosFinanceiros()
      .then(({ processos = [] }) => {
        const g = {}
        processos.forEach(p => {
          const tipo = p.tipo || 'Outros'
          if (!g[tipo]) g[tipo] = []
          g[tipo].push(p)
        })
        setGrupos(g)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const entries = Object.entries(grupos)

  return (
    <PageLayout
      title="Documentos Financeiros"
      subtitle="Neste espaço são disponibilizados os Documentos Financeiros da AINTAR para consulta e livre download."
      breadcrumbs={[
        { label: 'Quem Somos', href: '/quem-somos' },
        { label: 'Documentos Financeiros' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container">

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-3">
                  {[1, 2, 3].map(j => <div key={j} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="rounded-2xl bg-aintar-light border border-gray-100 p-10 text-center">
              <p className="text-gray-400 text-sm">Nenhum documento financeiro publicado de momento.</p>
              <p className="text-gray-400 text-sm mt-1">
                Para informações contacte{' '}
                <a href="mailto:geral@aintar.pt" className="text-aintar-blue hover:underline font-medium">geral@aintar.pt</a>
              </p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {entries.map(([tipo, processos], i) => {
                const cor = CORES[i % CORES.length]
                return (
                  <ScrollReveal key={tipo} delay={i * 0.1}>
                    <div className="h-full">
                      <div className={`flex items-center gap-3 mb-5 pb-4 border-b-2 border-${cor}/30`}>
                        <div className={`w-2 h-8 rounded-full bg-${cor}`} />
                        <h2 className="font-heading font-bold text-aintar-navy text-base">{tipo}</h2>
                      </div>
                      <div className="space-y-2.5">
                        {processos.map(p => {
                          const mainDoc = p.documentos?.find(d => d.ficheiro_url) ?? null
                          return (
                            <DocumentCard
                              key={p.pk}
                              title={p.titulo}
                              year={p.ano_exercicio?.toString()}
                              href={mainDoc ? fileUrl(mainDoc.ficheiro_url) : undefined}
                              fileSize="PDF"
                              accent={cor}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          )}

          <ScrollReveal delay={0.3} className="mt-10">
            <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10 text-center">
              <p className="text-sm text-gray-600">
                Para documentos anteriores ou informações adicionais, contacte-nos através de{' '}
                <a href="mailto:geral@aintar.pt" className="text-aintar-blue font-medium hover:underline">
                  geral@aintar.pt
                </a>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
