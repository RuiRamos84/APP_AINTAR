import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, LogIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navMenu = [
  {
    label: 'Quem Somos',
    children: [
      { label: 'A Nossa Missão', href: '/quem-somos' },
      { label: 'Órgãos Sociais', href: '/quem-somos/orgaos-sociais' },
      { label: 'Documentos Financeiros', href: '/quem-somos/documentos-financeiros' },
      { label: 'Recursos Humanos', href: '/quem-somos/recursos-humanos' },
      { label: 'Contratação Pública', href: '/quem-somos/contratacao-publica' },
    ],
  },
  {
    label: 'Clientes',
    children: [
      { label: 'Área de Clientes', href: '/clientes' },
      { label: 'Regulamento de Serviço', href: '/clientes/regulamento' },
      { label: 'Tarifário', href: '/clientes/tarifario' },
      { label: 'Formulários', href: '/clientes/formularios' },
      { label: 'Perguntas Frequentes', href: '/clientes/faq' },
      { label: '2ª Via de Fatura', href: 'https://app.aintar.pt', external: true },
    ],
  },
  {
    label: 'Saneamento',
    children: [
      { label: 'Sistemas de Tratamento', href: '/saneamento' },
      { label: 'Qualidade do Serviço', href: '/saneamento/qualidade' },
    ],
  },
  { label: 'Projetos', href: '/projetos' },
  { label: 'Sustentabilidade', href: '/sustentabilidade' },
  {
    label: 'Comunicação',
    children: [
      { label: 'Notícias', href: '/comunicacao/noticias' },
      { label: 'Avisos de Serviço', href: '/comunicacao/avisos' },
      { label: 'Editais', href: '/comunicacao/editais' },
    ],
  },
  { label: 'Contactos', href: '/contactos' },
]

function DropdownMenu({ items }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 z-50"
      role="menu"
    >
      <div className="bg-white rounded-2xl shadow-xl shadow-aintar-navy/15 border border-gray-100 overflow-hidden py-2">
        {items.map((item) =>
          item.external ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-aintar-blue hover:bg-aintar-light transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.label}
              to={item.href}
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-aintar-blue hover:bg-aintar-light transition-colors"
            >
              {item.label}
            </Link>
          )
        )}
      </div>
    </motion.div>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [mobileExpanded, setMobileExpanded] = useState(null)
  const location = useLocation()
  const hoverTimeout = useRef(null)

  const isHomePage = location.pathname === '/'

  // IDs das secções com fundo escuro na homepage
  const DARK_SECTIONS = new Set(['inicio', 'numeros', 'municipios', 'portal'])

  // Para páginas internas: isLight = scrolled (PageHeader é escuro no topo)
  // Para homepage: isLight depende de qual secção está sob o navbar
  const [darkUnderNav, setDarkUnderNav] = useState(true) // arranca no Hero (escuro)
  const isLight = isHomePage ? !darkUnderNav : scrolled

  // Scroll simples — para páginas internas e para o estado scrolled
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Deteção da secção sob o navbar — só na homepage
  useEffect(() => {
    if (!isHomePage) return

    const detectSection = () => {
      const NAVBAR_H = 70
      const sections = document.querySelectorAll('section[id]')
      let found = null
      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        if (rect.top <= NAVBAR_H && rect.bottom > NAVBAR_H) {
          found = section.id
        }
      })
      if (found !== null) {
        setDarkUnderNav(DARK_SECTIONS.has(found))
      }
    }

    window.addEventListener('scroll', detectSection, { passive: true })
    detectSection() // estado inicial
    return () => window.removeEventListener('scroll', detectSection)
  }, [isHomePage])


  useEffect(() => {
    setMobileOpen(false)
    setActiveDropdown(null)
  }, [location.pathname])

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMouseEnter = (label) => {
    clearTimeout(hoverTimeout.current)
    setActiveDropdown(label)
  }

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setActiveDropdown(null), 120)
  }

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isLight
            ? 'glass shadow-lg shadow-aintar-navy/10 border-b border-gray-100'
            : 'bg-transparent'
        }`}
      >
        <div className="section-container">
          <div className={`flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'h-14' : 'h-20'
          }`}>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img
                src={isLight ? '/logos/logo-horizontal-color.png' : '/logos/logo-horizontal-white.png'}
                alt="AINTAR"
                className={`w-auto transition-all duration-300 ${scrolled ? 'h-8' : 'h-10'}`}
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Navegação principal">
              {navMenu.map((item) =>
                item.children ? (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      aria-haspopup="menu"
                      aria-expanded={activeDropdown === item.label}
                      className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200
                        ${isLight
                          ? 'text-aintar-navy hover:text-aintar-blue hover:bg-aintar-light'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      {item.label}
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === item.label && (
                        <DropdownMenu items={item.children} />
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200
                      ${isLight
                        ? 'text-aintar-navy hover:text-aintar-blue hover:bg-aintar-light'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            {/* CTA */}
            <div className="hidden lg:flex items-center">
              <a
                href="https://app.aintar.pt"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5
                  ${isLight
                    ? 'bg-aintar-blue text-white hover:bg-aintar-blueMid hover:shadow-lg hover:shadow-aintar-blue/30'
                    : 'bg-aintar-sky text-white hover:bg-aintar-sky/90 hover:shadow-lg hover:shadow-aintar-sky/30'
                  }`}
              >
                <LogIn size={15} />
                Área de Cliente
              </a>
            </div>

            {/* Mobile Burger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className={`lg:hidden p-2 rounded-lg transition-colors duration-200 ${
                isLight ? 'text-aintar-navy hover:bg-aintar-light' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${scrolled ? 'top-14' : 'top-20'} left-0 right-0 z-40 glass border-b border-gray-100 shadow-xl max-h-[80vh] overflow-y-auto`}
          >
            <div className="section-container py-3">
              <nav className="flex flex-col gap-0.5" aria-label="Navegação mobile">
                {navMenu.map((item) =>
                  item.children ? (
                    <div key={item.label}>
                      <button
                        onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                        aria-expanded={mobileExpanded === item.label}
                        className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl
                          text-aintar-navy font-medium hover:bg-aintar-light transition-colors"
                      >
                        {item.label}
                        <ChevronDown
                          size={15}
                          className={`transition-transform ${mobileExpanded === item.label ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence>
                        {mobileExpanded === item.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pb-1 flex flex-col gap-0.5">
                              {item.children.map((child) =>
                                child.external ? (
                                  <a
                                    key={child.label}
                                    href={child.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:text-aintar-blue hover:bg-aintar-light transition-colors"
                                    onClick={() => setMobileOpen(false)}
                                  >
                                    {child.label}
                                  </a>
                                ) : (
                                  <Link
                                    key={child.label}
                                    to={child.href}
                                    className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:text-aintar-blue hover:bg-aintar-light transition-colors"
                                    onClick={() => setMobileOpen(false)}
                                  >
                                    {child.label}
                                  </Link>
                                )
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="px-4 py-3 rounded-xl text-aintar-navy font-medium hover:bg-aintar-light hover:text-aintar-blue transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )
                )}
                <div className="pt-2 mt-1 border-t border-gray-100">
                  <a
                    href="https://app.aintar.pt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-aintar-blue text-white font-semibold text-sm hover:bg-aintar-blueMid transition-colors"
                  >
                    <LogIn size={15} />
                    Área de Cliente
                  </a>
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
