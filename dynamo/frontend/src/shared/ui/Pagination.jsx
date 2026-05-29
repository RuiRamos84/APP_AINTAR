import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pages, total, perPage, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-1 py-2 text-xs text-slate-500">
      <span>{total} registos</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-2">
          {page} / {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
