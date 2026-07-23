import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import DarkBgDecorations from '../ui/DarkBgDecorations'

// breadcrumbs: [{ label: 'Quem Somos', href: '/quem-somos' }, { label: 'Documentos Financeiros' }]
export default function PageHeader({ title, subtitle, breadcrumbs = [] }) {
  const prefersReduced = useReducedMotion()
  const { scrollY } = useScroll()
  const y1      = useTransform(scrollY, [0, 300], [0, 60])
  const opacity = useTransform(scrollY, [0, 200], [1, 0.6])

  return (
    <div className="bg-hero-gradient pt-28 pb-20 relative overflow-hidden min-h-[220px]">

       {/* Decorações de fundo */}
       <DarkBgDecorations intensity="medium" />

       {/* Conteúdo com Parallax */}
       <motion.div style={{ y: y1, opacity }} className="section-container relative z-10">

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <motion.nav
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1.5 mb-4 flex-wrap"
          >
            <Link to="/" className="text-white/40 hover:text-aintar-sky text-xs transition-colors flex items-center gap-1">
              <Home size={12} />
              Início
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight size={11} className="text-white/25" />
                {crumb.href ? (
                  <Link to={crumb.href} className="text-white/40 hover:text-aintar-sky text-xs transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-aintar-sky text-xs font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </motion.nav>
        )}

        {/* Título — clip-path reveal (slides up from below a mask) */}
        <div style={{ overflow: 'hidden' }}>
          <motion.h1
            initial={{ y: '105%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading font-extrabold text-white leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
          >
            {title}
          </motion.h1>
        </div>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-white/55 mt-3 max-w-2xl text-base leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>

      {/* Onda animada — transição suave para o conteúdo branco */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none">

        {/* Camada 1 — fundo, semi-transparente, flui devagar */}
        <div
          className="absolute bottom-0 left-0 h-full"
          style={{
            width: '200%',
            ...(prefersReduced ? {} : {
              animationName: 'waveSlide',
              animationDuration: '12s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }),
          }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,32 C180,52 360,12 540,32 C720,52 900,12 1080,32
                 C1260,52 1440,12 1620,32 C1800,52 1980,12 2160,32
                 C2340,52 2520,12 2700,32 L2880,32 L2880,64 L0,64 Z"
              fill="rgba(255,255,255,0.25)"
            />
          </svg>
        </div>

        {/* Camada 2 — frente, branca sólida, flui mais rápido e em sentido inverso */}
        <div
          className="absolute bottom-0 left-0 h-full"
          style={{
            width: '200%',
            ...(prefersReduced ? {} : {
              animationName: 'waveSlide',
              animationDuration: '8s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDirection: 'reverse',
            }),
          }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,24 C240,48 480,8 720,24 C960,40 1200,8 1440,24
                 C1680,40 1920,8 2160,24 C2400,40 2640,8 2880,24
                 L2880,64 L0,64 Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

    </div>
  )
}
