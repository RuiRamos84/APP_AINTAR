import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { Award } from 'lucide-react'

const relatorios = [
  { title: 'Relatório de Qualidade de Serviço 2024', year: '2024', href: '/documentos/qualidade-servico-2024.pdf' },
  { title: 'Relatório de Qualidade de Serviço 2023', year: '2023', href: '/documentos/qualidade-servico-2023.pdf' },
  { title: 'Relatório de Qualidade de Serviço 2022', year: '2022', href: '/documentos/qualidade-servico-2022.pdf' },
]

const indicadores = [
  { label: 'Continuidade do Serviço', valor: '99,8%', descricao: 'Percentagem de tempo sem interrupções' },
  { label: 'Resposta a Reclamações', valor: '< 15 dias', descricao: 'Prazo médio de resposta' },
  { label: 'Qualidade do Efluente', valor: 'Conforme', descricao: 'Cumprimento dos valores limite' },
  { label: 'Avarias Resolvidas', valor: '98%', descricao: 'Taxa de resolução no prazo estabelecido' },
]

export default function QualidadeServicoPage() {
  return (
    <PageLayout
      title="Qualidade do Serviço"
      subtitle="Indicadores de desempenho e relatórios de qualidade do serviço de saneamento."
      breadcrumbs={[
        { label: 'Saneamento', href: '/saneamento' },
        { label: 'Qualidade do Serviço' },
      ]}
      seoDescription="Indicadores de qualidade do serviço de saneamento prestado pela AINTAR — conformidade, reclamações e monitorização."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-4xl">

          {/* ERSAR Seal */}
          <ScrollReveal className="mb-10">
            <div className="p-6 rounded-2xl bg-aintar-light border border-aintar-teal/20 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-aintar-teal/15 flex items-center justify-center flex-shrink-0">
                <Award size={28} className="text-aintar-teal" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-aintar-navy text-base mb-1">Regulação e Supervisão</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  A AINTAR é regulada pela <strong>ERSAR — Entidade Reguladora dos Serviços de Águas e Resíduos</strong>,
                  que avalia anualmente o desempenho da entidade gestora através do RASARP (Relatório Anual dos Serviços
                  de Águas e Resíduos em Portugal).
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Indicadores */}
          <ScrollReveal delay={0.1} className="mb-10">
            <h2 className="font-heading font-bold text-aintar-navy text-xl mb-6">Indicadores de Desempenho</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {indicadores.map((ind) => (
                <div key={ind.label}
                  className="p-5 rounded-2xl border border-gray-100 text-center hover:border-aintar-sky/30 hover:shadow-sm transition-all">
                  <div className="text-2xl font-extrabold font-heading text-aintar-blue mb-2">{ind.valor}</div>
                  <div className="text-xs font-semibold text-aintar-navy mb-1">{ind.label}</div>
                  <div className="text-xs text-gray-400 leading-snug">{ind.descricao}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Relatórios */}
          <ScrollReveal delay={0.2}>
            <h2 className="font-heading font-bold text-aintar-navy text-xl mb-5">Relatórios de Qualidade</h2>
            <div className="space-y-3">
              {relatorios.map((r) => (
                <DocumentCard key={r.year} title={r.title} year={r.year} href={r.href} fileSize="PDF" />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
