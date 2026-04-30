import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, ExternalLink, ArrowRight } from 'lucide-react'
import DarkBgDecorations from '../ui/DarkBgDecorations'

const footerLinks = {
  empresa: [
    { label: 'Sobre a AINTAR',    href: '/quem-somos' },
    { label: 'Órgãos Sociais',    href: '/quem-somos/orgaos-sociais' },
    { label: 'Recursos Humanos',  href: '/recursos-humanos' },
    { label: 'Projetos',          href: '/projetos' },
  ],
  servicos: [
    { label: 'Saneamento em Alta',      href: '/saneamento#alta' },
    { label: 'Saneamento em Baixa',     href: '/saneamento#baixa' },
    { label: 'Tratamento de Efluentes', href: '/saneamento#efluentes' },
    { label: 'Qualidade do Serviço',    href: '/saneamento/qualidade' },
    { label: 'Sustentabilidade',        href: '/sustentabilidade' },
  ],
  documentos: [
    { label: 'Tarifário 2026', href: '/clientes/tarifario' },
    { label: 'Regulamento de Serviço', href: '/clientes/regulamento' },
    { label: 'Relatório de Contas', href: '/quem-somos/documentos-financeiros' },
    { label: 'Formulários', href: '/clientes/formularios' },
  ],
}

const sectionLabels = {
  empresa: 'Empresa',
  servicos: 'Serviços',
  documentos: 'Documentos',
}

export default function Footer() {
  return (
    <footer className="bg-hero-gradient text-white relative overflow-hidden">
      <DarkBgDecorations intensity="low" />
      {/* Onda animada invertida — transição do conteúdo branco para o footer */}
      <div className="absolute top-0 left-0 right-0 h-16 overflow-hidden pointer-events-none z-10">

        {/* Camada 1 — fundo, semi-transparente */}
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: '200%',
            animationName: 'waveSlide',
            animationDuration: '12s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: 'reverse',
          }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,32 C180,12 360,52 540,32 C720,12 900,52 1080,32
                 C1260,12 1440,52 1620,32 C1800,12 1980,52 2160,32
                 C2340,12 2520,52 2700,32 C2880,12 L2880,0 L0,0 Z"
              fill="rgba(255,255,255,0.25)"
            />
          </svg>
        </div>

        {/* Camada 2 — frente, branca sólida */}
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: '200%',
            animationName: 'waveSlide',
            animationDuration: '8s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,40 C240,16 480,56 720,40 C960,16 1200,56 1440,40
                 C1680,16 1920,56 2160,40 C2400,16 2640,56 2880,40
                 L2880,0 L0,0 Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Main footer */}
      <div className="section-container pt-14 pb-10 lg:pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <img
              src="/logos/logo-horizontal-white.png"
              alt="AINTAR"
              className="h-8 w-auto mb-4"
            />
            <p className="text-white/60 text-xs leading-relaxed max-w-xs mb-4">
              Associação de Municípios para o Sistema Intermunicipal de Águas Residuais.
              Gestão responsável dos sistemas de saneamento na região Centro.
            </p>

            {/* Contactos — ícones horizontais com tooltip ao hover */}
            <div className="flex items-center gap-2 mt-2">

              {/* Telefone */}
              <a href="tel:+351232017073" aria-label="Telefone"
                className="relative group w-9 h-9 rounded-lg bg-white/5 hover:bg-aintar-sky/20
                  flex items-center justify-center text-white/50 hover:text-aintar-sky transition-all">
                <Phone size={15} />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-aintar-navy border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
                  whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 shadow-xl z-50">
                  232 017 073
                </span>
              </a>

              {/* Email */}
              <a href="mailto:geral@aintar.pt" aria-label="Email"
                className="relative group w-9 h-9 rounded-lg bg-white/5 hover:bg-aintar-sky/20
                  flex items-center justify-center text-white/50 hover:text-aintar-sky transition-all">
                <Mail size={15} />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-aintar-navy border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
                  whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 shadow-xl z-50">
                  geral@aintar.pt
                </span>
              </a>

              {/* Localização */}
              <div aria-label="Localização"
                className="relative group w-9 h-9 rounded-lg bg-white/5 hover:bg-aintar-sky/20
                  flex items-center justify-center text-white/50 hover:text-aintar-sky transition-all cursor-default">
                <MapPin size={15} />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-aintar-navy border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
                  whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 shadow-xl z-50">
                  Região Centro, Portugal
                </span>
              </div>

              {/* Separador */}
              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Facebook */}
              <a href="https://www.facebook.com/aintarjuntospeloambiente/?locale=pt_PT"
                target="_blank" rel="noopener noreferrer" aria-label="Facebook da AINTAR"
                className="relative group w-9 h-9 rounded-lg bg-white/5 hover:bg-[#1877F2]/20
                  flex items-center justify-center text-white/50 hover:text-[#1877F2] transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-aintar-navy border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
                  whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 shadow-xl z-50">
                  Facebook
                </span>
              </a>

              {/* Instagram */}
              <a href="https://www.instagram.com/aintar_juntospeloambiente/"
                target="_blank" rel="noopener noreferrer" aria-label="Instagram da AINTAR"
                className="relative group w-9 h-9 rounded-lg bg-white/5 hover:bg-[#E1306C]/20
                  flex items-center justify-center text-white/50 hover:text-[#E1306C] transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-aintar-navy border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
                  whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 shadow-xl z-50">
                  Instagram
                </span>
              </a>

              {/* WhatsApp — TODO: confirmar número */}
              <a href="https://wa.me/351927242740"
                target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da AINTAR"
                className="relative group w-9 h-9 rounded-lg bg-white/5 hover:bg-[#25D366]/20
                  flex items-center justify-center text-white/50 hover:text-[#25D366] transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-aintar-navy border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
                  whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0
                  transition-all duration-200 shadow-xl z-50">
                  WhatsApp
                </span>
              </a>

            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([key, links]) => (
            <div key={key}>
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
                {sectionLabels[key]}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-white/50 hover:text-aintar-sky text-sm transition-colors flex items-center gap-1.5 group"
                    >
                      <ArrowRight size={12} className="opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 relative z-10">
        <div className="section-container py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <span>© {new Date().getFullYear()} AINTAR — Todos os direitos reservados</span>
            <div className="flex items-center gap-4">
              <Link to="/politica-privacidade" className="hover:text-white/70 transition-colors">Política de Privacidade</Link>
              <Link to="/termos-utilizacao" className="hover:text-white/70 transition-colors">Termos de Utilização</Link>
              <a
                href="https://www.livroreclamacoes.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/70 transition-colors flex items-center gap-1"
              >
                Livro de Reclamações <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
