import { useState, useEffect } from 'react'
import { Calendar, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '../ui/ScrollReveal'
import { motion } from 'framer-motion'

import { getNoticias, fileUrl } from '../../services/cmsApi'

const CAT_COLOR = {
  default: 'bg-aintar-blue/15 text-aintar-blue',
  1: 'bg-aintar-sky/15 text-aintar-sky',
  2: 'bg-aintar-teal/15 text-aintar-teal',
  3: 'bg-aintar-blue/15 text-aintar-blue',
}

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NewsSection() {
  const [news, setNews] = useState([])

  useEffect(() => {
    getNoticias({ per_page: 3, destaque: true })
      .then(({ noticias = [] }) => {
        // Se não houver destaques, busca as 3 mais recentes
        if (noticias.length) return setNews(noticias)
        return getNoticias({ per_page: 3 }).then(({ noticias: all = [] }) => setNews(all))
      })
      .catch(() => {})
  }, [])

  return (
    <section id="noticias" className="bg-aintar-light">
      <div className="section-container py-16 lg:py-20">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <ScrollReveal>
              <span className="section-tag bg-aintar-blue/10 text-aintar-blue border border-aintar-blue/20 mb-3">
                Últimas Notícias
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="font-heading font-extrabold text-aintar-navy leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
                Acompanhe a nossa atividade
              </h2>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.2}>
            <Link to="/comunicacao/noticias" className="btn-outline-blue text-sm flex-shrink-0">
              Ver todas as notícias
              <ArrowRight size={14} />
            </Link>
          </ScrollReveal>
        </div>

        {/* News grid */}
        {news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((article, i) => (
              <ScrollReveal key={article.pk} delay={i * 0.12}>
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="card overflow-hidden h-full flex flex-col group"
                >
                  <Link to={`/comunicacao/noticias/${article.pk}`} className="flex flex-col h-full">
                    <div className="aspect-[16/9] bg-gradient-to-br from-aintar-navy to-aintar-blue overflow-hidden flex-shrink-0">
                      {article.imagem_url && (
                        <img
                          src={fileUrl(article.imagem_url)}
                          alt={article.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAT_COLOR[article.ts_categoria] ?? CAT_COLOR.default}`}>
                          {article.categoria ?? 'Notícia'}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <Calendar size={11} />
                          {formatDate(article.data_publicacao ?? article.data_criacao)}
                        </span>
                      </div>
                      <h3 className="font-heading font-bold text-aintar-navy text-base mb-3 leading-snug
                        group-hover:text-aintar-blue transition-colors flex-grow">
                        {article.titulo}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">
                        {article.resumo}
                      </p>
                      <div className="flex items-center gap-1.5 text-aintar-sky text-sm font-medium mt-auto">
                        Ler mais
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.article>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card h-64 animate-pulse bg-gray-100" />
            ))}
          </div>
        )}
      </div>

    </section>
  )
}
