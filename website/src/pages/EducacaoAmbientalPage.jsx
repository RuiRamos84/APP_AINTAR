import { Leaf, BookOpen, Users, TreePine, Droplets } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const iniciativas = [
  {
    icon: BookOpen,
    titulo: 'Visitas às Instalações',
    descricao: 'Recebemos grupos de escolas e associações nas nossas estações de tratamento para mostrar como funciona o ciclo do saneamento e sensibilizar para a importância da água.',
    color: 'aintar-teal',
  },
  {
    icon: Users,
    titulo: 'Ações de Sensibilização',
    descricao: 'Realizamos ações de sensibilização junto das comunidades sobre o uso responsável da água, a correta utilização da rede de saneamento e a prevenção de poluição.',
    color: 'aintar-blue',
  },
  {
    icon: TreePine,
    titulo: 'Projetos Escolares',
    descricao: 'Colaboramos com escolas do nosso território de intervenção em projetos pedagógicos sobre ambiente, água e saneamento, integrando a educação ambiental nos currículos.',
    color: 'aintar-teal',
  },
  {
    icon: Droplets,
    titulo: 'Água e Saneamento',
    descricao: 'Promovemos a literacia sobre o ciclo urbano da água, explicando a importância do saneamento adequado para a saúde pública e para a preservação dos recursos hídricos.',
    color: 'aintar-sky',
  },
]

export default function EducacaoAmbientalPage() {
  return (
    <PageLayout
      title="Educação Ambiental"
      subtitle="Sensibilizar as comunidades para um futuro mais sustentável."
      breadcrumbs={[{ label: 'Educação Ambiental' }]}
      seoDescription="Iniciativas de educação ambiental da AINTAR — sensibilização para o uso responsável da água e do saneamento."
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <ScrollReveal>
              <span className="section-tag bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20 mb-4">
                Juntos pelo Ambiente
              </span>
              <h2
                className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}
              >
                Educar para preservar
              </h2>
              <p className="text-gray-600 leading-relaxed">
                A AINTAR acredita que a educação ambiental é um pilar fundamental para a construção
                de comunidades mais conscientes e responsáveis. Promovemos iniciativas que aproximam
                as pessoas do ciclo da água e do saneamento, fomentando boas práticas no dia a dia.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {iniciativas.map((item, i) => (
              <ScrollReveal key={item.titulo} delay={i * 0.1}>
                <div
                  className={`p-7 rounded-2xl border border-${item.color}/20 bg-${item.color}/5 hover:shadow-md transition-shadow h-full`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-${item.color}/15 flex items-center justify-center mb-5`}
                  >
                    <item.icon size={22} className={`text-${item.color}`} />
                  </div>
                  <h3 className="font-heading font-bold text-aintar-navy text-base mb-3">
                    {item.titulo}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.descricao}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.3} className="mt-12">
            <div className="rounded-2xl bg-hero-gradient p-8 text-white text-center">
              <h3 className="font-heading font-bold text-xl mb-3">Quer colaborar connosco?</h3>
              <p className="text-white/70 text-sm leading-relaxed max-w-2xl mx-auto">
                Se representa uma escola, associação ou entidade interessada em desenvolver ações de
                educação ambiental em parceria com a AINTAR, entre em contacto connosco. Estamos
                disponíveis para construir juntos um programa adaptado às suas necessidades.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
