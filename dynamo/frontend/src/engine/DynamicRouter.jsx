import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/core/auth/AuthContext'
import appConfig from '@/config/app.config'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import DynamicPage from './DynamicPage'
import DynamicDetail from './DynamicDetail'

function PermissionGuard({ permission, children }) {
  const { hasPermission } = useAuth()
  if (permission && !hasPermission(permission)) {
    return <div className="p-8 text-center text-slate-400 text-sm">Sem permissão para aceder a esta área.</div>
  }
  return children
}

function AuthGuard({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export default function DynamicRouter() {
  const { modules, entities } = appConfig

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
        <Route index element={<HomePage />} />

        {modules.map((module) =>
          module.entities.map((entityKey) => {
            const entityCfg = entities[entityKey]
            if (!entityCfg) return null
            const path = `/${module.id}/${entityKey}`

            return (
              <Route key={entityKey} path={path}>
                <Route
                  index
                  element={
                    <PermissionGuard permission={entityCfg.permissions?.view}>
                      <DynamicPage entityCfg={entityCfg} />
                    </PermissionGuard>
                  }
                />
                <Route
                  path=":pk"
                  element={
                    <PermissionGuard permission={entityCfg.permissions?.view}>
                      <DynamicDetail entityCfg={entityCfg} />
                    </PermissionGuard>
                  }
                />
              </Route>
            )
          })
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
