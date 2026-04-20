import { useState, useEffect } from 'react'
import { AlertTriangle, Info, X, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getAlertas } from '../../services/cmsApi'

const DISMISS_KEY = 'aintar_alerts_dismissed'

export default function AlertBanner() {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    getAlertas()
      .then(({ alertas = [] }) => {
        const dismissed = JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]')
        setVisible(alertas.filter(a => !dismissed.includes(String(a.pk))))
      })
      .catch(() => {}) // falha silenciosa — sem alertas não é crítico
  }, [])

  const dismiss = (pk) => {
    setVisible(prev => {
      const next = prev.filter(a => a.pk !== pk)
      const dismissed = JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]')
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed, String(pk)]))
      return next
    })
  }

  if (!visible.length) return null

  return (
    <div className="fixed top-[68px] left-0 right-0 z-40 space-y-0.5">
      <AnimatePresence>
        {visible.map((alert) => {
          const isWarning = alert.ts_tipo === 1
          return (
            <motion.div
              key={alert.pk}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`overflow-hidden ${isWarning ? 'bg-amber-500' : 'bg-aintar-blue'}`}
            >
              <div className="section-container py-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {isWarning
                      ? <AlertTriangle size={15} className="text-white flex-shrink-0" />
                      : <Info size={15} className="text-white flex-shrink-0" />
                    }
                    <span className="text-white text-sm font-medium truncate">{alert.mensagem}</span>
                    <Link
                      to="/comunicacao/avisos"
                      className="flex items-center gap-0.5 text-white/80 hover:text-white text-xs flex-shrink-0 underline-offset-2 hover:underline"
                    >
                      Ver detalhe
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                  <button
                    onClick={() => dismiss(alert.pk)}
                    aria-label="Fechar aviso"
                    className="text-white/70 hover:text-white flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
