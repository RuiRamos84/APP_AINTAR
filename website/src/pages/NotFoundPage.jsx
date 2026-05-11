import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Droplets, Map } from 'lucide-react'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import TypewriterText from '../components/ui/TypewriterText'
import DarkBgDecorations from '../components/ui/DarkBgDecorations'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient relative overflow-hidden">
      <Navbar />
      
      {/* Background decorations */}
      <DarkBgDecorations intensity="high" />

      {/* Floating droplets for water theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <motion.div
           animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
           transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-1/4 left-[15%] text-aintar-sky blur-[2px]"
         >
           <Droplets size={40} />
         </motion.div>
         <motion.div
           animate={{ y: [0, -30, 0], opacity: [0.1, 0.4, 0.1] }}
           transition={{ duration: 5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
           className="absolute bottom-1/3 right-[20%] text-aintar-teal blur-[1px]"
         >
           <Droplets size={60} />
         </motion.div>
         <motion.div
           animate={{ y: [0, -15, 0], opacity: [0.1, 0.3, 0.1] }}
           transition={{ duration: 3.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-1/2 right-[10%] text-aintar-sky blur-[3px]"
         >
           <Droplets size={30} />
         </motion.div>
      </div>

      <main className="flex-grow flex items-center justify-center relative z-10">
        <div className="text-center px-4 py-20 flex flex-col items-center">
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
            className="relative mb-8"
          >
            {/* Glow effect behind 404 */}
            <div className="absolute inset-0 bg-aintar-sky/20 blur-[60px] rounded-full" />
            
            <h1 className="text-[8rem] md:text-[12rem] font-heading font-extrabold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">
              404
            </h1>
            
            {/* Floating icon */}
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 -right-6 md:-top-4 md:-right-10 text-aintar-sky"
            >
              <Map size={48} strokeWidth={1.5} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-4">
              <TypewriterText text="Página não encontrada" gradient={true} />
            </h2>
            
            <p className="text-white/60 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Parece que navegou para águas desconhecidas. O conteúdo que procura não existe ou foi movido.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link 
                to="/" 
                className="group relative flex items-center gap-2 bg-gradient-to-r from-aintar-sky to-aintar-teal text-white px-8 py-3.5 rounded-full font-semibold overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(41,181,232,0.4)]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <Home size={18} className="relative z-10" />
                <span className="relative z-10">Voltar ao Início</span>
              </Link>
              
              <button 
                onClick={() => window.history.back()} 
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3.5 rounded-full font-semibold transition-all hover:border-white/30"
              >
                <ArrowLeft size={18} />
                Página Anterior
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
