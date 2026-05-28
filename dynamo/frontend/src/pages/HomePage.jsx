import * as Icons from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/auth/AuthContext'
import appConfig from '@/config/app.config'

export default function HomePage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()

  const accessible = appConfig.modules.filter(
    (m) => !m.permission || hasPermission(m.permission)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Início</h1>
        <p className="text-sm text-slate-400 mt-0.5">Seleccione um módulo para começar</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {accessible.map((module) => {
          const Icon = Icons[module.icon] ?? Icons.Folder
          const firstEntity = module.entities[0]
          const to = firstEntity ? `/${module.id}/${firstEntity}` : '/'

          return (
            <button
              key={module.id}
              onClick={() => navigate(to)}
              className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: module.color + '18' }}>
                <Icon size={20} style={{ color: module.color }} />
              </div>
              <p className="text-sm font-medium text-slate-900">{module.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{module.entities.length} entidade{module.entities.length !== 1 ? 's' : ''}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
