import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Facebook, ExternalLink, ArrowRight } from 'lucide-react'

const footerLinks = {
  empresa: [
    { label: 'Sobre a AINTAR', href: '/quem-somos' },
    { label: 'Órgãos Sociais', href: '/quem-somos/orgaos-sociais' },
    { label: 'Municípios Associados', href: '/quem-somos' },
    { label: 'Projetos', href: '/projetos' },
  ],
  servicos: [
    { label: 'Saneamento em Alta', href: '/saneamento' },
    { label: 'Saneamento em Baixa', href: '/saneamento' },
    { label: 'Tratamento de Efluentes', href: '/saneamento' },
    { label: 'Qualidade do Serviço', href: '/saneamento/qualidade' },
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
    <footer className="bg-aintar-navy text-white">
      {/* Main footer */}
      <div className="section-container py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <img
              src="/logos/logo-horizontal-white.png"
              alt="AINTAR"
              className="h-10 w-auto mb-6"
            />
            <p className="text-white/60 text-sm leading-relaxed max-w-xs mb-6">
              Associação de Municípios para o Sistema Intermunicipal de Águas Residuais.
              Gestão responsável dos sistemas de saneamento na região Centro.
            </p>

            {/* Contacts */}
            <div className="space-y-3">
              <a href="tel:+351232017073" className="flex items-center gap-3 text-white/60 hover:text-aintar-sky transition-colors text-sm group">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-aintar-sky/20 transition-colors">
                  <Phone size={14} />
                </span>
                232 017 073
              </a>
              <a href="mailto:geral@aintar.pt" className="flex items-center gap-3 text-white/60 hover:text-aintar-sky transition-colors text-sm group">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-aintar-sky/20 transition-colors">
                  <Mail size={14} />
                </span>
                geral@aintar.pt
              </a>
              <div className="flex items-start gap-3 text-white/60 text-sm">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={14} />
                </span>
                <span>Região Centro, Portugal</span>
              </div>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://facebook.com/aintar"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-aintar-sky/20 flex items-center justify-center text-white/60 hover:text-aintar-sky transition-all"
                aria-label="Facebook da AINTAR"
              >
                <Facebook size={16} />
              </a>
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([key, links]) => (
            <div key={key}>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {sectionLabels[key]}
              </h4>
              <ul className="space-y-2.5">
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
      <div className="border-t border-white/10">
        <div className="section-container py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <span>© {new Date().getFullYear()} AINTAR — Todos os direitos reservados</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white/70 transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-white/70 transition-colors">Termos de Utilização</a>
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
