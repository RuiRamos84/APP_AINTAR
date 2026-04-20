import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function FloatingScrollIndicator() {
  const [show, setShow]       = useState(false)
  const [atBottom, setAtBottom] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      setAtBottom(scrollTop + clientHeight >= scrollHeight - 320)
    }

    const timer = setTimeout(() => {
      setShow(true)
      window.addEventListener('scroll', handleScroll, { passive: true })
    }, 1800)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleClick = () => {
    if (atBottom) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const sections = [...document.querySelectorAll('section[id]')]
      const currentY = window.scrollY
      const next = sections.find(
        (s) => s.getBoundingClientRect().top + currentY > currentY + 120
      )
      if (next) next.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={handleClick}
          aria-label={atBottom ? 'Ir para o topo' : 'Próxima secção'}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
            opacity-50 hover:opacity-100 transition-opacity duration-500 group cursor-pointer"
        >
          <motion.div
            animate={{ y: atBottom ? [0, -5, 0] : [0, 5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-8 h-8 rounded-full border border-aintar-sky/40
              flex items-center justify-center
              group-hover:border-aintar-sky/80
              transition-colors duration-300
              shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          >
            {/* Icon rotates 180° when at bottom */}
            <motion.div
              animate={{ rotate: atBottom ? 180 : 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <ChevronDown
                size={13}
                strokeWidth={1.8}
                className="text-aintar-sky/70 group-hover:text-aintar-sky transition-colors duration-300"
              />
            </motion.div>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
