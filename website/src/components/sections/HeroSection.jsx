import { motion } from 'framer-motion'
import { LogIn, ChevronRight, Users, Activity } from 'lucide-react'
import DarkBgDecorations from '../ui/DarkBgDecorations'
import WaveDivider from '../ui/WaveDivider'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}

const panelVariants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-hero-gradient"
    >
      <DarkBgDecorations intensity="high" />


      {/* Content — flex-grow so it fills the space above the wave */}
      <div className="section-container relative z-10 w-full pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-10 xl:gap-20 items-center min-h-[calc(100vh-200px)]">

          {/* ── Left: Text ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col justify-center"
          >
            <motion.div variants={itemVariants}>
              <span className="section-tag bg-aintar-sky/15 text-aintar-sky border border-aintar-sky/30 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-aintar-sky animate-pulse-slow" />
                Entidade Gestora desde Novembro de 2022
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-heading font-extrabold text-white leading-[1.08] mb-6 tracking-tight"
              style={{ fontSize: 'clamp(2.6rem, 4.5vw, 5rem)' }}
            >
              Gestão Sustentável{' '}
              <br className="hidden sm:block" />
              <span className="text-gradient">dos Sistemas</span>
              <br />
              de Saneamento
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-white/60 leading-relaxed mb-10 max-w-lg"
              style={{ fontSize: 'clamp(1rem, 1.4vw, 1.125rem)' }}
            >
              Servimos os municípios da região Centro de Portugal com rigor técnico,
              inovação e compromisso permanente com o ambiente e as gerações futuras.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 mb-10">
              <a
                href="https://app.aintar.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-base px-8 py-4 shadow-lg shadow-aintar-sky/25"
              >
                <LogIn size={18} />
                Área de Cliente
              </a>
              <button
                onClick={() => document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-outline text-base px-8 py-4"
              >
                Conhecer a AINTAR
                <ChevronRight size={18} />
              </button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-5 pt-7 border-t border-white/10"
            >
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-aintar-teal" />
                <span className="text-white/40 text-xs">Operacional 24/7</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Users size={13} className="text-aintar-sky" />
                <span className="text-white/40 text-xs">~56.000 habitantes servidos</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <span className="text-white/40 text-xs hidden sm:block">Financiado por fundos europeus</span>
            </motion.div>
          </motion.div>

          {/* ── Right: Stats panel (desktop only) ── */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            className="hidden lg:flex flex-col justify-center relative"
          >
            {/* Ambient glow */}
            <div className="absolute -inset-6 rounded-[2.5rem] blur-3xl opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, #29B5E8 0%, #2ABB9B 60%, transparent 100%)' }} />

            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 space-y-3">

              {/* Top: 2 small stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border p-5 bg-aintar-sky/15 border-aintar-sky/25">
                  <div className="text-4xl font-extrabold font-heading text-white leading-none mb-2">4</div>
                  <div className="text-xs text-white/50 leading-tight">Municípios Associados</div>
                </div>
                <div className="rounded-2xl border p-5 bg-aintar-teal/15 border-aintar-teal/25">
                  <div className="text-4xl font-extrabold font-heading text-white leading-none mb-2">145</div>
                  <div className="text-xs text-white/50 leading-tight">ETARs em Operação</div>
                </div>
              </div>

              {/* Hero stat */}
              <div className="rounded-2xl bg-gradient-to-br from-aintar-sky/20 to-aintar-teal/10 border border-aintar-sky/20 p-6 text-center">
                <div className="font-heading font-extrabold text-gradient leading-none mb-1"
                  style={{ fontSize: 'clamp(3.5rem, 5vw, 4.5rem)' }}>
                  700
                </div>
                <div className="text-aintar-sky text-sm font-semibold tracking-wide uppercase">
                  km de rede de coletores
                </div>
              </div>

              {/* Clients stat */}
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-extrabold font-heading text-white">26 mil</div>
                  <div className="text-xs text-white/45 mt-0.5">Clientes servidos</div>
                </div>
                <div className="flex items-center gap-1.5 bg-aintar-teal/20 border border-aintar-teal/30 rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-aintar-teal animate-pulse" />
                  <span className="text-aintar-teal text-xs font-semibold">Online</span>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 bg-aintar-navy rounded-2xl border border-aintar-sky/30 px-4 py-2.5 shadow-xl"
              >
                <div className="text-2xl font-extrabold font-heading text-aintar-sky leading-none">2022</div>
                <div className="text-xs text-white/50 mt-0.5 text-center">Fundação</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      <WaveDivider direction="down" color="#EFF6FC" />
    </section>
  )
}
