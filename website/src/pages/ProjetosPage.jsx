import { CheckCircle2, MapPin, Euro, ExternalLink } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const projetos = [
  {
    titulo: 'ETAR de Tondela Norte',
    municipio: 'Tondela',
    descricao: 'Requalificação e modernização da Estação de Tratamento de Águas Residuais de Tondela Norte. Obra inaugurada em julho de 2024 com a presença da Ministra do Ambiente e da Energia, Maria da Graça Carvalho.',
    contrato: 'Novembro 2022',
    inauguracao: 'Julho 2024',
    financiamento: 'Fundo de Coesão UE — Portugal 2020 / POSEUR',
    estado: 'concluido',
  },
  {
    titulo: 'Subsistema de Papízios',
    municipio: 'Carregal do Sal',
    descricao: 'Requalificação do subsistema de tratamento de águas residuais de Papízios. Inaugurado em junho de 2024 na presença do Secretário de Estado do Ambiente, Emídio Sousa.',
    contrato: 'Agosto 2022',
    inauguracao: 'Junho 2024',
    financiamento: 'Fundo de Coesão UE — Portugal 2020 / POSEUR',
    estado: 'concluido',
  },
  {
    titulo: 'Sistema de Touriz',
    municipio: 'Tábua',
    descricao: 'Construção e modernização do sistema de águas residuais de Touriz, integrando coletores, estação elevatória e ligações à rede intermunicipal gerida pela AINTAR.',
    contrato: 'Setembro 2022',
    inauguracao: '2023',
    financiamento: 'Fundo de Coesão UE — Portugal 2020 / POSEUR',
    estado: 'concluido',
  },
  {
    titulo: 'Sistema de Vila Chã',
    municipio: 'Tábua',
    descricao: 'Implementação do sistema de saneamento em Vila Chã, assegurando cobertura total da localidade com coletores e infraestrutura de transporte para tratamento centralizado.',
    contrato: '2022',
    inauguracao: '2023',
    financiamento: 'Fundo de Coesão UE — Portugal 2020 / POSEUR',
    estado: 'concluido',
  },
  {
    titulo: 'Sistema de Vila Pouca e Casal Bom',
    municipio: 'Santa Comba Dão',
    descricao: 'Requalificação da rede de águas residuais de Vila Pouca e Casal Bom, beneficiando centenas de famílias com ligação à rede intermunicipal de saneamento.',
    contrato: 'Agosto 2022',
    inauguracao: '2023',
    financiamento: 'Fundo de Coesão UE — Portugal 2020 / POSEUR',
    estado: 'concluido',
  },
  {
    titulo: 'Sistema de Pinheiro de Ázere',
    municipio: 'Santa Comba Dão',
    descricao: 'Construção do sistema de recolha e transporte de águas residuais de Pinheiro de Ázere, incluindo redes de coletores e ligação ao sistema de tratamento.',
    contrato: 'Setembro 2022',
    inauguracao: '2023',
    financiamento: 'Fundo de Coesão UE — Portugal 2020 / POSEUR',
    estado: 'concluido',
  },
]

const municipioColor = {
  'Tondela': 'bg-aintar-sky/10 text-aintar-sky',
  'Carregal do Sal': 'bg-aintar-teal/10 text-aintar-teal',
  'Tábua': 'bg-aintar-blue/10 text-aintar-blue',
  'Santa Comba Dão': 'bg-purple-100 text-purple-600',
}

export default function ProjetosPage() {
  return (
    <PageLayout
      title="Projetos e Obras"
      subtitle="Investimento superior a 6 milhões de euros em infraestruturas de saneamento nos municípios associados."
      breadcrumbs={[{ label: 'Projetos e Obras' }]}
      seoDescription="Projetos de modernização e investimento em infraestruturas de saneamento financiados pela AINTAR com fundos europeus."
    >
      <section className="section-padding bg-white">
        <div className="section-container">

          {/* Funding banner */}
          <ScrollReveal className="mb-10">
            <div className="rounded-2xl bg-aintar-light border border-aintar-blue/10 p-5 flex flex-wrap items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-aintar-blue/10 flex items-center justify-center flex-shrink-0">
                <Euro size={20} className="text-aintar-blue" />
              </div>
              <div className="flex-grow">
                <div className="font-semibold text-aintar-navy text-sm">Co-financiamento Europeu</div>
                <div className="text-gray-500 text-xs mt-0.5">
                  Todos os projetos são co-financiados pelo Fundo de Coesão da União Europeia, no âmbito do Programa Operacional Sustentabilidade e Eficiência no Uso de Recursos (POSEUR) — Portugal 2020.
                </div>
              </div>
              <a href="https://poseur.portugal2020.pt" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-aintar-blue font-semibold hover:text-aintar-sky transition-colors flex-shrink-0">
                Portugal 2020 <ExternalLink size={12} />
              </a>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal delay={0.05} className="mb-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: '6', label: 'Projetos concluídos' },
                { value: '4', label: 'Municípios beneficiados' },
                { value: '>€6M', label: 'Investimento total' },
                { value: '2024', label: 'Última inauguração' },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 rounded-2xl bg-aintar-light">
                  <div className="text-2xl font-heading font-extrabold text-aintar-blue">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Projects grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projetos.map((p, i) => (
              <ScrollReveal key={p.titulo} delay={i * 0.08}>
                <div className="card p-6 h-full flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                      bg-aintar-teal/10 text-aintar-teal`}>
                      <CheckCircle2 size={11} /> Concluído
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1
                      ${municipioColor[p.municipio]}`}>
                      <MapPin size={10} />{p.municipio}
                    </span>
                  </div>

                  <div className="flex-grow">
                    <h3 className="font-heading font-bold text-aintar-navy text-base mb-2">{p.titulo}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{p.descricao}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400 uppercase tracking-wide font-medium mb-0.5">Contrato</div>
                      <div className="text-aintar-navy font-semibold">{p.contrato}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 uppercase tracking-wide font-medium mb-0.5">Inauguração</div>
                      <div className="text-aintar-navy font-semibold">{p.inauguracao}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-400 uppercase tracking-wide font-medium mb-0.5">Financiamento</div>
                      <div className="text-aintar-blue">{p.financiamento}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Discussion publique note */}
          <ScrollReveal delay={0.3} className="mt-10">
            <div className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10">
              <h3 className="font-heading font-bold text-aintar-navy text-base mb-2">Consulta Pública</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Em março de 2023, a AINTAR promoveu a consulta pública do Projeto de Regulamento de Serviço
                de Saneamento de Águas Residuais Urbanas, publicada através do Aviso nº5728/2023 no Diário
                da República, 2.ª série. O regulamento encontra-se disponível em{' '}
                <a href="/clientes/regulamento" className="text-aintar-blue font-medium hover:underline">
                  Regulamento de Serviço
                </a>.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
