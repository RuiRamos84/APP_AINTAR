import { useState, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AccordionItem({ question, answer, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors duration-200
      ${open ? 'border-aintar-sky/40 shadow-sm shadow-aintar-sky/10' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`accordion-${id}`}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className={`font-semibold text-sm leading-snug transition-colors ${open ? 'text-aintar-blue' : 'text-aintar-navy'}`}>
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 transition-all duration-300 ${open ? 'rotate-180 text-aintar-sky' : 'text-gray-400'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`accordion-${id}`}
            role="region"
            aria-labelledby={`accordion-btn-${id}`}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50">
              <div className="pt-4">{answer}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
