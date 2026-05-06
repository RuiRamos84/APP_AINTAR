import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, CheckCircle2, Clock, FileText, ArrowUpRight, Users } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { getProcedimentos, getPublicacoes, fileUrl } from '../../services/cmsApi'

const norm = s => s?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ?? ''

function SectionTitle({ icon: Icon, label, color = 'text-aintar-teal', bg = 'bg-aintar-teal/10' }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon size={20} className={color} />
      </div>
      <h2 className="font-heading font-bold text-aintar-navy text-xl">{label}</h2>
    </div>
  )
}

function EmptySection({ msg }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-aintar-light p-8 text-center">
      <p className="text-gray-400 text-sm">{msg}</p>
    </div>
  )
}

function SkeletonList({ n = 3 }) {
  return <div className="space-y-3">{Array.from({ length: n }, (_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
}

function formatPrazo(p) {
  const fmt = d => d ? new Date(d).toLocaleDateString('pt-PT') : null
  const ini = fmt(p.data_abertura)
  const fim = fmt(p.data_encerramento)
  if (ini && fim) return `${ini} – ${fim}`
  if (ini) return `Aberto desde ${ini}`
  return '—'
}

export default function RecursosHumanosPage() {
  const [loading, setLoading]         = useState(true)
  const [abertos, setAbertos]         = useState([])
  const [concluidos, setConcluidos]   = useState([])
  const [tolerancias, setTolerancias] = useState([])
  const [mobilidade, setMobilidade]   = useState([])

  useEffect(() => {
    Promise.all([getProcedimentos(), getPublicacoes()])
      .then(([{ procedimentos = [] }, { publicacoes = [] }]) => {
        setAbertos(procedimentos.filter(p => !norm(p.estado).includes('conclu')))
        setConcluidos(procedimentos.filter(p => norm(p.estado).includes('conclu')))
        setTolerancias(publicacoes.filter(p =>
          norm(p.subtipo).includes('toleranc') || norm(p.tipo).includes('toleranc')
        ))
        setMobilidade(publicacoes.filter(p =>
          norm(p.subtipo).includes('mobilidade') || norm(p.tipo).includes('mobilidade')
        ))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Concluídos agrupados por ano
  const concluByAno = concluidos.reduce((acc, c) => {
    const d = c.data_encerramento || c.data_abertura
    const ano = d ? new Date(d).getFullYear().toString() : 'Anteriores'
    if (!acc[ano]) acc[ano] = []
    acc[ano].push(c)
    return acc
  }, {})
  const anosConc = Object.keys(concluByAno).sort((a, b) => b.localeCompare(a))

  return (
    <PageLayout
      title="Recursos Humanos"
      subtitle="Procedimentos concursais, tolerâncias de ponto e mobilidade na carreira."
      breadcrumbs={[{ label: 'Recursos Humanos' }]}
      seoDescription="Oportunidades de emprego e concursos públicos de recrutamento na AINTAR."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl space-y-14">

          {/* Concursos em Aberto */}
          <ScrollReveal>
            <SectionTitle icon={Briefcase} label="Concursos em Aberto" color="text-aintar-teal" bg="bg-aintar-teal/10" />
            {loading ? <SkeletonList /> : abertos.length === 0 ? (
              <EmptySection msg="Não existem procedimentos concursais em aberto de momento." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {abertos.map(c => (
                  <div key={c.pk} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                    {/* Imagem / cabeçalho colorido */}
                    <div className="h-44 relative overflow-hidden flex-shrink-0">
                      {c.imagem_url ? (
                        <img
                          src={`/api/v1/website/procedimento-imagem/${c.imagem_url}`}
                          alt={c.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-hero-gradient flex items-center justify-center">
                          {c.ref_letra && (
                            <span className="text-7xl font-heading font-black text-white/20 select-none">
                              {c.ref_letra}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Badge REFª sobreposto */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {c.ref_letra && (
                          <span className="text-xs font-bold bg-aintar-teal text-white px-2.5 py-1 rounded-full shadow">
                            REFª {c.ref_letra}
                          </span>
                        )}
                        {c.referencia && (
                          <span className="text-xs font-semibold bg-white/90 text-aintar-teal px-2.5 py-1 rounded-full shadow">
                            {c.referencia}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex flex-col flex-grow p-5">
                      <h3 className="font-heading font-bold text-aintar-navy text-sm leading-snug mb-3 line-clamp-3">
                        {c.titulo}
                      </h3>

                      {/* Descrição / meta */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {c.tipo_contrato && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{c.tipo_contrato}</span>
                        )}
                        {c.municipio && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">📍 {c.municipio}</span>
                        )}
                        {c.num_vagas && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {c.num_vagas} {Number(c.num_vagas) === 1 ? 'posto' : 'postos'}
                          </span>
                        )}
                      </div>

                      {/* Prazo */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 mt-auto">
                        <Clock size={11} />
                        {formatPrazo(c)}
                      </div>

                      {/* Botão */}
                      <Link
                        to={`/recursos-humanos/${c.pk}`}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-aintar-teal text-white text-sm font-semibold hover:bg-aintar-blue transition-colors w-full"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700">
                  As candidaturas devem ser formalizadas através do formulário AINTAR V04 disponível em{' '}
                  <a href="/clientes/formularios" className="font-semibold underline">Formulários</a>.
                  Para mais informações contacte <a href="mailto:geral@aintar.pt" className="font-semibold underline">geral@aintar.pt</a>.
                </p>
              </div>
            )}
          </ScrollReveal>

          {/* Mobilidade Intercarreiras — só aparece se houver dados */}
          {!loading && mobilidade.length > 0 && (
            <ScrollReveal delay={0.1}>
              <SectionTitle icon={Users} label="Mobilidade Intercarreiras" color="text-aintar-blue" bg="bg-aintar-blue/10" />
              <div className="space-y-2">
                {mobilidade.map(p => (
                  <DocumentCard
                    key={p.pk}
                    title={p.titulo}
                    subtitle={p.referencia_dr}
                    year={p.data_publicacao ? new Date(p.data_publicacao).toLocaleDateString('pt-PT') : p.ano?.toString()}
                    href={fileUrl(p.ficheiro_url)}
                    fileSize="PDF"
                  />
                ))}
              </div>
            </ScrollReveal>
          )}

          {/* Procedimentos Concluídos */}
          <ScrollReveal delay={0.15}>
            <SectionTitle icon={CheckCircle2} label="Procedimentos Concluídos" color="text-gray-400" bg="bg-gray-100" />
            {loading ? <SkeletonList /> : concluidos.length === 0 ? (
              <EmptySection msg="Nenhum procedimento concluído registado." />
            ) : (
              anosConc.map(ano => (
                <div key={ano} className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 pl-1">{ano}</h3>
                  <div className="space-y-2">
                    {concluByAno[ano].map(c => (
                      <div key={c.pk}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                        <div>
                          {c.referencia && (
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mr-2">{c.referencia}</span>
                          )}
                          <span className="text-sm text-aintar-navy font-medium">{c.titulo}</span>
                          {c.num_vagas && (
                            <span className="text-xs text-gray-400 ml-2">({c.num_vagas} {c.num_vagas === 1 ? 'posto' : 'postos'})</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0 ml-3">Concluído</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </ScrollReveal>

          {/* Tolerâncias de Ponto */}
          <ScrollReveal delay={0.2}>
            <SectionTitle icon={FileText} label="Tolerâncias de Ponto" color="text-aintar-sky" bg="bg-aintar-sky/10" />
            {loading ? <SkeletonList /> : tolerancias.length === 0 ? (
              <EmptySection msg="Nenhuma tolerância de ponto publicada de momento." />
            ) : (
              <div className="space-y-2">
                {tolerancias.map(t => (
                  <a key={t.pk} href={fileUrl(t.ficheiro_url)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white
                      hover:border-aintar-sky/30 hover:bg-aintar-sky/5 transition-colors group">
                    <div>
                      <div className="text-sm font-medium text-aintar-navy group-hover:text-aintar-blue transition-colors">{t.titulo}</div>
                      {t.data_publicacao && (
                        <div className="text-xs text-gray-400 mt-0.5">{new Date(t.data_publicacao).toLocaleDateString('pt-PT')}</div>
                      )}
                    </div>
                    <ArrowUpRight size={15} className="text-gray-300 group-hover:text-aintar-sky flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </ScrollReveal>

          {/* Candidatura Espontânea */}
          <ScrollReveal delay={0.25}>
            <div className="p-6 rounded-2xl bg-hero-gradient text-white">
              <h3 className="font-heading font-bold text-lg mb-2">Candidatura Espontânea</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                Não encontrou uma vaga adequada? Envie-nos a sua candidatura espontânea.
                Guardamos o seu currículo para futuras necessidades de recrutamento.
              </p>
              <a href="mailto:geral@aintar.pt?subject=Candidatura%20Espontânea"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aintar-sky text-white
                  text-sm font-semibold hover:bg-white hover:text-aintar-blue transition-all">
                Enviar Candidatura
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
