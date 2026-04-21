import { MapPin, ExternalLink } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import { motion } from 'framer-motion'
import DarkBgDecorations from '../ui/DarkBgDecorations'
import WaveDivider from '../ui/WaveDivider'


const municipalities = [
  { name: 'Carregal do Sal', region: 'Viseu Dão Lafões',  note: 'Sede da AINTAR',                          highlight: true },
  { name: 'Santa Comba Dão', region: 'Viseu Dão Lafões',  note: 'Sistema de Vila Pouca e Pinheiro de Ázere' },
  { name: 'Tábua',           region: 'Região de Coimbra', note: 'Sistema de Touriz e Vila Chã'              },
  { name: 'Tondela',         region: 'Viseu Dão Lafões',  note: 'ETAR Tondela Norte inaugurada em 2024'    },
]

export default function MunicipalitiesSection() {
  return (
    <section id="municipios" className="bg-hero-gradient flex flex-col min-h-screen overflow-hidden relative">

      <WaveDivider direction="up" color="#ffffff" />
      <DarkBgDecorations intensity="low" />

      <div className="flex-grow flex items-center w-full relative z-10">

        <div className="section-container w-full py-12">

          {/* Header */}
          <div className="max-w-xl mb-12">
            <ScrollReveal>
              <span className="section-tag bg-aintar-sky/15 text-aintar-sky border border-aintar-sky/20 mb-5">
                Área de Atuação
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="font-heading font-extrabold text-white leading-tight mb-4"
                style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.8rem)' }}>
                Servimos{' '}
                <span className="text-gradient">toda a região</span>{' '}
                com dedicação
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-white/50 leading-relaxed">
                A AINTAR actua em quatro municípios da região Centro de Portugal — assegurando
                a gestão integrada dos sistemas de saneamento e servindo cerca de 56.000 habitantes.
              </p>
            </ScrollReveal>
          </div>

          {/* Municipalities grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {municipalities.map((mun, i) => (
              <ScrollReveal key={mun.name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-2xl p-6 cursor-default transition-all duration-300 group
                    ${mun.highlight
                      ? 'bg-aintar-sky/15 border border-aintar-sky/35 hover:bg-aintar-sky/20'
                      : 'bg-white/[0.05] border border-white/10 hover:bg-aintar-sky/10 hover:border-aintar-sky/30'
                    }`}
                >
                  {mun.highlight && (
                    <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-widest
                      text-aintar-sky bg-aintar-sky/10 border border-aintar-sky/20 rounded-full px-2 py-0.5">
                      Sede
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className={mun.highlight ? 'text-aintar-sky' : 'text-aintar-sky/60 group-hover:text-aintar-sky transition-colors'} />
                    <div className="text-white font-bold text-base">{mun.name}</div>
                  </div>
                  <div className="text-white/40 text-xs mb-3 uppercase tracking-wider">{mun.region}</div>
                  <div className="text-white/60 text-xs leading-relaxed border-t border-white/10 pt-3">
                    {mun.note}
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          {/* Bottom note */}
          <ScrollReveal delay={0.5} className="mt-10 flex items-center justify-between flex-wrap gap-4">
            <p className="text-white/25 text-xs">
              Entidade constituída ao abrigo da Lei n.º 73/2013, de 3 de setembro
            </p>
            <a
              href="/quem-somos"
              className="flex items-center gap-2 text-aintar-sky/60 hover:text-aintar-sky text-xs font-medium transition-colors"
            >
              Saber mais sobre a AINTAR
              <ExternalLink size={12} />
            </a>
          </ScrollReveal>
        </div>
      </div>

      <WaveDivider direction="down" color="#EFF6FC" />
    </section>
  )
}
