import { Link } from 'react-router-dom'
import { Factory, Droplets, ArrowRight, Activity } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'

const instalacoes = [
  { nome: 'ETAR de Touriz', municipio: 'Tondela', tipo: 'ETAR', capacidade: '—' },
  { nome: 'SAR de Vila Pouca', municipio: 'Tondela', tipo: 'SAR', capacidade: '—' },
  { nome: 'SAR de Pinheiro de Ázere', municipio: 'Tondela', tipo: 'SAR', capacidade: '—' },
  { nome: 'Subsistema de Papízios', municipio: '—', tipo: 'Subsistema', capacidade: '—' },
]

export default function SaneamentoPage() {
  return (
    <PageLayout
      title="Sistemas de Tratamento"
      subtitle="Infraestruturas de saneamento de águas residuais geridas pela AINTAR na região Centro."
      breadcrumbs={[{ label: 'Saneamento' }]}
    >
      {/* Overview */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <ScrollReveal>
              <span className="section-tag bg-aintar-sky/10 text-aintar-sky border border-aintar-sky/20 mb-4">
                Infraestruturas
              </span>
              <h2 className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
                Rede de saneamento <span className="text-gradient">integrada e moderna</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                A AINTAR opera uma rede integrada de infraestruturas de saneamento em alta e em baixa,
                que incluem estações de tratamento de águas residuais (ETAR), sistemas de águas residuais (SAR),
                redes de emissários e estações elevatórias.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Todas as instalações operam com processos de monitorização contínua, assegurando o
                cumprimento dos padrões ambientais e a proteção dos recursos hídricos da região.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Factory, label: 'ETARs em Operação', value: '4+', color: 'aintar-sky' },
                  { icon: Droplets, label: 'SARs Activos', value: '8+', color: 'aintar-teal' },
                  { icon: Activity, label: 'Monitorização', value: '24/7', color: 'aintar-blue' },
                  { icon: Factory, label: 'Eficiência', value: '98%', color: 'aintar-teal' },
                ].map((s) => (
                  <div key={s.label}
                    className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10 text-center">
                    <s.icon size={22} className={`text-${s.color} mx-auto mb-2`} />
                    <div className={`text-2xl font-extrabold font-heading text-${s.color} mb-1`}>{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Instalações */}
          <ScrollReveal>
            <h2 className="font-heading font-bold text-aintar-navy text-xl mb-6">Principais Instalações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {instalacoes.map((inst, i) => (
                <div key={inst.nome}
                  className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-aintar-sky/30
                    hover:shadow-md transition-all">
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-3
                    ${inst.tipo === 'ETAR' ? 'bg-aintar-sky/10 text-aintar-sky' : 'bg-aintar-teal/10 text-aintar-teal'}`}>
                    {inst.tipo}
                  </div>
                  <div className="font-heading font-bold text-aintar-navy text-sm mb-1">{inst.nome}</div>
                  <div className="text-xs text-gray-400">{inst.municipio}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Quality link */}
          <ScrollReveal delay={0.2} className="mt-10 text-center">
            <Link to="/saneamento/qualidade" className="btn-outline-blue">
              Consultar Qualidade do Serviço
              <ArrowRight size={16} />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
