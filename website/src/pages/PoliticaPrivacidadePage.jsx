import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const sections = [
  {
    title: '1. Responsável pelo Tratamento',
    content: `A AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais é a entidade responsável pelo tratamento dos dados pessoais recolhidos através deste website. Sede: Rua Dr. Francisco José Basto da Silveira, Lote 4 R/CH Esq., 3430-030 Carregal do Sal,Viseu, Portugal. Contacto: geral@aintar.pt`,
  },
  {
    title: '2. Dados Recolhidos',
    content: `Recolhemos apenas os dados necessários para responder às suas solicitações: nome, endereço de e-mail, número de telefone (opcional) e o conteúdo da mensagem submetida através do formulário de contacto. Não recolhemos dados de forma automatizada para fins comerciais.`,
  },
  {
    title: '3. Finalidade e Base Legal',
    content: `Os seus dados são tratados exclusivamente para: (a) responder às suas questões e pedidos de informação; (b) cumprir obrigações legais aplicáveis à AINTAR enquanto entidade gestora de serviços públicos. A base legal é o interesse legítimo na prestação do serviço (Art.º 6.º, n.º 1, alínea f) do RGPD) e o cumprimento de obrigação legal (alínea c).`,
  },
  {
    title: '4. Conservação dos Dados',
    content: `Os dados pessoais submetidos através do formulário de contacto são conservados pelo prazo estritamente necessário para dar resposta à sua solicitação, não excedendo 12 meses salvo obrigação legal em contrário.`,
  },
  {
    title: '5. Partilha de Dados',
    content: `A AINTAR não vende nem partilha os seus dados pessoais com terceiros para fins comerciais. Os dados podem ser partilhados com entidades públicas quando exigido por lei ou por ordem judicial.`,
  },
  {
    title: '6. Os Seus Direitos',
    content: `Ao abrigo do RGPD (Regulamento UE 2016/679), tem direito a: aceder aos seus dados pessoais; solicitar a retificação ou apagamento; opor-se ao tratamento; solicitar a limitação do tratamento; apresentar reclamação à autoridade de controlo (CNPD — www.cnpd.pt). Para exercer os seus direitos, contacte-nos através de geral@aintar.pt.`,
  },
  {
    title: '7. Cookies',
    content: `Este website utiliza apenas cookies técnicos essenciais ao seu funcionamento. Não são utilizados cookies de rastreio ou publicidade.`,
  },
  {
    title: '8. Atualizações',
    content: `Esta política pode ser atualizada periodicamente. A versão mais recente estará sempre disponível nesta página. Última atualização: Janeiro de 2026.`,
  },
]

export default function PoliticaPrivacidadePage() {
  return (
    <PageLayout
      title="Política de Privacidade"
      subtitle="Como recolhemos, usamos e protegemos os seus dados pessoais."
      breadcrumbs={[{ label: 'Política de Privacidade' }]}
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
