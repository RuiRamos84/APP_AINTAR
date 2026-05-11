import { MapPin, Phone, Mail, Clock, ExternalLink, CreditCard } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'
import ContactForm from '../components/ui/ContactForm'

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
    label: 'Email Geral',
    value: 'geral@aintar.pt',
    href: 'mailto:geral@aintar.pt',
    sub: 'Resposta em 2 dias úteis',
  },
  {
    icon: Mail,
    label: 'Email Pedidos / Pagamentos',
    value: 'pedidos@aintar.pt',
    href: 'mailto:pedidos@aintar.pt',
    sub: 'Comprovativo de pagamento e pedidos de serviço',
  },
  {
    icon: Clock,
    label: 'Horário de Atendimento',
    value: 'Seg – Sex: 09h00 – 13h00 / 14h00 – 16h30',
    sub: 'Presencial e telefónico — encerrado em feriados',
  },
]

export default function ContactosPage() {
  return (
    <PageLayout
      title="Contactos"
      subtitle="Entre em contacto connosco. Estamos disponíveis para o ajudar."
      breadcrumbs={[{ label: 'Contactos' }]}
      seoDescription="Contacte a AINTAR: telefone 232 017 073, email geral@aintar.pt, sede em Carregal do Sal. Atendimento seg-sex 09h-13h / 14h-16h30."
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* Left — Info */}
            <div className="lg:col-span-2 space-y-5">
              <ScrollReveal>
                <h2 className="font-heading font-bold text-aintar-navy text-xl mb-5">Informação de Contacto</h2>
                <div className="space-y-4">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-4 group">
                      <div className="w-11 h-11 rounded-xl bg-aintar-light flex items-center justify-center flex-shrink-0
                        group-hover:bg-aintar-blue transition-colors">
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
                  ))}
                </div>
              </ScrollReveal>

              {/* Payment info */}
              <ScrollReveal delay={0.15}>
                <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={16} className="text-aintar-blue" />
                    <span className="font-semibold text-aintar-navy text-sm">Dados para Pagamento</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">Titular</span>
                      <span className="text-aintar-navy text-xs font-medium">AINTAR ASSOC MUN SIS INT AGUAS RESID</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">IBAN</span>
                      <span className="text-aintar-navy text-xs font-mono font-bold">PT50 0033 0000 4570 8378 2190 5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">SWIFT / BIC</span>
                      <span className="text-aintar-navy text-xs font-mono">BCOMPTPL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">Banco</span>
                      <span className="text-aintar-navy text-xs">Millennium BCP</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Envie o comprovativo para{' '}
                    <a href="mailto:pedidos@aintar.pt" className="text-aintar-blue hover:underline font-medium">pedidos@aintar.pt</a>
                  </p>
                </div>
              </ScrollReveal>

              {/* Livro de Reclamações */}
              <ScrollReveal delay={0.2}>
                <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10">
                  <p className="text-sm text-gray-600 mb-3 font-medium">Livro de Reclamações</p>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    Para reclamações formais utilize o portal oficial do Estado:
                  </p>
                  <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-aintar-blue font-semibold text-sm hover:text-aintar-sky transition-colors">
                    livroreclamacoes.pt <ExternalLink size={14} />
                  </a>
                </div>
              </ScrollReveal>
            </div>

            {/* Right — Form */}
            <div className="lg:col-span-3">
              <ScrollReveal delay={0.15}>
                <h2 className="font-heading font-bold text-aintar-navy text-xl mb-7">Enviar Mensagem</h2>
                <ContactForm rows={6} />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
