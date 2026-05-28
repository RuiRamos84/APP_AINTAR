import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import {
  MinijogoModal,
  MinijogoLimpeza,
  MinijogoLabirinto,
  MinijogoCorreida,
  MinijogoEcoponto,
  MinijogosDiferencas,
  MinijogoViagemAgua,
} from '../components/games/Minijogos'

const JOGADOR = 'Jogador'
const COR     = '#0284c7'

const JOGOS = [
  {
    id: 'residuos',
    emoji: '♻️',
    titulo: 'Separa os Resíduos',
    descricao: 'Clica num resíduo e arrasta-o para o ecoponto correto antes do tempo acabar!',
    cor: '#7c3aed',
  },
  {
    id: 'limpeza',
    emoji: '🚿',
    titulo: 'Limpa as Águas',
    descricao: 'Clica em todo o lixo que está a poluir a água antes do tempo acabar. Cuidado — ele foge!',
    cor: '#0284c7',
  },
  {
    id: 'labirinto',
    emoji: '🌀',
    titulo: 'Labirinto ETAR',
    descricao: 'Navega pelo labirinto e leva o 💩 à estação de tratamento!',
    cor: '#059669',
  },
  {
    id: 'corrida',
    emoji: '🏃',
    titulo: 'Foge até à ETAR',
    descricao: 'Desvia-te do lixo usando as setas ↑↓ e sobrevive o máximo de tempo possível!',
    cor: '#dc2626',
  },
  {
    id: 'ecoponto',
    emoji: '⚡',
    titulo: 'Carrega o Ecoponto',
    descricao: 'Move o ecoponto com as setas ← → e apanha apenas os resíduos corretos!',
    cor: '#ca8a04',
  },
  {
    id: 'diferencas',
    emoji: '🔍',
    titulo: 'Encontra as Diferenças',
    descricao: 'Compara as duas imagens e clica nas 5 diferenças antes do tempo acabar!',
    cor: '#7e22ce',
  },
  {
    id: 'viagem',
    emoji: '🧩',
    titulo: 'Viagem da Água',
    descricao: 'Ordena os passos do ciclo urbano da água pela sequência correta!',
    cor: '#0369a1',
  },
]

export default function MinijogosPage() {
  const [ativo, setAtivo] = useState(null)
  const [resultado, setResultado] = useState(null) // null | 'won' | 'lost'
  const [key, setKey]  = useState(0)

  function abrirJogo(id) {
    setAtivo(id)
    setResultado(null)
    setKey(k => k + 1)
  }

  function fecharJogo() {
    setAtivo(null)
    setResultado(null)
  }

  function onResult(passed) {
    setResultado(passed ? 'won' : 'lost')
    // keep the modal result screen visible; user closes via button below
  }

  // Wrap each mini-game so after it shows its own result we add a "Jogar outra vez / Fechar" overlay
  function ResultOverlay({ passed }) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 40, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
          <button onClick={() => abrirJogo(ativo)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            <RotateCcw size={16} /> Jogar outra vez
          </button>
          <button onClick={fecharJogo}
            style={{ padding: '12px 24px', borderRadius: 14, border: '2px solid #e5e7eb', cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14 }}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Jogos e Desafios"
      subtitle="Testa os teus conhecimentos sobre o ambiente em 7 mini-jogos!"
      breadcrumbs={[
        { label: 'Educação Ambiental', href: '/educacao-ambiental' },
        { label: 'AINTAR Kids', href: '/educacao-ambiental/aintar-kids' },
        { label: 'Jogos e Desafios' },
      ]}
      seoDescription="Mini-jogos educativos AINTAR Kids — separação de resíduos, labirinto, corrida e muito mais!"
    >
      <section className="section-padding bg-slate-50">
        <div className="section-container">

          {/* Grid de jogos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
            {JOGOS.map(jogo => (
              <div key={jogo.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-3">
                <div className="text-4xl">{jogo.emoji}</div>
                <div>
                  <h3 className="font-heading font-bold text-aintar-navy text-base mb-1">{jogo.titulo}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{jogo.descricao}</p>
                </div>
                <button
                  onClick={() => abrirJogo(jogo.id)}
                  className="mt-auto w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: jogo.cor }}
                >
                  Jogar!
                </button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/educacao-ambiental/aintar-kids"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-aintar-teal text-aintar-teal font-semibold text-sm hover:bg-aintar-teal/5 transition-colors">
              <ArrowLeft size={15} />
              Voltar ao AINTAR Kids
            </Link>
          </div>
        </div>
      </section>

      {/* Mini-jogos activos */}
      {ativo === 'residuos'   && <MinijogoModal     key={key} jogador={JOGADOR} cor={COR} onResult={onResult} />}
      {ativo === 'limpeza'    && <MinijogoLimpeza   key={key} jogador={JOGADOR} cor={COR} onResult={onResult} />}
      {ativo === 'labirinto'  && <MinijogoLabirinto key={key} jogador={JOGADOR} cor={COR} onResult={onResult} />}
      {ativo === 'corrida'    && <MinijogoCorreida  key={key} jogador={JOGADOR}           onResult={onResult} />}
      {ativo === 'ecoponto'   && <MinijogoEcoponto  key={key} jogador={JOGADOR}           onResult={onResult} />}
      {ativo === 'diferencas' && <MinijogosDiferencas key={key} jogador={JOGADOR}         onResult={onResult} />}
      {ativo === 'viagem'     && <MinijogoViagemAgua key={key} jogador={JOGADOR} cor={COR} onResult={onResult} />}

      {/* Botões pós-resultado */}
      {resultado !== null && <ResultOverlay passed={resultado === 'won'} />}
    </PageLayout>
  )
}
