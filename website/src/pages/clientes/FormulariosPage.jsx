import { useState, useEffect } from 'react'
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getDocumentos, fileUrl } from '../../services/cmsApi'

const CAT_FORMULARIOS = 1

function FormCard({ title, subtitle, href }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-gray-100
      bg-white hover:border-aintar-sky/30 hover:shadow-md hover:shadow-aintar-blue/10 transition-all duration-200">

      {/* Icon + Info */}
      <div className="flex items-center gap-4 flex-grow min-w-0">
        <div className="w-10 h-10 rounded-lg bg-aintar-light flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-aintar-blue" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-aintar-navy text-sm truncate">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200
            text-gray-600 hover:border-aintar-blue hover:text-aintar-blue text-xs font-medium transition-colors"
        >
          <Download size={13} />
          PDF
        </a>
        <a
          href="https://app.aintar.pt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-aintar-blue text-white
            hover:bg-aintar-sky text-xs font-semibold transition-colors"
        >
          <ExternalLink size={13} />
          Submeter Online
        </a>
      </div>
    </div>
  )
}

export default function FormulariosPage() {
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocumentos(CAT_FORMULARIOS)
      .then(({ documentos = [] }) => setDocs(documentos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grupos = docs.reduce((acc, doc) => {
    const key = doc.subcategoria || 'Geral'
    if (!acc[key]) acc[key] = []
    acc[key].push(doc)
    return acc
  }, {})

  return (
    <PageLayout
      title="Formulários"
      subtitle="Descarregue os formulários ou submeta os seus pedidos diretamente através da Área de Cliente."
      breadcrumbs={[
        { label: 'Clientes', href: '/clientes' },
        { label: 'Formulários' },
      ]}
      seoDescription="Descarregue formulários para pedidos de serviço, ligações, reclamações e outros requerimentos à AINTAR."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {/* Banner Submissão Online */}
          <ScrollReveal>
            <motion.a
              href="https://app.aintar.pt"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-2xl
                bg-hero-gradient text-white mb-10 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-aintar-sky/20 flex items-center justify-center flex-shrink-0">
                <ExternalLink size={24} className="text-aintar-sky" />
              </div>
              <div className="flex-grow text-center sm:text-left">
                <div className="font-heading font-bold text-base mb-1">Prefere submeter online?</div>
                <div className="text-white/60 text-sm">
                  Aceda à Área de Cliente e submeta o seu pedido sem necessidade de impressão.
                </div>
              </div>
              <div className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                bg-aintar-sky text-white font-semibold text-sm group-hover:bg-white group-hover:text-aintar-blue
                transition-all duration-300">
                Entrar no Portal
                <ExternalLink size={14} />
              </div>
            </motion.a>
          </ScrollReveal>

          {/* Formulários por categoria */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">A carregar formulários…</span>
            </div>
          )}

          {!loading && docs.length === 0 && (
            <div className="text-center py-16">
              <FileText size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Não existem formulários disponíveis de momento.</p>
            </div>
          )}

          {!loading && docs.length > 0 && (
            <div className="space-y-10">
              {Object.entries(grupos).map(([grupo, items], i) => (
                <ScrollReveal key={grupo} delay={i * 0.08}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-1 h-6 rounded-full bg-aintar-sky flex-shrink-0" />
                    <h2 className="font-heading font-bold text-aintar-navy text-lg">{grupo}</h2>
                  </div>
                  <div className="space-y-2.5">
                    {items.map((doc) => (
                      <FormCard
                        key={doc.pk}
                        title={doc.titulo}
                        subtitle={doc.descricao}
                        href={fileUrl(doc.ficheiro_url)}
                      />
                    ))}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          {/* Nota rodapé */}
          {!loading && (
            <ScrollReveal delay={0.2} className="mt-10">
              <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Os formulários podem também ser entregues pessoalmente na sede da AINTAR em Carregal do Sal
                  ou enviados por email para{' '}
                  <a href="mailto:geral@aintar.pt" className="text-aintar-blue font-medium hover:underline">
                    geral@aintar.pt
                  </a>.
                </p>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
