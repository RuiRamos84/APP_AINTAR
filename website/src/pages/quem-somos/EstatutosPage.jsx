import { useState, useEffect } from 'react'
import { FileText, Download, Loader2, ExternalLink } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getDocumentos, fileUrl } from '../../services/cmsApi'

const CAT_ESTATUTOS = 5

function PdfViewer({ url, title }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl bg-aintar-light border border-gray-100">
        <FileText size={40} className="text-gray-300" />
        <p className="text-gray-400 text-sm text-center px-4">
          O seu browser não suporta visualização inline de PDF.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aintar-blue text-white text-sm font-semibold hover:bg-aintar-blue-mid transition-colors"
        >
          <ExternalLink size={14} />
          Abrir PDF
        </a>
      </div>
    )
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-aintar-light" style={{ height: '75vh' }}>
      <object
        data={url}
        type="application/pdf"
        width="100%"
        height="100%"
        onError={() => setFailed(true)}
        aria-label={title}
      >
        <iframe
          src={`${url}#view=FitH&toolbar=1`}
          title={title}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          onError={() => setFailed(true)}
        >
          <p className="p-4 text-sm text-gray-500">
            PDF não disponível.{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-aintar-blue underline">
              Descarregue aqui
            </a>.
          </p>
        </iframe>
      </object>
    </div>
  )
}

export default function EstatutosPage() {
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  useEffect(() => {
    getDocumentos(CAT_ESTATUTOS)
      .then(({ documentos = [] }) => {
        setDocs(documentos)
        if (documentos.length > 0) setActive(documentos[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeUrl = active ? fileUrl(active.ficheiro_url) : null

  return (
    <PageLayout
      title="Estatutos"
      subtitle="Estatutos e documentação orgânica da AINTAR."
      breadcrumbs={[
        { label: 'Quem Somos', href: '/quem-somos' },
        { label: 'Estatutos' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-5xl">

          {loading && (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">A carregar documento…</span>
            </div>
          )}

          {!loading && docs.length === 0 && (
            <div className="text-center py-20">
              <FileText size={44} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Documento não disponível de momento.</p>
              <p className="text-gray-300 text-xs mt-2">
                Contacte{' '}
                <a href="mailto:geral@aintar.pt" className="text-aintar-blue hover:underline">
                  geral@aintar.pt
                </a>{' '}
                para obter esta informação.
              </p>
            </div>
          )}

          {!loading && docs.length > 0 && (
            <div className="space-y-6">
              {/* Seletor de documento (se houver mais de um) */}
              {docs.length > 1 && (
                <ScrollReveal>
                  <div className="flex flex-wrap gap-2">
                    {docs.map(doc => (
                      <button
                        key={doc.pk}
                        onClick={() => setActive(doc)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                          active?.pk === doc.pk
                            ? 'bg-aintar-blue text-white border-aintar-blue'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-aintar-blue hover:text-aintar-blue'
                        }`}
                      >
                        <FileText size={13} />
                        {doc.titulo}
                      </button>
                    ))}
                  </div>
                </ScrollReveal>
              )}

              {/* Toolbar */}
              <ScrollReveal>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="font-heading font-bold text-aintar-navy text-lg truncate">
                      {active?.titulo}
                    </h2>
                    {active?.descricao && (
                      <p className="text-gray-400 text-sm mt-0.5">{active.descricao}</p>
                    )}
                  </div>
                  <a
                    href={activeUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-aintar-blue/30 text-aintar-blue text-sm font-semibold hover:bg-aintar-blue hover:text-white transition-colors flex-shrink-0"
                  >
                    <Download size={14} />
                    Descarregar PDF
                  </a>
                </div>
              </ScrollReveal>

              {/* Visualizador */}
              <ScrollReveal delay={0.1}>
                {activeUrl && <PdfViewer url={activeUrl} title={active?.titulo} />}
              </ScrollReveal>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
