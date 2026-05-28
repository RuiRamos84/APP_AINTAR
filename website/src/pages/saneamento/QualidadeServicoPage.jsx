import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DocumentCard from '../../components/ui/DocumentCard'
import { Award, CheckCircle, AlertCircle } from 'lucide-react'

const relatorios = [
  { title: 'Relatório de Qualidade de Serviço 2024', year: '2024', href: '/documentos/qualidade-servico-2024.pdf' },
  { title: 'Relatório de Qualidade de Serviço 2023', year: '2023', href: '/documentos/qualidade-servico-2023.pdf' },
  { title: 'Relatório de Qualidade de Serviço 2022', year: '2022', href: '/documentos/qualidade-servico-2022.pdf' },
]

// avaliacao: 'boa' | 'mediana'
const categorias = [
  {
    titulo: 'Adequação do Serviço ao Utilizador',
    indicadores: [
      {
        codigo: 'AR 02',
        label: 'Acessibilidade física por redes fixas e meios móveis',
        valor: '72%',
        referencia: '[70; 100]',
        avaliacao: 'boa',
        descricao: 'Percentagem de alojamentos com acesso ao serviço de saneamento por rede fixa.',
      },
      {
        codigo: 'AR 03',
        label: 'Acessibilidade económica do serviço',
        valor: '0,24%',
        referencia: '[0; 0,50]',
        avaliacao: 'boa',
        descricao: 'Custo anual do serviço em percentagem do rendimento disponível médio dos utilizadores.',
      },
      {
        codigo: 'AR 05',
        label: 'Resposta a reclamações e pedidos de informação escritos',
        valor: '100%',
        referencia: '100',
        avaliacao: 'boa',
        descricao: 'Taxa de resposta dentro do prazo legal estabelecido.',
      },
    ],
  },
  {
    titulo: 'Sustentabilidade da Gestão do Serviço',
    indicadores: [
      {
        codigo: 'AR 06',
        label: 'Cobertura dos gastos',
        valor: '121%',
        referencia: '[100; 110]',
        avaliacao: 'boa',
        descricao: 'Rácio entre receitas e gastos totais operacionais — indicador de equilíbrio financeiro.',
      },
      {
        codigo: 'AR 14',
        label: 'Adequação dos recursos humanos no tratamento',
        valor: '3,3 /(10⁶ m³·ano)',
        referencia: '[2,1; 3,5]',
        avaliacao: 'boa',
        descricao: 'Número de trabalhadores afetos ao tratamento por volume de águas residuais tratadas.',
      },
      {
        codigo: 'AR 15',
        label: 'Adequação dos recursos humanos na recolha e drenagem',
        valor: '2,5 /(100 km·ano)',
        referencia: '[5,0; 12,0]',
        avaliacao: 'mediana',
        descricao: 'Número de trabalhadores afetos à rede de coletores por extensão gerida.',
      },
    ],
  },
]

const avaliacaoConfig = {
  boa: {
    label: 'Boa',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    Icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  mediana: {
    label: 'Mediana',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    Icon: AlertCircle,
    iconColor: 'text-amber-500',
  },
}

function IndicadorCard({ ind }) {
  const cfg = avaliacaoConfig[ind.avaliacao]
  const { Icon } = cfg
  return (
    <div className={`p-5 rounded-2xl border ${cfg.border} ${cfg.bg} flex flex-col gap-3 hover:shadow-sm transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{ind.codigo}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
          <Icon size={10} />
          {cfg.label}
        </span>
      </div>
      <div className={`text-2xl font-extrabold font-heading ${cfg.text} leading-none`}>{ind.valor}</div>
      <div className="text-xs font-semibold text-aintar-navy leading-snug">{ind.label}</div>
      <div className="text-xs text-gray-500 leading-snug">{ind.descricao}</div>
      <div className="text-[10px] text-gray-400 mt-auto">Valor de referência: {ind.referencia}</div>
    </div>
  )
}

export default function QualidadeServicoPage() {
  return (
    <PageLayout
      title="Qualidade do Serviço"
      subtitle="Indicadores de desempenho ERSAR 2024 e relatórios de qualidade do serviço de saneamento."
      breadcrumbs={[
        { label: 'Saneamento', href: '/saneamento' },
        { label: 'Qualidade do Serviço' },
      ]}
      seoDescription="Indicadores de qualidade do serviço de saneamento prestado pela AINTAR — conformidade, reclamações e monitorização."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-5xl">

          {/* ERSAR */}
          <ScrollReveal className="mb-10">
            <div className="p-6 rounded-2xl bg-aintar-light border border-aintar-teal/20 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-aintar-teal/15 flex items-center justify-center flex-shrink-0">
                <Award size={28} className="text-aintar-teal" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-heading font-bold text-aintar-navy text-base">Regulação e Supervisão</h3>
                  <span className="text-[11px] font-bold bg-aintar-teal/10 text-aintar-teal px-2 py-0.5 rounded-full">Avaliação 2024</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  A AINTAR é regulada pela <strong>ERSAR — Entidade Reguladora dos Serviços de Águas e Resíduos</strong>,
                  que avalia anualmente o desempenho da entidade gestora através do RASARP (Relatório Anual dos Serviços
                  de Águas e Resíduos em Portugal). Os indicadores abaixo refletem a avaliação do ano de 2024.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Categorias de indicadores */}
          {categorias.map((cat, i) => (
            <ScrollReveal key={cat.titulo} delay={i * 0.1} className="mb-10">
              <h2 className="font-heading font-bold text-aintar-navy text-lg mb-4 pb-2 border-b border-gray-100">
                {cat.titulo}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.indicadores.map((ind) => (
                  <IndicadorCard key={ind.codigo} ind={ind} />
                ))}
              </div>
            </ScrollReveal>
          ))}

          {/* Relatórios */}
          <ScrollReveal delay={0.3}>
            <h2 className="font-heading font-bold text-aintar-navy text-lg mb-5">Relatórios de Qualidade</h2>
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
