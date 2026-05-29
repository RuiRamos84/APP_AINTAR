import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/core/auth/AuthContext'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import appConfig from '@/config/app.config'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">{appConfig.app.name}</h1>
          <p className="text-sm text-slate-400 mt-1">Introduza as suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Utilizador"
            type="text"
            placeholder="nome.utilizador"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            autoFocus
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
