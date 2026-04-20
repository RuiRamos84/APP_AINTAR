import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { motion } from 'framer-motion'

// breadcrumbs: [{ label: 'Quem Somos', href: '/quem-somos' }, { label: 'Documentos Financeiros' }]
export default function PageHeader({ title, subtitle, breadcrumbs = [] }) {
  return (
    <div className="bg-hero-gradient pt-28 pb-12 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-1/4 w-96 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #29B5E8 0%, transparent 70%)' }}
        />
      </div>

      <div className="section-container relative z-10">
        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 mb-4 flex-wrap">
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
          </nav>
        )}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="font-heading font-extrabold text-white leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-white/55 mt-3 max-w-2xl text-base leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
        <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none" className="w-full block" style={{ height: '40px' }}>
          <path d="M0,20 C360,40 720,0 1080,20 C1260,30 1380,15 1440,20 L1440,40 L0,40 Z" fill="white" />
        </svg>
      </div>
    </div>
  )
}
