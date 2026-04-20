import { FileText, Download, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DocumentCard({ title, subtitle, year, fileSize, href, type = 'pdf' }) {
  const isExternal = href?.startsWith('http')
  const Icon = type === 'link' ? ExternalLink : FileText

  return (
    <motion.a
      href={href || '#'}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      download={!isExternal && href ? true : undefined}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white
        hover:border-aintar-sky/40 hover:shadow-md hover:shadow-aintar-blue/10
        transition-all duration-200 group cursor-pointer"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-aintar-light flex items-center justify-center flex-shrink-0
        group-hover:bg-aintar-blue group-hover:text-white transition-colors">
        <Icon size={18} className="text-aintar-blue group-hover:text-white transition-colors" />
      </div>

      {/* Info */}
      <div className="flex-grow min-w-0">
        <div className="font-semibold text-aintar-navy text-sm truncate group-hover:text-aintar-blue transition-colors">
          {title}
        </div>
        {(subtitle || year) && (
          <div className="text-xs text-gray-400 mt-0.5">
            {subtitle}{subtitle && year ? ' · ' : ''}{year}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-aintar-blue transition-colors">
        {fileSize && <span>{fileSize}</span>}
        <Download size={14} className="group-hover:scale-110 transition-transform" />
      </div>
    </motion.a>
  )
}
