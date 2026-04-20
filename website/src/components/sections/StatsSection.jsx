import AnimatedCounter from '../ui/AnimatedCounter'
import ScrollReveal from '../ui/ScrollReveal'

const stats = [
  { value: 4,   suffix: '',     label: 'Municípios Associados', description: 'Carregal do Sal, Santa Comba Dão, Tábua e Tondela' },
  { value: 700, suffix: ' km',  label: 'Rede de Coletores',      description: 'Infraestrutura de saneamento gerida pela AINTAR' },
  { value: 145, suffix: '',     label: 'Estações de Tratamento', description: 'ETARs em operação na área de atuação' },
  { value: 26,  suffix: ' mil', label: 'Clientes Servidos',      description: 'Cerca de 56.000 habitantes abrangidos' },
]

export default function StatsSection() {
  return (
    <section className="bg-aintar-navy">
      <div className="section-container py-12 lg:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.08}>
              <div className={`text-center py-4 lg:py-0
                ${i < stats.length - 1 ? 'border-r border-white/10' : ''}
                ${i < 2 ? 'border-b border-white/10 lg:border-b-0 pb-8 lg:pb-0' : 'pt-8 lg:pt-0'}
              `}>
                <div className="text-4xl lg:text-5xl font-heading font-extrabold text-gradient leading-none mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="font-semibold text-white text-sm mb-1">{stat.label}</div>
                <div className="text-white/35 text-xs leading-snug px-4 hidden lg:block">{stat.description}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
