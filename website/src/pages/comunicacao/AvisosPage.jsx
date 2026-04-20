import { useState, useEffect } from 'react'
import { AlertTriangle, Info, Clock, MapPin } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getAlertas } from '../../services/cmsApi'

export default function AvisosPage() {
  const [ativos, setAtivos]       = useState([])
  const [anteriores, setAnteriores] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getAlertas()
      .then(({ alertas = [] }) => {
        setAtivos(alertas.filter(a => a.ativo_agora))
        setAnteriores(alertas.filter(a => !a.ativo_agora))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatPeriodo = (a) => {
    const parts = []
    if (a.data_inicio) parts.push(new Date(a.data_inicio).toLocaleDateString('pt-PT'))
    if (a.data_fim)    parts.push(new Date(a.data_fim).toLocaleDateString('pt-PT'))
    return parts.join(' – ') || '—'
  }

  return (
    <PageLayout
      title="Avisos de Serviço"
      subtitle="Comunicados sobre interrupções programadas, manutenções e outros avisos relevantes."
      breadcrumbs={[
        { label: 'Comunicação' },
        { label: 'Avisos de Serviço' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {/* Ativos */}
          <div className="mb-12">
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="font-heading font-bold text-aintar-navy text-xl">Avisos Ativos</h2>
              </div>
            </ScrollReveal>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="rounded-2xl h-24 bg-gray-100 animate-pulse" />)}
              </div>
            ) : ativos.length === 0 ? (
              <div className="rounded-2xl bg-aintar-light border border-gray-100 p-8 text-center">
                <div className="text-gray-400 text-sm">Não existem avisos ativos de momento.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {ativos.map((aviso, i) => {
                  const isWarning = aviso.ts_tipo === 1
                  return (
                    <ScrollReveal key={aviso.pk} delay={i * 0.08}>
                      <div className={`rounded-2xl border p-6 ${
                        isWarning ? 'border-amber-200 bg-amber-50' : 'border-aintar-sky/20 bg-aintar-sky/5'
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isWarning ? 'bg-amber-100' : 'bg-aintar-sky/15'
                          }`}>
                            {isWarning
                              ? <AlertTriangle size={20} className="text-amber-600" />
                              : <Info size={20} className="text-aintar-sky" />
                            }
                          </div>
                          <div className="flex-grow">
                            <h3 className="font-heading font-bold text-aintar-navy text-base mb-2">{aviso.tipo ?? 'Aviso'}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">{aviso.mensagem}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1.5">
                                <Clock size={12} /> {formatPeriodo(aviso)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            )}
          </div>

          {/* Anteriores */}
          {!loading && anteriores.length > 0 && (
            <div>
              <ScrollReveal>
                <h2 className="font-heading font-bold text-aintar-navy text-xl mb-6 text-gray-400">Avisos Anteriores</h2>
              </ScrollReveal>
              <div className="space-y-3">
                {anteriores.map((aviso, i) => (
                  <ScrollReveal key={aviso.pk} delay={i * 0.08}>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 opacity-70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-600 text-sm mb-1">{aviso.mensagem}</h3>
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Clock size={11} /> {formatPeriodo(aviso)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">Encerrado</span>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
