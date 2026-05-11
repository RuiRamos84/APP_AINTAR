import { useState } from 'react'
import { ArrowRight, Zap, Shield, Leaf, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '../ui/ScrollReveal'
import TypewriterText from '../ui/TypewriterText'
import { motion } from 'framer-motion'


const pillars = [
  { icon: TrendingUp, text: 'Gestão eficiente e rigorosa dos sistemas de saneamento em alta e em baixa', color: 'text-aintar-sky',  bg: 'bg-aintar-sky/10'  },
  { icon: Zap,        text: 'Investimento em infraestruturas modernas com financiamento europeu',         color: 'text-aintar-blue', bg: 'bg-aintar-blue/10' },
  { icon: Shield,     text: 'Transparência e prestação de contas aos municípios associados',               color: 'text-aintar-teal', bg: 'bg-aintar-teal/10' },
  { icon: Leaf,       text: 'Sustentabilidade ambiental e economia circular — Juntos pelo Ambiente',       color: 'text-aintar-sky',  bg: 'bg-aintar-sky/10'  },
]

export default function AboutSection() {
  const [imgError, setImgError] = useState(false)

  return (
    <section id="sobre" className="bg-aintar-light flex flex-col min-h-screen">

      {/* Content fills space between stats strip and bottom wave */}
      <div className="flex-grow flex items-center w-full">
        <div className="section-container w-full py-16 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left — Visual */}
            <ScrollReveal>
              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-aintar-blue/15 aspect-[4/3]">
                  {imgError ? (
                    <div className="w-full h-full bg-gradient-to-br from-aintar-navy via-aintar-mid to-aintar-blue" />
                  ) : (
                    <img
                      src="/images/sobre-aintar.jpg"
                      alt="Infraestrutura AINTAR"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  )}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-aintar-teal flex items-center justify-center flex-shrink-0">
                          <Shield size={16} className="text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-aintar-navy text-sm">Certificação de Qualidade</div>
                          <div className="text-xs text-gray-500">Processos auditados e certificados</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl bg-aintar-sky/10 -z-10" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-aintar-teal/10 -z-10" />

                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-6 top-10 hidden lg:block"
                >
                  <div className="bg-aintar-navy rounded-2xl p-4 shadow-xl text-white text-center min-w-[100px]">
                    <div className="text-2xl font-extrabold font-heading text-aintar-sky">2022</div>
                    <div className="text-xs text-white/55 mt-0.5">Fundação</div>
                  </div>
                </motion.div>
              </div>
            </ScrollReveal>

            {/* Right — Content */}
            <div>
              <ScrollReveal>
                <span className="section-tag bg-aintar-blue/10 text-aintar-blue border border-aintar-blue/20 mb-5">
                  Quem Somos
                </span>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <h2 className="font-heading font-extrabold text-aintar-navy leading-tight mb-6"
                  style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.8rem)' }}>
                  Uma associação construída{' '}
                  <TypewriterText text="para o futuro" gradient={true} />
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="text-gray-600 leading-relaxed mb-8 text-sm lg:text-base">
                  A AINTAR agrega os municípios de Carregal do Sal, Santa Comba Dão, Tábua e Tondela
                  na gestão integrada de cerca de 700 km de coletores, 145 estações de tratamento e
                  91 estações elevatórias, servindo aproximadamente 56.000 habitantes. Desde 1 de
                  novembro de 2022 assumimos a responsabilidade de Entidade Gestora dos sistemas
                  de saneamento em alta e em baixa — <em>Juntos pelo Ambiente</em>.
                </p>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {pillars.map((pillar, i) => (
                  <ScrollReveal key={i} delay={0.3 + i * 0.08}>
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-gray-100
                      hover:border-aintar-sky/20 hover:shadow-sm transition-all duration-200">
                      <div className={`w-8 h-8 rounded-xl ${pillar.bg} ${pillar.color} flex items-center justify-center flex-shrink-0`}>
                        <pillar.icon size={15} />
                      </div>
                      <span className="text-gray-600 text-sm leading-snug">{pillar.text}</span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal delay={0.6}>
                <Link to="/quem-somos" className="btn-outline-blue">
                  Conhecer a nossa missão
                  <ArrowRight size={16} />
                </Link>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
