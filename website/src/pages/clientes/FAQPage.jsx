import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import AccordionItem from '../../components/ui/AccordionItem'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

const faqs = [
  {
    categoria: 'Faturação e Pagamentos',
    items: [
      {
        question: 'Com que periodicidade recebo a fatura?',
        answer: 'As faturas são emitidas bimestralmente, com base nas leituras efetuadas ao contador. Pode consultar e descarregar as suas faturas a qualquer momento através da Área de Cliente em app.aintar.pt.',
      },
      {
        question: 'Quais os meios de pagamento disponíveis?',
        answer: 'Pode pagar as suas faturas por transferência bancária, referência Multibanco, MBWAY, débito direto ou presencialmente no nosso atendimento. Os dados de pagamento constam na fatura.',
      },
      {
        question: 'O que acontece se não pagar a fatura dentro do prazo?',
        answer: 'Após o vencimento, serão aplicados juros de mora de acordo com o tarifário em vigor. Em caso de incumprimento prolongado, o serviço poderá ser suspenso após notificação prévia.',
      },
      {
        question: 'Como posso obter uma 2ª via da minha fatura?',
        answer: 'Pode solicitar uma 2ª via através da Área de Cliente em app.aintar.pt, por email para geral@aintar.pt ou presencialmente no nosso atendimento.',
      },
    ],
  },
  {
    categoria: 'Leituras e Contadores',
    items: [
      {
        question: 'Como posso comunicar a leitura do meu contador?',
        answer: 'Pode comunicar a leitura através da Área de Cliente online, pelo telefone do atendimento ao cliente, ou aguardar a leitura periódica efetuada pelos nossos técnicos.',
      },
      {
        question: 'A minha conta está mais elevada que o habitual. O que devo fazer?',
        answer: 'Um consumo invulgarmente elevado pode indicar uma fuga ou anomalia na instalação. Verifique se existem torneiras ou autoclismos com fuga. Se necessário, contacte-nos para solicitar uma revisão da leitura.',
      },
    ],
  },
  {
    categoria: 'Ligação ao Sistema e Contratos',
    items: [
      {
        question: 'Como solicito uma nova ligação ao sistema de saneamento?',
        answer: 'O pedido de nova ligação deve ser efetuado através do formulário disponível na secção de Formulários, acompanhado da documentação indicada. O prazo de apreciação é de 30 dias úteis.',
      },
      {
        question: 'Como procedo à transferência do contrato para outro titular?',
        answer: 'Para alterar o titular do contrato, preencha o formulário de Alteração de Titular, disponível na secção de Formulários, e entregue-o juntamente com o documento de identidade do novo titular.',
      },
      {
        question: 'Posso suspender temporariamente o serviço?',
        answer: 'Sim, pode solicitar a suspensão temporária do serviço por motivo justificado (ex: imóvel devoluto). Contacte-nos para obter informação sobre as condições e custos associados.',
      },
    ],
  },
  {
    categoria: 'Avarias e Reclamações',
    items: [
      {
        question: 'Como reporto uma avaria ou entupimento na rede pública?',
        answer: 'Avarias na rede pública devem ser reportadas pelo nosso número de atendimento. Em situações urgentes (derrames, inundações) use a linha de emergência disponível 24 horas.',
      },
      {
        question: 'Qual o prazo de resposta a uma reclamação?',
        answer: 'As reclamações são respondidas no prazo máximo de 15 dias úteis. Para reclamações formais, pode também utilizar o Livro de Reclamações Electrónico em livroreclamacoes.pt.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <PageLayout
      title="Perguntas Frequentes"
      subtitle="Encontre respostas às dúvidas mais comuns sobre os nossos serviços."
      breadcrumbs={[
        { label: 'Clientes', href: '/clientes' },
        { label: 'Perguntas Frequentes' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">
          <div className="space-y-10">
            {faqs.map((cat, ci) => (
              <ScrollReveal key={cat.categoria} delay={ci * 0.05}>
                <h2 className="font-heading font-bold text-aintar-navy text-lg mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 rounded-full bg-aintar-teal" />
                  {cat.categoria}
                </h2>
                <div className="space-y-2">
                  {cat.items.map((item, i) => (
                    <AccordionItem
                      key={item.question}
                      question={item.question}
                      answer={item.answer}
                      defaultOpen={ci === 0 && i === 0}
                    />
                  ))}
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Still have questions */}
          <ScrollReveal delay={0.3} className="mt-12">
            <div className="rounded-2xl bg-hero-gradient p-8 text-center text-white">
              <div className="w-12 h-12 rounded-full bg-aintar-sky/20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={22} className="text-aintar-sky" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">Não encontrou a sua resposta?</h3>
              <p className="text-white/60 text-sm mb-5">
                A nossa equipa está disponível para esclarecer qualquer dúvida.
              </p>
              <Link to="/contactos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-aintar-sky text-white
                  font-semibold text-sm hover:bg-white hover:text-aintar-blue transition-all">
                Contactar Apoio
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
