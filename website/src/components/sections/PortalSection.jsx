import { FileText, Gauge, AlertTriangle, ClipboardList, Phone, ArrowRight, LogIn, Sparkles } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import { motion } from 'framer-motion'


const portalActions = [
  { icon: FileText,      label: '2ª Via de Fatura',   description: 'Aceda e imprima as suas faturas',    href: 'https://app.aintar.pt', external: true,  color: '#29B5E8' },
  { icon: Gauge,         label: 'Comunicar Leitura',  description: 'Registe a leitura do seu contador',  href: 'https://app.aintar.pt', external: true,  color: '#2ABB9B' },
  { icon: AlertTriangle, label: 'Reportar Avaria',    description: 'Comunique problemas na rede',        href: 'https://app.aintar.pt', external: true,  color: '#29B5E8' },
  { icon: ClipboardList, label: 'Formulários',        description: 'Pedidos e requerimentos online',     href: 'https://app.aintar.pt', external: true,  color: '#2ABB9B' },
  { icon: Phone,         label: 'Contacto Direto',    description: 'Fale com o nosso apoio',             href: '#contactos',            external: false, color: '#2074AA' },
]

export default function PortalSection() {
  const handleAnchorClick = (e, href) => {
    e.preventDefault()
    document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="portal" className="bg-aintar-navy flex flex-col min-h-screen relative overflow-hidden">
      {/* NewsSection já entrega a transição aintar-light → navy — sem wave aqui */}

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #29B5E8 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #2ABB9B 0%, transparent 70%)' }} />
      </div>

      <div className="flex-grow flex items-center w-full relative z-10">
        <div className="section-container w-full py-12">

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <ScrollReveal>
                <span className="section-tag bg-aintar-sky/15 text-aintar-sky border border-aintar-sky/20 mb-5">
                  Portal do Cidadão
                </span>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <h2 className="font-heading font-extrabold text-white leading-tight"
                  style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.8rem)' }}>
                  Aceda aos serviços online{' '}
                  <span className="text-gradient">24 horas por dia</span>
                </h2>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.2} className="flex-shrink-0">
              <a
                href="https://app.aintar.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-semibold text-sm
                  bg-aintar-sky text-white hover:bg-white hover:text-aintar-blue
                  transition-all duration-300 hover:shadow-2xl hover:shadow-aintar-sky/30 hover:-translate-y-0.5"
              >
                <LogIn size={16} />
                Entrar na Área de Cliente
                <ArrowRight size={14} />
              </a>
            </ScrollReveal>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {portalActions.map((action, i) => (
              <ScrollReveal key={action.label} delay={i * 0.07}>
                <motion.a
                  href={action.href}
                  target={action.external ? '_blank' : undefined}
                  rel={action.external ? 'noopener noreferrer' : undefined}
                  onClick={!action.external ? (e) => handleAnchorClick(e, action.href) : undefined}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="w-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10
                    hover:border-white/25 rounded-2xl p-5 flex flex-col items-center gap-3
                    transition-colors duration-200 group text-center"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/[0.07] group-hover:scale-110
                    flex items-center justify-center transition-transform duration-200"
                    style={{ color: action.color }}>
                    <action.icon size={20} />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm leading-tight">{action.label}</div>
                    <div className="text-white/40 text-xs mt-1 hidden sm:block">{action.description}</div>
                  </div>
                </motion.a>
              </ScrollReveal>
            ))}
          </div>

          {/* Bottom note */}
          <ScrollReveal delay={0.4} className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-white/25 text-xs">
              <Sparkles size={12} />
              Disponível 24 horas por dia, 7 dias por semana — sem deslocações
            </div>
          </ScrollReveal>
        </div>
      </div>

    </section>
  )
}
