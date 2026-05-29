import { Droplets, Recycle, TreePine, Star, BookOpen, Smile, Gamepad2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const atividades = [
  {
    icon: Droplets,
    titulo: 'A Viagem da Água',
    descricao: 'Descobrimos juntos de onde vem a água que bebemos e para onde vai depois de usada. Uma aventura pelo ciclo da água explicada de forma divertida!',
    color: 'aintar-sky',
  },
  {
    icon: Recycle,
    titulo: 'Reciclar é Fixe',
    descricao: 'Aprendemos a separar os resíduos e a perceber porque é tão importante não deitar coisas erradas na sanita ou no lavatório.',
    color: 'aintar-teal',
  },
  {
    icon: TreePine,
    titulo: 'Guardiões do Ambiente',
    descricao: 'Cada criança pode ser um guardião do ambiente! Mostramos como as pequenas ações do dia a dia fazem uma grande diferença para o planeta.',
    color: 'aintar-teal',
  },
  {
    icon: BookOpen,
    titulo: 'Visitas à ETAR',
    descricao: 'As turmas podem visitar as nossas estações de tratamento e ver ao vivo como a água residual é tratada antes de voltar à natureza.',
    color: 'aintar-blue',
  },
  {
    icon: Star,
    titulo: 'Concursos e Desafios',
    descricao: 'Organizamos concursos de desenho, textos e projetos sobre o ambiente para as escolas do nosso território. Prémios para os melhores trabalhos!',
    color: 'aintar-sky',
  },
  {
    icon: Smile,
    titulo: 'Jogos e Atividades',
    descricao: 'Passatempos, jogos interativos e materiais didáticos sobre a água e o saneamento, criados especialmente para crianças do 1.º ao 6.º ano.',
    color: 'aintar-teal',
    href: '/educacao-ambiental/aintar-kids/jogo',
  },
]

export default function AintarKidsPage() {
  return (
    <PageLayout
      title="AINTAR Kids"
      subtitle="Um mundo de aventuras para aprender a cuidar do ambiente!"
      breadcrumbs={[
        { label: 'Educação Ambiental', href: '/educacao-ambiental' },
        { label: 'AINTAR Kids' },
      ]}
      seoDescription="AINTAR Kids — atividades, jogos e visitas educativas para crianças sobre água, saneamento e ambiente."
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <ScrollReveal>
              <span className="section-tag bg-aintar-sky/10 text-aintar-sky border border-aintar-sky/20 mb-4">
                Para os mais novos
              </span>
              <h2
                className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}
              >
                Aprender a cuidar do planeta começa aqui!
              </h2>
              <p className="text-gray-600 leading-relaxed">
                O programa <strong>AINTAR Kids</strong> foi criado para levar a educação ambiental
                às crianças de forma divertida e envolvente. Acreditamos que os mais novos são os
                grandes agentes de mudança para um futuro mais sustentável.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {atividades.map((item, i) => (
              <ScrollReveal key={item.titulo} delay={i * 0.08}>
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
                  {item.href && (
                    <div className="mt-5 flex flex-col gap-2">
                      <Link
                        to={item.href}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aintar-teal text-white text-sm font-semibold hover:bg-aintar-teal/80 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Gamepad2 size={16} />
                        Jogo do Tabuleiro
                      </Link>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.3} className="mt-12">
            <div className="rounded-2xl bg-hero-gradient p-8 text-white text-center">
              <h3 className="font-heading font-bold text-xl mb-3">
                A tua escola quer participar?
              </h3>
              <p className="text-white/70 text-sm leading-relaxed max-w-2xl mx-auto">
                Se és professor ou responsável de uma escola ou agrupamento e queres levar o
                programa AINTAR Kids à tua turma, entra em contacto connosco. Vamos adorar
                conhecer-vos!
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
