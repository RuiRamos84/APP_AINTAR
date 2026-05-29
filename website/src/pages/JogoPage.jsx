import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'

// ─── 3D Die ───────────────────────────────────────────────────────────────────

const SZ = 96
const HALF = SZ / 2

const DOTS = {
  1: [0,0,0, 0,1,0, 0,0,0],
  2: [0,0,1, 0,0,0, 1,0,0],
  3: [0,0,1, 0,1,0, 1,0,0],
  4: [1,0,1, 0,0,0, 1,0,1],
  5: [1,0,1, 0,1,0, 1,0,1],
  6: [1,0,1, 1,0,1, 1,0,1],
}

const FACE_ROT = {
  1: [0,    0],
  2: [0,  -90],
  3: [90,   0],
  4: [-90,  0],
  5: [0,   90],
  6: [0,  180],
}

const FACE_T = [
  `translateZ(${HALF}px)`,
  `rotateY(90deg) translateZ(${HALF}px)`,
  `rotateX(-90deg) translateZ(${HALF}px)`,
  `rotateX(90deg) translateZ(${HALF}px)`,
  `rotateY(-90deg) translateZ(${HALF}px)`,
  `rotateY(180deg) translateZ(${HALF}px)`,
]

const DADO_INIT = { rx: 0, ry: 0, res: null, n: 0 }

function Face({ value, t }) {
  return (
    <div style={{
      position: 'absolute', width: SZ, height: SZ,
      transform: t,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      background: 'linear-gradient(145deg,#ffffff 0%,#f0f4f8 100%)',
      borderRadius: 14, border: '2px solid #cbd5e1', boxSizing: 'border-box',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,.8), inset 0 -2px 4px rgba(0,0,0,.08)',
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
      gridTemplateRows: 'repeat(3,1fr)', padding: 11, gap: 2,
    }}>
      {DOTS[value].map((on, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {on === 1 && (
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #2d5a8a, #1e3a5f)',
              boxShadow: '0 1px 3px rgba(0,0,0,.35)',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Dado3D({ rx, ry }) {
  return (
    <div style={{ perspective: 500, width: SZ, height: SZ }}>
      <div style={{
        width: SZ, height: SZ,
        position: 'relative', transformStyle: 'preserve-3d',
        transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
        transition: 'transform 1.1s cubic-bezier(.23,.68,.35,1)',
      }}>
        {[1,2,3,4,5,6].map((v, i) => <Face key={v} value={v} t={FACE_T[i]} />)}
      </div>
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

const CORES_JOGADOR = ['#0284c7', '#15803d', '#dc2626', '#7c3aed']

const casas = [
  { n: 1,  t: 'CUIDA DO PLANETA, É O ÚNICO QUE TEMOS!',  a: null,             bg: '#7c3aed', fg: '#fff',    dir: '▲' },
  { n: 2,  t: 'TOALHITAS NO LIXO INDIFERENCIADO',        a: 'AVANÇA 2 CASAS', bg: '#16a34a', fg: '#fff',   dir: '▲', labirinto: true },
  { n: 3,  t: 'COTONETES NA SANITA!',                    a: '1X SEM JOGAR (Separar o lixo)',   bg: '#15803d', fg: '#fff',   dir: '▲', minijogo: true },
  { n: 4,  t: 'FRALDAS NO LIXO INDIFERENCIADO',          a: 'JOGA OUTRA VEZ', bg: '#22c55e', fg: '#fff',   dir: '◀', limpeza: true },
  { n: 5,  t: 'PAPEL DAS PASTILHAS NA SANITA',           a: '1X SEM JOGAR (Separar o lixo)',   bg: '#eab308', fg: '#fff',   dir: '◀', minijogo: true },
  { n: 6,  t: 'ÁGUA LIMPA É VIDA — PROTEGE OS RIOS!',    a: null,             bg: '#7c3aed', fg: '#fff',    dir: '◀' },
  { n: 7,  t: 'PENSO RÁPIDO NA SANITA',                  a: '1X SEM JOGAR (Separar o lixo)',   bg: '#dc2626', fg: '#fff',   dir: '◀', minijogo: true },
  { n: 8,  t: 'RESTOS DE SOPA NO ESGOTO',                a: 'RECUA 3 CASAS',  bg: '#1d4ed8', fg: '#fff',   dir: '◀', corrida: true },
  { n: 9,  t: 'SACOS DE PLÁSTICO NO ECOPONTO AMARELO',   a: 'JOGA OUTRA VEZ', bg: '#166534', fg: '#fff',   dir: '▼', limpeza: true },
  { n: 10, t: 'ESFREGÃO DA LOUÇA NO ESGOTO',             a: '1X SEM JOGAR (Separar o lixo)',   bg: '#2563eb', fg: '#fff',   dir: '▼', minijogo: true },
  { n: 11, t: 'ALGODÃO NO LIXO INDIFERENCIADO',          a: 'AVANÇA 2 CASAS', bg: '#0d9488', fg: '#fff',   dir: '▼', labirinto: true },
  { n: 12, t: 'LUVAS DESCARTÁVEIS NO ESGOTO',            a: '1X SEM JOGAR (Separar o lixo)',   bg: '#3b82f6', fg: '#fff',   dir: '▶', minijogo: true },
  { n: 13, t: 'SEPARA O LIXO, SALVA O FUTURO!',          a: null,             bg: '#7c3aed', fg: '#fff',    dir: '▶' },
  { n: 14, t: 'CABELOS NO LIXO INDIFERENCIADO',          a: 'JOGA OUTRA VEZ', bg: '#db2777', fg: '#fff',   dir: '▶', limpeza: true },
  { n: 15, t: 'RESTOS DE COMIDA NO LIXO INDIFERENCIADO', a: 'JOGA OUTRA VEZ', bg: '#ec4899', fg: '#fff',   dir: '▶', limpeza: true },
  { n: 16, t: 'TAMPÕES E PENSOS HIGIÉNICOS NA SANITA',   a: '1X SEM JOGAR (Separar o lixo)',   bg: '#f87171', fg: '#fff',   dir: '▲', minijogo: true },
  { n: 17, t: 'MÁSCARAS NO LIXO INDIFERENCIADO',         a: 'AVANÇA 1 CASA',  bg: '#7c3aed', fg: '#fff',   dir: '▲', viagem: true },
  { n: 18, t: '',                                         a: 'AVANÇA 2 CASAS', bg: '#38bdf8', fg: '#fff',   dir: '◀', labirinto: true },
  { n: 19, t: 'MÁSCARAS NO LIXO INDIFERENCIADO',         a: 'AVANÇA 2 CASAS', bg: '#0ea5e9', fg: '#fff',   dir: '◀', labirinto: true },
  { n: 20, t: 'SERINGAS NO ESGOTO',                      a: 'RECUA 2 CASAS',  bg: '#f59e0b', fg: '#fff',   dir: '◀', catcher: true },
  { n: 21, t: 'PEQUENAS AÇÕES, GRANDES MUDANÇAS!',       a: null,             bg: '#7c3aed', fg: '#fff',    dir: '▼' },
  { n: 22, t: 'DESCOBRE AS ETAPAS DA ETAR!',             a: 'RECUA 6 CASAS',  bg: '#0284c7', fg: '#fff',   dir: '▶', canos: true },
]

// Grid positions [row, col] for each casa number
const GRID_POS = {
  9:[1,1], 8:[1,2], 7:[1,3], 6:[1,4], 5:[1,5], 4:[1,6],
  10:[2,1], 21:[2,2], 20:[2,3], 19:[2,4], 18:[2,5], 3:[2,6],
  11:[3,1], 22:[3,2], 17:[3,5], 2:[3,6],
  12:[4,1], 13:[4,2], 14:[4,3], 15:[4,4], 16:[4,5], 1:[4,6],
}

const ACAO_COR = {
  JOGA:   { bg: '#15803d', fg: '#fff' },
  SEM:    { bg: '#b91c1c', fg: '#fff' },
  AVANÇA: { bg: '#f97316', fg: '#fff' },
  RECUA:  { bg: '#6d28d9', fg: '#fff' },
}

function AcaoBadge({ a }) {
  if (!a) return null
  const key = Object.keys(ACAO_COR).find(k => a.includes(k))
  const { bg, fg } = ACAO_COR[key] || { bg: '#ddd', fg: '#000' }
  return (
    <div style={{ background: bg, color: fg, fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}
      className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden">
      {a}
    </div>
  )
}

// ─── Mini-game ────────────────────────────────────────────────────────────────

const RESIDUOS = [
  { id: 1,  nome: 'Garrafa de plástico', emoji: '🧴', ecoponto: 'amarelo'  },
  { id: 2,  nome: 'Jornal',              emoji: '📰', ecoponto: 'azul'     },
  { id: 3,  nome: 'Garrafa de vidro',    emoji: '🍾', ecoponto: 'verde'    },
  { id: 4,  nome: 'Casca de fruta',      emoji: '🍌', ecoponto: 'cinzento' },
  { id: 5,  nome: 'Lata de alumínio',    emoji: '🥫', ecoponto: 'amarelo'  },
  { id: 6,  nome: 'Caixa de cartão',     emoji: '📦', ecoponto: 'azul'     },
  { id: 7,  nome: 'Frasco de vidro',     emoji: '🫙', ecoponto: 'verde'    },
  { id: 8,  nome: 'Saco de plástico',    emoji: '🛍️', ecoponto: 'amarelo'  },
  { id: 9,  nome: 'Sobras de comida',    emoji: '🍽️', ecoponto: 'cinzento' },
  { id: 10, nome: 'Livro velho',         emoji: '📚', ecoponto: 'azul'     },
  { id: 11, nome: 'Pote de iogurte',     emoji: '🥛', ecoponto: 'amarelo'  },
  { id: 12, nome: 'Pote de vidro',       emoji: '🫙', ecoponto: 'verde'    },
  { id: 13, nome: 'Embalagem de leite', emoji: '🥛', ecoponto: 'amarelo'  },
  { id: 14, nome: 'Copo de plástico',   emoji: '🥤', ecoponto: 'amarelo'  },
  { id: 15, nome: 'Revista',            emoji: '📓', ecoponto: 'azul'     },
  { id: 16, nome: 'Caixa de pizza',     emoji: '🍕', ecoponto: 'azul'     },
  { id: 17, nome: 'Frasco de mel',       emoji: '🍯', ecoponto: 'verde'    },
  { id: 18, nome: 'Resto de jardim',    emoji: '🌿', ecoponto: 'cinzento' },
  { id: 19, nome: 'Lata de tinta',      emoji: '🪣', ecoponto: 'amarelo'  },
  { id: 20, nome: 'Embalagem de ovos',  emoji: '🥚', ecoponto: 'azul'     },
  { id: 21, nome: 'Ampola de vidro',    emoji: '💊', ecoponto: 'verde'    },
  { id: 22, nome: 'Restos de pão',      emoji: '🍞', ecoponto: 'cinzento' },
  { id: 23, nome: 'Envelope de papel',  emoji: '✉️', ecoponto: 'azul'     },
  { id: 24, nome: 'Embalagem de iogurte líquido', emoji: '🧃', ecoponto: 'amarelo' },
  { id: 25, nome: 'Frasco de perfume',  emoji: '🧴', ecoponto: 'verde'    },
  { id: 26, nome: 'Cascas de ovo',      emoji: '🥚', ecoponto: 'cinzento' },
  { id: 27, nome: 'Caixa de cereais',   emoji: '🌾', ecoponto: 'azul'     },
  { id: 28, nome: 'Lata de refrigerante', emoji: '🥫', ecoponto: 'amarelo' },
  { id: 29, nome: 'Garrafa de azeite',  emoji: '🫒', ecoponto: 'verde'    },
  { id: 30, nome: 'Restos de carne',    emoji: '🍖', ecoponto: 'cinzento' },
]

const ECOPONTOS_MJ = [
  { id: 'amarelo',  nome: 'Amarelo',        cor: '#ca8a04', desc: 'Plástico e Metal' },
  { id: 'azul',     nome: 'Azul',           cor: '#2563eb', desc: 'Papel e Cartão'  },
  { id: 'verde',    nome: 'Verde',          cor: '#16a34a', desc: 'Vidro'            },
  { id: 'cinzento', nome: 'Indiferenciado', cor: '#4b5563', desc: 'Restos / Outros'  },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function MinijogoModal({ jogador, cor, onResult }) {
  const [items] = useState(() => shuffle(RESIDUOS).slice(0, 4))
  const [placed, setPlaced] = useState({})   // { itemId → ecopontoId }
  const [results, setResults] = useState({}) // { itemId → bool }
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(10)
  const [done, setDone] = useState(false)

  const allPlaced = Object.keys(placed).length === items.length
  const score = items.filter(item => results[item.id] === true).length
  const passed = score === items.length

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setDone(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (allPlaced && !done) setDone(true)
  }, [allPlaced, done])

  function place(ecopontoId) {
    if (selected === null || done) return
    const item = items.find(i => i.id === selected)
    setPlaced(p => ({ ...p, [selected]: ecopontoId }))
    setResults(r => ({ ...r, [selected]: item.ecoponto === ecopontoId }))
    setSelected(null)
  }

  const timerPct = (timeLeft / 10) * 100
  const timerColor = timeLeft > 5 ? '#22c55e' : timeLeft > 3 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 28,
        width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {!done ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>
                  🎮 Mini-Jogo — {jogador}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f' }}>
                  Separa os Resíduos!
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Clica num resíduo e depois no ecoponto correto.
                </div>
              </div>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: timeLeft > 5 ? '#dcfce7' : '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: timerColor,
              }}>{timeLeft}s</div>
            </div>

            {/* Timer bar */}
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, marginBottom: 20 }}>
              <div style={{
                height: '100%', width: `${timerPct}%`,
                background: timerColor, borderRadius: 99,
                transition: 'width 1s linear, background-color 0.5s',
              }} />
            </div>

            {/* Items */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              {items.map(item => {
                const isPlaced = placed[item.id] !== undefined
                const isSel = selected === item.id
                return (
                  <div
                    key={item.id}
                    draggable={!isPlaced && !done}
                    onDragStart={() => !isPlaced && !done && setSelected(item.id)}
                    onClick={() => {
                      if (isPlaced || done) return
                      setSelected(s => s === item.id ? null : item.id)
                    }}
                    style={{
                      cursor: isPlaced ? 'default' : 'pointer',
                      opacity: isPlaced ? 0.22 : 1,
                      padding: '10px 12px', borderRadius: 14, minWidth: 80, textAlign: 'center',
                      border: isSel ? `2.5px solid ${cor}` : '2px solid #e5e7eb',
                      background: isSel ? `${cor}18` : '#f8fafc',
                      transform: isSel ? 'scale(1.08)' : 'none',
                      transition: 'all 0.15s',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{item.emoji}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginTop: 4, lineHeight: 1.2 }}>
                      {item.nome}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Ecopontos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {ECOPONTOS_MJ.map(eco => {
                const placedHere = items.filter(i => placed[i.id] === eco.id)
                return (
                  <div
                    key={eco.id}
                    onClick={() => place(eco.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); place(eco.id) }}
                    style={{
                      borderRadius: 14, padding: '10px 6px',
                      background: selected !== null ? `${eco.cor}18` : '#f8fafc',
                      border: `2px dashed ${eco.cor}`,
                      cursor: selected !== null ? 'pointer' : 'default',
                      textAlign: 'center', minHeight: 90,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: eco.cor, margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1f2937' }}>{eco.nome}</div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6 }}>{eco.desc}</div>
                    {placedHere.map(item => (
                      <div key={item.id} style={{ fontSize: 17 }}>
                        {item.emoji} {results[item.id] ? '✅' : '❌'}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          /* Result screen */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{passed ? '🎉' : '😢'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {passed ? 'Muito Bem!' : 'Quase!'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
              {score}/{items.length} corretos
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: passed ? '#16a34a' : '#dc2626' }}>
              {passed ? '✔ Podes ficar na casa!' : '✖ Perdes a vez nesta casa.'}
            </p>
            {!passed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, textAlign: 'left', background: '#fef2f2', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Respostas certas:</div>
                {items.filter(i => results[i.id] !== true).map(item => {
                  const eco = ECOPONTOS_MJ.find(e => e.id === item.ecoponto)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                      <span>{item.emoji}</span>
                      <span>{item.nome}</span>
                      <span style={{ color: '#9ca3af' }}>→</span>
                      <span style={{ fontWeight: 700, color: eco.cor }}>{eco.nome}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => onResult(passed)}
              style={{
                padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: passed ? '#16a34a' : '#dc2626',
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}
            >
              {passed ? 'Continuar 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Limpeza mini-game ────────────────────────────────────────────────────────

const LIXO_AGUA = [
  { id: 1,  emoji: '💊' }, { id: 2,  emoji: '🩹' }, { id: 3,  emoji: '🧴' },
  { id: 4,  emoji: '🪥' }, { id: 5,  emoji: '🧻' }, { id: 6,  emoji: '🛍️' },
  { id: 7,  emoji: '🩺' }, { id: 8,  emoji: '🧤' }, { id: 9,  emoji: '🚬' },
  { id: 10, emoji: '🪒' }, { id: 11, emoji: '🩻' }, { id: 12, emoji: '💉' },
]

function MinijogoLimpeza({ jogador, cor, onResult }) {
  const [items, setItems] = useState(() =>
    shuffle([...LIXO_AGUA]).slice(0, 10).map(item => ({
      ...item,
      x: 10 + Math.random() * 70,
      y: 10 + Math.random() * 70,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      removed: false,
    }))
  )
  const [timeLeft, setTimeLeft] = useState(10)
  const [done, setDone] = useState(false)
  const poolRef = useRef(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const itemsRef = useRef(items)
  itemsRef.current = items

  const remaining = items.filter(i => !i.removed).length
  const won = remaining === 0

  // Track mouse/touch over pool (for flee behaviour)
  function onMouseMove(e) {
    const rect = poolRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }
  function onTouchMove(e) {
    const rect = poolRef.current?.getBoundingClientRect()
    if (!rect || !e.touches[0]) return
    mouseRef.current = {
      x: ((e.touches[0].clientX - rect.left) / rect.width) * 100,
      y: ((e.touches[0].clientY - rect.top) / rect.height) * 100,
    }
  }

  // Physics loop: flee + drift
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      setItems(prev => prev.map(item => {
        if (item.removed) return item
        let { x, y, vx, vy } = item

        // Flee from cursor
        const dx = x - mx, dy = y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const FLEE = 16
        if (dist < FLEE && dist > 0.1) {
          const force = ((FLEE - dist) / FLEE) * 0.35
          vx += (dx / dist) * force
          vy += (dy / dist) * force
        }

        // Random jitter
        vx += (Math.random() - 0.5) * 0.06
        vy += (Math.random() - 0.5) * 0.06

        // Clamp speed
        const spd = Math.sqrt(vx * vx + vy * vy)
        const MAX = 0.75
        if (spd > MAX) { vx = (vx / spd) * MAX; vy = (vy / spd) * MAX }

        x += vx; y += vy

        // Bounce off walls
        if (x < 5)  { x = 5;  vx =  Math.abs(vx) }
        if (x > 88) { x = 88; vx = -Math.abs(vx) }
        if (y < 5)  { y = 5;  vy =  Math.abs(vy) }
        if (y > 85) { y = 85; vy = -Math.abs(vy) }

        return { ...item, x, y, vx, vy }
      }))
    }, 50)
    return () => clearInterval(id)
  }, [done])

  // Countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setDone(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (!done && remaining === 0) setDone(true)
  }, [remaining, done])


  function remove(id) {
    if (done) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, removed: true } : i))
  }

  const timerColor = timeLeft > 5 ? '#22c55e' : timeLeft > 3 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>🚿 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Limpa as Águas Residuais!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clica em todo o lixo antes do tempo acabar. Cuidado — ele foge!</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 5 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{remaining} restantes</div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 10) * 100}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {/* Water pool */}
            <div
              ref={poolRef}
              onMouseMove={onMouseMove}
              onTouchMove={onTouchMove}
              style={{
                position: 'relative', width: '100%', height: 270,
                background: 'linear-gradient(180deg,#38bdf8 0%,#0284c7 55%,#0369a1 100%)',
                borderRadius: 16, overflow: 'hidden', cursor: 'crosshair',
                boxShadow: 'inset 0 -6px 20px rgba(0,0,0,0.2)',
                touchAction: 'none',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.05) 28px,rgba(255,255,255,0.05) 29px)' }} />
              {items.map(item => item.removed ? null : (
                <button
                  key={item.id}
                  onClick={() => remove(item.id)}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`, top: `${item.y}%`,
                    transform: 'translate(-50%,-50%)',
                    fontSize: 24, width: 44, height: 44,
                    background: 'rgba(255,255,255,0.25)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    padding: 0,
                  }}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '💧' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Água limpa!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Podes jogar outra vez!' : `✖ Ficaram ${remaining} itens na água.`}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Jogar Outra Vez! 🎲' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Maze mini-game ───────────────────────────────────────────────────────────

const MAZE_START = [1, 1]
const MAZE_END   = [14, 16]
const CELL = 34

const MAZE_CONFIGS = [
  {
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,1],
      [1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,0,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,1],
      [1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,1],
      [1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemyStart: [7, 9],
  },
  {
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1],
      [1,0,1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,1],
      [1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,1],
      [1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,1],
      [1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemyStart: [7, 5],
  },
  {
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
      [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],
      [1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemyStart: [7, 9],
  },
  {
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,1],
      [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,0,1,1,1,0,1,1,1,0,1,0,0,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,1,1],
      [1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemyStart: [7, 7],
  },
  {
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1],
      [1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,1],
      [1,1,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1],
      [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1],
      [1,0,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1],
      [1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemyStart: [7, 5],
  },
  {
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1],
      [1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,1,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,0,1],
      [1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1],
      [1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemyStart: [5, 5],
  },
]

// ─── Catcher constants ───────────────────────────────────────────────────────
const CATCH_W = 420
const CATCH_H = 300
const BIN_W = 72
const BIN_H = 44
const BIN_Y = CATCH_H - BIN_H - 6
const BIN_SPEED = 7
const ITEM_SZ = 38

// ─── Runner constants ─────────────────────────────────────────────────────────
const RUNNER_W = 460
const RUNNER_H = 260
const RUNNER_LANES = 5
const RUNNER_LANE_H = RUNNER_H / RUNNER_LANES
const RUNNER_PLAYER_X = 72
const RUNNER_COLLISION_DIST = 28
const OBSTACULOS_RUNNER = ['💊','🩹','🧴','🪥','🛍️','🧤','🚬','🪒','💉','🧽','🪣','🩺']

const DPAD = {
  width: 54, height: 54, borderRadius: 12, border: 'none',
  background: '#1e3a5f', color: '#fff', fontSize: 22,
  cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700,
}

function MinijogoLabirinto({ jogador, cor, onResult }) {
  const [config]                = useState(() => MAZE_CONFIGS[Math.floor(Math.random() * MAZE_CONFIGS.length)])
  const MAZE                    = config.grid
  const [pos, setPos]           = useState([...MAZE_START])
  const posRef                  = useRef([...MAZE_START])
  const [enemyPos, setEnemyPos] = useState(() => [...config.enemyStart])
  const enemyPosRef             = useRef([...config.enemyStart])
  const [timeLeft, setTimeLeft] = useState(20)
  const [done, setDone]         = useState(false)
  const [won, setWon]           = useState(false)
  const [caught, setCaught]     = useState(false)
  const doneRef                 = useRef(false)
  const boardRef                = useRef(null)

  useEffect(() => { boardRef.current?.focus() }, [])

  function resetAfterCatch() {
    posRef.current = [...MAZE_START]
    enemyPosRef.current = [...config.enemyStart]
    setPos([...MAZE_START])
    setEnemyPos([...config.enemyStart])
    setCaught(false)
  }

  // Timer
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); if (!doneRef.current) { doneRef.current = true; setDone(true) } return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  // Check win
  useEffect(() => {
    if (!done && pos[0] === MAZE_END[0] && pos[1] === MAZE_END[1]) {
      doneRef.current = true
      setWon(true)
      setDone(true)
    }
  }, [pos, done])

  // Enemy AI
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const [er, ec] = enemyPosRef.current
      const [pr, pc] = posRef.current
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
      const passable = dirs.filter(([dr,dc]) => MAZE[er+dr]?.[ec+dc] === 0)
      if (passable.length === 0) return
      let chosen
      if (Math.random() < 0.65) {
        chosen = passable.reduce((best, [dr,dc]) => {
          const d = Math.abs(er+dr-pr) + Math.abs(ec+dc-pc)
          return d < best.d ? { d, move: [dr,dc] } : best
        }, { d: Infinity, move: passable[0] }).move
      } else {
        chosen = passable[Math.floor(Math.random() * passable.length)]
      }
      const nr = er + chosen[0], nc = ec + chosen[1]
      enemyPosRef.current = [nr, nc]
      setEnemyPos([nr, nc])

      if (nr === posRef.current[0] && nc === posRef.current[1]) {
        setCaught(true)
        setTimeout(() => resetAfterCatch(), 900)
      }
    }, 550)
    return () => clearInterval(id)
  }, [done])

  // Keyboard
  useEffect(() => {
    function onKey(e) {
      const map = {
        ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1],
        w: [-1,0], s: [1,0], a: [0,-1], d: [0,1],
      }
      const d = map[e.key]
      if (!d) return
      e.preventDefault()
      if (doneRef.current) return
      const [r, c] = posRef.current
      const nr = r + d[0], nc = c + d[1]
      if (MAZE[nr]?.[nc] !== 0) return
      posRef.current = [nr, nc]
      setPos([nr, nc])
      const [er, ec] = enemyPosRef.current
      if (nr === er && nc === ec && !doneRef.current) {
        setCaught(true)
        setTimeout(() => resetAfterCatch(), 900)
      }
    }
    if (!done) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])

  function tryMove(dr, dc) {
    if (doneRef.current) return
    const [r, c] = posRef.current
    const nr = r + dr, nc = c + dc
    if (MAZE[nr]?.[nc] !== 0) return
    posRef.current = [nr, nc]
    setPos([nr, nc])
    const [er, ec] = enemyPosRef.current
    if (nr === er && nc === ec && !doneRef.current) {
      setCaught(true)
      setTimeout(() => resetAfterCatch(), 900)
    }
  }

  const timerPct = (timeLeft / 20) * 100
  const timerColor = timeLeft > 12 ? '#22c55e' : timeLeft > 6 ? '#f59e0b' : '#ef4444'
  const boardBg = caught ? '#fee2e2' : '#fff'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: boardBg, borderRadius: 24, padding: 24,
        width: '100%', maxWidth: 700,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        transition: 'background 0.3s',
      }}>
        {!done ? (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 2 }}>🌀 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Leva o 💩 à ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Usa as setas do teclado ou os botões abaixo. Foge do 🦠!</div>
              </div>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: timeLeft > 12 ? '#dcfce7' : '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: timerColor,
              }}>{timeLeft}s</div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {caught && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>💀 Apanhado! A reiniciar...</div>
            )}

            <div ref={boardRef} tabIndex={0} style={{ outline: 'none', lineHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAZE[0].length}, ${CELL}px)`, border: '3px solid #1e3a5f', borderRadius: 6, overflow: 'hidden' }}>
                {MAZE.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const isPlayer = pos[0] === r && pos[1] === c
                    const isEnemy  = enemyPos[0] === r && enemyPos[1] === c
                    const isEnd    = MAZE_END[0] === r && MAZE_END[1] === c
                    return (
                      <div key={`${r}-${c}`} style={{
                        width: CELL, height: CELL,
                        background: cell === 1 ? '#1e3a5f' : isEnd ? '#bfdbfe' : '#f0fdf4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: CELL * 0.58,
                        border: cell === 0 ? '0.5px solid #d1fae5' : 'none',
                        boxSizing: 'border-box',
                      }}>
                        {isPlayer ? '💩' : isEnemy ? '🦠' : isEnd ? '🏭' : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button onPointerDown={() => tryMove(-1, 0)} style={DPAD}>↑</button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onPointerDown={() => tryMove(0, -1)} style={DPAD}>←</button>
                <button onPointerDown={() => tryMove(1,  0)} style={DPAD}>↓</button>
                <button onPointerDown={() => tryMove(0,  1)} style={DPAD}>→</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Chegaste à ETAR!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Avanças 2 casas!' : '✖ Ficas na casa atual.'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Avançar 2 Casas! 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Corrida mini-game ────────────────────────────────────────────────────────

function MinijogoCorreida({ jogador, onResult }) {
  const [lane, setLane] = useState(2)
  const laneRef = useRef(2)
  const [obstacles, setObstacles] = useState([])
  const obstaclesRef = useRef([])
  const [timeLeft, setTimeLeft] = useState(30)
  const timeLeftRef = useRef(30)
  const [done, setDone] = useState(false)
  const [crashed, setCrashed] = useState(false)
  const doneRef = useRef(false)
  const obsIdRef = useRef(0)

  function changeLane(dir) {
    if (doneRef.current) return
    const nl = Math.max(0, Math.min(RUNNER_LANES - 1, laneRef.current + dir))
    laneRef.current = nl
    setLane(nl)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowUp')   { e.preventDefault(); changeLane(-1) }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeLane(1) }
    }
    if (!done) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])

  // Game loop: move obstacles + collision
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const spd = Math.min(7 + (30 - timeLeftRef.current) * 0.55, 18)
      const updated = obstaclesRef.current
        .map(o => ({ ...o, x: o.x - spd }))
        .filter(o => o.x > -60)
      obstaclesRef.current = updated
      setObstacles([...updated])

      const hit = updated.some(o =>
        o.lane === laneRef.current && Math.abs(o.x - RUNNER_PLAYER_X) < RUNNER_COLLISION_DIST
      )
      if (hit && !doneRef.current) {
        doneRef.current = true
        setCrashed(true)
        setDone(true)
      }
    }, 50)
    return () => clearInterval(id)
  }, [done])

  // Spawn obstacles
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const lane1 = Math.floor(Math.random() * RUNNER_LANES)
      const newObs = [{
        id: obsIdRef.current++,
        lane: lane1,
        x: RUNNER_W + 30,
        emoji: OBSTACULOS_RUNNER[Math.floor(Math.random() * OBSTACULOS_RUNNER.length)],
      }]
      // 40% chance de spawn duplo em faixa diferente
      if (Math.random() < 0.40) {
        let lane2 = Math.floor(Math.random() * RUNNER_LANES)
        if (lane2 === lane1) lane2 = (lane2 + 1) % RUNNER_LANES
        newObs.push({
          id: obsIdRef.current++,
          lane: lane2,
          x: RUNNER_W + 30,
          emoji: OBSTACULOS_RUNNER[Math.floor(Math.random() * OBSTACULOS_RUNNER.length)],
        })
      }
      obstaclesRef.current = [...obstaclesRef.current, ...newObs]
      setObstacles([...obstaclesRef.current])
    }, 620)
    return () => clearInterval(id)
  }, [done])

  // Timer
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1)
      setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current === 0) {
        doneRef.current = true
        setDone(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  const won = done && !crashed
  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 7 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 510, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {!done ? (
          <>
            {/* Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>🏃 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Foge até à ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Usa ↑↓ para desviar do lixo. Sobrevive 30 segundos!</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 15 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            {/* Timer bar */}
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 30) * 100}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {/* Game area */}
            <div style={{
              position: 'relative',
              width: RUNNER_W, maxWidth: '100%', height: RUNNER_H,
              background: 'linear-gradient(180deg,#1e3a8a 0%,#1d4ed8 50%,#1e40af 100%)',
              borderRadius: 16, overflow: 'hidden',
              border: '3px solid #1e3a8a',
              boxShadow: 'inset 0 -4px 20px rgba(0,0,0,0.35)',
            }}>
              {/* Lane dividers */}
              {[1,2,3,4].map(i => (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * RUNNER_LANE_H, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              ))}
              {/* Water ripple lines */}
              {[0,1,2,3,4].map(i => (
                <div key={`r${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * RUNNER_LANE_H + RUNNER_LANE_H / 2, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              ))}

              {/* Finish line / ETAR */}
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, background: 'rgba(0,0,0,0.18)', borderLeft: '2px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>🏭</span>
              </div>

              {/* Player zone separator */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: RUNNER_PLAYER_X - 18, background: 'rgba(255,255,255,0.04)', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />

              {/* Player (cocozito) */}
              <div style={{
                position: 'absolute',
                left: RUNNER_PLAYER_X,
                top: lane * RUNNER_LANE_H + RUNNER_LANE_H / 2,
                transform: 'translate(-50%, -50%)',
                fontSize: 26,
                transition: 'top 0.08s ease',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
                zIndex: 2,
                lineHeight: 1,
              }}>💩</div>

              {/* Obstacles */}
              {obstacles.map(o => (
                <div key={o.id} style={{
                  position: 'absolute',
                  left: o.x,
                  top: o.lane * RUNNER_LANE_H + RUNNER_LANE_H / 2,
                  transform: 'translate(-50%, -50%)',
                  fontSize: 22,
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
                  lineHeight: 1,
                }}>{o.emoji}</div>
              ))}
            </div>

            {/* D-pad */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button onPointerDown={() => changeLane(-1)} style={DPAD}>↑</button>
              <button onPointerDown={() => changeLane(1)}  style={DPAD}>↓</button>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Teclado: ↑ ↓ &nbsp;|&nbsp; Velocidade aumenta com o tempo!</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💥'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Chegaste à ETAR!' : 'Bateste num obstáculo!'}
            </h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Ficas na casa atual.' : '✖ Recuas 3 casas!'}
            </p>
            <button
              onClick={() => onResult(won)}
              style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}
            >
              {won ? 'Continuar 🎉' : 'Recuar 3 Casas 😢'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Catcher mini-game ───────────────────────────────────────────────────────

function MinijogoEcoponto({ jogador, onResult }) {
  const [ecoTarget] = useState(() => ECOPONTOS_MJ[Math.floor(Math.random() * ECOPONTOS_MJ.length)])
  const [binX, setBinX] = useState(CATCH_W / 2 - BIN_W / 2)
  const binXRef = useRef(CATCH_W / 2 - BIN_W / 2)
  const [items, setItems] = useState([])
  const itemsRef = useRef([])
  const [lives, setLives] = useState(1)
  const livesRef = useRef(1)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [flash, setFlash] = useState(null)
  const [timeLeft, setTimeLeft] = useState(20)
  const timeLeftRef = useRef(20)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const itemIdRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })
  const ecoId = ecoTarget.id

  // Keyboard tracking
  useEffect(() => {
    function dn(e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); keysRef.current.left  = true }
      if (e.key === 'ArrowRight') { e.preventDefault(); keysRef.current.right = true }
    }
    function up(e) {
      if (e.key === 'ArrowLeft')  keysRef.current.left  = false
      if (e.key === 'ArrowRight') keysRef.current.right = false
    }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Bin movement loop (16ms for smoothness)
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const { left, right } = keysRef.current
      if (!left && !right) return
      const newX = Math.max(0, Math.min(CATCH_W - BIN_W, binXRef.current + (left ? -BIN_SPEED : BIN_SPEED)))
      binXRef.current = newX
      setBinX(newX)
    }, 16)
    return () => clearInterval(id)
  }, [done])

  // Game loop: fall + collision (40ms)
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const spd = Math.min(3.5 + (20 - timeLeftRef.current) * 0.40, 11)
      const bx = binXRef.current
      const newItems = []
      let livesLost = 0
      let gained = 0
      let flashType = null

      for (const item of itemsRef.current) {
        const ny = item.y + spd
        const itemBottom = ny + ITEM_SZ / 2
        const itemLeft   = item.x - ITEM_SZ / 2
        const itemRight  = item.x + ITEM_SZ / 2

        // Caught by bin
        if (itemBottom >= BIN_Y && itemBottom <= BIN_Y + BIN_H && itemRight >= bx && itemLeft <= bx + BIN_W) {
          if (item.ecoponto === ecoId) { gained++;    flashType = 'good' }
          else                         { livesLost++; flashType = 'bad'  }
          continue
        }
        if (ny > CATCH_H + ITEM_SZ) {
          if (item.ecoponto === ecoId) { livesLost++; flashType = 'bad' }
          continue
        }
        newItems.push({ ...item, y: ny })
      }

      itemsRef.current = newItems
      setItems([...newItems])

      if (gained > 0) {
        scoreRef.current += gained
        setScore(scoreRef.current)
      }
      if (livesLost > 0) {
        const nl = Math.max(0, livesRef.current - livesLost)
        livesRef.current = nl
        setLives(nl)
        if (nl === 0 && !doneRef.current) { doneRef.current = true; setDone(true) }
      }
      if (flashType) { setFlash(flashType); setTimeout(() => setFlash(null), 280) }
    }, 40)
    return () => clearInterval(id)
  }, [done, ecoId])

  // Spawn items
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const r = RESIDUOS[Math.floor(Math.random() * RESIDUOS.length)]
      const eco = ECOPONTOS_MJ.find(e => e.id === r.ecoponto)
      const newItem = {
        id: itemIdRef.current++,
        x: ITEM_SZ / 2 + Math.random() * (CATCH_W - ITEM_SZ),
        y: -ITEM_SZ / 2,
        emoji: r.emoji,
        ecoponto: r.ecoponto,
        color: eco.cor,
      }
      itemsRef.current = [...itemsRef.current, newItem]
      setItems([...itemsRef.current])
    }, 800)
    return () => clearInterval(id)
  }, [done])

  // Timer
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1)
      setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current === 0) { doneRef.current = true; setDone(true) }
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  const won = done && livesRef.current > 0
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444'
  const areaBg = flash === 'good'
    ? 'linear-gradient(180deg,#dcfce7,#f0fdf4)'
    : flash === 'bad'
    ? 'linear-gradient(180deg,#fee2e2,#fef2f2)'
    : 'linear-gradient(180deg,#f0f9ff 0%,#e0f2fe 100%)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {!done ? (
          <>
            {/* Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ecoTarget.cor, marginBottom: 2 }}>⚡ Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Carrega o Ecoponto!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Apanha só os resíduos do ecoponto <span style={{ fontWeight: 800, color: ecoTarget.cor }}>{ecoTarget.nome}</span> ({ecoTarget.desc})!
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 10 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <span style={{ fontSize: 18 }}>{lives > 0 ? '❤️' : '🖤'}</span>
                </div>
              </div>
            </div>

            {/* Timer bar */}
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 20) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            {/* Score + target indicator */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${ecoTarget.cor}15`, borderRadius: 10, padding: '4px 12px', border: `2px solid ${ecoTarget.cor}` }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ecoTarget.cor }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: ecoTarget.cor }}>{ecoTarget.nome} — {ecoTarget.desc}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>⭐ {score}</div>
            </div>

            {/* Game area */}
            <div style={{
              position: 'relative', width: CATCH_W, maxWidth: '100%', height: CATCH_H,
              background: areaBg, borderRadius: 16, overflow: 'hidden',
              border: '3px solid #bae6fd', transition: 'background 0.15s',
            }}>
              {/* Falling items */}
              {items.map(item => (
                <div key={item.id} style={{
                  position: 'absolute', left: item.x, top: item.y,
                  transform: 'translate(-50%,-50%)',
                  width: ITEM_SZ + 10, height: ITEM_SZ + 10, borderRadius: '50%',
                  background: `${item.color}22`, border: `2.5px solid ${item.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: ITEM_SZ * 0.62, lineHeight: 1,
                }}>{item.emoji}</div>
              ))}

              {/* Bin */}
              <div style={{
                position: 'absolute', left: binX, top: BIN_Y,
                width: BIN_W, height: BIN_H,
                background: ecoTarget.cor,
                borderRadius: '10px 10px 4px 4px',
                border: '3px solid rgba(0,0,0,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
                boxShadow: `0 4px 14px ${ecoTarget.cor}66`,
              }}>♻️</div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <button
                onPointerDown={() => { keysRef.current.left = true }}
                onPointerUp={() => { keysRef.current.left = false }}
                onPointerLeave={() => { keysRef.current.left = false }}
                style={{ ...DPAD, width: 66, height: 66, fontSize: 28 }}
              >←</button>
              <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Teclado: ← →</span>
              <button
                onPointerDown={() => { keysRef.current.right = true }}
                onPointerUp={() => { keysRef.current.right = false }}
                onPointerLeave={() => { keysRef.current.right = false }}
                style={{ ...DPAD, width: 66, height: 66, fontSize: 28 }}
              >→</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💔'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Ecoponto carregado!' : 'Ficaste sem vidas!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Pontuação: ⭐ {scoreRef.current}</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Ficas na casa atual.' : '✖ Recuas 2 casas!'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Recuar 2 Casas 😢'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Encontrar Diferenças mini-game ──────────────────────────────────────────

const DIFERENCAS_SCENES = [
  {
    title: 'O Rio',
    left: [
      ['🏠','🌊','🐟','🌿','🌳'],
      ['🚿','💧','🐠','🦋','☀️'],
      ['🧴','🗑️','♻️','🌾','🏡'],
      ['💊','🚰','🌻','🐸','🌍'],
    ],
    right: [
      ['🏚️','🌊','🐟','🌿','🌳'],
      ['🚿','💧','🐡','🦋','☀️'],
      ['🧴','🚮','♻️','🌾','🏡'],
      ['💉','🚰','🌻','🐸','🗺️'],
    ],
    diffs: [[0,0],[1,2],[2,1],[3,0],[3,4]],
  },
  {
    title: 'A ETAR',
    left: [
      ['🏭','🌊','🚰','💧','🐟'],
      ['🔧','🪣','⚗️','🧪','🌿'],
      ['👷','🦺','🔬','📊','🌳'],
      ['🌱','🐠','💦','🌾','🦋'],
    ],
    right: [
      ['🏭','🌊','🚿','💧','🐟'],
      ['🔧','🧹','⚗️','🧪','🌿'],
      ['👷','🦺','🔭','📊','🌲'],
      ['🌱','🐟','💦','🌾','🦋'],
    ],
    diffs: [[0,2],[1,1],[2,2],[2,4],[3,1]],
  },
  {
    title: 'A Praia',
    left: [
      ['🏖️','🌊','🐚','🦀','🌴'],
      ['☀️','🐠','🦈','💧','🌿'],
      ['🚿','🧴','🪣','🌊','🐟'],
      ['🌊','🦋','🌻','🏄','💦'],
    ],
    right: [
      ['🏖️','🌊','🐚','🦞','🌴'],
      ['☀️','🐡','🦈','💧','🌿'],
      ['🚿','🧹','🪣','🌊','🐙'],
      ['🌊','🦋','🌸','🏄','💦'],
    ],
    diffs: [[0,3],[1,1],[2,1],[2,4],[3,2]],
  },
]

function MinijogosDiferencas({ jogador, recuaCasas, onResult }) {
  const [scene] = useState(() => DIFERENCAS_SCENES[Math.floor(Math.random() * DIFERENCAS_SCENES.length)])
  const [found, setFound] = useState(() => new Set())
  const [wrongFlash, setWrongFlash] = useState(() => new Set())
  const [timeLeft, setTimeLeft] = useState(40)
  const [done, setDone] = useState(false)
  const [won, setWon] = useState(false)
  const totalDiffs = scene.diffs.length

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setDone(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (!done && found.size === totalDiffs) { setWon(true); setDone(true) }
  }, [found, done, totalDiffs])

  function handleCellClick(r, c) {
    if (done) return
    const key = `${r},${c}`
    if (found.has(key)) return
    const isDiff = scene.diffs.some(([dr, dc]) => dr === r && dc === c)
    if (isDiff) {
      setFound(prev => new Set([...prev, key]))
    } else {
      setWrongFlash(prev => new Set([...prev, key]))
      setTimeout(() => setWrongFlash(prev => { const n = new Set(prev); n.delete(key); return n }), 600)
    }
  }

  const timerPct = (timeLeft / 40) * 100
  const timerColor = timeLeft > 20 ? '#22c55e' : timeLeft > 10 ? '#f59e0b' : '#ef4444'
  const CELL_SZ = 52

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', marginBottom: 2 }}>🔍 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Encontra as Diferenças!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Clica nas {totalDiffs} diferenças na imagem da direita. {found.size}/{totalDiffs} encontradas.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 20 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{found.size}/{totalDiffs}</div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>{scene.title}</div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Left — original */}
              <div>
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Original</div>
                <div style={{ border: '2px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', display: 'inline-block' }}>
                  {scene.left.map((row, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      {row.map((emoji, c) => (
                        <div key={c} style={{
                          width: CELL_SZ, height: CELL_SZ,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 26,
                          background: (r + c) % 2 === 0 ? '#f8fafc' : '#f1f5f9',
                          borderRight: c < row.length - 1 ? '1px solid #e5e7eb' : 'none',
                          borderBottom: r < scene.left.length - 1 ? '1px solid #e5e7eb' : 'none',
                        }}>{emoji}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — modified, clickable */}
              <div>
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Encontra as diferenças 👆</div>
                <div style={{ border: '2px solid #7e22ce', borderRadius: 10, overflow: 'hidden', display: 'inline-block' }}>
                  {scene.right.map((row, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      {row.map((emoji, c) => {
                        const key = `${r},${c}`
                        const isFound = found.has(key)
                        const isWrong = wrongFlash.has(key)
                        return (
                          <div
                            key={c}
                            onClick={() => handleCellClick(r, c)}
                            style={{
                              width: CELL_SZ, height: CELL_SZ,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 26, position: 'relative',
                              background: isFound ? '#bbf7d0' : isWrong ? '#fecaca' : (r + c) % 2 === 0 ? '#f8fafc' : '#f1f5f9',
                              borderRight: c < row.length - 1 ? '1px solid #e5e7eb' : 'none',
                              borderBottom: r < scene.right.length - 1 ? '1px solid #e5e7eb' : 'none',
                              cursor: isFound ? 'default' : 'pointer',
                              transition: 'background 0.2s',
                              userSelect: 'none',
                            }}
                          >
                            {emoji}
                            {isFound && (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.35)', fontSize: 18, fontWeight: 900, color: '#15803d' }}>✓</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Encontraste tudo!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              {found.size}/{totalDiffs} diferenças encontradas
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Não recuas casas!' : `✖ Recuas ${recuaCasas} casa${recuaCasas !== 1 ? 's' : ''}!`}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : `Recuar ${recuaCasas} Casa${recuaCasas !== 1 ? 's' : ''} 😢`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Viagem da Água mini-game ─────────────────────────────────────────────────

const CICLO_AGUA = [
  { id: 1, label: 'Captação',     emoji: '🏔️',  desc: 'A água é captada do rio ou albufeira' },
  { id: 2, label: 'Tratamento',   emoji: '🏭',  desc: 'A água é tratada na ETA para ser potável' },
  { id: 3, label: 'Distribuição', emoji: '🚰',  desc: 'A água limpa chega a casa por canos' },
  { id: 4, label: 'Uso',          emoji: '🚿',  desc: 'Usamos a água em casa' },
  { id: 5, label: 'Esgoto',       emoji: '🕳️',  desc: 'As águas usadas vão para o esgoto' },
  { id: 6, label: 'ETAR',         emoji: '⚙️',  desc: 'A ETAR trata as águas residuais' },
  { id: 7, label: 'Rio',          emoji: '🌊',  desc: 'A água tratada regressa ao rio' },
]

function MinijogoViagemAgua({ jogador, cor, onResult }) {
  const [order, setOrder] = useState(() => shuffle(CICLO_AGUA.slice(1)))
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [done, setDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setDone(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  function handleDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, idx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
    if (dragIdx === null || dragIdx === idx) return
    setOrder(prev => {
      const arr = [...prev]
      const dragged = arr.splice(dragIdx, 1)[0]
      arr.splice(idx, 0, dragged)
      return arr
    })
    setDragIdx(idx)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragIdx(null)
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  function handleSubmit() {
    if (done) return
    setSubmitted(true)
    setDone(true)
  }

  const first = CICLO_AGUA[0]
  const isCorrect = submitted && order.every((item, idx) => item.id === CICLO_AGUA[idx + 1].id)
  const timerPct = (timeLeft / 60) * 100
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444'
  const won = isCorrect

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🧩 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Ordena a Viagem da Água!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>A 1ª etapa já está revelada. Arrasta as restantes pela ordem correta.</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 30 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {/* Step 1 — fixed, given to the player */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              background: '#f0fdf4', border: '2px solid #16a34a',
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', minWidth: 18 }}>1.</span>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{first.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{first.label}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{first.desc}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 99 }}>1ª etapa</span>
            </div>

            {/* Steps 2–7 — draggable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {order.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: dragOverIdx === idx ? `${cor}14` : '#f8fafc',
                    border: dragOverIdx === idx ? `2px solid ${cor}` : '2px solid #e5e7eb',
                    cursor: 'grab', userSelect: 'none',
                    transition: 'border-color 0.12s, background 0.12s',
                    opacity: dragIdx === idx ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', minWidth: 18 }}>{idx + 2}.</span>
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 16, color: '#d1d5db', userSelect: 'none' }}>⠿</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              style={{ padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', background: cor, color: '#fff', fontWeight: 700, fontSize: 14 }}
            >
              ✅ Confirmar Ordem
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{!submitted ? '⏰' : won ? '🎉' : '❌'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {!submitted ? 'Tempo esgotado!' : won ? 'Ordem correta!' : 'Ordem errada!'}
            </h3>
            {(!won) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, textAlign: 'left', background: '#f0f9ff', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>Ordem correta:</div>
                {CICLO_AGUA.map((item, idx) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', minWidth: 16 }}>{idx + 1}.</span>
                    <span>{item.emoji}</span>
                    <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{item.label}</span>
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>— {item.desc}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Avanças 1 casa!' : '✖ Ficas na casa atual.'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Avançar 1 Casa! 🎉' : 'Continuar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mini-jogo: Canos da ETAR ─────────────────────────────────────────────────

const CANOS_CELL = 48
const CANOS_ROWS = 5
const CANOS_COLS = 8

const CANOS_GRID = [
  [['E'],['W','E'],['W','E'],['W','S'],['S','E'],['N','S'],['N','E'],['W','S']],
  [['N','E'],['W','S'],['N','E'],['N','S'],['N','W'],['E','W'],['N','W'],['N','S']],
  [['N','S'],['N','E'],['W','S'],['N','E'],['W','E'],['W','S'],['N','E'],['N','W']],
  [['N','S'],['N','S'],['N','E'],['W','S'],['E','W'],['N','S'],['N','W'],['N','S']],
  [['N','E'],['W','E'],['W','E'],['W','E'],['W','E'],['N','E'],['W','E'],['W']],
]

const CANOS_PATH = [
  [0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[2,4],[2,5],[3,5],[4,5],[4,6],[4,7],
]

// Stages in correct order — drag to reorder
const ETAR_STAGES = [
  { id: 0, label: 'Entrada',     icon: '🚰', desc: 'Chegada das águas residuais' },
  { id: 1, label: 'Gradagem',    icon: '🔩', desc: 'Remove sólidos grosseiros' },
  { id: 2, label: 'Desarenação', icon: '⚙️', desc: 'Remove areia' },
  { id: 3, label: 'Decantação',  icon: '🧪', desc: 'Separa sólidos em suspensão' },
  { id: 4, label: 'Trat. Bio.',  icon: '🦠', desc: 'Bactérias tratam matéria orgânica' },
  { id: 5, label: 'Rio',         icon: '🌊', desc: 'Água devolvida ao rio' },
]

// Each milestone maps a stage (by id) to the pipe path index it fills up to
const CANOS_MILESTONES = [
  { stageId: 0, pathIdx: 0,  color: '#0369a1' },
  { stageId: 1, pathIdx: 3,  color: '#7c3aed' },
  { stageId: 2, pathIdx: 5,  color: '#b45309' },
  { stageId: 3, pathIdx: 7,  color: '#0369a1' },
  { stageId: 4, pathIdx: 8,  color: '#059669' },
  { stageId: 5, pathIdx: 11, color: '#0284c7' },
]

function MinijogoCanosEtar({ jogador, cor, onResult }) {
  const TIME_LIMIT = 20
  const [order, setOrder] = useState(() => shuffle(ETAR_STAGES))
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const dragFromRef = useRef(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [done, setDone] = useState(false)
  const [won, setWon] = useState(false)
  const timerRef = useRef(null)

  // Water fills up to the last consecutively correct stage
  let waterIdx = 0
  for (let i = 0; i < CANOS_MILESTONES.length; i++) {
    if (order[i]?.id === CANOS_MILESTONES[i].stageId) {
      waterIdx = CANOS_MILESTONES[i].pathIdx
    } else {
      break
    }
  }
  const isWon = waterIdx === CANOS_PATH.length - 1

  useEffect(() => {
    if (isWon && !done) {
      clearInterval(timerRef.current)
      setTimeout(() => { setDone(true); setWon(true) }, 500)
    }
  }, [isWon]) // eslint-disable-line

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setDone(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  function handleDragStart(e, idx) {
    dragFromRef.current = idx
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, idx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
    if (dragFromRef.current === null || dragFromRef.current === idx) return
    const from = dragFromRef.current
    dragFromRef.current = idx
    setDragIdx(idx)
    setOrder(prev => {
      const arr = [...prev]
      const [dragged] = arr.splice(from, 1)
      arr.splice(idx, 0, dragged)
      return arr
    })
  }

  function handleDrop(e) { e.preventDefault(); dragFromRef.current = null; setDragIdx(null); setDragOverIdx(null) }
  function handleDragEnd() { dragFromRef.current = null; setDragIdx(null); setDragOverIdx(null) }

  function hasWater(r, c) {
    for (let i = 0; i <= waterIdx; i++) {
      if (CANOS_PATH[i][0] === r && CANOS_PATH[i][1] === c) return true
    }
    return false
  }

  const timerPct = (timeLeft / TIME_LIMIT) * 100
  const timerColor = timeLeft > 30 ? '#0284c7' : timeLeft > 10 ? '#f59e0b' : '#dc2626'
  const S = CANOS_CELL
  const cx = S / 2, cy = S / 2
  const pw = 10

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '20px 24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        maxWidth: '95vw', maxHeight: '95vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>💧 Mini-Jogo — <span style={{ color: cor }}>{jogador}</span></div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a5f' }}>Liga os Canos da ETAR!</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
              Ordena as etapas pela sequência correta. A água avança à medida que acertares!
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, color: timerColor, flexShrink: 0 }}>{timeLeft}s</div>
        </div>

        {/* Timer bar */}
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, marginBottom: 12 }}>
          <div style={{
            height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 3,
            transition: 'width 1s linear, background 0.5s',
          }} />
        </div>

        {/* Pipe grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CANOS_COLS}, ${S}px)`, gap: 3, marginBottom: 14 }}>
          {Array.from({ length: CANOS_ROWS }, (_, r) =>
            Array.from({ length: CANOS_COLS }, (_, c) => {
              const openings = CANOS_GRID[r]?.[c] ?? []
              const water = hasWater(r, c)
              const pipeColor = water ? '#0284c7' : '#94a3b8'
              const bgColor = water ? '#dbeafe' : '#f1f5f9'
              const borderColor = water ? '#93c5fd' : '#e2e8f0'
              return (
                <svg key={`${r},${c}`} width={S} height={S}
                  style={{ display: 'block', borderRadius: 5, border: `2px solid ${borderColor}`, transition: 'all 0.35s' }}
                >
                  <rect width={S} height={S} fill={bgColor} />
                  {openings.includes('N') && <rect x={cx-pw/2} y={0} width={pw} height={cy+pw/2} fill={pipeColor} rx={2} />}
                  {openings.includes('S') && <rect x={cx-pw/2} y={cy-pw/2} width={pw} height={cy+pw/2} fill={pipeColor} rx={2} />}
                  {openings.includes('E') && <rect x={cx-pw/2} y={cy-pw/2} width={cx+pw/2} height={pw} fill={pipeColor} rx={2} />}
                  {openings.includes('W') && <rect x={0} y={cy-pw/2} width={cx+pw/2} height={pw} fill={pipeColor} rx={2} />}
                  {openings.length > 0 && <circle cx={cx} cy={cy} r={pw/2+2} fill={pipeColor} />}
                </svg>
              )
            })
          )}
        </div>

        {/* Ordering cards */}
        {!done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {order.map((stage, idx) => {
              // Green only if this slot AND all previous are correct
              let green = true
              for (let i = 0; i <= idx; i++) {
                if (order[i]?.id !== CANOS_MILESTONES[i].stageId) { green = false; break }
              }
              return (
                <div
                  key={stage.id}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10,
                    background: green ? '#f0fdf4' : dragOverIdx === idx ? `${cor}14` : '#f8fafc',
                    border: `2px solid ${green ? '#86efac' : dragOverIdx === idx ? cor : '#e5e7eb'}`,
                    cursor: 'grab', userSelect: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                    opacity: dragIdx === idx ? 0.45 : 1,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', minWidth: 16 }}>{idx + 1}.</span>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{stage.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', flex: 1 }}>{stage.label}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{stage.desc}</span>
                  {green && <span style={{ fontSize: 13 }}>✅</span>}
                  <span style={{ fontSize: 14, color: '#d1d5db' }}>⠿</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Result */}
        {done && (
          <div style={{
            textAlign: 'center', padding: '18px 16px',
            background: won ? '#f0fdf4' : '#fef2f2',
            borderRadius: 12, border: `1px solid ${won ? '#86efac' : '#fca5a5'}`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>{won ? '🎉' : '⏱️'}</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: won ? '#166534' : '#991b1b', marginBottom: 12 }}>
              {won ? 'Parabéns! Continuas na casa 22.' : 'Tempo esgotado! Recuas 6 casas.'}
            </div>
            {!won && (
              <div style={{ marginBottom: 14, textAlign: 'left', background: '#f0f9ff', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 6 }}>Ordem correta:</div>
                {ETAR_STAGES.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 16, fontWeight: 700 }}>{i + 1}.</span>
                    <span>{s.icon}</span>
                    <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{s.label}</span>
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>— {s.desc}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onResult(won)}
              style={{
                padding: '10px 28px', borderRadius: 10, border: 'none',
                background: won ? '#16a34a' : '#dc2626', color: '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Poop piece with colour dot
function Peca({ playerIdx, moving }) {
  return (
    <div
      key={playerIdx}
      className={`flex flex-col items-center ${moving ? 'animate-bounce' : ''}`}
      style={{ animationDuration: '0.4s' }}
    >
      <span style={{ fontSize: 'clamp(14px, 1.8vw, 22px)' }} className="leading-none drop-shadow-sm">💩</span>
      <div className="rounded-full mt-0.5 border border-white/60"
        style={{ width: 'clamp(7px, 0.9vw, 11px)', height: 'clamp(7px, 0.9vw, 11px)', background: CORES_JOGADOR[playerIdx] }} />
    </div>
  )
}

function Tabuleiro({ posicoes, jogadores, turnoMovendo }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 'clamp(4px, 0.5vw, 10px)', width: '100%',
      }}>

        {/* Casas 1–22 */}
        {casas.map(c => {
          const aqui = posicoes.map((p, i) => i).filter(i => posicoes[i] === c.n)
          return (
            <div key={c.n}
              style={{ gridRow: GRID_POS[c.n][0], gridColumn: GRID_POS[c.n][1], background: c.bg, color: c.fg, minHeight: 'clamp(100px, 16vh, 175px)' }}
              className="relative rounded-xl p-2.5 flex flex-col items-center text-center border-2 border-white/30 shadow"
            >
              <div className="flex justify-between w-full mb-1">
                <span style={{ fontSize: 'clamp(8px, 0.9vw, 12px)' }} className="font-black">{c.n}</span>
                <span style={{ fontSize: 'clamp(10px, 1.1vw, 16px)' }} className="leading-none opacity-80">{c.minijogo ? '🎮' : c.dir}</span>
              </div>
              <div style={{ fontSize: 'clamp(7px, 0.75vw, 10px)' }} className="font-bold leading-tight flex-1 flex items-center justify-center px-1">
                {c.t}
              </div>
              {c.labirinto
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#065f46', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>🌀 AVANÇA 2 (LABIRINTO)</div>
                : c.limpeza
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#0369a1', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>🚿 JOGA OUTRA VEZ (LIMPEZA)</div>
                : c.corrida
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#991b1b', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>🏃 RECUA 3 (CORRIDA)</div>
                : c.catcher
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#b45309', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>⚡ RECUA 2 (ECOPONTO)</div>
                : c.diferencas
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#7e22ce', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>🔍 DIFERENÇAS (RECUA {c.diferencas})</div>
                : c.viagem
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#7c3aed', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>🧩 AVANÇA 1 (VIAGEM DA ÁGUA)</div>
                : c.canos
                ? <div className="rounded-full px-1.5 py-0.5 font-bold text-center leading-tight mt-1.5 overflow-hidden" style={{ background: '#0284c7', color: '#fff', fontSize: 'clamp(6px, 0.65vw, 8px)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>💧 RECUA 6 (CANOS ETAR)</div>
                : <AcaoBadge a={c.a} />
              }
              {aqui.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap justify-center">
                  {aqui.map(i => <Peca key={i} playerIdx={i} moving={i === turnoMovendo} />)}
                </div>
              )}
            </div>
          )
        })}

        {/* Casa 23 — AINTAR centre */}
        <div style={{
          gridRow: 3, gridColumn: '3 / 5',
          background: '#1d4ed8',
          color: '#fff',
          minHeight: 'clamp(100px, 16vh, 175px)',
        }}
          className="relative rounded-xl p-4 flex flex-col items-center justify-center text-center border-2 border-white/30 shadow"
        >
          <span style={{ fontSize: 'clamp(8px, 0.9vw, 12px)', color: '#fff' }} className="absolute top-2 left-3 font-black opacity-50">23</span>
          <div style={{ fontSize: 'clamp(16px, 2vw, 28px)', color: '#fff' }} className="font-black tracking-widest">AINTAR</div>
          <div style={{ fontSize: 'clamp(8px, 0.85vw, 11px)', color: '#fff' }} className="font-medium opacity-75 italic">Juntos pelo Ambiente</div>
          <div style={{ fontSize: 'clamp(14px, 1.8vw, 24px)' }} className="mt-0.5">🏆</div>
          {posicoes.map((p, i) => p === 23 && (
            <Peca key={i} playerIdx={i} moving={i === turnoMovendo} />
          ))}
        </div>

      </div>
    </div>
  )
}

// ─── Player registration ──────────────────────────────────────────────────────

function RegistoJogadores({ onStart }) {
  const [nomes, setNomes] = useState(['', ''])

  function atualizar(i, v) {
    setNomes(prev => prev.map((n, idx) => idx === i ? v : n))
  }

  return (
    <div className="max-w-sm mx-auto p-8 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <h3 className="font-heading font-bold text-aintar-navy text-xl mb-6 text-center">
        Quem vai jogar?
      </h3>
      <div className="flex flex-col gap-3 mb-5">
        {nomes.map((nome, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: CORES_JOGADOR[i] }}>
              {i + 1}
            </div>
            <input type="text" value={nome} onChange={e => atualizar(i, e.target.value)}
              placeholder={`Jogador ${i + 1}`} maxLength={20}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-aintar-navy placeholder-gray-400 focus:outline-none focus:border-aintar-teal focus:ring-2 focus:ring-aintar-teal/20 transition-colors"
            />
            {nomes.length > 2 && (
              <button onClick={() => setNomes(p => p.filter((_, idx) => idx !== i))}
                className="w-8 h-8 rounded-full border border-red-200 text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0">
                <Minus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {nomes.length < 4 && (
        <button onClick={() => setNomes(p => [...p, ''])}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-aintar-teal/30 text-aintar-teal text-sm font-medium hover:border-aintar-teal/60 hover:bg-aintar-teal/5 transition-colors flex items-center justify-center gap-2 mb-5">
          <Plus size={15} /> Adicionar jogador
        </button>
      )}
      <button onClick={() => onStart(nomes.map((n, i) => n.trim() || `Jogador ${i + 1}`))}
        className="w-full py-3 rounded-xl bg-aintar-blue text-white font-bold text-sm hover:bg-aintar-blue-mid hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg">
        🎲 Começar Jogo!
      </button>
    </div>
  )
}

// ─── Active game ──────────────────────────────────────────────────────────────

function JogoAtivo({ jogadores, onRestart }) {
  const [dado, setDado] = useState(DADO_INIT)
  const [rolling, setRolling] = useState(false)
  const [dieVisible, setDieVisible] = useState(false)
  const [turno, setTurno] = useState(0)
  const [posicoes, setPosicoes] = useState(() => jogadores.map(() => 0))
  const [turnoMovendo, setTurnoMovendo] = useState(-1)
  const [lancou, setLancou] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [minijogoAtivo, setMinijogoAtivo] = useState(false)
  const [labirintoAtivo, setLabirintoAtivo] = useState(false)
  const [limpezaAtivo, setLimpezaAtivo] = useState(false)
  const [corridaAtivo, setCorridaAtivo] = useState(false)
  const [catcherAtivo, setCatcherAtivo] = useState(false)
  const [diferencasAtivo, setDiferencasAtivo] = useState(false)
  const [casaDiferencasRecua, setCasaDiferencasRecua] = useState(0)
  const [viagemAtivo, setViagemAtivo] = useState(false)
  const [canosAtivo, setCanosAtivo] = useState(false)
  const [skipMsgJogador, setSkipMsgJogador] = useState(null)
  const semJogarRef = useRef(jogadores.map(() => false))
  const timersRef = useRef([])
  const gameRef = useRef(null)

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    gameRef.current?.requestFullscreen().catch(() => {})
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      gameRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  function schedule(fn, delay) {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
  }

  function lancar() {
    if (rolling || dieVisible || turnoMovendo !== -1 || lancou) return
    const face = Math.floor(Math.random() * 6) + 1
    const [rx, ry] = FACE_ROT[face]
    const base = (dado.n + 1) * 1440
    setDado({ rx: base + rx, ry: base + ry, res: face, n: dado.n + 1 })
    setRolling(true)
    setDieVisible(true)

    // Die animation ends at 1.1s → then show result for 3s → hide die → move poop
    schedule(() => setRolling(false), 1100)
    schedule(() => {
      setDieVisible(false)
      schedule(() => movePoop(face, turno), 350)
    }, 1100 + 3000)
  }

  function movePoop(steps, jogadorIdx) {
    const startPos = posicoes[jogadorIdx]
    const rawTarget = startPos + steps
    const path = []
    for (let i = startPos + 1; i <= Math.min(rawTarget, 23); i++) path.push(i)
    if (rawTarget > 23) {
      const finalPos = 46 - rawTarget
      for (let i = 22; i >= finalPos; i--) path.push(i)
    }

    setTurnoMovendo(jogadorIdx)
    let idx = 0
    function step() {
      const pos = path[idx]
      idx++
      setPosicoes(cur => cur.map((p, i) => i === jogadorIdx ? pos : p))
      if (idx < path.length) {
        schedule(step, 400)
      } else {
        schedule(() => {
          setTurnoMovendo(-1)
          const finalPos = path[path.length - 1]
          const casa = casas.find(c => c.n === finalPos)
          if (casa?.minijogo) {
            setMinijogoAtivo(true)
          } else if (casa?.labirinto) {
            setLabirintoAtivo(true)
          } else if (casa?.limpeza) {
            setLimpezaAtivo(true)
          } else if (casa?.corrida) {
            setCorridaAtivo(true)
          } else if (casa?.catcher) {
            setCatcherAtivo(true)
          } else if (casa?.diferencas) {
            setCasaDiferencasRecua(casa.diferencas)
            setDiferencasAtivo(true)
          } else if (casa?.viagem) {
            setViagemAtivo(true)
          } else if (casa?.canos) {
            setCanosAtivo(true)
          } else {
            setLancou(true)
          }
        }, 500)
      }
    }
    schedule(step, 150)
  }

  function proximoTurno() {
    const nextTurno = (turno + 1) % jogadores.length
    if (semJogarRef.current[nextTurno]) {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === nextTurno ? false : v)
      setSkipMsgJogador(jogadores[nextTurno])
      setTimeout(() => {
        setSkipMsgJogador(null)
        setTurno((nextTurno + 1) % jogadores.length)
        setLancou(false)
      }, 2200)
    } else {
      setTurno(nextTurno)
      setLancou(false)
    }
  }

  const jogadorAtual = jogadores[turno]
  const corAtual = CORES_JOGADOR[turno]
  const isMoving = turnoMovendo !== -1
  const isVencedor = lancou && posicoes[turno] === 23

  function handleMinijogoResult(passed) {
    setMinijogoAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === turno ? true : v)
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleLabirintoResult(passed) {
    setLabirintoAtivo(false)
    if (passed) {
      movePoop(2, turno)
    } else {
      setLancou(true)
    }
  }

  function handleLimpezaResult(passed) {
    setLimpezaAtivo(false)
    if (passed) {
      setLancou(false) // same player rolls again
    } else {
      setLancou(true)  // turn ends normally
    }
  }

  function recuarPeca(steps, jogadorIdx, currentPos) {
    const target = Math.max(1, currentPos - steps)
    const path = []
    for (let i = currentPos - 1; i >= target; i--) path.push(i)
    if (path.length === 0) { setLancou(true); return }

    setTurnoMovendo(jogadorIdx)
    let idx = 0
    function step() {
      const pos = path[idx]
      idx++
      setPosicoes(cur => cur.map((p, i) => i === jogadorIdx ? pos : p))
      if (idx < path.length) {
        schedule(step, 400)
      } else {
        schedule(() => { setTurnoMovendo(-1); setLancou(true) }, 500)
      }
    }
    schedule(step, 150)
  }

  function handleCorridaResult(passed) {
    setCorridaAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      recuarPeca(3, turno, posicoes[turno])
    }
  }

  function handleCatcherResult(passed) {
    setCatcherAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      recuarPeca(2, turno, posicoes[turno])
    }
  }

  function handleDiferencasResult(passed) {
    setDiferencasAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      recuarPeca(casaDiferencasRecua, turno, posicoes[turno])
    }
  }

  function handleViagemResult(passed) {
    setViagemAtivo(false)
    if (passed) {
      movePoop(1, turno)
    } else {
      setLancou(true)
    }
  }

  function handleCanosResult(passed) {
    setCanosAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      recuarPeca(6, turno, posicoes[turno])
    }
  }

  return (
    <div ref={gameRef} style={isFullscreen ? {
      background: '#f1f5f9', padding: '24px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
    } : { position: 'relative' }}>

      {/* Fullscreen gate */}
      {!isFullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0284c7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 20, padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 72 }}>🎮</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>
            Jogo do Tabuleiro AINTAR
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', maxWidth: 320, margin: 0, lineHeight: 1.6 }}>
            Para a melhor experiência, o jogo é jogado em <strong style={{ color: '#fff' }}>ecrã inteiro</strong>.
          </p>
          <button
            onClick={() => gameRef.current?.requestFullscreen()}
            style={{
              padding: '16px 40px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: '#fff', color: '#1e3a5f', fontWeight: 800, fontSize: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <Maximize2 size={20} />
            Voltar ao Jogo
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Podes sair a qualquer momento com a tecla ESC
          </p>
          <Link
            to="/educacao-ambiental/aintar-kids"
            style={{
              marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.55)',
              textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <ArrowLeft size={14} /> Voltar ao AINTAR Kids
          </Link>
        </div>
      )}

      {skipMsgJogador && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '36px 52px', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)', maxWidth: 360,
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>⏸️</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: '#dc2626', marginBottom: 8 }}>
              {skipMsgJogador} fica sem jogar!
            </div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              Esta jogada passa automaticamente...
            </div>
          </div>
        </div>
      )}
      {minijogoAtivo && (
        <MinijogoModal
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleMinijogoResult}
        />
      )}
      {labirintoAtivo && (
        <MinijogoLabirinto
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleLabirintoResult}
        />
      )}
      {limpezaAtivo && (
        <MinijogoLimpeza
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleLimpezaResult}
        />
      )}
      {corridaAtivo && (
        <MinijogoCorreida
          jogador={jogadorAtual}
          onResult={handleCorridaResult}
        />
      )}
      {catcherAtivo && (
        <MinijogoEcoponto
          jogador={jogadorAtual}
          onResult={handleCatcherResult}
        />
      )}
      {diferencasAtivo && (
        <MinijogosDiferencas
          jogador={jogadorAtual}
          recuaCasas={casaDiferencasRecua}
          onResult={handleDiferencasResult}
        />
      )}
      {viagemAtivo && (
        <MinijogoViagemAgua
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleViagemResult}
        />
      )}
      {canosAtivo && (
        <MinijogoCanosEtar
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleCanosResult}
        />
      )}

      {/* Header row: status + fullscreen button */}
      <div className="flex items-center justify-between w-full mb-4 gap-2">
        <div className="flex items-center gap-2 min-h-[22px] flex-1 justify-center">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: corAtual }} />
          <p className="text-sm font-semibold text-aintar-navy text-center">
            {rolling       ? 'A lançar…'
            : dieVisible   ? `Saiu o ${dado.res}! Avança ${dado.res} casa${dado.res !== 1 ? 's' : ''}!`
            : isMoving     ? `${jogadores[turnoMovendo]} a avançar…`
            : lancou       ? `${jogadorAtual} jogou!`
            :                `Vez de ${jogadorAtual}`}
          </p>
        </div>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair de ecrã inteiro' : 'Ecrã inteiro'}
          className="flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-aintar-navy transition-colors shadow-sm"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Board with die overlay */}
      <div className="relative w-full">
        <Tabuleiro posicoes={posicoes} jogadores={jogadores} turnoMovendo={turnoMovendo} />

        {/* Die floats centred over board, fades in/out */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20, pointerEvents: 'none',
          opacity: dieVisible ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Dado3D rx={dado.rx} ry={dado.ry} />
          </div>
        </div>
      </div>

      {/* Turn controls */}
      <div className="mt-2 flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {jogadores.map((j, i) => (
            <div key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${i === turno ? 'scale-110 shadow-md' : 'opacity-45'}`}
              style={{ background: i === turno ? CORES_JOGADOR[i] : '#e5e7eb', color: i === turno ? '#fff' : '#6b7280' }}
            >
              💩 {j}
            </div>
          ))}
        </div>

        {isVencedor ? (
          <div className="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="text-5xl mb-2">🏆</div>
            <h3 className="font-heading font-bold text-aintar-navy text-xl">{jogadorAtual} ganhou!</h3>
            <p className="text-gray-500 text-sm mt-1">Chegou à casa 23! Parabéns!</p>
            <button
              onClick={onRestart}
              className="mt-5 px-7 py-3 rounded-2xl font-bold text-white text-sm hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
              style={{ background: '#1e3a5f' }}
            >
              🔄 Reiniciar Jogo
            </button>
          </div>
        ) : !lancou ? (
          <button onClick={lancar}
            disabled={rolling || dieVisible || isMoving}
            className={`px-8 py-4 rounded-2xl font-bold text-white text-base transition-all duration-200 select-none shadow-lg
              ${(rolling || dieVisible || isMoving) ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:shadow-xl active:scale-95'}`}
            style={{ background: (rolling || dieVisible || isMoving) ? '#9ca3af' : corAtual }}
          >
            🎲 Vez de {jogadorAtual} — Lançar Dado
          </button>
        ) : (
          <button onClick={proximoTurno}
            className="px-8 py-4 rounded-2xl text-white font-bold text-base hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            style={{ background: CORES_JOGADOR[(turno + 1) % jogadores.length] }}
          >
            Próxima vez — {jogadores[(turno + 1) % jogadores.length]}
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JogoPage() {
  const [jogadores, setJogadores] = useState(null)

  return (
    <PageLayout
      title="Tabuleiro — AINTAR Kids"
      subtitle="O que não colocar no esgoto? Vamos aprender a jogar!"
      breadcrumbs={[
        { label: 'Educação Ambiental', href: '/educacao-ambiental' },
        { label: 'AINTAR Kids', href: '/educacao-ambiental/aintar-kids' },
        { label: 'Jogo do Tabuleiro' },
      ]}
      seoDescription="Jogo do tabuleiro AINTAR Kids — aprende o que não colocar no esgoto de forma divertida."
    >
      <section className="section-padding bg-slate-100">
        <div className="section-container">

          <div className="max-w-3xl mx-auto mb-10 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm text-sm text-gray-600 leading-relaxed">
            <h3 className="font-heading font-bold text-aintar-navy mb-2">Regras do jogo</h3>
            Podem participar entre 2 a 4 jogadores. O primeiro a jogar é o que tiver mais pontos no lançamento do dado.
            Ao longo do jogo estão indicadas as ações a respeitar{' '}
            (<strong>recuar, avançar, ficar sem jogar ou jogar novamente</strong>).
            Ganha o jogador que atingir primeiro a casa <strong>nº 23</strong> com o número exato.
            Se o valor obtido ultrapassar essa casa, recuas o número de casas indicado no dado. <strong>Boa sorte!</strong>
          </div>

          {!jogadores
            ? <RegistoJogadores onStart={setJogadores} />
            : <JogoAtivo jogadores={jogadores} onRestart={() => setJogadores(null)} />
          }

          <div className="mt-4 text-center">
            <Link to="/educacao-ambiental/aintar-kids"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-aintar-teal text-aintar-teal font-semibold text-sm hover:bg-aintar-teal/5 transition-colors">
              <ArrowLeft size={15} />
              Voltar ao AINTAR Kids
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
