import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Users2, Calendar, Download, FileText, Loader2 } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import { getProcedimento, getConcursalForSiteProc, fileUrl } from '../../services/cmsApi'

const fmt = d => d ? new Date(d).toLocaleDateString('pt-PT') : null

function formatPrazo(p) {
  const ini = fmt(p.data_abertura)
  const fim = fmt(p.data_encerramento)
  if (ini && fim) return `${ini} – ${fim}`
  if (ini) return `Aberto desde ${ini}`
  return '—'
}

export default function ProcedimentoPage() {
  const { pk } = useParams()
  const navigate = useNavigate()
  const [proc, setProc]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    if (!pk) return
    setLoading(true)
    getProcedimento(pk)
      .then(({ procedimento }) => setProc(procedimento))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [pk])

  const handleCandidatura = async () => {
    setNavigating(true)
    try {
      const { concursal_pk } = await getConcursalForSiteProc(pk)
      navigate(`/clientes/formularios/candidatura/${concursal_pk}`)
    } catch {
      setNavigating(false)
    }
  }

  return (
    <PageLayout
      title={loading ? 'A carregar…' : error ? 'Procedimento não encontrado' : proc?.titulo ?? ''}
      breadcrumbs={[
        { label: 'Quem Somos', href: '/quem-somos' },
        { label: 'Recursos Humanos', href: '/quem-somos/recursos-humanos' },
        { label: loading ? '…' : proc?.titulo ?? '' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">
          <Link
            to="/quem-somos/recursos-humanos"
            className="inline-flex items-center gap-1.5 text-aintar-teal text-sm font-medium mb-8 hover:underline"
          >
            <ArrowLeft size={14} /> Voltar a Recursos Humanos
          </Link>

          {loading && (
            <div className="space-y-4">
              <div className="h-7 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="grid grid-cols-3 gap-3 mt-6">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
              <div className="h-32 bg-gray-100 rounded-xl animate-pulse mt-4" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-gray-400">
              <p>Este procedimento não está disponível ou foi removido.</p>
            </div>
          )}

          {!loading && !error && proc && (
            <article className="space-y-8">
              {/* Título e badges */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {proc.referencia && (
                    <span className="text-xs font-bold text-aintar-teal bg-aintar-teal/15 px-2.5 py-1 rounded-full">
                      {proc.referencia}
                    </span>
                  )}
                  {proc.tipo && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {proc.tipo}
                    </span>
                  )}
                </div>
                <h1 className="font-heading font-bold text-aintar-navy text-2xl leading-snug">{proc.titulo}</h1>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {proc.carreira && (
                  <div className="p-4 rounded-xl bg-aintar-light">
                    <div className="text-xs text-gray-400 mb-1">Carreira</div>
                    <div className="text-sm font-semibold text-aintar-navy">{proc.carreira}</div>
                  </div>
                )}
                {proc.categoria_prof && (
                  <div className="p-4 rounded-xl bg-aintar-light">
                    <div className="text-xs text-gray-400 mb-1">Categoria</div>
                    <div className="text-sm font-semibold text-aintar-navy">{proc.categoria_prof}</div>
                  </div>
                )}
                {proc.num_vagas && (
                  <div className="p-4 rounded-xl bg-aintar-light">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1"><Users2 size={11} /> Vagas</div>
                    <div className="text-sm font-semibold text-aintar-navy">{proc.num_vagas}</div>
                  </div>
                )}
                {proc.municipio && (
                  <div className="p-4 rounded-xl bg-aintar-light">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1"><MapPin size={11} /> Município</div>
                    <div className="text-sm font-semibold text-aintar-navy">{proc.municipio}</div>
                  </div>
                )}
                {(proc.data_abertura || proc.data_encerramento) && (
                  <div className="p-4 rounded-xl bg-aintar-light col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1"><Calendar size={11} /> Prazo</div>
                    <div className="text-sm font-semibold text-aintar-navy">{formatPrazo(proc)}</div>
                  </div>
                )}
              </div>

              {/* Descrição */}
              {proc.descricao && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Descrição</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{proc.descricao}</p>
                </div>
              )}

              {/* Fases */}
              {proc.fases?.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Fases do Procedimento</h2>
                  <ol className="space-y-3">
                    {proc.fases.map((fase, i) => (
                      <li key={fase.pk} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-aintar-teal/10 text-aintar-teal text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-aintar-navy">{fase.label}</span>
                            {fase.data && (
                              <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                                <Clock size={11} /> {fmt(fase.data)}
                              </span>
                            )}
                          </div>
                          {fase.notas && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{fase.notas}</p>}
                          {fase.ficheiro_url && (
                            <a
                              href={fileUrl(fase.ficheiro_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-aintar-teal hover:text-aintar-blue transition-colors"
                            >
                              <Download size={12} /> Descarregar documento
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* CTA candidatura */}
              <div className="p-6 rounded-2xl bg-hero-gradient text-white">
                <h3 className="font-heading font-bold text-base mb-1">Pretende candidatar-se?</h3>
                <p className="text-white/70 text-sm mb-4">
                  Preencha o formulário de candidatura DAGF_RH_FR_01 para este procedimento.
                </p>
                <button
                  onClick={handleCandidatura}
                  disabled={navigating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aintar-sky text-white
                    text-sm font-semibold hover:bg-white hover:text-aintar-blue transition-all
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {navigating
                    ? <><Loader2 size={16} className="animate-spin" /> A abrir formulário…</>
                    : <><FileText size={16} /> Formulário de Candidatura</>
                  }
                </button>
              </div>
            </article>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
