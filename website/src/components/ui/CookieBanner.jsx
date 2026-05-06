import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'

const STORAGE_KEY = 'aintar_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY))

  const accept = (value) => {
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{    y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[60] glass border-t border-aintar-sky/20 shadow-2xl shadow-aintar-navy/10"
        >
          <div className="section-container py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-grow">
                <Cookie size={20} className="text-aintar-sky flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-aintar-navy font-semibold text-sm">Este website utiliza cookies</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    Usamos cookies essenciais para o correto funcionamento do site.{' '}
                    <Link to="/politica-privacidade" className="text-aintar-sky hover:underline">
                      Política de Privacidade
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => accept('essential')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold border-2 border-aintar-blue text-aintar-blue hover:bg-aintar-blue hover:text-white transition-all duration-200"
                >
                  Apenas Essenciais
                </button>
                <button
                  onClick={() => accept('all')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold bg-aintar-sky text-white hover:bg-aintar-blue transition-all duration-200"
                >
                  Aceitar Todos
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
