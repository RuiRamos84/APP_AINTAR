import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import AnimatedCounter from '../ui/AnimatedCounter'
import ScrollReveal from '../ui/ScrollReveal'
import DarkBgDecorations from '../ui/DarkBgDecorations'
import WaveDivider from '../ui/WaveDivider'
import TypewriterText from '../ui/TypewriterText'

gsap.registerPlugin(ScrollTrigger)

/* ─── Stats ─────────────────────────────────────────────────────── */
const CIRCUMFERENCE = 283  // 2πr para r=45

const stats = [
  {
    value: 140,    suffix: '',    label: 'Estações Elevatórias',
    description: 'Elevatórias distribuídas pelos 4 municípios',
    color: '#20B4DC', glowColor: 'rgba(32,180,220,0.25)', fillPercent: 0.70, delay: 0.10,
  },
  {
    value: 97,     suffix: '',    label: 'Estações de Tratamento de Águas Residuais',
    description: 'Estações de tratamento de águas residuais',
    color: '#2ABB9B', glowColor: 'rgba(42,187,155,0.25)', fillPercent: 0.49, delay: 0.22,
  },
  {
    value: 25513,  suffix: '',    label: 'Alojamentos Servidos',
    description: 'Alojamentos servidos na rede de coletores',
    color: '#20B4DC', glowColor: 'rgba(32,180,220,0.25)', fillPercent: 0.85, delay: 0.34,
    ringFontSize: 17,
  },
  {
    value: 1291.5, suffix: ' km', label: 'Comprimento de Coletores',
    description: 'Comprimento total de coletores geridos',
    color: '#2ABB9B', glowColor: 'rgba(42,187,155,0.25)', fillPercent: 0.95, delay: 0.46,
    ringFontSize: 16,
  },
  {
    value: 92.2,   suffix: '%',   label: 'Adesão à Rede Fixa',
    description: 'Adesão ao serviço de rede fixa',
    color: '#00D2FF', glowColor: 'rgba(0,210,255,0.20)',  fillPercent: 0.922, delay: 0.58,
  },
]

/* ─── Card de stat ───────────────────────────────────────────────── */
function StatCard({ stat, inView }) {
  const dashOffset = CIRCUMFERENCE * (1 - stat.fillPercent)
  const R = 45
  const SIZE = 110

  return (
    <div
      className="flex flex-col items-center text-center px-4 py-6 group"
      data-statcard="true"
    >
      {/* Anel SVG */}
      <div className="relative mb-5" style={{ width: SIZE, height: SIZE }}>
        {/* Glow de fundo */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${stat.glowColor}, transparent 68%)`,
            animation: 'gpulse 3.2s ease-in-out infinite',
            inset: '-6px',
          }}
        />
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="6"
          />
          <motion.circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={stat.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={inView
              ? { strokeDashoffset: [CIRCUMFERENCE, dashOffset] }
              : { strokeDashoffset: CIRCUMFERENCE }
            }
            transition={{ duration: 2.2, delay: stat.delay, ease: [0.22, 1, 0.36, 1] }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        {/* Valor dentro do anel */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading font-extrabold leading-none" style={{ fontSize: stat.ringFontSize ?? 26, color: stat.color }}>
            {inView ? <AnimatedCounter target={stat.value} duration={2200} /> : 0}
          </span>
          {stat.suffix && (
            <span className="text-[11px] font-bold mt-0.5" style={{ color: stat.color }}>
              {stat.suffix.trim()}
            </span>
          )}
        </div>
      </div>

      <div className="text-white font-semibold text-sm mb-1.5 group-hover:text-aintar-sky transition-colors duration-300">
        {stat.label}
      </div>
      <div className="text-white/35 text-xs leading-relaxed hidden lg:block max-w-[140px]">
        {stat.description}
      </div>
    </div>
  )
}

/* ─── Secção principal ───────────────────────────────────────────── */
export default function StatsSection() {
  const sectionRef = useRef(null)
  const bgRef      = useRef(null)
  const gridRef    = useRef(null)
  const inView     = useInView(sectionRef, { once: true, margin: '-80px' })

  useGSAP(() => {
    const trigger = sectionRef.current
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Background parallax — camadas de fundo movem a velocidade diferente
      gsap.to(bgRef.current, {
        y: '-20%',
        ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      })
    })

    // Stat cards cinematic entrance — escala + opacidade stagger ao entrar
    gsap.from('[data-statcard]', {
      scale: 0.7,
      opacity: 0,
      y: 40,
      duration: 0.7,
      stagger: { each: 0.1, from: 'start' },
      ease: 'back.out(1.5)',
      clearProps: 'all',
      scrollTrigger: {
        trigger: gridRef.current,
        start: 'top 82%',
        toggleActions: 'play none none none',
      },
    })
  }, { scope: sectionRef, dependencies: [] })

  return (
    <section
      id="numeros"
      ref={sectionRef}
      className="bg-hero-gradient flex flex-col min-h-screen relative overflow-hidden"
    >
      <WaveDivider direction="up" color="#EFF6FC" />

      {/* Parallax background */}
      <div ref={bgRef} className="absolute inset-0 pointer-events-none">
        <DarkBgDecorations />
      </div>

      {/* Conteúdo */}
      <div className="flex-grow flex flex-col justify-center w-full relative z-10">
        <div className="section-container w-full py-16 lg:py-24">

          {/* Cabeçalho */}
          <ScrollReveal className="text-center mb-14 lg:mb-20">
            <span className="section-tag bg-aintar-sky/15 text-aintar-sky border border-aintar-sky/30 mb-6 inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-aintar-sky animate-pulse-slow" />
              A AINTAR em Números
            </span>
            <h2
              className="font-heading font-extrabold text-white leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)' }}
            >
              Uma infraestrutura{' '}
              <TypewriterText text="de referência regional" gradient={true} />
            </h2>
            <p className="text-white/50 mt-4 max-w-xl mx-auto leading-relaxed"
              style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)' }}>
              Gerimos sistemas de saneamento de alta e baixa numa área de atuação que serve
              quatro municípios da região Centro de Portugal.
            </p>
          </ScrollReveal>

          {/* Cards de estatísticas */}
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-white/[0.07]">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} inView={inView} />
            ))}
          </div>

          {/* Faixa inferior com dados extra */}
          <ScrollReveal delay={0.7}>
            <div className="mt-14 lg:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: '24/7', label: 'Monitorização contínua', sub: 'Sistemas SCADA em operação permanente' },
                { value: '2022', label: 'Entidade Gestora desde', sub: '1 de novembro de 2022' },
                { value: '~56k', label: 'Habitantes abrangidos', sub: 'Nas 4 regiões dos municípios associados' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-6 py-5 flex items-center gap-5 hover:border-aintar-sky/25 hover:bg-white/[0.07] transition-all duration-300"
                >
                  <div
                    className="font-heading font-extrabold text-gradient leading-none flex-shrink-0"
                    style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)' }}
                  >
                    {item.value}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{item.label}</div>
                    <div className="text-white/35 text-xs mt-0.5">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

        </div>
      </div>
      <WaveDivider direction="down" color="#ffffff" />
    </section>
  )
}
