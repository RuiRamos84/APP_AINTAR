import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Command, ArrowRight, FileText, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SearchModal({ isOpen, onClose, items }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Flatten items for search
  const flattenedItems = items.reduce((acc, item) => {
    if (item.children) {
      return [...acc, ...item.children.map(child => ({ ...child, category: item.label }))]
    }
    return [...acc, { ...item, category: 'Geral' }]
  }, [])

  const results = query.trim() === '' 
    ? [] 
    : flattenedItems.filter(item => 
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:pt-32">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-aintar-navy/40 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-100"
          >
            {/* Input Header */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
              <Search className="text-gray-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="O que procura? (ex: tarifário, notícias...)"
                className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 placeholder:text-gray-400"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                <Command size={12} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">ESC</span>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
              {query.trim() === '' ? (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-aintar-light text-aintar-blue mb-4">
                    <Search size={24} />
                  </div>
                  <p className="text-gray-500 font-medium">Digite algo para pesquisar no portal AINTAR</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-2 space-y-1">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Resultados encontrados ({results.length})
                  </div>
                  {results.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.href}
                      onClick={onClose}
                      className="group flex items-center justify-between p-4 rounded-2xl hover:bg-aintar-light transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-aintar-blue group-hover:border-aintar-blue/20 transition-colors">
                          {item.external ? <LinkIcon size={18} /> : <FileText size={18} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-aintar-blue/60 mb-0.5 uppercase tracking-wide">{item.category}</div>
                          <div className="text-gray-900 font-semibold">{item.label}</div>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <p>Nenhum resultado encontrado para "<span className="text-gray-900 font-semibold">{query}</span>"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><span className="p-1 bg-white border border-gray-200 rounded text-[9px]">ENTER</span> Selecionar</span>
                <span className="flex items-center gap-1"><span className="p-1 bg-white border border-gray-200 rounded text-[9px]">↑↓</span> Navegar</span>
              </div>
              <div>Portal AINTAR</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
