import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Calendar, ChevronRight } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getDocumentos, fileUrl, getConcursalProcedimentos } from '../../services/cmsApi'

const CAT_FORMULARIOS = 1

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function FormulariosPage() {
  const navigate = useNavigate()
  const [docs, setDocs]                 = useState([])
  const [concursos, setConcursos]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingConcursos, setLoadingConcursos] = useState(true)

  useEffect(() => {
    getDocumentos(CAT_FORMULARIOS)
      .then(({ documentos = [] }) => setDocs(documentos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getConcursalProcedimentos()
      .then(({ procedimentos = [] }) => setConcursos(procedimentos))
      .catch(() => {})
      .finally(() => setLoadingConcursos(false))
  }, [])

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

          {/* Concursos abertos */}
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-4">
              <Briefcase size={20} className="text-aintar-blue" />
              <h2 className="font-heading font-bold text-aintar-navy text-lg">
                Recrutamento — Procedimentos Concursais
              </h2>
            </div>

            {loadingConcursos && (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {!loadingConcursos && concursos.length === 0 && (
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-500">
                Não existem procedimentos concursais em curso de momento.
              </div>
            )}

            {!loadingConcursos && concursos.length > 0 && (
              <div className="space-y-3">
                {concursos.map(c => (
                  <div
                    key={c.pk}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl
                      border border-aintar-blue/20 bg-aintar-light hover:shadow-md
                      hover:shadow-aintar-blue/10 transition-all duration-200"
                  >
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-aintar-navy text-sm">
                        {c.carreira}{c.categoria ? ` — ${c.categoria}` : ''}
                      </p>
                      {c.area_atividade && (
                        <p className="text-xs text-gray-500 mt-0.5">{c.area_atividade}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {c.tipo_contrato_descricao && (
                          <span className="text-xs bg-white border border-aintar-blue/20 text-aintar-blue
                            rounded-full px-2.5 py-0.5">
                            {c.tipo_contrato_descricao}
                          </span>
                        )}
                        {c.data_abertura && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar size={12} />
                            Abertura: {formatDate(c.data_abertura)}
                          </span>
                        )}
                        {c.data_encerramento && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar size={12} />
                            Encerramento: {formatDate(c.data_encerramento)}
                          </span>
                        )}
                        {c.codigo_bep && (
                          <span className="text-xs text-gray-400">BEP: {c.codigo_bep}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/clientes/formularios/candidatura/${c.pk}`)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-aintar-blue
                        hover:text-aintar-navy transition whitespace-nowrap flex-shrink-0"
                    >
                      Candidatar <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollReveal>

          <div className="my-10 border-t border-gray-100" />

          {/* Formulários gerais (existentes) */}
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
