import { useState, useEffect } from 'react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getOrgaosSociais } from '../../services/cmsApi'

const COR_MAP = {
  'aintar-sky':  { border: 'border-aintar-sky/20',  bg: 'bg-aintar-sky/10',  accent: 'text-aintar-sky',  divide: 'divide-aintar-sky/10'  },
  'aintar-blue': { border: 'border-aintar-blue/20', bg: 'bg-aintar-blue/10', accent: 'text-aintar-blue', divide: 'divide-aintar-blue/10' },
  'aintar-teal': { border: 'border-aintar-teal/20', bg: 'bg-aintar-teal/10', accent: 'text-aintar-teal', divide: 'divide-aintar-teal/10' },
}
const DEFAULT_COR = { border: 'border-gray-200', bg: 'bg-gray-50', accent: 'text-gray-500', divide: 'divide-gray-100' }

export default function OrgaosSociaisPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrgaosSociais()
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout
      title="Órgãos Sociais"
      subtitle="Composição dos órgãos sociais da AINTAR — mandato em vigor."
      breadcrumbs={[
        { label: 'Quem Somos', href: '/quem-somos' },
        { label: 'Órgãos Sociais' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {loading && (
            <div className="space-y-6">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          )}

          {!loading && !data && (
            <div className="rounded-2xl bg-aintar-light border border-gray-100 p-10 text-center">
              <p className="text-gray-400 text-sm">Informação não disponível de momento.</p>
            </div>
          )}

          {!loading && data && (
            <>
              {data.mandato && (
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-8 pl-1">
                  Mandato {data.mandato}
                </p>
              )}

              <div className="space-y-6">
                {data.orgaos?.map((orgao, i) => {
                  const c = COR_MAP[orgao.cor] ?? DEFAULT_COR
                  return (
                    <ScrollReveal key={orgao.titulo} delay={i * 0.1}>
                      <div className={`rounded-2xl border overflow-hidden ${c.border} ${c.bg}`}>
                        <div className="px-6 py-4 border-b border-inherit">
                          <h2 className="font-heading font-bold text-aintar-navy text-lg">{orgao.titulo}</h2>
                          {orgao.descricao && <p className="text-gray-500 text-sm mt-0.5">{orgao.descricao}</p>}
                        </div>
                        <div className={`divide-y ${c.divide} bg-white`}>
                          {orgao.membros?.map(m => (
                            <div key={m.cargo} className="flex items-center justify-between px-6 py-3.5">
                              <span className={`text-xs font-semibold uppercase tracking-wider ${c.accent}`}>{m.cargo}</span>
                              <span className="text-aintar-navy font-medium text-sm">{m.nome}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>

              {data.nota && (
                <ScrollReveal delay={0.3} className="mt-8">
                  <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10">
                    <p className="text-sm text-gray-600">
                      {data.nota}{' '}
                      A composição detalhada e os mandatos encontram-se disponíveis nos{' '}
                      <a href="/quem-somos/documentos-financeiros" className="text-aintar-blue hover:underline font-medium">
                        Documentos Institucionais
                      </a>.
                    </p>
                  </div>
                </ScrollReveal>
              )}
            </>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
