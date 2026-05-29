import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/core/auth/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <User size={15} className="text-slate-400" />
        <span>{user?.name ?? user?.username}</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
      >
        <LogOut size={13} /> Sair
      </button>
    </header>
  )
}
