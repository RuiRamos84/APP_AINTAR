import { Link } from 'react-router-dom'
import { FileText, Euro, ClipboardList, HelpCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DarkBgDecorations from '../../components/ui/DarkBgDecorations'

const areas = [
  {
    icon: FileText,
    label: 'Regulamento de Serviço',
    description: 'Consulte as condições gerais de prestação do serviço de saneamento.',
    href: '/clientes/regulamento',
    color: 'aintar-blue',
  },
  {
    icon: Euro,
    label: 'Tarifário',
    description: 'Tarifas em vigor e documentos históricos de anos anteriores.',
    href: '/clientes/tarifario',
    color: 'aintar-teal',
  },
  {
    icon: ClipboardList,
    label: 'Formulários',
    description: 'Pedidos de ligação, alterações contratuais e requerimentos.',
    href: '/clientes/formularios',
    color: 'aintar-sky',
  },
  {
    icon: HelpCircle,
    label: 'Perguntas Frequentes',
    description: 'Respostas às dúvidas mais comuns sobre o serviço de saneamento.',
    href: '/clientes/faq',
    color: 'aintar-blue',
  },
]

const quickActions = [
  { label: '2ª Via de Fatura', href: 'https://app.aintar.pt', external: true },
  { label: 'Comunicar Leitura', href: 'https://app.aintar.pt', external: true },
  { label: 'Reportar Avaria', href: 'https://app.aintar.pt', external: true },
  { label: 'Contactar Apoio', href: '/contactos', external: false },
]

export default function ClientesPage() {
  return (
    <PageLayout
      title="Clientes"
      subtitle="Toda a informação e serviços de que necessita enquanto cliente da AINTAR."
      breadcrumbs={[{ label: 'Clientes' }]}
    >
      {/* Quick actions */}
      <section className="py-10 bg-aintar-light border-b border-aintar-blue/10">
        <div className="section-container">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <span className="text-sm font-semibold text-aintar-navy mr-2">Acesso rápido:</span>
            {quickActions.map((a) =>
              a.external ? (
                <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer"
                  className="btn-outline-blue text-xs px-4 py-2">
                  {a.label}
                </a>
              ) : (
                <Link key={a.label} to={a.href}
                  className="btn-outline-blue text-xs px-4 py-2">
                  {a.label}
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* Main areas */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {areas.map((area, i) => (
              <ScrollReveal key={area.label} delay={i * 0.1}>
                <Link to={area.href} className="card p-6 flex flex-col gap-4 h-full group">
                  <div className={`w-12 h-12 rounded-xl bg-${area.color}/10 flex items-center justify-center
                    group-hover:bg-${area.color}/20 transition-colors`}>
                    <area.icon size={22} className={`text-${area.color}`} />
                  </div>
                  <div className="flex-grow">
                    <div className="font-heading font-bold text-aintar-navy text-sm mb-1.5 group-hover:text-aintar-blue transition-colors">
                      {area.label}
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed">{area.description}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold text-${area.color}`}>
                    Consultar <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pagamentos & IBAN */}
      <section className="section-padding bg-white border-t border-gray-50">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-3xl bg-aintar-light border border-aintar-blue/10">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Euro size={32} className="text-aintar-blue" />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="font-heading font-bold text-aintar-navy text-lg mb-2">Informação de Pagamentos</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Pode efetuar o pagamento das suas faturas através de Multibanco, Débito Direto ou Transferência Bancária.
                  Para transferências, utilize o IBAN abaixo e envie o comprovativo para <a href="mailto:pedidos@aintar.pt" className="text-aintar-blue font-semibold hover:underline">pedidos@aintar.pt</a>.
                </p>
                <div className="inline-flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 font-mono text-sm">
                  <span className="text-gray-400 font-sans font-bold uppercase tracking-widest text-[10px]">IBAN Millennium BCP</span>
                  <span className="text-aintar-navy font-bold select-all">PT50 0033 0000 4554 1170 3800 5</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Avaria urgente banner */}
      <section className="py-10 bg-hero-gradient relative overflow-hidden">
        <DarkBgDecorations particles={false} intensity="low" />
        <div className="section-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <div>
                <div className="font-heading font-bold text-white text-base">Piquete 24 Horas</div>
                <div className="text-white/60 text-sm">Para avarias urgentes fora do horário normal</div>
              </div>
            </div>
            <a href="tel:+351963612484"
              className="px-6 py-3 rounded-full bg-amber-500 text-white font-bold text-sm hover:bg-amber-400 transition-colors flex-shrink-0">
              963 612 484
            </a>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
