import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Loader2, Download } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import { getProcedimento, getConcursalForSiteProc, procDocUrl } from '../../services/cmsApi'

const fmt = d => d ? new Date(d).toLocaleDateString('pt-PT') : null

function DocList({ titulo, items }) {
  if (!items?.length) return null
  return (
    <div>
      <h2 className="font-heading font-bold text-aintar-navy text-base mb-3">{titulo}</h2>
      <ul className="space-y-2">
        {items.map(doc => (
          <li key={doc.pk} className="flex items-center gap-2">
            <span className="text-aintar-navy font-medium">–</span>
            <a
              href={procDocUrl(doc.ficheiro_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-aintar-teal hover:text-aintar-blue hover:underline transition-colors flex items-center gap-1.5"
            >
              {doc.titulo || doc.nome_original}
              <Download size={12} className="opacity-60 flex-shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
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
      navigate(`/recursos-humanos/candidatura/${concursal_pk}`)
    } catch {
      setNavigating(false)
    }
  }

  const docs = proc?.documentos ?? {}
  const hasDocs = (docs.publicacao?.length || docs.referencia?.length || docs.formulario?.length)

  return (
    <PageLayout
      title={loading ? 'A carregar…' : error ? 'Procedimento não encontrado' : proc?.titulo ?? ''}
      breadcrumbs={[
        { label: 'Recursos Humanos', href: '/recursos-humanos' },
        { label: loading ? '…' : proc?.titulo ?? '' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">
          <Link
            to="/recursos-humanos"
            className="inline-flex items-center gap-1.5 text-aintar-teal text-sm font-medium mb-8 hover:underline"
          >
            <ArrowLeft size={14} /> Voltar a Recursos Humanos
          </Link>

          {loading && (
            <div className="space-y-4">
              <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-7 bg-gray-100 rounded animate-pulse w-2/3 mt-4" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-gray-400">
              <p>Este procedimento não está disponível ou foi removido.</p>
            </div>
          )}

          {!loading && !error && proc && (
            <article className="space-y-8">
              {/* Título */}
              <h1 className="font-heading font-bold text-aintar-navy text-2xl leading-snug">
                {proc.titulo}
              </h1>

              {/* Imagem */}
              {proc.imagem_url && (
                <div className="rounded-2xl overflow-hidden h-56 sm:h-72 bg-aintar-light">
                  <img
                    src={proc.imagem_url}
                    alt={proc.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Badges + Descrição */}
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {proc.referencia && (
                    <span className="text-xs font-bold text-aintar-teal bg-aintar-teal/15 px-2.5 py-1 rounded-full">
                      REFª {proc.ref_letra ?? proc.referencia}
                    </span>
                  )}
                  {proc.tipo && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {proc.tipo}
                    </span>
                  )}
                  {proc.tipo_contrato && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {proc.tipo_contrato}
                    </span>
                  )}
                </div>
                {proc.descricao && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {proc.descricao}
                  </p>
                )}
              </div>

              {/* Datas e local */}
              <div className="space-y-2 text-sm text-gray-700">
                {proc.data_abertura && (
                  <p>
                    <span className="font-semibold text-aintar-navy">Data de início de candidaturas: </span>
                    {fmt(proc.data_abertura)}
                  </p>
                )}
                {proc.data_encerramento && (
                  <p>
                    <span className="font-semibold text-aintar-navy">Data de fim de candidaturas: </span>
                    {fmt(proc.data_encerramento)}
                  </p>
                )}
                {proc.municipio && (
                  <p>
                    <span className="font-semibold text-aintar-navy">Local de trabalho</span>
                    {' – '}{proc.municipio}
                  </p>
                )}
              </div>

              {/* Documentos */}
              {hasDocs > 0 && (
                <div className="space-y-6 pt-2">
                  <DocList titulo="Publicações" items={docs.publicacao} />
                  <DocList titulo="Referências Bibliográficas" items={docs.referencia} />
                </div>
              )}

              {/* CTA candidatura */}
              <div className="p-6 rounded-2xl bg-hero-gradient text-white">
                <h3 className="font-heading font-bold text-base mb-1">Pretende candidatar-se?</h3>
                <p className="text-white/70 text-sm mb-4">
                  Preencha o formulário de candidatura para este procedimento.
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
