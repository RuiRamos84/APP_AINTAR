import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const sections = [
  {
    title: '1. Objeto',
    content: `Os presentes Termos de Utilização regulam o acesso e utilização do website da AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais, disponível em aintar.pt. A utilização deste website implica a aceitação plena destes termos.`,
  },
  {
    title: '2. Utilização do Website',
    content: `O website da AINTAR destina-se a disponibilizar informação institucional, documentos públicos e meios de contacto com a entidade. É proibido utilizar este website para fins ilícitos, transmitir conteúdos ofensivos ou tentar comprometer a segurança dos sistemas informáticos da AINTAR.`,
  },
  {
    title: '3. Propriedade Intelectual',
    content: `Todos os conteúdos deste website — textos, imagens, logótipos e marca — são propriedade da AINTAR ou de terceiros que autorizaram a sua utilização. É proibida a reprodução total ou parcial sem autorização prévia e escrita da AINTAR.`,
  },
  {
    title: '4. Hiperligações',
    content: `Este website pode conter ligações para websites externos. A AINTAR não é responsável pelo conteúdo ou políticas de privacidade desses websites e a inclusão de uma ligação não implica qualquer endosso ou parceria.`,
  },
  {
    title: '5. Disponibilidade',
    content: `A AINTAR empenha-se em assegurar a disponibilidade contínua deste website, mas não garante que o serviço esteja sempre disponível, podendo ocorrer interrupções para manutenção ou por razões técnicas fora do seu controlo.`,
  },
  {
    title: '6. Responsabilidade',
    content: `A AINTAR não se responsabiliza por quaisquer danos resultantes da utilização ou impossibilidade de utilização deste website, nem pela inexatidão de informações fornecidas por terceiros.`,
  },
  {
    title: '7. Lei Aplicável',
    content: `Estes Termos de Utilização são regidos pela lei portuguesa. Qualquer litígio será submetido aos tribunais competentes da comarca de Viseu.`,
  },
  {
    title: '8. Contacto',
    content: `Para quaisquer questões relacionadas com estes termos, contacte-nos através de geral@aintar.pt ou pelo telefone 232 017 073.`,
  },
]

export default function TermosUtilizacaoPage() {
  return (
    <PageLayout
      title="Termos de Utilização"
      subtitle="Condições de acesso e utilização do website da AINTAR."
      breadcrumbs={[{ label: 'Termos de Utilização' }]}
      seoDescription="Termos e condições de utilização do website da AINTAR."
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto space-y-8">
            {sections.map((s, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className="border-b border-gray-100 pb-8 last:border-0">
                  <h2 className="font-heading font-bold text-aintar-navy text-lg mb-3">{s.title}</h2>
                  <p className="text-gray-600 leading-relaxed text-sm">{s.content}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
