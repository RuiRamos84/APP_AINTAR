import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center bg-aintar-light">
        <div className="text-center px-4 py-20">
          <div className="text-8xl font-heading font-extrabold text-gradient mb-6">404</div>
          <h1 className="font-heading font-bold text-aintar-navy text-2xl mb-3">Página não encontrada</h1>
          <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
            A página que procura não existe ou foi movida para outro endereço.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/" className="btn-primary">
              <Home size={16} />
              Ir para o Início
            </Link>
            <button onClick={() => window.history.back()} className="btn-outline-blue">
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
