import { useState, useEffect } from 'react'
import { Calendar, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { motion } from 'framer-motion'
import { getNoticias, fileUrl } from '../../services/cmsApi'

const CAT_COLOR = {
  default: 'bg-aintar-blue/10 text-aintar-blue',
  1: 'bg-aintar-sky/10 text-aintar-sky',
  2: 'bg-aintar-teal/10 text-aintar-teal',
  3: 'bg-aintar-blue/10 text-aintar-blue',
}

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const PER_PAGE = 9

  useEffect(() => {
    setLoading(true)
    getNoticias({ page, per_page: PER_PAGE })
      .then(({ noticias: items = [], total: t = 0 }) => {
        setNoticias(items)
        setTotal(t)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <PageLayout
      title="Notícias"
      subtitle="Acompanhe a atividade da AINTAR e as novidades do sector."
      breadcrumbs={[
        { label: 'Comunicação' },
        { label: 'Notícias' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-72 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : noticias.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Sem notícias publicadas de momento.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {noticias.map((n, i) => (
                <ScrollReveal key={n.pk} delay={(i % 3) * 0.08}>
                  <motion.article
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="card overflow-hidden h-full flex flex-col group"
                  >
                    <Link to={`/comunicacao/noticias/${n.pk}`} className="flex flex-col h-full">
                      <div className="aspect-[16/9] bg-gradient-to-br from-aintar-navy to-aintar-blue overflow-hidden flex-shrink-0">
                        {n.imagem_url && (
                          <img
                            src={fileUrl(n.imagem_url)}
                            alt={n.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        )}
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAT_COLOR[n.ts_categoria] ?? CAT_COLOR.default}`}>
                            {n.categoria ?? 'Notícia'}
                          </span>
                          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Calendar size={11} />{formatDate(n.data_publicacao ?? n.data_criacao)}
                          </span>
                        </div>
                        <h3 className="font-heading font-bold text-aintar-navy text-sm mb-3 leading-snug group-hover:text-aintar-blue transition-colors flex-grow">
                          {n.titulo}
                        </h3>
                        <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-3">{n.resumo}</p>
                        <div className="flex items-center gap-1.5 text-aintar-sky text-sm font-medium mt-auto">
                          Ler mais <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                </ScrollReveal>
              ))}
            </div>
          )}

          {/* Paginação */}
          {total > PER_PAGE && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: Math.ceil(total / PER_PAGE) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                    page === i + 1
                      ? 'bg-aintar-blue text-white'
                      : 'bg-aintar-light text-aintar-navy hover:bg-aintar-blue/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
