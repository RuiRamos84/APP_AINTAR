import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

// ─── Shared constants ─────────────────────────────────────────────────────────

export const RESIDUOS = [
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
  { id: 13, nome: 'Embalagem de leite',  emoji: '🥛', ecoponto: 'amarelo'  },
  { id: 14, nome: 'Copo de plástico',    emoji: '🥤', ecoponto: 'amarelo'  },
  { id: 15, nome: 'Revista',             emoji: '📓', ecoponto: 'azul'     },
  { id: 16, nome: 'Caixa de pizza',      emoji: '🍕', ecoponto: 'azul'     },
  { id: 17, nome: 'Frasco de mel',       emoji: '🍯', ecoponto: 'verde'    },
  { id: 18, nome: 'Resto de jardim',     emoji: '🌿', ecoponto: 'cinzento' },
  { id: 19, nome: 'Lata de tinta',       emoji: '🪣', ecoponto: 'amarelo'  },
  { id: 20, nome: 'Embalagem de ovos',   emoji: '🥚', ecoponto: 'azul'     },
  { id: 21, nome: 'Ampola de vidro',     emoji: '💊', ecoponto: 'verde'    },
  { id: 22, nome: 'Restos de pão',       emoji: '🍞', ecoponto: 'cinzento' },
  { id: 23, nome: 'Envelope de papel',   emoji: '✉️', ecoponto: 'azul'     },
  { id: 24, nome: 'Embalagem de iogurte líquido', emoji: '🧃', ecoponto: 'amarelo' },
  { id: 25, nome: 'Frasco de perfume',   emoji: '🧴', ecoponto: 'verde'    },
  { id: 26, nome: 'Cascas de ovo',       emoji: '🥚', ecoponto: 'cinzento' },
  { id: 27, nome: 'Caixa de cereais',    emoji: '🌾', ecoponto: 'azul'     },
  { id: 28, nome: 'Lata de refrigerante',emoji: '🥫', ecoponto: 'amarelo'  },
  { id: 29, nome: 'Garrafa de azeite',   emoji: '🫒', ecoponto: 'verde'    },
  { id: 30, nome: 'Restos de carne',     emoji: '🍖', ecoponto: 'cinzento' },
]

export const ECOPONTOS_MJ = [
  { id: 'amarelo',  nome: 'Amarelo',        cor: '#ca8a04', desc: 'Plástico e Metal' },
  { id: 'azul',     nome: 'Azul',           cor: '#2563eb', desc: 'Papel e Cartão'  },
  { id: 'verde',    nome: 'Verde',          cor: '#16a34a', desc: 'Vidro'            },
  { id: 'cinzento', nome: 'Indiferenciado', cor: '#4b5563', desc: 'Restos / Outros'  },
]

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const LIXO_AGUA = [
  { id: 1,  emoji: '💊' }, { id: 2,  emoji: '🩹' }, { id: 3,  emoji: '🧴' },
  { id: 4,  emoji: '🪥' }, { id: 5,  emoji: '🧻' }, { id: 6,  emoji: '🛍️' },
  { id: 7,  emoji: '🩺' }, { id: 8,  emoji: '🧤' }, { id: 9,  emoji: '🚬' },
  { id: 10, emoji: '🪒' }, { id: 11, emoji: '🩻' }, { id: 12, emoji: '💉' },
]

export const MAZE_START = [1, 1]
export const MAZE_END   = [14, 16]
export const CELL = 34

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

const CATCH_W = 420
const CATCH_H = 300
const BIN_W = 72
const BIN_H = 44
const BIN_Y = CATCH_H - BIN_H - 6
const BIN_SPEED = 7
const ITEM_SZ = 38

const RUNNER_W = 460
const RUNNER_H = 260
const RUNNER_LANES = 5
const RUNNER_LANE_H = RUNNER_H / RUNNER_LANES
const RUNNER_PLAYER_X = 72
const RUNNER_COLLISION_DIST = 28
const OBSTACULOS_RUNNER = ['💊','🩹','🧴','🪥','🛍️','🧤','🚬','🪒','💉','🧽','🪣','🩺']

export const DPAD = {
  width: 54, height: 54, borderRadius: 12, border: 'none',
  background: '#1e3a5f', color: '#fff', fontSize: 22,
  cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700,
}

const DIFERENCAS_SCENES = [
  {
    title: 'O Rio',
    left:  [['🏠','🌊','🐟','🌿','🌳'],['🚿','💧','🐠','🦋','☀️'],['🧴','🗑️','♻️','🌾','🏡'],['💊','🚰','🌻','🐸','🌍']],
    right: [['🏚️','🌊','🐟','🌿','🌳'],['🚿','💧','🐡','🦋','☀️'],['🧴','🚮','♻️','🌾','🏡'],['💉','🚰','🌻','🐸','🗺️']],
    diffs: [[0,0],[1,2],[2,1],[3,0],[3,4]],
  },
  {
    title: 'A ETAR',
    left:  [['🏭','🌊','🚰','💧','🐟'],['🔧','🪣','⚗️','🧪','🌿'],['👷','🦺','🔬','📊','🌳'],['🌱','🐠','💦','🌾','🦋']],
    right: [['🏭','🌊','🚿','💧','🐟'],['🔧','🧹','⚗️','🧪','🌿'],['👷','🦺','🔭','📊','🌲'],['🌱','🐟','💦','🌾','🦋']],
    diffs: [[0,2],[1,1],[2,2],[2,4],[3,1]],
  },
  {
    title: 'A Praia',
    left:  [['🏖️','🌊','🐚','🦀','🌴'],['☀️','🐠','🦈','💧','🌿'],['🚿','🧴','🪣','🌊','🐟'],['🌊','🦋','🌻','🏄','💦']],
    right: [['🏖️','🌊','🐚','🦞','🌴'],['☀️','🐡','🦈','💧','🌿'],['🚿','🧹','🪣','🌊','🐙'],['🌊','🦋','🌸','🏄','💦']],
    diffs: [[0,3],[1,1],[2,1],[2,4],[3,2]],
  },
]

const CICLO_AGUA = [
  { id: 1, label: 'Captação',     emoji: '🏔️', desc: 'A água é captada do rio ou albufeira' },
  { id: 2, label: 'Tratamento',   emoji: '🏭', desc: 'A água é tratada na ETA para ser potável' },
  { id: 3, label: 'Distribuição', emoji: '🚰', desc: 'A água limpa chega a casa por canos' },
  { id: 4, label: 'Uso',          emoji: '🚿', desc: 'Usamos a água em casa' },
  { id: 5, label: 'Esgoto',       emoji: '🕳️', desc: 'As águas usadas vão para o esgoto' },
  { id: 6, label: 'ETAR',         emoji: '⚙️', desc: 'A ETAR trata as águas residuais' },
  { id: 7, label: 'Rio',          emoji: '🌊', desc: 'A água tratada regressa ao rio' },
]

// ─── Shared game helpers ──────────────────────────────────────────────────────

function useWinConfetti(shouldFire) {
  useEffect(() => {
    if (!shouldFire) return
    confetti({
      particleCount: 130, spread: 72, origin: { y: 0.55 },
      colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'],
    })
  }, [shouldFire])
}

const SPRING = { type: 'spring', damping: 22, stiffness: 310 }
const MODAL_IN = { scale: 0.82, opacity: 0, y: 18 }
const MODAL_OUT = { scale: 1, opacity: 1, y: 0 }

function GameModal({ children, bg, maxWidth, flex }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: bg || 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <motion.div
        initial={MODAL_IN} animate={MODAL_OUT} transition={SPRING}
        style={{
          background: '#fff', borderRadius: 24,
          width: '100%', maxWidth: maxWidth || 520,
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          ...(flex ? { display: 'flex', flexDirection: 'column', gap: 14 } : {}),
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// ─── Mini-jogos ───────────────────────────────────────────────────────────────

export function MinijogoModal({ jogador, cor, onResult }) {
  const [items] = useState(() => shuffle(RESIDUOS).slice(0, 4))
  const [placed, setPlaced] = useState({})
  const [results, setResults] = useState({})
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(10)
  const [done, setDone] = useState(false)

  const allPlaced = Object.keys(placed).length === items.length
  const score = items.filter(item => results[item.id] === true).length
  const passed = score === items.length

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(id); setDone(true); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => { if (allPlaced && !done) setDone(true) }, [allPlaced, done])

  function place(ecopontoId) {
    if (selected === null || done) return
    const item = items.find(i => i.id === selected)
    setPlaced(p => ({ ...p, [selected]: ecopontoId }))
    setResults(r => ({ ...r, [selected]: item.ecoponto === ecopontoId }))
    setSelected(null)
  }

  const timerPct = (timeLeft / 30) * 100
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444'
  useWinConfetti(done && passed)

  return (
    <GameModal bg="rgba(4,36,12,0.88)" maxWidth={520}>
      <div style={{ padding: 28 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🎮 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f' }}>Separa os Resíduos!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clica num resíduo e depois no ecoponto correto.</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 10 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, marginBottom: 20 }}>
              <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 99, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              {items.map(item => {
                const isPlaced = placed[item.id] !== undefined
                const isSel = selected === item.id
                return (
                  <div key={item.id} draggable={!isPlaced && !done}
                    onDragStart={() => !isPlaced && !done && setSelected(item.id)}
                    onClick={() => { if (isPlaced || done) return; setSelected(s => s === item.id ? null : item.id) }}
                    style={{ cursor: isPlaced ? 'default' : 'pointer', opacity: isPlaced ? 0.22 : 1, padding: '10px 12px', borderRadius: 14, minWidth: 80, textAlign: 'center', border: isSel ? `2.5px solid ${cor}` : '2px solid #e5e7eb', background: isSel ? `${cor}18` : '#f8fafc', transform: isSel ? 'scale(1.08)' : 'none', transition: 'all 0.15s', userSelect: 'none' }}>
                    <div style={{ fontSize: 28 }}>{item.emoji}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginTop: 4, lineHeight: 1.2 }}>{item.nome}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {ECOPONTOS_MJ.map(eco => {
                const placedHere = items.filter(i => placed[i.id] === eco.id)
                return (
                  <div key={eco.id} onClick={() => place(eco.id)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); place(eco.id) }}
                    style={{ borderRadius: 14, padding: '10px 6px', background: selected !== null ? `${eco.cor}18` : '#f8fafc', border: `2px dashed ${eco.cor}`, cursor: selected !== null ? 'pointer' : 'default', textAlign: 'center', minHeight: 90, transition: 'background 0.15s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: eco.cor, margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1f2937' }}>{eco.nome}</div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6 }}>{eco.desc}</div>
                    {placedHere.map(item => <div key={item.id} style={{ fontSize: 17 }}>{item.emoji} {results[item.id] ? '✅' : '❌'}</div>)}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{passed ? '🎉' : '😢'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{passed ? 'Muito Bem!' : 'Quase!'}</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>{score}/{items.length} corretos</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: passed ? '#16a34a' : '#dc2626' }}>{passed ? '✔ Podes ficar na casa!' : '✖ Perdes a vez nesta casa.'}</p>
            {!passed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, textAlign: 'left', background: '#fef2f2', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Respostas certas:</div>
                {items.filter(i => results[i.id] !== true).map(item => {
                  const eco = ECOPONTOS_MJ.find(e => e.id === item.ecoponto)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                      <span>{item.emoji}</span><span>{item.nome}</span><span style={{ color: '#9ca3af' }}>→</span><span style={{ fontWeight: 700, color: eco.cor }}>{eco.nome}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={() => onResult(passed)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: passed ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {passed ? 'Continuar 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}

export function MinijogoLimpeza({ jogador, cor, onResult }) {
  const [items, setItems] = useState(() =>
    shuffle([...LIXO_AGUA]).slice(0, 10).map(item => ({
      ...item, x: 10 + Math.random() * 70, y: 10 + Math.random() * 70,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, removed: false,
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

  function onMouseMove(e) {
    const rect = poolRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }
  }
  function onTouchMove(e) {
    const rect = poolRef.current?.getBoundingClientRect()
    if (!rect || !e.touches[0]) return
    mouseRef.current = { x: ((e.touches[0].clientX - rect.left) / rect.width) * 100, y: ((e.touches[0].clientY - rect.top) / rect.height) * 100 }
  }

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      const mx = mouseRef.current.x, my = mouseRef.current.y
      setItems(prev => prev.map(item => {
        if (item.removed) return item
        let { x, y, vx, vy } = item
        const dx = x - mx, dy = y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const FLEE = 16
        if (dist < FLEE && dist > 0.1) { const force = ((FLEE - dist) / FLEE) * 0.35; vx += (dx / dist) * force; vy += (dy / dist) * force }
        vx += (Math.random() - 0.5) * 0.06; vy += (Math.random() - 0.5) * 0.06
        const spd = Math.sqrt(vx * vx + vy * vy); const MAX = 0.75
        if (spd > MAX) { vx = (vx / spd) * MAX; vy = (vy / spd) * MAX }
        x += vx; y += vy
        if (x < 5)  { x = 5;  vx =  Math.abs(vx) }
        if (x > 88) { x = 88; vx = -Math.abs(vx) }
        if (y < 5)  { y = 5;  vy =  Math.abs(vy) }
        if (y > 85) { y = 85; vy = -Math.abs(vy) }
        return { ...item, x, y, vx, vy }
      }))
    }, 50)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(id); setDone(true); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => { if (!done && remaining === 0) setDone(true) }, [remaining, done])

  function remove(id) { if (done) return; setItems(prev => prev.map(i => i.id === id ? { ...i, removed: true } : i)) }

  const timerColor = timeLeft > 5 ? '#22c55e' : timeLeft > 3 ? '#f59e0b' : '#ef4444'
  useWinConfetti(done && won)

  return (
    <GameModal bg="rgba(0,20,50,0.92)" maxWidth={460} flex>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            <div ref={poolRef} onMouseMove={onMouseMove} onTouchMove={onTouchMove}
              style={{ position: 'relative', width: '100%', height: 270, background: 'linear-gradient(180deg,#38bdf8 0%,#0284c7 55%,#0369a1 100%)', borderRadius: 16, overflow: 'hidden', cursor: 'crosshair', boxShadow: 'inset 0 -6px 20px rgba(0,0,0,0.2)', touchAction: 'none' }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.05) 28px,rgba(255,255,255,0.05) 29px)' }} />
              {items.map(item => item.removed ? null : (
                <button key={item.id} onClick={() => remove(item.id)}
                  style={{ position: 'absolute', left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%,-50%)', fontSize: 24, width: 44, height: 44, background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', padding: 0 }}>
                  {item.emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '💧' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{won ? 'Água limpa!' : 'Tempo esgotado!'}</h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>{won ? '✔ Podes jogar outra vez!' : `✖ Ficaram ${remaining} itens na água.`}</p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Jogar Outra Vez! 🎲' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}

export function MinijogoLabirinto({ jogador, cor, onResult }) {
  const [config]                = useState(() => MAZE_CONFIGS[Math.floor(Math.random() * MAZE_CONFIGS.length)])
  const MAZE                    = config.grid
  const [pos, setPos]           = useState([...MAZE_START])
  const posRef                  = useRef([...MAZE_START])
  const [enemyPos, setEnemyPos] = useState(() => [...config.enemyStart])
  const enemyPosRef             = useRef([...config.enemyStart])
  const [timeLeft, setTimeLeft] = useState(20)
  const [done, setDone]         = useState(false)
  const doneRef                 = useRef(false)
  const [won, setWon]           = useState(false)
  const [caught, setCaught]     = useState(false)
  const boardRef                = useRef(null)

  useEffect(() => { boardRef.current?.focus() }, [])

  // Timer
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); doneRef.current = true; setDone(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  // Win check
  useEffect(() => {
    if (!done && pos[0] === MAZE_END[0] && pos[1] === MAZE_END[1]) {
      doneRef.current = true; setWon(true); setDone(true)
    }
  }, [pos, done])

  // Reset player + enemy to starts
  function resetAfterCatch() {
    posRef.current = [...MAZE_START]
    setPos([...MAZE_START])
    enemyPosRef.current = [...config.enemyStart]
    setEnemyPos([...config.enemyStart])
    setCaught(true)
    setTimeout(() => setCaught(false), 500)
  }

  // Player movement
  function movePlayer(dr, dc) {
    if (doneRef.current) return
    const [r, c] = posRef.current
    const nr = r + dr, nc = c + dc
    if (MAZE[nr]?.[nc] !== 0) return
    posRef.current = [nr, nc]
    setPos([nr, nc])
    const [er, ec] = enemyPosRef.current
    if (nr === er && nc === ec) resetAfterCatch()
  }

  // Keyboard
  useEffect(() => {
    function onKey(e) {
      const map = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1], w:[-1,0], s:[1,0], a:[0,-1], d:[0,1] }
      const d = map[e.key]; if (!d) return
      e.preventDefault()
      movePlayer(d[0], d[1])
    }
    if (!done) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])

  // Enemy chases player every 550ms
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const [er, ec] = enemyPosRef.current
      const [pr, pc] = posRef.current
      const dr = pr - er, dc = pc - ec
      const toward = []
      if (dr !== 0) toward.push([Math.sign(dr), 0])
      if (dc !== 0) toward.push([0, Math.sign(dc)])
      const allDirs = [[1,0],[-1,0],[0,1],[0,-1]]
      const other = allDirs.filter(([r,c]) => !toward.some(([tr,tc]) => tr===r && tc===c))
      const dirs = Math.random() < 0.65 ? [...toward, ...other] : [...other, ...toward]
      for (const [ddr, ddc] of dirs) {
        const nr = er + ddr, nc = ec + ddc
        if (MAZE[nr]?.[nc] === 0) {
          enemyPosRef.current = [nr, nc]; setEnemyPos([nr, nc]); break
        }
      }
      const [ner, nec] = enemyPosRef.current
      if (ner === posRef.current[0] && nec === posRef.current[1] && !doneRef.current) {
        resetAfterCatch()
      }
    }, 550)
    return () => clearInterval(id)
  }, [done])

  const timerPct = (timeLeft / 30) * 100
  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#f59e0b' : '#ef4444'
  useWinConfetti(done && won)

  return (
    <GameModal bg="rgba(8,14,32,0.93)" maxWidth={700} flex>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 2 }}>🌀 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Leva o 💩 à ETAR! Foge da 🦠!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Setas / WASD para mover. Se a bactéria te apanhar, recomeças!</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 12 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>
            <div ref={boardRef} tabIndex={0} style={{ outline: 'none', lineHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAZE[0].length}, ${CELL}px)`, border: '3px solid #1e3a5f', borderRadius: 6, overflow: 'hidden' }}>
                {MAZE.flatMap((row, r) => row.map((cell, c) => {
                  const isPlayer = pos[0] === r && pos[1] === c
                  const isEnemy  = enemyPos[0] === r && enemyPos[1] === c
                  const isEnd    = MAZE_END[0] === r && MAZE_END[1] === c
                  return (
                    <div key={`${r}-${c}`} style={{ width: CELL, height: CELL, background: cell === 1 ? '#1e3a5f' : isEnemy ? '#fee2e2' : isEnd ? '#bfdbfe' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: CELL * 0.58, border: cell === 0 ? '0.5px solid #d1fae5' : 'none', boxSizing: 'border-box' }}>
                      {isPlayer ? '💩' : isEnemy ? '🦠' : isEnd ? '🏭' : null}
                    </div>
                  )
                }))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button onPointerDown={() => movePlayer(-1, 0)} style={DPAD}>↑</button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onPointerDown={() => movePlayer(0, -1)} style={DPAD}>←</button>
                <button onPointerDown={() => movePlayer(1,  0)} style={DPAD}>↓</button>
                <button onPointerDown={() => movePlayer(0,  1)} style={DPAD}>→</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{won ? 'Chegaste à ETAR!' : 'Tempo esgotado!'}</h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>{won ? '✔ Avanças 2 casas!' : '✖ Ficas na casa atual.'}</p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Avançar 2 Casas! 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}

export function MinijogoCorreida({ jogador, onResult }) {
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
    laneRef.current = nl; setLane(nl)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowUp')   { e.preventDefault(); changeLane(-1) }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeLane(1) }
    }
    if (!done) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const spd = Math.min(3 + (30 - timeLeftRef.current) * 0.28, 9)
      const updated = obstaclesRef.current.map(o => ({ ...o, x: o.x - spd })).filter(o => o.x > -60)
      obstaclesRef.current = updated; setObstacles([...updated])
      const hit = updated.some(o => o.lane === laneRef.current && Math.abs(o.x - RUNNER_PLAYER_X) < RUNNER_COLLISION_DIST)
      if (hit && !doneRef.current) { doneRef.current = true; setCrashed(true); setDone(true) }
    }, 50)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const newObs = { id: obsIdRef.current++, lane: Math.floor(Math.random() * RUNNER_LANES), x: RUNNER_W + 30, emoji: OBSTACULOS_RUNNER[Math.floor(Math.random() * OBSTACULOS_RUNNER.length)] }
      obstaclesRef.current = [...obstaclesRef.current, newObs]; setObstacles([...obstaclesRef.current])
    }, 1300)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1); setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current === 0) { doneRef.current = true; setDone(true) }
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  const won = done && !crashed
  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 7 ? '#f59e0b' : '#ef4444'
  useWinConfetti(done && won)

  return (
    <GameModal bg="rgba(10,8,0,0.92)" maxWidth={510} flex>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>🏃 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Foge até à ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Usa ↑↓ para desviar do lixo. Sobrevive 30 segundos!</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 15 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 30) * 100}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>
            <div style={{ position: 'relative', width: RUNNER_W, maxWidth: '100%', height: RUNNER_H, background: 'linear-gradient(180deg,#1e3a8a 0%,#1d4ed8 50%,#1e40af 100%)', borderRadius: 16, overflow: 'hidden', border: '3px solid #1e3a8a', boxShadow: 'inset 0 -4px 20px rgba(0,0,0,0.35)' }}>
              {[1,2,3,4].map(i => <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * RUNNER_LANE_H, height: 1, background: 'rgba(255,255,255,0.1)' }} />)}
              {[0,1,2,3,4].map(i => <div key={`r${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * RUNNER_LANE_H + RUNNER_LANE_H / 2, height: 1, background: 'rgba(255,255,255,0.06)' }} />)}
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, background: 'rgba(0,0,0,0.18)', borderLeft: '2px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>🏭</span>
              </div>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: RUNNER_PLAYER_X - 18, background: 'rgba(255,255,255,0.04)', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
              <div style={{ position: 'absolute', left: RUNNER_PLAYER_X, top: lane * RUNNER_LANE_H + RUNNER_LANE_H / 2, transform: 'translate(-50%, -50%)', fontSize: 26, transition: 'top 0.08s ease', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))', zIndex: 2, lineHeight: 1 }}>💩</div>
              {obstacles.map(o => <div key={o.id} style={{ position: 'absolute', left: o.x, top: o.lane * RUNNER_LANE_H + RUNNER_LANE_H / 2, transform: 'translate(-50%, -50%)', fontSize: 22, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))', lineHeight: 1 }}>{o.emoji}</div>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button onPointerDown={() => changeLane(-1)} style={DPAD}>↑</button>
              <button onPointerDown={() => changeLane(1)}  style={DPAD}>↓</button>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Teclado: ↑ ↓ &nbsp;|&nbsp; Velocidade aumenta com o tempo!</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💥'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{won ? 'Chegaste à ETAR!' : 'Bateste num obstáculo!'}</h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>{won ? '✔ Ficas na casa atual.' : '✖ Recuas 3 casas!'}</p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Continuar 🎉' : 'Recuar 3 Casas 😢'}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}

export function MinijogoEcoponto({ jogador, onResult }) {
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

  useEffect(() => {
    function dn(e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); keysRef.current.left  = true }
      if (e.key === 'ArrowRight') { e.preventDefault(); keysRef.current.right = true }
    }
    function up(e) {
      if (e.key === 'ArrowLeft')  keysRef.current.left  = false
      if (e.key === 'ArrowRight') keysRef.current.right = false
    }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const { left, right } = keysRef.current
      if (!left && !right) return
      const newX = Math.max(0, Math.min(CATCH_W - BIN_W, binXRef.current + (left ? -BIN_SPEED : BIN_SPEED)))
      binXRef.current = newX; setBinX(newX)
    }, 16)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const spd = Math.min(3.5 + (20 - timeLeftRef.current) * 0.40, 11)
      const bx = binXRef.current
      const newItems = []; let livesLost = 0, gained = 0, flashType = null
      for (const item of itemsRef.current) {
        const ny = item.y + spd
        const itemBottom = ny + ITEM_SZ / 2, itemLeft = item.x - ITEM_SZ / 2, itemRight = item.x + ITEM_SZ / 2
        if (itemBottom >= BIN_Y && itemBottom <= BIN_Y + BIN_H && itemRight >= bx && itemLeft <= bx + BIN_W) {
          if (item.ecoponto === ecoId) { gained++; flashType = 'good' } else { livesLost++; flashType = 'bad' }
          continue
        }
        if (ny > CATCH_H + ITEM_SZ) continue
        newItems.push({ ...item, y: ny })
      }
      itemsRef.current = newItems; setItems([...newItems])
      if (gained > 0) { scoreRef.current += gained; setScore(scoreRef.current) }
      if (livesLost > 0) {
        const nl = Math.max(0, livesRef.current - livesLost); livesRef.current = nl; setLives(nl)
        if (nl === 0 && !doneRef.current) { doneRef.current = true; setDone(true) }
      }
      if (flashType) { setFlash(flashType); setTimeout(() => setFlash(null), 280) }
    }, 40)
    return () => clearInterval(id)
  }, [done, ecoId])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const r = RESIDUOS[Math.floor(Math.random() * RESIDUOS.length)]
      const eco = ECOPONTOS_MJ.find(e => e.id === r.ecoponto)
      const newItem = { id: itemIdRef.current++, x: ITEM_SZ / 2 + Math.random() * (CATCH_W - ITEM_SZ), y: -ITEM_SZ / 2, emoji: r.emoji, ecoponto: r.ecoponto, color: eco.cor }
      itemsRef.current = [...itemsRef.current, newItem]; setItems([...itemsRef.current])
    }, 800)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1); setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current === 0) { doneRef.current = true; setDone(true) }
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  const won = done && livesRef.current > 0
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444'
  const areaBg = flash === 'good' ? 'linear-gradient(180deg,#dcfce7,#f0fdf4)' : flash === 'bad' ? 'linear-gradient(180deg,#fee2e2,#fef2f2)' : 'linear-gradient(180deg,#f0f9ff 0%,#e0f2fe 100%)'
  useWinConfetti(done && won)

  return (
    <GameModal bg="rgba(0,25,50,0.92)" maxWidth={470} flex>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {!done ? (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ecoTarget.cor, marginBottom: 2 }}>⚡ Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Carrega o Ecoponto!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Apanha só os resíduos do ecoponto <span style={{ fontWeight: 800, color: ecoTarget.cor }}>{ecoTarget.nome}</span> ({ecoTarget.desc})!</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 15 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}><span style={{ fontSize: 18 }}>{lives > 0 ? '❤️' : '🖤'}</span></div>
              </div>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 20) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${ecoTarget.cor}15`, borderRadius: 10, padding: '4px 12px', border: `2px solid ${ecoTarget.cor}` }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ecoTarget.cor }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: ecoTarget.cor }}>{ecoTarget.nome} — {ecoTarget.desc}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>⭐ {score}</div>
            </div>
            <div style={{ position: 'relative', width: CATCH_W, maxWidth: '100%', height: CATCH_H, background: areaBg, borderRadius: 16, overflow: 'hidden', border: '3px solid #bae6fd', transition: 'background 0.15s' }}>
              {items.map(item => <div key={item.id} style={{ position: 'absolute', left: item.x, top: item.y, transform: 'translate(-50%,-50%)', width: ITEM_SZ + 10, height: ITEM_SZ + 10, borderRadius: '50%', background: `${item.color}22`, border: `2.5px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: ITEM_SZ * 0.62, lineHeight: 1 }}>{item.emoji}</div>)}
              <div style={{ position: 'absolute', left: binX, top: BIN_Y, width: BIN_W, height: BIN_H, background: ecoTarget.cor, borderRadius: '10px 10px 4px 4px', border: '3px solid rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 4px 14px ${ecoTarget.cor}66` }}>♻️</div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <button onPointerDown={() => { keysRef.current.left = true }} onPointerUp={() => { keysRef.current.left = false }} onPointerLeave={() => { keysRef.current.left = false }} style={{ ...DPAD, width: 66, height: 66, fontSize: 28 }}>←</button>
              <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Teclado: ← →</span>
              <button onPointerDown={() => { keysRef.current.right = true }} onPointerUp={() => { keysRef.current.right = false }} onPointerLeave={() => { keysRef.current.right = false }} style={{ ...DPAD, width: 66, height: 66, fontSize: 28 }}>→</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💔'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{won ? 'Ecoponto carregado!' : 'Ficaste sem vidas!'}</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Pontuação: ⭐ {scoreRef.current}</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>{won ? '✔ Ficas na casa atual.' : '✖ Recuas 2 casas!'}</p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Continuar 🎉' : 'Recuar 2 Casas 😢'}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}

export function MinijogosDiferencas({ jogador, recuaCasas = 1, onResult }) {
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
      setTimeLeft(t => { if (t <= 1) { clearInterval(id); setDone(true); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => { if (!done && found.size === totalDiffs) { setWon(true); setDone(true) } }, [found, done, totalDiffs])

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
  useWinConfetti(done && won)

  return (
    <GameModal bg="rgba(20,10,0,0.9)" maxWidth={620} flex>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', marginBottom: 2 }}>🔍 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Encontra as Diferenças!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clica nas {totalDiffs} diferenças na imagem da direita. {found.size}/{totalDiffs} encontradas.</div>
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
              <div>
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Original</div>
                <div style={{ border: '2px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', display: 'inline-block' }}>
                  {scene.left.map((row, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      {row.map((emoji, c) => <div key={c} style={{ width: CELL_SZ, height: CELL_SZ, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, background: (r + c) % 2 === 0 ? '#f8fafc' : '#f1f5f9', borderRight: c < row.length - 1 ? '1px solid #e5e7eb' : 'none', borderBottom: r < scene.left.length - 1 ? '1px solid #e5e7eb' : 'none' }}>{emoji}</div>)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Encontra as diferenças 👆</div>
                <div style={{ border: '2px solid #7e22ce', borderRadius: 10, overflow: 'hidden', display: 'inline-block' }}>
                  {scene.right.map((row, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      {row.map((emoji, c) => {
                        const key = `${r},${c}`
                        const isFound = found.has(key), isWrong = wrongFlash.has(key)
                        return (
                          <div key={c} onClick={() => handleCellClick(r, c)}
                            style={{ width: CELL_SZ, height: CELL_SZ, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, position: 'relative', background: isFound ? '#bbf7d0' : isWrong ? '#fecaca' : (r + c) % 2 === 0 ? '#f8fafc' : '#f1f5f9', borderRight: c < row.length - 1 ? '1px solid #e5e7eb' : 'none', borderBottom: r < scene.right.length - 1 ? '1px solid #e5e7eb' : 'none', cursor: isFound ? 'default' : 'pointer', transition: 'background 0.2s', userSelect: 'none' }}>
                            {emoji}
                            {isFound && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.35)', fontSize: 18, fontWeight: 900, color: '#15803d' }}>✓</div>}
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
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{won ? 'Encontraste tudo!' : 'Tempo esgotado!'}</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{found.size}/{totalDiffs} diferenças encontradas</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>{won ? '✔ Não recuas casas!' : `✖ Recuas ${recuaCasas} casa${recuaCasas !== 1 ? 's' : ''}!`}</p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Continuar 🎉' : `Recuar ${recuaCasas} Casa${recuaCasas !== 1 ? 's' : ''} 😢`}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}

export function MinijogoViagemAgua({ jogador, cor, onResult }) {
  const [order, setOrder] = useState(() => shuffle(CICLO_AGUA))
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [done, setDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(id); setDone(true); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  function handleDragStart(e, idx) { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }
  function handleDragOver(e, idx) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(idx)
    if (dragIdx === null || dragIdx === idx) return
    setOrder(prev => { const arr = [...prev]; const dragged = arr.splice(dragIdx, 1)[0]; arr.splice(idx, 0, dragged); return arr })
    setDragIdx(idx)
  }
  function handleDrop(e) { e.preventDefault(); setDragIdx(null); setDragOverIdx(null) }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null) }
  function handleSubmit() { if (done) return; setSubmitted(true); setDone(true) }

  const isCorrect = submitted && order.every((item, idx) => item.id === CICLO_AGUA[idx].id)
  const timerPct = (timeLeft / 60) * 100
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444'
  const won = isCorrect
  useWinConfetti(done && won)

  return (
    <GameModal bg="rgba(0,18,46,0.93)" maxWidth={480} flex>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🧩 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Ordena a Viagem da Água!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Arrasta os passos pela ordem correta do ciclo urbano da água.</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 30 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {order.map((item, idx) => (
                <div key={item.id} draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={handleDrop} onDragEnd={handleDragEnd}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: dragOverIdx === idx ? `${cor}14` : '#f8fafc', border: dragOverIdx === idx ? `2px solid ${cor}` : '2px solid #e5e7eb', cursor: 'grab', userSelect: 'none', transition: 'border-color 0.12s, background 0.12s', opacity: dragIdx === idx ? 0.5 : 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', minWidth: 18 }}>{idx + 1}.</span>
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 16, color: '#d1d5db', userSelect: 'none' }}>⠿</span>
                </div>
              ))}
            </div>
            <button onClick={handleSubmit} style={{ padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', background: cor, color: '#fff', fontWeight: 700, fontSize: 14 }}>✅ Confirmar Ordem</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{!submitted ? '⏰' : won ? '🎉' : '❌'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{!submitted ? 'Tempo esgotado!' : won ? 'Ordem correta!' : 'Ordem errada!'}</h3>
            {!won && (
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
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>{won ? '✔ Avanças 1 casa!' : '✖ Ficas na casa atual.'}</p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Avançar 1 Casa! 🎉' : 'Continuar'}
            </button>
          </div>
        )}
      </div>
    </GameModal>
  )
}
