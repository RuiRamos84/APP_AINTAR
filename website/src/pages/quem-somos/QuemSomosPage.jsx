import { Link } from 'react-router-dom'
import { Users, FileText, ShoppingCart, Network, ScrollText, ArrowRight, CheckCircle2 } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'

const colorMap = {
  'aintar-sky':  { icon: 'bg-aintar-sky/10 group-hover:bg-aintar-sky/20 text-aintar-sky', cta: 'text-aintar-sky' },
  'aintar-teal': { icon: 'bg-aintar-teal/10 group-hover:bg-aintar-teal/20 text-aintar-teal', cta: 'text-aintar-teal' },
  'aintar-blue': { icon: 'bg-aintar-blue/10 group-hover:bg-aintar-blue/20 text-aintar-blue', cta: 'text-aintar-blue' },
}

const subPages = [
  {
    icon: Network,
    label: 'Organograma',
    description: 'Estrutura orgânica e composição dos órgãos de gestão da associação.',
    href: '/quem-somos/organograma',
    color: 'aintar-blue',
  },
  {
    icon: Users,
    label: 'Órgãos Sociais',
    description: 'Composição da Assembleia Intermunicipal, Conselho de Administração e Fiscal Único.',
    href: '/quem-somos/orgaos-sociais',
    color: 'aintar-sky',
  },
  {
    icon: ScrollText,
    label: 'Estatutos',
    description: 'Consulte e descarregue os estatutos oficiais da AINTAR.',
    href: '/quem-somos/estatutos',
    color: 'aintar-teal',
  },
  {
    icon: FileText,
    label: 'Documentos Financeiros',
    description: 'Prestação de contas, documentos provisórios e relatórios financeiros por ano.',
    href: '/quem-somos/documentos-financeiros',
    color: 'aintar-teal',
  },
  {
    icon: ShoppingCart,
    label: 'Contratação Pública',
    description: 'Acesso ao portal BASE e publicação de contratos públicos.',
    href: '/quem-somos/contratacao-publica',
    color: 'aintar-sky',
  },
]

const values = [
  { title: 'Rigor Técnico', text: 'Operamos com padrões de excelência na gestão de infraestruturas críticas.' },
  { title: 'Transparência', text: 'Prestamos contas à comunidade com clareza e regularidade.' },
  { title: 'Sustentabilidade', text: 'Protegemos os recursos hídricos para as gerações futuras.' },
  { title: 'Inovação', text: 'Investimos em tecnologia e processos modernos de tratamento.' },
]

export default function QuemSomosPage() {
  return (
    <PageLayout
      title="Quem Somos"
      subtitle="A AINTAR é a entidade gestora responsável pelos sistemas intermunicipais de saneamento de águas residuais na região Centro de Portugal."
      breadcrumbs={[{ label: 'Quem Somos' }]}
    >
      {/* Mission */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ScrollReveal>
              <span className="section-tag bg-aintar-blue/10 text-aintar-blue border border-aintar-blue/20 mb-4">
                A Nossa Missão
              </span>
              <h2 className="font-heading font-extrabold text-aintar-navy mb-6 leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
                Gestão intermunicipal para um{' '}
                <span className="text-gradient">ambiente mais saudável</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                A <strong>AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais</strong> foi
                constituída para assegurar a gestão eficiente dos sistemas de saneamento de águas residuais
                em alta e em baixa, nos municípios que integram a associação.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Desde <strong>1 de novembro de 2022</strong>, assumimos formalmente as competências de Entidade
                Gestora, unindo recursos e capacidades técnicas dos municípios associados para prestar
                um serviço de qualidade às populações da região Centro.
              </p>
              <div className="space-y-2.5">
                {['Gestão técnica especializada', 'Eficiência operacional', 'Transparência total', 'Compromisso ambiental'].map(v => (
                  <div key={v} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-aintar-teal flex-shrink-0" />
                    {v}
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {values.map((v) => (
                  <div key={v.title}
                    className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10 hover:border-aintar-sky/30 transition-colors">
                    <div className="font-heading font-bold text-aintar-blue text-sm mb-2">{v.title}</div>
                    <p className="text-gray-500 text-xs leading-relaxed">{v.text}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Sub-pages grid */}
      <section className="section-padding bg-aintar-light">
        <div className="section-container">
          <ScrollReveal className="text-center mb-12">
            <h2 className="font-heading font-extrabold text-aintar-navy mb-3"
              style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}>
              Informação Institucional
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Aceda aos documentos, órgãos e informações relevantes sobre a estrutura e funcionamento da AINTAR.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subPages.map((page, i) => {
              const colors = colorMap[page.color]
              return (
                <ScrollReveal key={page.label} delay={i * 0.1}>
                  <Link to={page.href} className="card p-6 flex flex-col gap-4 h-full group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${colors.icon}`}>
                      <page.icon size={22} />
                    </div>
                    <div className="flex-grow">
                      <div className="font-heading font-bold text-aintar-navy text-sm mb-1.5 group-hover:text-aintar-blue transition-colors">
                        {page.label}
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">{page.description}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${colors.cta}`}>
                      Consultar
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
