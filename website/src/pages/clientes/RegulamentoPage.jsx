import { useState, useEffect } from 'react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { CheckCircle2, Download, FileText, Loader2, ExternalLink } from 'lucide-react'
import { getDocumentos, fileUrl } from '../../services/cmsApi'

const CAT_REGULAMENTACAO = 2
const CAT_CONDICOES = 6

function PdfViewer({ url, title }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl bg-aintar-light border border-gray-100">
        <FileText size={32} className="text-gray-300" />
        <p className="text-gray-400 text-xs text-center">Browser não suporta visualização inline.</p>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-aintar-blue text-white text-xs font-semibold hover:bg-aintar-blue-mid transition-colors">
          <ExternalLink size={12} /> Abrir PDF
        </a>
      </div>
    )
  }
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-100 bg-aintar-light" style={{ height: '65vh' }}>
      <object data={url} type="application/pdf" width="100%" height="100%" onError={() => setFailed(true)} aria-label={title}>
        <iframe src={`${url}#view=FitH`} title={title} width="100%" height="100%" style={{ border: 'none' }} onError={() => setFailed(true)}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-aintar-blue underline text-sm p-4 block">Descarregar PDF</a>
        </iframe>
      </object>
    </div>
  )
}

const capitulos = [
  'Disposições gerais e âmbito de aplicação',
  'Condições de ligação ao sistema de saneamento',
  'Direitos e deveres dos utilizadores',
  'Condições de faturação e pagamento',
  'Regime de avarias e reclamações',
  'Condições de suspensão e rescisão do contrato',
]

export default function RegulamentoPage() {
  const [docs, setDocs]       = useState([])
  const [condicoes, setCondicoes] = useState([])
  const [loadingCond, setLoadingCond] = useState(true)
  useEffect(() => {
    getDocumentos(CAT_REGULAMENTACAO)
      .then(({ documentos = [] }) => setDocs(documentos))
      .catch(() => {})
    getDocumentos(CAT_CONDICOES)
      .then(({ documentos = [] }) => setCondicoes(documentos))
      .catch(() => {})
      .finally(() => setLoadingCond(false))
  }, [])

  return (
    <PageLayout
      title="Regulamento de Serviço"
      subtitle="Condições gerais de prestação do serviço de saneamento de águas residuais."
      breadcrumbs={[
        { label: 'Clientes', href: '/clientes' },
        { label: 'Regulamento de Serviço' },
      ]}
      seoDescription="Regulamento de serviço da AINTAR — condições gerais do fornecimento do serviço de saneamento."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Main content */}
            <div className="lg:col-span-2">
              <ScrollReveal>
                <h2 className="font-heading font-bold text-aintar-navy text-xl mb-4">Sobre o Regulamento</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  O Regulamento de Serviço define as condições gerais em que a AINTAR presta os serviços de
                  saneamento de águas residuais, estabelecendo os direitos e deveres de ambas as partes —
                  entidade gestora e utilizadores.
                </p>
                <p className="text-gray-600 text-sm leading-relaxed mb-8">
                  Este regulamento foi elaborado em conformidade com o Decreto-Lei n.º 194/2009, de 20 de agosto,
                  e demais legislação aplicável ao sector dos serviços de águas e resíduos.
                </p>

                <h3 className="font-heading font-bold text-aintar-navy text-base mb-4">Principais Capítulos</h3>
                <div className="space-y-3">
                  {capitulos.map((c, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-aintar-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-aintar-blue text-xs font-bold">{i + 1}</span>
                      </div>
                      <span className="text-gray-600 text-sm">{c}</span>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            {/* Downloads */}
            <div>
              <ScrollReveal delay={0.15}>
                <div className="sticky top-24">
                  <h3 className="font-heading font-bold text-aintar-navy text-base mb-4">Documentos</h3>
                  <div className="space-y-3">
                    {docs.map((doc) => (
                      <DocumentCard key={doc.pk} title={doc.titulo} subtitle={doc.descricao} year={doc.ano?.toString()} href={fileUrl(doc.ficheiro_url)} fileSize="PDF" />
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-2xl bg-aintar-teal/10 border border-aintar-teal/20">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-aintar-teal flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Para esclarecimentos sobre o regulamento, contacte o nosso serviço de atendimento.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Condições Contratuais */}
      <section className="section-padding bg-aintar-light/50">
        <div className="section-container max-w-4xl">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-aintar-teal/10 flex items-center justify-center">
                <FileText size={18} className="text-aintar-teal" />
              </div>
              <h2 className="font-heading font-bold text-aintar-navy text-xl">Condições Contratuais</h2>
            </div>
          </ScrollReveal>

          {loadingCond && (
            <div className="flex items-center gap-2 py-10 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">A carregar…</span>
            </div>
          )}

          {!loadingCond && condicoes.length === 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Documento não disponível de momento.</p>
            </div>
          )}

          {!loadingCond && condicoes.length > 0 && condicoes.map((doc, i) => (
            <ScrollReveal key={doc.pk} delay={i * 0.08}>
              <div className="mb-6">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-aintar-navy text-base">{doc.titulo}</h3>
                    {doc.descricao && <p className="text-gray-400 text-sm mt-0.5">{doc.descricao}</p>}
                  </div>
                  <a
                    href={fileUrl(doc.ficheiro_url)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-aintar-teal/30 text-aintar-teal text-sm font-semibold hover:bg-aintar-teal hover:text-white transition-colors flex-shrink-0"
                  >
                    <Download size={13} />
                    Descarregar PDF
                  </a>
                </div>
                <PdfViewer url={fileUrl(doc.ficheiro_url)} title={doc.titulo} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </PageLayout>
  )
}
