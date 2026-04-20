import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, ArrowLeft } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import { getNoticia, fileUrl } from '../../services/cmsApi'

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NoticiaPage() {
  const { pk } = useParams()
  const [noticia, setNoticia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (!pk) return
    setLoading(true)
    getNoticia(pk)
      .then(({ noticia: n }) => setNoticia(n))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [pk])

  return (
    <PageLayout
      title={loading ? 'A carregar…' : error ? 'Notícia não encontrada' : noticia?.titulo ?? ''}
      breadcrumbs={[
        { label: 'Comunicação' },
        { label: 'Notícias', href: '/comunicacao/noticias' },
        { label: loading ? '…' : noticia?.titulo ?? '' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">
          <Link
            to="/comunicacao/noticias"
            className="inline-flex items-center gap-1.5 text-aintar-sky text-sm font-medium mb-8 hover:underline"
          >
            <ArrowLeft size={14} /> Voltar às notícias
          </Link>

          {loading && (
            <div className="space-y-4">
              <div className="h-6 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-gray-400">
              <p>Esta notícia não está disponível ou foi removida.</p>
            </div>
          )}

          {!loading && !error && noticia && (
            <article>
              {/* Meta */}
              <div className="flex items-center gap-3 mb-6 text-sm text-gray-400">
                <span className="px-2.5 py-1 rounded-full bg-aintar-blue/10 text-aintar-blue font-semibold text-xs">
                  {noticia.categoria ?? 'Notícia'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {formatDate(noticia.data_publicacao ?? noticia.data_criacao)}
                </span>
              </div>

              {/* Imagem */}
              {noticia.imagem_url && (
                <div className="rounded-2xl overflow-hidden mb-8 aspect-[16/7] bg-gradient-to-br from-aintar-navy to-aintar-blue">
                  <img
                    src={fileUrl(noticia.imagem_url)}
                    alt={noticia.titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}

              {/* Resumo */}
              {noticia.resumo && (
                <p className="text-gray-600 text-lg leading-relaxed mb-6 font-medium">
                  {noticia.resumo}
                </p>
              )}

              {/* Conteúdo HTML */}
              {noticia.conteudo_html && (
                <div
                  className="prose prose-aintar max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: noticia.conteudo_html }}
                />
              )}
            </article>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
