import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { dynamoApi } from '@/core/api/dynamo.api'
import { setAuthToken, clearAuthToken } from '@/core/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dynamo_user') || 'null') }
    catch { return null }
  })
  const [token, setToken] = useState(() => sessionStorage.getItem('dynamo_token') || null)

  useEffect(() => {
    if (token) setAuthToken(token)
    else clearAuthToken()
  }, [token])

  const login = useCallback(async (username, password) => {
    const res = await dynamoApi.login(username, password)
    const { access_token, name, permissions = [] } = res
    const userData = { name, username, permissions }

    setAuthToken(access_token)
    setToken(access_token)
    setUser(userData)
    sessionStorage.setItem('dynamo_token', access_token)
    sessionStorage.setItem('dynamo_user', JSON.stringify(userData))
    return userData
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('dynamo_token')
    sessionStorage.removeItem('dynamo_user')
  }, [])

  const hasPermission = useCallback((perm) => {
    if (!user?.permissions) return false
    return user.permissions.includes(perm)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasPermission, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
