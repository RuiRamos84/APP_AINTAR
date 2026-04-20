import { Leaf, Recycle, Sun, Droplets } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const pilares = [
  {
    icon: Droplets,
    titulo: 'Protecção dos Recursos Hídricos',
    descricao: 'O tratamento eficiente das águas residuais é a nossa contribuição directa para a preservação dos recursos hídricos. Monitoramos continuamente a qualidade dos efluentes tratados antes da sua rejeição no meio hídrico.',
    color: 'aintar-sky',
  },
  {
    icon: Sun,
    titulo: 'Eficiência Energética',
    descricao: 'Investimos em tecnologias e processos que reduzem o consumo energético das nossas instalações. O aproveitamento de biogás e a instalação de painéis solares são objectivos do nosso plano de sustentabilidade.',
    color: 'aintar-teal',
  },
  {
    icon: Recycle,
    titulo: 'Gestão de Lamas',
    descricao: 'As lamas resultantes do processo de tratamento são geridas de forma responsável, privilegiando a sua valorização agrícola como correctivo orgânico, em conformidade com a legislação aplicável.',
    color: 'aintar-blue',
  },
  {
    icon: Leaf,
    titulo: 'Educação Ambiental',
    descricao: 'Promovemos a sensibilização das comunidades para a importância do uso responsável da água e do correcto funcionamento dos sistemas de saneamento, através de acções de educação ambiental.',
    color: 'aintar-teal',
  },
]

export default function SustentabilidadePage() {
  return (
    <PageLayout
      title="Sustentabilidade"
      subtitle="O compromisso da AINTAR com o ambiente e as gerações futuras."
      breadcrumbs={[{ label: 'Sustentabilidade' }]}
    >
      {/* Intro */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <ScrollReveal>
              <span className="section-tag bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20 mb-4">
                Juntos pelo Ambiente
              </span>
              <h2 className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
                A sustentabilidade no centro da nossa missão
              </h2>
              <p className="text-gray-600 leading-relaxed">
                O slogan <strong>"Juntos pelo Ambiente"</strong> não é apenas um lema — é o princípio orientador
                de todas as nossas decisões. Acreditamos que a gestão responsável do saneamento é um contributo
                essencial para a qualidade de vida das populações e para a preservação do ambiente.
              </p>
            </ScrollReveal>
          </div>

          {/* Pilares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pilares.map((p, i) => (
              <ScrollReveal key={p.titulo} delay={i * 0.1}>
                <div className={`p-7 rounded-2xl border border-${p.color}/20 bg-${p.color}/5 hover:shadow-md transition-shadow h-full`}>
                  <div className={`w-12 h-12 rounded-xl bg-${p.color}/15 flex items-center justify-center mb-5`}>
                    <p.icon size={22} className={`text-${p.color}`} />
                  </div>
                  <h3 className="font-heading font-bold text-aintar-navy text-base mb-3">{p.titulo}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{p.descricao}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Commitment */}
          <ScrollReveal delay={0.3} className="mt-12">
            <div className="rounded-2xl bg-hero-gradient p-8 text-white text-center">
              <h3 className="font-heading font-bold text-xl mb-3">O nosso compromisso</h3>
              <p className="text-white/70 text-sm leading-relaxed max-w-2xl mx-auto">
                Trabalhamos diariamente para que os sistemas de saneamento que gerimos contribuam
                para um futuro mais sustentável, protegendo os recursos naturais e assegurando um
                serviço de qualidade às populações que servimos.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
