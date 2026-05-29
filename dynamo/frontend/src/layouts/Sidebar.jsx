import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import * as Icons from 'lucide-react'
import appConfig from '@/config/app.config'
import { useAuth } from '@/core/auth/AuthContext'

function ModuleSection({ module }) {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (module.permission && !hasPermission(module.permission)) return null

  const ModIcon = Icons[module.icon] ?? Icons.Folder

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group"
      >
        <ModIcon size={13} style={{ color: module.color }} />
        <span className="flex-1 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-600">
          {module.label}
        </span>
        <Icons.ChevronRight
          size={12}
          className={`text-slate-300 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 mb-1">
          {module.entities.map((entityKey) => {
            const entity = appConfig.entities[entityKey]
            if (!entity) return null
            if (entity.permissions?.view && !hasPermission(entity.permissions.view)) return null

            const Icon = Icons[entity.icon] ?? Icons.Database
            const to = `/${module.id}/${entityKey}`
            const active = location.pathname.startsWith(to)

            return (
              <NavLink
                key={entityKey}
                to={to}
                className={`flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-sm transition-colors
                  ${active
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Icon size={15} />
                {entity.labelPlural}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-60 h-full bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100">
        <span className="text-base font-bold text-slate-900">{appConfig.app.name}</span>
        <span className="ml-1.5 text-xs text-indigo-500 font-medium">dynamo</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-1">
        {appConfig.modules.map((module) => (
          <ModuleSection key={module.id} module={module} />
        ))}
      </nav>
    </aside>
  )
}
