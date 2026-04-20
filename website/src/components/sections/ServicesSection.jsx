import { Waves, ArrowUpFromLine, Factory, ArrowRight } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import { Link } from 'react-router-dom'

const services = [
  {
    num: '01',
    icon: ArrowUpFromLine,
    title: 'Saneamento em Alta',
    description:
      'Gestão e operação das infraestruturas de transporte e tratamento de águas residuais, incluindo emissários, elevatórias e estações de tratamento (ETAR).',
    features: ['Redes de emissários', 'Estações elevatórias', 'ETARs', 'Monitorização contínua'],
    accent: '#29B5E8',
    link: '/saneamento',
  },
  {
    num: '02',
    icon: Waves,
    title: 'Saneamento em Baixa',
    description:
      'Operação dos sistemas de drenagem locais, recolha de águas residuais domésticas e industriais nos municípios associados, assegurando o serviço de proximidade.',
    features: ['Redes de drenagem', 'Ramais domiciliários', 'Manutenção preventiva', 'Atendimento ao cliente'],
    accent: '#1B5E8E',
    link: '/saneamento',
  },
  {
    num: '03',
    icon: Factory,
    title: 'Tratamento de Efluentes',
    description:
      'Operação de estações de tratamento com tecnologia avançada, garantindo a conformidade com os padrões ambientais e a proteção dos recursos hídricos.',
    features: ['Tratamento biológico', 'Controlo analítico', 'Gestão de lamas', 'Relatórios ambientais'],
    accent: '#2ABB9B',
    link: '/saneamento',
  },
]

export default function ServicesSection() {
  return (
    <section id="servicos" className="bg-white flex flex-col min-h-screen">
      <div className="flex-grow flex items-center w-full">
        <div className="section-container w-full py-16">

          {/* Header */}
          <div className="max-w-2xl mb-12 lg:mb-16">
            <ScrollReveal>
              <span className="section-tag bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20 mb-5">
                Os Nossos Serviços
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="font-heading font-extrabold text-aintar-navy mb-4 leading-tight"
                style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.8rem)' }}>
                Soluções integradas<br />de saneamento
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-gray-500 leading-relaxed">
                Gerimos toda a cadeia de valor dos sistemas de saneamento, desde a recolha
                até ao tratamento final, com eficiência e responsabilidade ambiental.
              </p>
            </ScrollReveal>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {services.map((service, i) => (
              <ScrollReveal key={service.title} delay={i * 0.1}>
                <div className="group relative bg-white rounded-3xl border border-gray-100
                  hover:border-gray-200 hover:shadow-2xl hover:shadow-gray-100/80
                  hover:-translate-y-2 transition-all duration-300 p-8 h-full flex flex-col overflow-hidden">

                  {/* Background number */}
                  <div
                    className="absolute -top-4 -right-2 font-heading font-extrabold leading-none
                      pointer-events-none select-none opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-300"
                    style={{ fontSize: '9rem', color: service.accent }}
                  >
                    {service.num}
                  </div>

                  {/* Accent line */}
                  <div className="w-12 h-1 rounded-full mb-6 transition-all duration-300 group-hover:w-20"
                    style={{ background: service.accent }} />

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300"
                    style={{ backgroundColor: `${service.accent}18`, color: service.accent }}>
                    <service.icon size={22} />
                  </div>

                  <h3 className="font-heading font-bold text-aintar-navy text-xl mb-3">
                    {service.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow">
                    {service.description}
                  </p>

                  <ul className="space-y-2 mb-7">
                    {service.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <span className="w-1 h-1 rounded-full flex-shrink-0"
                          style={{ background: service.accent }} />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={service.link}
                    className="flex items-center gap-2 text-sm font-semibold transition-colors duration-200"
                    style={{ color: service.accent }}
                  >
                    Saber mais
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Bottom CTA */}
          <ScrollReveal delay={0.3} className="text-center mt-12">
            <div className="inline-flex items-center gap-4 flex-wrap justify-center">
              <span className="text-gray-400 text-sm">Tem questões sobre os nossos serviços?</span>
              <button
                onClick={() => document.getElementById('contactos')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-outline-blue text-sm px-5 py-2.5"
              >
                Fale connosco
                <ArrowRight size={14} />
              </button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
