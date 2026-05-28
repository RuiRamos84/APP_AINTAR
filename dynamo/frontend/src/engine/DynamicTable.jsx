import {
  useReactTable, getCoreRowModel, flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import { ArrowUpDown, Pencil, Trash2, Eye } from 'lucide-react'
import { useMetaOptions } from '@/core/meta/MetaContext'
import appConfig from '@/config/app.config'

function CellValue({ field, value, allData }) {
  if (value == null || value === '') return <span className="text-slate-300">—</span>

  if (field.type === 'boolean') {
    return <span className={`inline-block w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-300'}`} />
  }
  if (field.type === 'date' || field.type === 'datetime') {
    try {
      return <span>{format(parseISO(value), field.type === 'datetime' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy', { locale: pt })}</span>
    } catch { return <span>{value}</span> }
  }
  if (field.type === 'select') {
    // label resolvido no componente pai que tem acesso ao hook
    return <span className="text-slate-600">{value}</span>
  }
  if (field.type === 'relation') {
    return <span className="text-slate-600">{value}</span>
  }
  return <span>{String(value)}</span>
}

function useResolvedData(entityCfg, rawData) {
  // Para cada campo select/relation, resolve label via meta ou entity
  const allFields = entityCfg.fields
  return rawData.map((row) => {
    const resolved = { ...row }
    return resolved
  })
}

export default function DynamicTable({ entityCfg, data = [], sort, onSort, onView, onEdit, onDelete }) {
  const helper = createColumnHelper()
  const columnKeys = entityCfg.listView?.columns ?? entityCfg.fields.filter((f) => f.type !== 'id').map((f) => f.key)

  const columns = [
    ...columnKeys.map((key) => {
      const field = entityCfg.fields.find((f) => f.key === key)
      if (!field) return null
      return helper.accessor(key, {
        header: () => (
          <button
            onClick={() => onSort?.(key)}
            className="flex items-center gap-1 text-left font-medium text-slate-600 hover:text-slate-900"
          >
            {field.label}
            {sort?.field === key && <ArrowUpDown size={12} className="text-indigo-500" />}
          </button>
        ),
        cell: (info) => <CellValue field={field} value={info.getValue()} allData={data} />,
      })
    }).filter(Boolean),

    helper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          {onView && (
            <button
              onClick={() => onView(info.row.original)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Ver detalhes"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            onClick={() => onEdit?.(info.row.original)}
            className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete?.(info.row.original[entityCfg.db.pkField])}
            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onView?.(row.original)}
              className={`hover:bg-slate-50 transition-colors ${onView ? 'cursor-pointer' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-slate-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
