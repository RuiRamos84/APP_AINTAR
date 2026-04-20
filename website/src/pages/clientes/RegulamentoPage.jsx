import { useState, useEffect } from 'react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { CheckCircle2 } from 'lucide-react'
import { getDocumentos, fileUrl } from '../../services/cmsApi'

const CAT_REGULAMENTACAO = 2

const capitulos = [
  'Disposições gerais e âmbito de aplicação',
  'Condições de ligação ao sistema de saneamento',
  'Direitos e deveres dos utilizadores',
  'Condições de faturação e pagamento',
  'Regime de avarias e reclamações',
  'Condições de suspensão e rescisão do contrato',
]

export default function RegulamentoPage() {
  const [docs, setDocs] = useState([])
  useEffect(() => {
    getDocumentos(CAT_REGULAMENTACAO)
      .then(({ documentos = [] }) => setDocs(documentos))
      .catch(() => {})
  }, [])

  return (
    <PageLayout
      title="Regulamento de Serviço"
      subtitle="Condições gerais de prestação do serviço de saneamento de águas residuais."
      breadcrumbs={[
        { label: 'Clientes', href: '/clientes' },
        { label: 'Regulamento de Serviço' },
      ]}
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
    </PageLayout>
  )
}
