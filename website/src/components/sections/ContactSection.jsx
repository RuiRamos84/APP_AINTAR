import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import ContactForm from '../ui/ContactForm'

const contactInfo = [
  {
    icon: MapPin,
    label: 'Sede',
    value: 'Rua Dr. Francisco José Basto da Silveira, Lote 4 R/CH Esq.',
    sub: '3430-030 Carregal do Sal',
  },
  {
    icon: Phone,
    label: 'Telefone',
    value: '232 017 073',
    href: 'tel:+351232017073',
    sub: 'Chamada para rede fixa nacional',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'geral@aintar.pt',
    href: 'mailto:geral@aintar.pt',
    sub: 'Respondemos em 2 dias úteis',
  },
  {
    icon: Clock,
    label: 'Horário de Atendimento',
    value: 'Seg – Sex: 09h00 – 13h00 / 14h00 – 16h30',
    sub: 'Atendimento presencial e telefónico',
  },
]

export default function ContactSection() {
  return (
    <section id="contactos" className="section-padding bg-white">
      <div className="section-container">

        {/* Header */}
        <div className="text-center mb-14">
          <ScrollReveal>
            <span className="section-tag bg-aintar-blue/10 text-aintar-blue border border-aintar-blue/20 mb-4">
              Contactos
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h2 className="font-heading font-extrabold text-aintar-navy leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}>
              Estamos aqui para ajudar
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">

          {/* Left — Contact info */}
          <div className="lg:col-span-2">
            <div className="space-y-5 mb-8">
              {contactInfo.map((item, i) => (
                <ScrollReveal key={item.label} delay={i * 0.08}>
                  <div className="flex items-start gap-4 group">
                    <div className="w-11 h-11 rounded-xl bg-aintar-light flex items-center justify-center flex-shrink-0
                      group-hover:bg-aintar-blue group-hover:text-white transition-colors">
                      <item.icon size={18} className="text-aintar-blue group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</div>
                      {item.href ? (
                        <a href={item.href} className="font-semibold text-aintar-navy hover:text-aintar-blue transition-colors text-sm">
                          {item.value}
                        </a>
                      ) : (
                        <div className="font-semibold text-aintar-navy text-sm">{item.value}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Reclamações */}
            <ScrollReveal delay={0.35}>
              <div className="p-4 rounded-2xl bg-aintar-light border border-aintar-blue/10">
                <p className="text-sm text-gray-600 mb-3">
                  Para reclamações formais, utilize o Livro de Reclamações Eletrónico:
                </p>
                <a
                  href="https://www.livroreclamacoes.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-aintar-blue font-semibold text-sm hover:text-aintar-sky transition-colors"
                >
                  livroreclamacoes.pt
                  <ExternalLink size={14} />
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-3">
            <ScrollReveal delay={0.2}>
              <ContactForm rows={5} />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
