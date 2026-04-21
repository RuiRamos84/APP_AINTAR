import { useReducedMotion } from 'framer-motion'

/**
 * DarkBgDecorations — decorações de fundo partilhadas por todas as secções escuras.
 *
 * Uso: colocar como filho direto da section, antes do conteúdo.
 *   <section className="bg-hero-gradient relative overflow-hidden">
 *     <DarkBgDecorations />
 *     <div className="relative z-10"> … </div>
 *   </section>
 *
 * Props:
 *   - particles  {boolean}             mostrar partículas animadas (default true)
 *   - intensity  {'low'|'medium'|'high'}  opacidade dos orbes (default 'medium')
 */

const PARTICLES = [
  { size: 3, color: '#20B4DC', glow: '#20B4DC', top: '14%', left: '7%',  duration: '4.8s', delay: '0s'   },
  { size: 2, color: '#2ABB9B', glow: '#2ABB9B', top: '55%', left: '18%', duration: '6.2s', delay: '1.4s' },
  { size: 4, color: '#00D2FF', glow: '#00D2FF', top: '28%', left: '80%', duration: '4.0s', delay: '0.6s' },
  { size: 2, color: '#20B4DC', glow: '#20B4DC', top: '70%', left: '68%', duration: '5.6s', delay: '2.2s' },
  { size: 3, color: '#2ABB9B', glow: '#2ABB9B', top: '10%', left: '52%', duration: '3.8s', delay: '1.7s' },
  { size: 2, color: '#00D2FF', glow: '#00D2FF', top: '82%', left: '36%', duration: '4.5s', delay: '0.4s' },
  { size: 4, color: '#20B4DC', glow: '#20B4DC', top: '42%', left: '92%', duration: '6.0s', delay: '3.1s' },
]

const INTENSITY = {
  low:    { orb1: '0.08', orb2: '0.06', orb3: '0.07', dots: '0.018' },
  medium: { orb1: '0.14', orb2: '0.10', orb3: '0.12', dots: '0.025' },
  high:   { orb1: '0.22', orb2: '0.16', orb3: '0.18', dots: '0.035' },
}

export default function DarkBgDecorations({ particles = true, intensity = 'medium' }) {
  const prefersReduced = useReducedMotion()
  const op = INTENSITY[intensity] ?? INTENSITY.medium

  return (
    <>
      {/* Orbes de luz */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, #20B4DC 0%, transparent 65%)',
            opacity: op.orb1,
          }}
        />
        <div
          className="absolute bottom-0 right-1/3 w-[350px] h-[350px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, #2ABB9B 0%, transparent 65%)',
            opacity: op.orb2,
          }}
        />
        <div
          className="absolute top-0 right-0 w-[280px] h-[280px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, #00D2FF 0%, transparent 70%)',
            opacity: op.orb3,
          }}
        />
      </div>

      {/* Grid de pontos */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(32,180,220,1) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          opacity: op.dots,
        }}
      />

      {/* Partículas animadas */}
      {particles && !prefersReduced && (
        <div className="absolute inset-0 pointer-events-none">
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: '50%',
                top: p.top,
                left: p.left,
                animationName: 'rise',
                animationDuration: p.duration,
                animationDelay: p.delay,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                boxShadow: `0 0 ${p.size * 2}px ${p.glow}`,
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}
