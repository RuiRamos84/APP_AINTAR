import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import { motion, LayoutGroup } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
gsap.registerPlugin()

// ─── 3D Die ───────────────────────────────────────────────────────────────────

const SZ = 112
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

const BURST_COLORS = ['#fbbf24','#f97316','#ef4444','#a855f7','#3b82f6','#10b981','#ec4899','#06b6d4']

function Dado3D({ rx, ry, rolling }) {
  const prevRollingRef = useRef(false)
  const particlesRef = useRef([])

  useEffect(() => {
    if (prevRollingRef.current && !rolling) {
      const ps = particlesRef.current.filter(Boolean)
      gsap.killTweensOf(ps)
      gsap.set(ps, { x: 0, y: 0, opacity: 1, scale: 1 })
      ps.forEach((p, i) => {
        const angle = (i / ps.length) * Math.PI * 2
        const dist = 52 + Math.random() * 30
        gsap.to(p, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          opacity: 0,
          scale: 0.2,
          duration: 0.5 + Math.random() * 0.25,
          ease: 'power2.out',
        })
      })
    }
    prevRollingRef.current = rolling
  }, [rolling])

  return (
    <div style={{
      position: 'relative', width: SZ, height: SZ,
      filter: rolling
        ? 'drop-shadow(0 0 18px rgba(255,215,0,0.95)) drop-shadow(0 0 36px rgba(255,165,0,0.6))'
        : 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
      transition: 'filter 0.4s ease',
    }}>
      {/* Particle burst sparks */}
      {BURST_COLORS.map((color, i) => (
        <div key={i} ref={el => particlesRef.current[i] = el} style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 9, height: 9, borderRadius: '50%',
          background: color,
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none', opacity: 0,
        }} />
      ))}
      <div style={{
        perspective: 600, width: SZ, height: SZ,
      }}>
        <div style={{
          width: SZ, height: SZ,
          position: 'relative', transformStyle: 'preserve-3d',
          transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
          transition: 'transform 1.1s cubic-bezier(.23,.68,.35,1)',
        }}>
          {[1,2,3,4,5,6].map((v, i) => <Face key={v} value={v} t={FACE_T[i]} />)}
        </div>
      </div>
    </div>
  )
}

// ─── CSS Keyframes ────────────────────────────────────────────────────────────

function GameStyles() {
  return (
    <style>{`
      @keyframes tokenFloat {
        0%,100% { transform: translateY(0px)  scale(1);    }
        50%      { transform: translateY(-7px) scale(1.03); }
      }
      @keyframes tokenSpin {
        0%,100% { transform: translateY(-2px) scale(1.06) rotateZ(-4deg); }
        25%      { transform: translateY(-6px) scale(1.11) rotateZ(0deg);  }
        50%      { transform: translateY(-2px) scale(1.06) rotateZ(4deg);  }
        75%      { transform: translateY(-6px) scale(1.11) rotateZ(0deg);  }
      }
      @keyframes tokenBounce {
        0%   { transform: translateY(0px)   scale(1)    rotateZ(0deg);   }
        25%  { transform: translateY(-22px) scale(1.35) rotateZ(-10deg); }
        55%  { transform: translateY(-28px) scale(1.4)  rotateZ(8deg);  }
        82%  { transform: translateY(-10px) scale(1.18) rotateZ(-3deg); }
        100% { transform: translateY(0px)   scale(1)    rotateZ(0deg);  }
      }
      @keyframes glowPulse {
        0%,100% { opacity: 0.5;  transform: scale(1);    }
        50%      { opacity: 1;   transform: scale(1.38); }
      }
      @keyframes shimmerPurple {
        0%,100% { filter: brightness(1) saturate(1); }
        50%      { filter: brightness(1.18) saturate(1.25); }
      }
      @keyframes centerGlow {
        0%,100% { box-shadow: 0 4px 0 rgba(0,0,0,0.3), 0 8px 24px rgba(2,132,199,0.4), inset 0 1px 0 rgba(255,255,255,0.25); }
        50%      { box-shadow: 0 4px 0 rgba(0,0,0,0.3), 0 14px 40px rgba(14,165,233,0.75), inset 0 1px 0 rgba(255,255,255,0.38); }
      }
      @keyframes pieceLand {
        0%   { opacity: 0; transform: scale(0.35) translateY(-18px); }
        62%  { opacity: 1; transform: scale(1.18) translateY(4px);  }
        82%  { transform: scale(0.94) translateY(-2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes pieceLeave {
        0%   { opacity: 1; transform: scale(1);    }
        100% { opacity: 0; transform: scale(0.3) translateY(-12px); }
      }
      @keyframes trophyPulse {
        0%,100% { transform: scale(1) rotate(0deg); }
        50%      { transform: scale(1.3) rotate(8deg); }
      }
      @keyframes rollPulse {
        0%,100% { transform: translateY(0) scale(1); }
        50%      { transform: translateY(-4px) scale(1.04); }
      }
      @keyframes skipShake {
        0%,100% { transform: translateX(0) rotate(0deg); }
        15%      { transform: translateX(-10px) rotate(-3deg); }
        30%      { transform: translateX(10px) rotate(3deg); }
        50%      { transform: translateX(-7px) rotate(-2deg); }
        70%      { transform: translateX(7px) rotate(2deg); }
        85%      { transform: translateX(-3px); }
      }
      @keyframes confettiFall {
        0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(105vh) rotate(800deg); opacity: 0; }
      }
      @keyframes winBounce {
        0%,100% { transform: scale(1); }
        50%      { transform: scale(1.04); }
      }
      @keyframes sbFall {
        from { transform: translateX(-50%) translateY(-72px); opacity: 1; }
        to   { transform: translateX(-50%) translateY(200px); opacity: 0.3; }
      }
      @keyframes rrUrgent {
        0%       { fill:#3b82f6; filter:drop-shadow(0 0 3px #3b82f688); }
        45%      { fill:#f59e0b; filter:drop-shadow(0 0 5px #f59e0b88); }
        80%,100% { fill:#dc2626; filter:drop-shadow(0 0 8px #dc2626bb); }
      }
      @keyframes rrPulse {
        0%,100% { transform:scale(1);    }
        50%      { transform:scale(1.35); }
      }
    `}</style>
  )
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4']

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 90 }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 3.5,
      duration: 2.8 + Math.random() * 2.2,
      size: 6 + Math.random() * 11,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      radius: Math.random() > 0.45 ? '50%' : '2px',
    }))
  , [])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`, top: '-24px',
          width: p.size, height: p.size,
          background: p.color, borderRadius: p.radius,
          animation: `confettiFall ${p.duration}s ${p.delay}s linear infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

const CORES_JOGADOR = ['#0284c7', '#15803d', '#dc2626', '#7c3aed']

const casas = [
  { n: 1,  t: 'CUIDA DO PLANETA, É O ÚNICO QUE TEMOS!',  a: null,             bg: '#7c3aed', fg: '#fff',    dir: '▲' },
  { n: 2,  t: 'TOALHITAS NO LIXO INDIFERENCIADO',        a: 'AVANÇA 2 CASAS', bg: '#16a34a', fg: '#fff',   dir: '▲', labirinto: true },
  { n: 3,  t: 'COTONETES NA SANITA!',                    a: '1X SEM JOGAR (Monta a ETAR)',   bg: '#15803d', fg: '#fff',   dir: '▲', minijogo: true },
  { n: 4,  t: 'FRALDAS NO LIXO INDIFERENCIADO',          a: 'JOGA OUTRA VEZ', bg: '#22c55e', fg: '#fff',   dir: '◀', desembaralha: true },
  { n: 5,  t: 'PAPEL DAS PASTILHAS NA SANITA',           a: '1X SEM JOGAR (Depósitos)',         bg: '#eab308', fg: '#fff',   dir: '◀', deposito: true },
  { n: 6,  t: 'ÁGUA LIMPA É VIDA — PROTEGE OS RIOS!',    a: null,             bg: '#7c3aed', fg: '#fff',    dir: '◀' },
  { n: 7,  t: 'PENSO RÁPIDO NA SANITA',                  a: '1X SEM JOGAR (Análise)',        bg: '#dc2626', fg: '#fff',   dir: '◀', analise: true },
  { n: 8,  t: 'RESTOS DE SOPA NO ESGOTO',                a: 'RECUA 3 CASAS',  bg: '#1d4ed8', fg: '#fff',   dir: '◀', corrida: true },
  { n: 9,  t: 'PALAVRAS CRUZADAS DA ETAR!',               a: 'JOGA OUTRA VEZ', bg: '#166534', fg: '#fff',   dir: '▼', cruzadas: true },
  { n: 10, t: 'ESFREGÃO DA LOUÇA NO ESGOTO',             a: '1X SEM JOGAR (Separa Fluidos)',    bg: '#2563eb', fg: '#fff',   dir: '▼', separaFluidos: true },
  { n: 11, t: 'ALGODÃO NO LIXO INDIFERENCIADO',          a: 'AVANÇA 2 CASAS', bg: '#0d9488', fg: '#fff',   dir: '▼', detetivo: true },
  { n: 12, t: 'LUVAS DESCARTÁVEIS NO ESGOTO',            a: '1X SEM JOGAR (Prensa)',        bg: '#3b82f6', fg: '#fff',   dir: '▶', prensa: true },
  { n: 13, t: 'SEPARA O LIXO, SALVA O FUTURO!',          a: null,             bg: '#7c3aed', fg: '#fff',    dir: '▶' },
  { n: 14, t: 'CABELOS NO LIXO INDIFERENCIADO',          a: 'JOGA OUTRA VEZ', bg: '#db2777', fg: '#fff',   dir: '▶', desembaralha: true },
  { n: 15, t: 'RESTOS DE COMIDA NO LIXO INDIFERENCIADO', a: 'JOGA OUTRA VEZ', bg: '#ec4899', fg: '#fff',   dir: '▶', limpeza: true },
  { n: 16, t: 'TAMPÕES E PENSOS HIGIÉNICOS NA SANITA',   a: '1X SEM JOGAR (Sopa de Letras)', bg: '#f87171', fg: '#fff',   dir: '▲', sopaLetras: true },
  { n: 17, t: 'MÁSCARAS NO LIXO INDIFERENCIADO',         a: 'AVANÇA 1 CASA',  bg: '#7c3aed', fg: '#fff',   dir: '▲', viagem: true },
  { n: 18, t: 'CLASSIFICA OS RESÍDUOS DA ETAR!',           a: 'AVANÇA 2 CASAS', bg: '#38bdf8', fg: '#fff',   dir: '◀', classifica: true },
  { n: 19, t: 'MÁSCARAS NO LIXO INDIFERENCIADO',         a: 'AVANÇA 2 CASAS', bg: '#0ea5e9', fg: '#fff',   dir: '◀', labirinto: true },
  { n: 20, t: 'GUARDA A REDE DE SANEAMENTO!',              a: 'RECUA 2 CASAS',  bg: '#f59e0b', fg: '#fff',   dir: '◀', catcher: true },
  { n: 21, t: 'PEQUENAS AÇÕES, GRANDES MUDANÇAS!',       a: null,             bg: '#7c3aed', fg: '#fff',    dir: '▼' },
  { n: 22, t: 'VERDADEIRO OU FALSO — ETAR!',              a: 'RECUA 6 CASAS',  bg: '#0284c7', fg: '#fff',   dir: '▶', vf: true },
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

const ETAR_PECAS = [
  { id: 1, label: 'Gradagem',              emoji: '⚙️',  hint: 'Remove sólidos grandes' },
  { id: 2, label: 'Desarenação',           emoji: '🏖️',  hint: 'Retira areia e partículas' },
  { id: 3, label: 'Decantação Primária',   emoji: '🪣',  hint: 'Sedimenta sólidos suspensos' },
  { id: 4, label: 'Tratamento Biológico',  emoji: '🦠',  hint: 'Bactérias degradam matéria orgânica' },
  { id: 5, label: 'Decantação Secundária', emoji: '🌊',  hint: 'Separa lamas da água tratada' },
  { id: 6, label: 'Desinfeção',            emoji: '☀️',  hint: 'Elimina microrganismos patogénicos' },
]

function MinijogoMontaEtar({ jogador, cor, onResult }) {
  const [slots, setSlots] = useState(
    Array.from({ length: 6 }, (_, i) => ({ pos: i + 1, pieceId: null }))
  )
  const [shuffledPieces] = useState(() => shuffle([...ETAR_PECAS]))
  const [selected, setSelected] = useState(null)
  const [won, setWon] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [done, setDone] = useState(false)

  const placedIds = slots.map(s => s.pieceId).filter(Boolean)
  const poolPieces = shuffledPieces.filter(p => !placedIds.includes(p.id))

  useEffect(() => {
    if (!done && slots.every(s => s.pieceId === s.pos)) {
      setWon(true)
      setDone(true)
    }
  }, [slots, done])

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

  function handlePieceClick(pieceId) {
    if (done) return
    setSelected(prev => prev === pieceId ? null : pieceId)
  }

  function handleSlotClick(pos) {
    if (done) return
    const slot = slots[pos - 1]
    if (selected === null) {
      if (slot.pieceId !== null) {
        setSelected(slot.pieceId)
        setSlots(prev => prev.map(s => s.pos === pos ? { ...s, pieceId: null } : s))
      }
      return
    }
    const displaced = slot.pieceId
    setSlots(prev => prev.map(s => s.pos === pos ? { ...s, pieceId: selected } : s))
    setSelected(displaced)
  }

  const timerPct = (timeLeft / 30) * 100
  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '95vh', overflowY: 'auto' }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🏭 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Monta a ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Seleciona uma peça e coloca-a no slot correto (1 = entrada, 6 = saída).</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 15 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
              {/* Slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textAlign: 'center', marginBottom: 2 }}>🏭 ETAR (1→6)</div>
                {slots.map(slot => {
                  const piece = ETAR_PECAS.find(p => p.id === slot.pieceId)
                  const correct = slot.pieceId === slot.pos
                  const filled = slot.pieceId !== null
                  return (
                    <div
                      key={slot.pos}
                      onClick={() => handleSlotClick(slot.pos)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${filled ? (correct ? '#16a34a' : '#f59e0b') : selected !== null ? `${cor}88` : '#e5e7eb'}`,
                        background: filled ? (correct ? '#f0fdf4' : '#fffbeb') : selected !== null ? `${cor}0a` : '#f9fafb',
                        transition: 'all 0.12s', minHeight: 44,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', minWidth: 16 }}>{slot.pos}.</span>
                      {piece ? (
                        <>
                          <span style={{ fontSize: 20 }}>{piece.emoji}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', flex: 1, lineHeight: 1.2 }}>{piece.label}</span>
                          <span style={{ fontSize: 13 }}>{correct ? '✅' : '🔄'}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 10, color: '#cbd5e1', fontStyle: 'italic', flex: 1 }}>
                          {selected !== null ? 'Colocar aqui' : '—'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Piece pool */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textAlign: 'center', marginBottom: 2 }}>🧩 Peças</div>
                {poolPieces.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Todas colocadas!</div>
                ) : poolPieces.map(piece => (
                  <div
                    key={piece.id}
                    onClick={() => handlePieceClick(piece.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${selected === piece.id ? cor : '#e5e7eb'}`,
                      background: selected === piece.id ? `${cor}15` : '#f8fafc',
                      transform: selected === piece.id ? 'scale(1.03)' : 'none',
                      transition: 'all 0.12s', minHeight: 44,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{piece.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>{piece.label}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.3 }}>{piece.hint}</div>
                    </div>
                    {selected === piece.id && <span style={{ fontSize: 12, color: cor, fontWeight: 800 }}>●</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'ETAR montada!' : 'Tempo esgotado!'}
            </h3>
            {!won && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, textAlign: 'left', background: '#f0f9ff', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>Ordem correta das etapas:</div>
                {ETAR_PECAS.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', minWidth: 16 }}>{i + 1}.</span>
                    <span>{p.emoji}</span>
                    <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{p.label}</span>
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>— {p.hint}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Podes ficar na casa!' : '✖ Perdes a vez nesta ronda.'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Próximo Jogador'}
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

// Itens que NÃO devem ser clicados — pertencem à água limpa
const SAFE_AGUA = ['💧', '🌿', '🌊', '☁️', '🌧️', '❄️']

function MinijogoLimpeza({ jogador, cor, onResult }) {
  const [items, setItems] = useState(() =>
    shuffle([...LIXO_AGUA]).slice(0, 11).map((item, i) => ({
      uid: `t${i}`, emoji: item.emoji,
      x: 8 + Math.random() * 74, y: 8 + Math.random() * 74,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      removed: false,
    }))
  )
  const [timeLeft, setTimeLeft] = useState(14)
  const [done, setDone] = useState(false)
  const [handPos, setHandPos] = useState(null) // píxeis relativos à pool
  const poolRef = useRef(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const itemsRef = useRef(items)
  itemsRef.current = items

  const trashRemaining = items.filter(i => !i.removed).length
  const won = trashRemaining === 0

  function onMouseMove(e) {
    const rect = poolRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    mouseRef.current = { x: (px / rect.width) * 100, y: (py / rect.height) * 100 }
    setHandPos({ x: px, y: py })
  }
  function onTouchMove(e) {
    const rect = poolRef.current?.getBoundingClientRect()
    if (!rect || !e.touches[0]) return
    const px = e.touches[0].clientX - rect.left
    const py = e.touches[0].clientY - rect.top
    mouseRef.current = { x: (px / rect.width) * 100, y: (py / rect.height) * 100 }
    setHandPos({ x: px, y: py })
  }
  function onMouseLeave() { setHandPos(null) }

  // Physics loop — velocidade e fuga aumentadas
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      setItems(prev => prev.map(item => {
        if (item.removed) return item
        let { x, y, vx, vy } = item
        const dx = x - mx, dy = y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const FLEE = 17
        if (dist < FLEE && dist > 0.1) {
          const force = ((FLEE - dist) / FLEE) * 0.32
          vx += (dx / dist) * force
          vy += (dy / dist) * force
        }
        vx += (Math.random() - 0.5) * 0.07
        vy += (Math.random() - 0.5) * 0.07
        const spd = Math.sqrt(vx * vx + vy * vy)
        const MAX = 0.85
        if (spd > MAX) { vx = (vx / spd) * MAX; vy = (vy / spd) * MAX }
        x += vx; y += vy
        if (x < 4)  { x = 4;  vx =  Math.abs(vx) }
        if (x > 90) { x = 90; vx = -Math.abs(vx) }
        if (y < 4)  { y = 4;  vy =  Math.abs(vy) }
        if (y > 87) { y = 87; vy = -Math.abs(vy) }
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
    if (!done && trashRemaining === 0) setDone(true)
  }, [trashRemaining, done])

  function remove(uid) {
    if (done) return
    setItems(prev => prev.map(i => i.uid === uid ? { ...i, removed: true } : i))
  }

  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444'
  const TOTAL_TIME = 14

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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 15 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{trashRemaining} restantes</div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / TOTAL_TIME) * 100}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {/* Water pool */}
            <div
              ref={poolRef}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
              onTouchMove={onTouchMove}
              style={{
                position: 'relative', width: '100%', height: 300,
                background: 'linear-gradient(180deg,#38bdf8 0%,#0284c7 55%,#0369a1 100%)',
                borderRadius: 16, overflow: 'hidden', cursor: 'none',
                boxShadow: 'inset 0 -6px 20px rgba(0,0,0,0.2)',
                touchAction: 'none',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.05) 28px,rgba(255,255,255,0.05) 29px)' }} />

              {/* Mão a seguir o cursor */}
              {handPos && (
                <div style={{
                  position: 'absolute',
                  left: handPos.x, top: handPos.y,
                  transform: 'translate(-30%, -20%)',
                  fontSize: 28, pointerEvents: 'none', zIndex: 20,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  userSelect: 'none', lineHeight: 1,
                }}>🤏</div>
              )}

              {items.map(item => item.removed ? null : (
                <button
                  key={item.uid}
                  onClick={() => remove(item.uid)}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`, top: `${item.y}%`,
                    transform: 'translate(-50%,-50%)',
                    fontSize: 22, width: 42, height: 42,
                    background: 'rgba(255,255,255,0.25)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'none',
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
            <div style={{ fontSize: 52, marginBottom: 10 }}>
              {won ? '💧' : '⏰'}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Água limpa!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Podes jogar outra vez!' : `✖ Ficaram ${trashRemaining} itens na água.`}
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

// ─── Desembaralha a Palavra mini-game ────────────────────────────────────────

const PALAVRAS_ETAR = [
  { palavra: 'ETAR',       hint: 'Estação de tratamento de águas residuais' },
  { palavra: 'GRADAGEM',   hint: 'Primeira etapa — remove sólidos grandes' },
  { palavra: 'ESGOTO',     hint: 'Canalização que transporta águas usadas' },
  { palavra: 'LAMAS',      hint: 'Resíduo sólido produzido no tratamento' },
  { palavra: 'OXIGÉNIO',   hint: 'Gás fundamental no tratamento biológico' },
  { palavra: 'BACTÉRIA',   hint: 'Microrganismo que ajuda a limpar a água' },
  { palavra: 'CAPTAÇÃO',   hint: 'Recolha de água da natureza' },
  { palavra: 'RESIDUAL',   hint: 'Tipo de água que sai das casas' },
  { palavra: 'SANEAMENTO', hint: 'Sistema de gestão de esgotos' },
  { palavra: 'DESINFEÇÃO', hint: 'Etapa que elimina microrganismos' },
  { palavra: 'TURBIDEZ',    hint: 'Medida da limpidez da água' },
  { palavra: 'DECANTAÇÃO',  hint: 'Etapa onde os sólidos se depositam no fundo' },
  { palavra: 'FLOTAÇÃO',    hint: 'Processo que remove gorduras e óleos da água' },
  { palavra: 'AFLUENTE',    hint: 'Água residual que entra na ETAR' },
  { palavra: 'EFLUENTE',    hint: 'Água tratada que sai da ETAR para o rio' },
  { palavra: 'BIOGÁS',      hint: 'Gás produzido pelas bactérias ao tratar as lamas' },
  { palavra: 'ESCUMA',      hint: 'Matéria flutuante removida no pré-tratamento' },
  { palavra: 'FILTRAÇÃO',   hint: 'Passagem da água por filtros para remover impurezas' },
  { palavra: 'NITRATOS',    hint: 'Compostos de azoto eliminados no tratamento' },
  { palavra: 'CLORAGEM',    hint: 'Desinfeção da água com cloro' },
  { palavra: 'DIGESTÃO',    hint: 'Tratamento anaeróbio das lamas por bactérias' },
  { palavra: 'FÓSFORO',     hint: 'Nutriente poluente removido no tratamento terciário' },
]

function MinijogoDesembaralha({ jogador, cor, onResult }) {
  const TOTAL_LIVES = 1
  const WIN_SCORE = 5

  const [palavras] = useState(() => shuffle([...PALAVRAS_ETAR]).slice(0, WIN_SCORE))
  const [idx, setIdx] = useState(0)
  const [tiles, setTiles] = useState(() =>
    shuffle(palavras[0].palavra.split('').map((l, i) => ({ id: i, letter: l })))
  )
  const [tentativa, setTentativa] = useState([])
  const [lives, setLives] = useState(TOTAL_LIVES)
  const livesRef = useRef(TOTAL_LIVES)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [feedback, setFeedback] = useState(null)
  const [timeLeft, setTimeLeft] = useState(120)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)

  const currentPalavra = palavras[idx]
  const won = done && scoreRef.current === WIN_SCORE
  const placedIds = new Set(tentativa.map(t => t.id))
  const availableTiles = tiles.filter(t => !placedIds.has(t.id))

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

  function checkAnswer(nova) {
    const guess = nova.map(t => t.letter).join('')
    if (guess === currentPalavra.palavra) {
      scoreRef.current++
      setScore(scoreRef.current)
      setFeedback('correct')
      if (scoreRef.current === WIN_SCORE) {
        doneRef.current = true
        setTimeout(() => setDone(true), 900)
      } else {
        setTimeout(() => {
          const ni = idx + 1
          setIdx(ni)
          setTiles(shuffle(palavras[ni].palavra.split('').map((l, i) => ({ id: i, letter: l }))))
          setTentativa([])
          setFeedback(null)
        }, 900)
      }
    } else {
      const nl = Math.max(0, livesRef.current - 1)
      livesRef.current = nl
      setLives(nl)
      setFeedback('wrong')
      if (nl === 0) { doneRef.current = true; setTimeout(() => setDone(true), 900) }
      else {
        setTimeout(() => {
          setTiles(shuffle(currentPalavra.palavra.split('').map((l, i) => ({ id: i, letter: l }))))
          setTentativa([])
          setFeedback(null)
        }, 900)
      }
    }
  }

  function clickTile(tile) {
    if (feedback !== null || doneRef.current) return
    const nova = [...tentativa, tile]
    setTentativa(nova)
    if (nova.length === currentPalavra.palavra.length) checkAnswer(nova)
  }

  function undoLetter() {
    if (feedback !== null || tentativa.length === 0) return
    setTentativa(prev => prev.slice(0, -1))
  }

  const timerColor = timeLeft > 50 ? '#22c55e' : timeLeft > 25 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: cor, marginBottom: 2 }}>🔤 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Desembaralha a Palavra!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clica nas letras pela ordem certa para formar a palavra.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 50 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: TOTAL_LIVES }).map((_, i) => (
                    <span key={i} style={{ fontSize: 15 }}>{i < lives ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 120) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>⭐ Palavra {idx + 1} / {WIN_SCORE}</span>
              <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', maxWidth: '60%', textAlign: 'right' }}>💡 {currentPalavra.hint}</span>
            </div>

            {/* Answer area */}
            <div style={{
              display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap',
              minHeight: 56, padding: '10px 12px', borderRadius: 14,
              background: feedback === 'correct' ? '#dcfce7' : feedback === 'wrong' ? '#fee2e2' : '#f1f5f9',
              border: `2px solid ${feedback === 'correct' ? '#16a34a' : feedback === 'wrong' ? '#dc2626' : '#e5e7eb'}`,
              transition: 'all 0.2s',
            }}>
              {tentativa.length === 0
                ? <span style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>Clica nas letras abaixo…</span>
                : tentativa.map((t, i) => (
                  <div key={`${t.id}-${i}`} style={{
                    width: 36, height: 44, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: feedback === 'correct' ? '#16a34a' : feedback === 'wrong' ? '#dc2626' : cor,
                    color: '#fff', fontSize: 17, fontWeight: 900,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}>{t.letter}</div>
                ))
              }
            </div>

            {tentativa.length > 0 && !feedback && (
              <button onClick={undoLetter} style={{
                alignSelf: 'center', padding: '5px 14px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', background: '#f9fafb',
                fontSize: 11, color: '#6b7280', cursor: 'pointer', fontWeight: 600,
              }}>← Apagar última</button>
            )}

            {/* Scrambled tiles */}
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
              {availableTiles.map(tile => (
                <button
                  key={tile.id}
                  onClick={() => clickTile(tile)}
                  disabled={!!feedback}
                  style={{
                    width: 44, height: 52, borderRadius: 10,
                    border: `2px solid ${cor}`, background: '#fff',
                    color: cor, fontSize: 19, fontWeight: 900,
                    cursor: feedback ? 'default' : 'pointer',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.10)',
                    opacity: feedback ? 0.5 : 1, transition: 'transform 0.1s',
                  }}
                >{tile.letter}</button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💔'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Todas as palavras certas!' : 'Boa tentativa!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Palavras certas: ⭐ {scoreRef.current} / {WIN_SCORE}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>
              💡 Pratica para aprender o vocabulário das ETARs!
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Podes jogar outra vez!' : '✖ O teu turno passou.'}
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

// ─── Classifica Resíduos da ETAR mini-game ───────────────────────────────────

const RESIDUOS_ETAR_CLASS = [
  { id: 1, nome: 'Lamas',           emoji: '🟤', destino: 'agricultura', hint: 'Produzidas na decantação' },
  { id: 2, nome: 'Biogás',          emoji: '💨', destino: 'energia',     hint: 'Gás produzido pelas bactérias' },
  { id: 3, nome: 'Água tratada',    emoji: '💧', destino: 'rio',         hint: 'Saída final da ETAR' },
  { id: 4, nome: 'Areias',          emoji: '⏳', destino: 'aterro',      hint: 'Removidas na desarenação' },
  { id: 5, nome: 'Gorduras',        emoji: '🫙', destino: 'aterro',      hint: 'Removidas no pré-tratamento' },
  { id: 6, nome: 'Escumas',         emoji: '🫧', destino: 'aterro',      hint: 'Matéria flutuante' },
  { id: 7, nome: 'Composto orgânico', emoji: '🌿', destino: 'agricultura', hint: 'Lamas estabilizadas e tratadas' },
  { id: 8, nome: 'Calor recuperado', emoji: '🔥', destino: 'energia',   hint: 'Usado para aquecer a ETAR' },
]

const DESTINOS_ETAR = [
  { id: 'agricultura', nome: 'Agricultura', emoji: '🌱', cor: '#16a34a', desc: 'Adubo para campos' },
  { id: 'energia',     nome: 'Energia',     emoji: '⚡', cor: '#f59e0b', desc: 'Eletricidade ou calor' },
  { id: 'rio',         nome: 'Rio',         emoji: '🌊', cor: '#0ea5e9', desc: 'Devolvida à natureza' },
  { id: 'aterro',      nome: 'Aterro',      emoji: '🏔️', cor: '#6b7280', desc: 'Deposição controlada' },
]

function MinijogoClassificaResiduos({ jogador, cor, onResult }) {
  const WIN_SCORE = 5
  const TOTAL_LIVES = 1
  const TOTAL_TIME = 40

  const [items] = useState(() => shuffle([...RESIDUOS_ETAR_CLASS]))
  const [idx, setIdx] = useState(0)
  const [lives, setLives] = useState(TOTAL_LIVES)
  const livesRef = useRef(TOTAL_LIVES)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [chosenDest, setChosenDest] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)

  const currentItem = items[idx]
  const won = done && scoreRef.current >= WIN_SCORE

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

  function handleDestino(destinoId) {
    if (feedback !== null || doneRef.current) return
    const correct = destinoId === currentItem.destino
    setChosenDest(destinoId)
    setFeedback(correct ? 'correct' : 'wrong')

    if (correct) {
      scoreRef.current++
      setScore(scoreRef.current)
      if (scoreRef.current >= WIN_SCORE) {
        doneRef.current = true
        setTimeout(() => setDone(true), 900)
        return
      }
    } else {
      const nl = Math.max(0, livesRef.current - 1)
      livesRef.current = nl
      setLives(nl)
      if (nl === 0) { doneRef.current = true; setTimeout(() => setDone(true), 900); return }
    }

    setTimeout(() => {
      const ni = idx + 1
      if (ni >= items.length) { doneRef.current = true; setDone(true); return }
      setIdx(ni)
      setFeedback(null)
      setChosenDest(null)
    }, 900)
  }

  const timerColor = timeLeft > 20 ? '#22c55e' : timeLeft > 10 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>♻️ Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Classifica os Resíduos da ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Para onde vai cada resíduo produzido no tratamento?</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 20 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: TOTAL_LIVES }).map((_, i) => (
                    <span key={i} style={{ fontSize: 15 }}>{i < lives ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / TOTAL_TIME) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>⭐ {score} / {WIN_SCORE} certos</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Resíduo {idx + 1} / {items.length}</span>
            </div>

            {/* Item display */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '18px 24px', borderRadius: 16,
              background: feedback === 'correct' ? '#dcfce7' : feedback === 'wrong' ? '#fee2e2' : '#f0f9ff',
              border: `2px solid ${feedback === 'correct' ? '#16a34a' : feedback === 'wrong' ? '#dc2626' : '#bae6fd'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 56 }}>{currentItem.emoji}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f' }}>{currentItem.nome}</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>💡 {currentItem.hint}</div>
              {feedback === 'correct' && <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>✔ Correto!</div>}
              {feedback === 'wrong' && (
                <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                  ✖ Vai para {DESTINOS_ETAR.find(d => d.id === currentItem.destino)?.emoji} {DESTINOS_ETAR.find(d => d.id === currentItem.destino)?.nome}!
                </div>
              )}
            </div>

            {/* Destination buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DESTINOS_ETAR.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => handleDestino(dest.id)}
                  disabled={!!feedback}
                  style={{
                    padding: '12px 8px', borderRadius: 14, cursor: feedback ? 'default' : 'pointer',
                    border: `2.5px solid ${chosenDest === dest.id ? dest.cor : dest.cor + '55'}`,
                    background: chosenDest === dest.id
                      ? (feedback === 'correct' ? '#dcfce7' : '#fee2e2')
                      : `${dest.cor}10`,
                    opacity: feedback && chosenDest !== dest.id ? 0.5 : 1,
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{dest.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: dest.cor }}>{dest.nome}</span>
                  <span style={{ fontSize: 9, color: '#6b7280' }}>{dest.desc}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💔'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Ótima classificação!' : 'Vamos aprender mais!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Acertaste: ⭐ {scoreRef.current} / {WIN_SCORE}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, textAlign: 'left', background: '#f0f9ff', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 3 }}>Respostas corretas:</div>
              {RESIDUOS_ETAR_CLASS.map(item => {
                const dest = DESTINOS_ETAR.find(d => d.id === item.destino)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span>{item.emoji}</span>
                    <span style={{ fontWeight: 600, color: '#1e3a5f', flex: 1 }}>{item.nome}</span>
                    <span>→</span>
                    <span style={{ color: dest.cor, fontWeight: 700 }}>{dest.emoji} {dest.nome}</span>
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Avanças 2 casas!' : '✖ Ficas na casa atual.'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Avançar 2 Casas! 🎉' : 'Continuar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sniper do Esgoto mini-game ──────────────────────────────────────────────

// ─── Prensa de Lamas mini-game ────────────────────────────────────────────────

const PRENSA_IDEAL_MIN = 38
const PRENSA_IDEAL_MAX = 72
const PRENSA_DANGER    = 88
const PRENSA_TARGET_S  = 8
const PRENSA_TOTAL_S   = 14

function MinijogoPrensaLamas({ jogador, onResult }) {
  const [pressure, setPressure] = useState(15)
  const [timeLeft, setTimeLeft] = useState(PRENSA_TOTAL_S)
  const [goodTime, setGoodTime] = useState(0)
  const [done, setDone]         = useState(false)
  const [broken, setBroken]     = useState(false)
  const [won, setWon]           = useState(false)
  const holdingRef  = useRef(false)
  const pressureRef = useRef(15)
  const doneRef     = useRef(false)

  // Physics: pressure rises when held, falls when released
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const next = Math.max(0, Math.min(100, pressureRef.current + (holdingRef.current ? 2.4 : -1.6)))
      pressureRef.current = next
      setPressure(next)
      if (next >= 100 && !doneRef.current) {
        doneRef.current = true; setBroken(true); setDone(true)
      }
    }, 50)
    return () => clearInterval(id)
  }, [done])

  // Accumulate time in ideal zone
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      if (pressureRef.current >= PRENSA_IDEAL_MIN && pressureRef.current <= PRENSA_IDEAL_MAX) {
        setGoodTime(t => {
          const next = +(t + 0.2).toFixed(1)
          if (next >= PRENSA_TARGET_S && !doneRef.current) {
            doneRef.current = true; setWon(true); setDone(true)
          }
          return next
        })
      }
    }, 200)
    return () => clearInterval(id)
  }, [done])

  // Countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      setTimeLeft(t => {
        if (t <= 1) { if (!doneRef.current) { doneRef.current = true; setDone(true) } return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  const zone = pressure < PRENSA_IDEAL_MIN ? 'low'
             : pressure <= PRENSA_IDEAL_MAX ? 'ideal'
             : pressure <= PRENSA_DANGER    ? 'high'
             : 'danger'

  const gaugeColor = { low: '#60a5fa', ideal: '#16a34a', high: '#f59e0b', danger: '#dc2626' }[zone]
  const timerColor = timeLeft > 10 ? '#16a34a' : '#dc2626'
  const goalPct = Math.min(100, (goodTime / PRENSA_TARGET_S) * 100)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f', marginBottom: 2 }}>⚙️ Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Prensa de Lamas!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Carrega e solta o botão para manter a pressão na zona verde durante {PRENSA_TARGET_S}s.
                </div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 10 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            {/* Desidratação progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                <span>💧 Desidratação das lamas</span>
                <span>{Math.round(goalPct)}%</span>
              </div>
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99 }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${goalPct}%`, background: '#16a34a', transition: 'width 0.2s' }} />
              </div>
            </div>

            {/* Gauge + visual */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center' }}>
              {/* Vertical gauge */}
              <div style={{ position: 'relative', width: 42, height: 200, background: '#f1f5f9', borderRadius: 21, overflow: 'hidden', border: '2px solid #e5e7eb', flexShrink: 0 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${PRENSA_IDEAL_MIN}%`, height: `${PRENSA_IDEAL_MAX - PRENSA_IDEAL_MIN}%`, background: 'rgba(22,163,74,0.18)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${PRENSA_DANGER}%`, height: `${100 - PRENSA_DANGER}%`, background: 'rgba(220,38,38,0.15)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pressure}%`, background: `linear-gradient(0deg,${gaugeColor}bb,${gaugeColor})`, transition: 'height 0.05s, background 0.2s', borderRadius: '0 0 21px 21px' }} />
                <div style={{ position: 'absolute', left: 3, bottom: `${PRENSA_IDEAL_MIN}%`, width: 6, height: 2, background: '#16a34a' }} />
                <div style={{ position: 'absolute', left: 3, bottom: `${PRENSA_IDEAL_MAX}%`, width: 6, height: 2, background: '#16a34a' }} />
                <div style={{ position: 'absolute', left: 3, bottom: `${PRENSA_DANGER}%`, width: 6, height: 2, background: '#dc2626' }} />
              </div>

              {/* Sludge block */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 110, borderRadius: 10,
                  height: Math.round(110 - pressure * 0.55),
                  minHeight: 40,
                  background: 'linear-gradient(135deg,#78350f,#92400e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                  boxShadow: zone === 'ideal' ? '0 0 22px rgba(22,163,74,0.55)' : zone === 'danger' ? '0 0 22px rgba(220,38,38,0.6)' : '0 4px 14px rgba(0,0,0,0.3)',
                  transition: 'all 0.1s',
                }}>💩</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: gaugeColor, transition: 'color 0.2s' }}>
                  {Math.round(pressure)}%
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: gaugeColor, textAlign: 'center' }}>
                  {zone === 'ideal' ? '✅ Zona ideal!' : zone === 'danger' ? '⚠️ Vai partir!' : zone === 'high' ? '🔶 Pressão alta' : '📉 Pressão baixa'}
                </div>
              </div>
            </div>

            {/* Press button */}
            <button
              onPointerDown={() => { holdingRef.current = true }}
              onPointerUp={() => { holdingRef.current = false }}
              onPointerLeave={() => { holdingRef.current = false }}
              style={{
                padding: '18px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: zone === 'danger' ? '#dc2626' : zone === 'ideal' ? '#16a34a' : '#1e3a5f',
                color: '#fff', fontWeight: 800, fontSize: 18,
                boxShadow: '0 6px 20px rgba(0,0,0,0.2)', transition: 'background 0.2s',
                userSelect: 'none', touchAction: 'none',
              }}
            >
              🔧 PRESSIONAR
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
              Carrega para aumentar • Solta para diminuir • Não deixes chegar a 100%!
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{broken ? '💥' : won ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {broken ? 'A prensa partiu!' : won ? 'Lamas desidratadas!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              {broken ? 'Excesso de pressão — equipamento danificado.'
               : won   ? 'Desidratação completa com sucesso!'
               :         `Só desidrataste ${Math.round(goalPct)}% das lamas.`}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Ficas na casa!' : '✖ Perdes a próxima jogada.'}
            </p>
            <button onClick={() => onResult(won)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {won ? 'Continuar 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const ITENS_SNIPER_MAUS = ['🤧','🩹','🪮','💊','💉','🧤','🛍️','🩸','🍼','🚬']
const SNIPER_W = 340
const SNIPER_H = 280
const SNIPER_SZ = 44

function MinijogoSniperEsgoto({ jogador, onResult }) {
  const WIN_SCORE = 5
  const TOTAL_LIVES = 3
  const ITEM_MS = 3000

  const [items, setItems] = useState([])
  const itemsRef = useRef([])
  const [lives, setLives] = useState(TOTAL_LIVES)
  const livesRef = useRef(TOTAL_LIVES)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [flash, setFlash] = useState(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const timeLeftRef = useRef(30)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const itemIdRef = useRef(0)

  useEffect(() => {
    if (done) return
    const TICK = 50
    const id = setInterval(() => {
      if (doneRef.current) return
      const newItems = []
      let livesLost = 0
      for (const item of itemsRef.current) {
        const prog = item.progress + TICK / ITEM_MS
        let nx = item.x + item.vx, ny = item.y + item.vy
        let vx = item.vx, vy = item.vy
        if (nx < SNIPER_SZ / 2 || nx > SNIPER_W - SNIPER_SZ / 2) { vx = -vx; nx = item.x }
        if (ny < SNIPER_SZ / 2 || ny > SNIPER_H - SNIPER_SZ / 2) { vy = -vy; ny = item.y }
        if (prog >= 1) { if (item.type === 'mau') livesLost++; continue }
        newItems.push({ ...item, x: nx, y: ny, vx, vy, progress: prog })
      }
      itemsRef.current = newItems
      setItems([...newItems])
      if (livesLost > 0) {
        const nl = Math.max(0, livesRef.current - livesLost)
        livesRef.current = nl; setLives(nl)
        if (nl === 0 && !doneRef.current) { doneRef.current = true; setDone(true) }
      }
    }, TICK)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const isMau = Math.random() < 0.65
      const angle = Math.random() * Math.PI * 2
      const spd = 0.5 + Math.random() * 0.5
      itemsRef.current = [...itemsRef.current, {
        id: itemIdRef.current++,
        x: SNIPER_SZ / 2 + Math.random() * (SNIPER_W - SNIPER_SZ),
        y: SNIPER_SZ / 2 + Math.random() * (SNIPER_H - SNIPER_SZ),
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        type: isMau ? 'mau' : 'agua',
        emoji: isMau ? ITENS_SNIPER_MAUS[Math.floor(Math.random() * ITENS_SNIPER_MAUS.length)] : '💧',
        color: isMau ? '#ef4444' : '#38bdf8',
        progress: 0,
      }]
      setItems([...itemsRef.current])
    }, 1400)
    return () => clearInterval(id)
  }, [done])

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

  function shoot(item) {
    if (doneRef.current) return
    itemsRef.current = itemsRef.current.filter(i => i.id !== item.id)
    setItems([...itemsRef.current])
    if (item.type === 'mau') {
      scoreRef.current++; setScore(scoreRef.current)
      setFlash('good'); setTimeout(() => setFlash(null), 180)
      if (scoreRef.current >= WIN_SCORE && !doneRef.current) { doneRef.current = true; setDone(true) }
    } else {
      const nl = Math.max(0, livesRef.current - 1)
      livesRef.current = nl; setLives(nl)
      setFlash('bad'); setTimeout(() => setFlash(null), 180)
      if (nl === 0 && !doneRef.current) { doneRef.current = true; setDone(true) }
    }
  }

  const won = done && scoreRef.current >= WIN_SCORE
  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#f59e0b' : '#ef4444'
  const ringR = (SNIPER_SZ + 14) / 2
  const ringCirc = 2 * Math.PI * ringR

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {!done ? (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>🎯 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Sniper do Esgoto!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clica no lixo 🔴 antes que entre no esgoto. Não toques na água 💧!</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 15 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: TOTAL_LIVES }).map((_, i) => (
                    <span key={i} style={{ fontSize: 16 }}>{i < lives ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 30) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>🎯 Abatidos: {score} / {WIN_SCORE}</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>anel a fechar = tempo a esgotar</span>
            </div>
            <div style={{
              position: 'relative', width: SNIPER_W, maxWidth: '100%', height: SNIPER_H,
              background: flash === 'good' ? 'linear-gradient(180deg,#dcfce7,#bbf7d0)' : flash === 'bad' ? 'linear-gradient(180deg,#fee2e2,#fecaca)' : 'linear-gradient(160deg,#1e3a8a 0%,#0369a1 100%)',
              borderRadius: 16, overflow: 'hidden', cursor: 'crosshair',
              border: '3px solid #1d4ed8', transition: 'background 0.12s',
            }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.04) 40px,rgba(255,255,255,0.04) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.04) 40px,rgba(255,255,255,0.04) 41px)' }} />
              {items.map(item => {
                const sz = SNIPER_SZ + 14
                return (
                  <div key={item.id} onClick={() => shoot(item)} style={{
                    position: 'absolute', left: item.x, top: item.y, transform: 'translate(-50%,-50%)',
                    width: sz, height: sz, cursor: 'crosshair',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg style={{ position: 'absolute', width: sz, height: sz, transform: 'rotate(-90deg)' }}>
                      <circle cx={sz/2} cy={sz/2} r={ringR} fill="none" stroke={item.color} strokeWidth="3" opacity="0.25" />
                      <circle cx={sz/2} cy={sz/2} r={ringR} fill="none" stroke={item.color} strokeWidth="3"
                        strokeDasharray={ringCirc} strokeDashoffset={ringCirc * item.progress} />
                    </svg>
                    <div style={{
                      width: SNIPER_SZ, height: SNIPER_SZ, borderRadius: '50%',
                      background: `${item.color}22`, border: `2.5px solid ${item.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: SNIPER_SZ * 0.55,
                    }}>{item.emoji}</div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '💔'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Esgoto protegido!' : 'O esgoto foi comprometido!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Abatidos: 🎯 {scoreRef.current} / {WIN_SCORE}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>💡 Só a água deve entrar no esgoto — o lixo tem de ser retido!</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Podes ficar na casa!' : '✖ Perdes a vez nesta ronda.'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Depósito mini-game ───────────────────────────────────────────────────────

const DEP_FILL     = 0.5   // %/tick (100ms) da fonte → tanque 1
const DEP_TRANSFER = 0.75  // %/tick entre tanques quando válvula aberta
const DEP_MIN      = 50    // zona verde — mínimo
const DEP_MAX      = 85    // zona verde — máximo
const DEP_TIME     = 50    // segundos

const DEP_TANK_NAMES = ['Decantação\nPrimária', 'Tratamento\nBiológico', 'Decantação\nSecundária']

function DepTank({ name, level }) {
  const inZone   = level >= DEP_MIN && level <= DEP_MAX
  const overflow = level >= 98
  const waterColor = overflow
    ? 'linear-gradient(0deg,#dc2626,#ef4444)'
    : 'linear-gradient(0deg,#0284c7,#38bdf8)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a5f', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{name}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: overflow ? '#dc2626' : inZone ? '#16a34a' : '#6b7280' }}>
        {Math.round(level)}%
      </div>
      <div style={{
        width: 56, height: 150,
        border: '3px solid #1e3a5f', borderRadius: '4px 4px 8px 8px',
        position: 'relative', overflow: 'hidden', background: '#e0f2fe',
      }}>
        {/* Zona verde */}
        <div style={{
          position: 'absolute',
          bottom: `${DEP_MIN}%`, height: `${DEP_MAX - DEP_MIN}%`,
          left: 0, right: 0,
          background: 'rgba(34,197,94,0.18)',
          borderTop: '2px dashed #16a34a',
          borderBottom: '2px dashed #16a34a',
          pointerEvents: 'none',
        }} />
        {/* Água */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${level}%`,
          background: waterColor,
          transition: 'height 0.1s linear, background 0.3s',
        }} />
        {/* Linha de overflow */}
        <div style={{ position: 'absolute', top: 1, left: 0, right: 0, height: 2, background: '#dc2626', opacity: 0.6 }} />
      </div>
    </div>
  )
}

function DepValve({ open, onClick, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 28 }}>
      <button
        onClick={onClick}
        style={{
          width: 42, height: 42, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: open ? '#dcfce7' : '#fee2e2',
          border: `2px solid ${open ? '#16a34a' : '#dc2626'}`,
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 0 8px rgba(22,163,74,0.4)' : '0 0 8px rgba(220,38,38,0.3)',
          transition: 'all 0.15s',
        }}
      >{open ? '🔓' : '🔒'}</button>
      <div style={{ fontSize: 8, fontWeight: 700, color: open ? '#16a34a' : '#dc2626', textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

function MinijogoDeposito({ jogador, cor, onResult }) {
  const levelsRef = useRef([0, 0, 0])
  const valvesRef = useRef([true, false, false]) // [fonte→T1, T1→T2, T2→T3]
  const doneRef   = useRef(false)
  const [levels, setLevels]   = useState([0, 0, 0])
  const [valves, setValves]   = useState([true, false, false])
  const [timeLeft, setTimeLeft] = useState(DEP_TIME)
  const [done, setDone]       = useState(false)
  const [overflow, setOverflow] = useState(false)

  function toggleValve(idx) {
    if (doneRef.current) return
    const next = valvesRef.current.map((v, i) => i === idx ? !v : v)
    valvesRef.current = next
    setValves([...next])
  }

  // Física dos tanques
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const [v0, v1, v2] = valvesRef.current
      let [t1, t2, t3] = levelsRef.current

      if (v0) t1 += DEP_FILL
      if (v1 && t1 > 0) { const tr = Math.min(DEP_TRANSFER, t1); t1 -= tr; t2 += tr }
      if (v2 && t2 > 0) { const tr = Math.min(DEP_TRANSFER, t2); t2 -= tr; t3 += tr }

      if (t1 > 100 || t2 > 100 || t3 > 100) {
        levelsRef.current = [Math.min(100, t1), Math.min(100, t2), Math.min(100, t3)]
        setLevels([...levelsRef.current])
        doneRef.current = true
        setOverflow(true)
        setDone(true)
        return
      }
      levelsRef.current = [t1, t2, t3]
      setLevels([t1, t2, t3])
    }, 100)
    return () => clearInterval(id)
  }, [done])

  // Contador
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id)
          if (!doneRef.current) { doneRef.current = true; setDone(true) }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  function confirm() {
    if (doneRef.current) return
    doneRef.current = true
    setDone(true)
  }

  const allInZone = levels.every(l => l >= DEP_MIN && l <= DEP_MAX)
  const won = !overflow && allInZone
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>🏗️ Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Enche os Depósitos da ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Abre/fecha as válvulas para manter todos os tanques na <span style={{ color: '#16a34a', fontWeight: 700 }}>zona verde ({DEP_MIN}–{DEP_MAX}%)</span>. Se um transbordar, perdes!
                </div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 20 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            {/* Barra de tempo */}
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / DEP_TIME) * 100}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 10, color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#38bdf8', borderRadius: 2, display: 'inline-block' }} /> Água</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'rgba(34,197,94,0.3)', border: '1px dashed #16a34a', borderRadius: 2, display: 'inline-block' }} /> Zona alvo</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 4, background: '#dc2626', borderRadius: 2, display: 'inline-block' }} /> Overflow</span>
            </div>

            {/* Jogo */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6 }}>
              {/* Fonte */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 28 }}>
                <div style={{ fontSize: 24 }}>💧</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0284c7', textAlign: 'center' }}>Fonte</div>
              </div>

              <DepValve open={valves[0]} onClick={() => toggleValve(0)} label="V1" />
              <DepTank name={DEP_TANK_NAMES[0]} level={levels[0]} />
              <DepValve open={valves[1]} onClick={() => toggleValve(1)} label="V2" />
              <DepTank name={DEP_TANK_NAMES[1]} level={levels[1]} />
              <DepValve open={valves[2]} onClick={() => toggleValve(2)} label="V3" />
              <DepTank name={DEP_TANK_NAMES[2]} level={levels[2]} />
            </div>

            {allInZone && (
              <button
                onClick={confirm}
                style={{ padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14 }}
              >
                ✅ Confirmar — Todos na zona verde!
              </button>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : overflow ? '💦' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Depósitos cheios!' : overflow ? 'Transbordou!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Ficas na casa!' : '✖ Perdes a vez nesta ronda!'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Próximo Jogador'}
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

const ITENS_REDE_MAUS = [
  { emoji: '🤧' }, { emoji: '🩹' }, { emoji: '🪥' }, { emoji: '💊' },
  { emoji: '💉' }, { emoji: '🧤' }, { emoji: '🛍️' }, { emoji: '🧻' },
]

const GRADE_AREA_W = 340
const GRADE_AREA_H = 300
const GRADE_W = 105
const GRADE_H = 14
const GRADE_Y_POS = GRADE_AREA_H - 52
const GRADE_SPD = 14
const GRADE_ITEM_SZ = 36

function MinijogoGuardaRede({ jogador, onResult }) {
  const [gradeX, setGradeX] = useState(GRADE_AREA_W / 2 - GRADE_W / 2)
  const gradeXRef = useRef(GRADE_AREA_W / 2 - GRADE_W / 2)
  const [items, setItems] = useState([])
  const itemsRef = useRef([])
  const [lives, setLives] = useState(1)
  const livesRef = useRef(1)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [flash, setFlash] = useState(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const timeLeftRef = useRef(60)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const itemIdRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })

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

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const { left, right } = keysRef.current
      if (!left && !right) return
      const newX = Math.max(0, Math.min(GRADE_AREA_W - GRADE_W, gradeXRef.current + (left ? -GRADE_SPD : GRADE_SPD)))
      gradeXRef.current = newX
      setGradeX(newX)
    }, 16)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const spd = Math.min(2.5 + (60 - timeLeftRef.current) * 0.13, 8)
      const gx = gradeXRef.current
      const newItems = []
      let livesLost = 0
      let gained = 0
      let flashType = null

      for (const item of itemsRef.current) {
        const ny = item.y + spd
        const itemBottom = ny + GRADE_ITEM_SZ / 2
        const itemLeft   = item.x - GRADE_ITEM_SZ / 2
        const itemRight  = item.x + GRADE_ITEM_SZ / 2

        if (itemBottom >= GRADE_Y_POS && itemBottom <= GRADE_Y_POS + GRADE_H + spd &&
            itemRight >= gx && itemLeft <= gx + GRADE_W) {
          if (item.type === 'mau') { flashType = 'good' }           // apanhado — sem contagem
          else                     { livesLost++; flashType = 'bad' } // apanhou água — perde vida
          continue
        }
        if (ny > GRADE_AREA_H + GRADE_ITEM_SZ) {
          if (item.type === 'mau') { gained++; livesLost++; flashType = 'bad' } // passou — conta miss e perde vida
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
  }, [done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      if (doneRef.current) return
      const isMau = Math.random() < 0.58
      const newItem = {
        id: itemIdRef.current++,
        x: GRADE_ITEM_SZ / 2 + Math.random() * (GRADE_AREA_W - GRADE_ITEM_SZ),
        y: -GRADE_ITEM_SZ,
        type: isMau ? 'mau' : 'agua',
        emoji: isMau ? ITENS_REDE_MAUS[Math.floor(Math.random() * ITENS_REDE_MAUS.length)].emoji : '💧',
        color: isMau ? '#f87171' : '#38bdf8',
      }
      itemsRef.current = [...itemsRef.current, newItem]
      setItems([...itemsRef.current])
    }, 950)
    return () => clearInterval(id)
  }, [done])

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
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444'
  const areaBg = flash === 'good'
    ? 'linear-gradient(180deg,#bae6fd 0%,#0369a1 100%)'
    : flash === 'bad'
    ? 'linear-gradient(180deg,#fecaca 0%,#7f1d1d 60%,#0369a1 100%)'
    : 'linear-gradient(180deg,#bae6fd 0%,#0369a1 100%)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {!done ? (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', marginBottom: 2 }}>🔩 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Guarda a Rede!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Bloqueia o lixo 🔴 com a grade. <span style={{ color: '#dc2626', fontWeight: 700 }}>Não apanhes a água 💧!</span> Sobrevive 60s!
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 30 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 1 }).map((_, i) => (
                    <span key={i} style={{ fontSize: 16 }}>{i < lives ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, width: '100%' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 60) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: score > 0 ? '#dc2626' : '#374151' }}>⚠️ Falhaste: {score}</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>← → ou botões</span>
            </div>

            <div style={{
              position: 'relative', width: GRADE_AREA_W, maxWidth: '100%', height: GRADE_AREA_H,
              background: areaBg, borderRadius: 16, overflow: 'hidden',
              border: '3px solid #bae6fd', transition: 'background 0.15s',
            }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 56, height: 14, background: '#94a3b8', borderRadius: '0 0 6px 6px', zIndex: 2 }} />
              {items.map(item => (
                <div key={item.id} style={{
                  position: 'absolute', left: item.x, top: item.y,
                  transform: 'translate(-50%,-50%)',
                  width: GRADE_ITEM_SZ + 8, height: GRADE_ITEM_SZ + 8, borderRadius: '50%',
                  background: `${item.color}33`, border: `2.5px solid ${item.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: GRADE_ITEM_SZ * 0.65, lineHeight: 1,
                }}>{item.emoji}</div>
              ))}
              <div style={{
                position: 'absolute', left: gradeX, top: GRADE_Y_POS,
                width: GRADE_W, height: GRADE_H,
                background: 'repeating-linear-gradient(90deg,#475569 0px,#475569 6px,transparent 6px,transparent 10px)',
                borderRadius: 4, border: '2px solid #334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.15)' }} />
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
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Rede protegida!' : 'A rede foi comprometida!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Itens que passaram: ⚠️ {scoreRef.current}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>
              💡 As grades nas ETARs impedem que sólidos entrem na rede!
            </p>
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
  const [slots, setSlots] = useState(
    Array.from({ length: 7 }, (_, i) => ({ pos: i + 1, pieceId: null }))
  )
  const [shuffledPieces] = useState(() => shuffle([...CICLO_AGUA]))
  const [selected, setSelected] = useState(null)
  const [won, setWon] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [done, setDone] = useState(false)

  const placedIds = slots.map(s => s.pieceId).filter(Boolean)
  const poolPieces = shuffledPieces.filter(p => !placedIds.includes(p.id))

  useEffect(() => {
    if (!done && slots.every(s => s.pieceId === s.pos)) {
      setWon(true)
      setDone(true)
    }
  }, [slots, done])

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

  function handlePieceClick(pieceId) {
    if (done) return
    setSelected(prev => prev === pieceId ? null : pieceId)
  }

  function handleSlotClick(pos) {
    if (done) return
    const slot = slots[pos - 1]
    if (selected === null) {
      if (slot.pieceId !== null) {
        setSelected(slot.pieceId)
        setSlots(prev => prev.map(s => s.pos === pos ? { ...s, pieceId: null } : s))
      }
      return
    }
    const displaced = slot.pieceId
    setSlots(prev => prev.map(s => s.pos === pos ? { ...s, pieceId: selected } : s))
    setSelected(displaced)
  }

  const timerPct = (timeLeft / 60) * 100
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '95vh', overflowY: 'auto' }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🧩 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Ordena a Viagem da Água!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Seleciona uma etapa e coloca-a no slot correto (1 = início, 7 = fim).</div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 30 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
              {/* Slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textAlign: 'center', marginBottom: 2 }}>💧 Ciclo (1→7)</div>
                {slots.map(slot => {
                  const piece = CICLO_AGUA.find(p => p.id === slot.pieceId)
                  const correct = slot.pieceId === slot.pos
                  const filled = slot.pieceId !== null
                  return (
                    <div
                      key={slot.pos}
                      onClick={() => handleSlotClick(slot.pos)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${filled ? (correct ? '#16a34a' : '#f59e0b') : selected !== null ? `${cor}88` : '#e5e7eb'}`,
                        background: filled ? (correct ? '#f0fdf4' : '#fffbeb') : selected !== null ? `${cor}0a` : '#f9fafb',
                        transition: 'all 0.12s', minHeight: 42,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', minWidth: 16 }}>{slot.pos}.</span>
                      {piece ? (
                        <>
                          <span style={{ fontSize: 18 }}>{piece.emoji}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', flex: 1, lineHeight: 1.2 }}>{piece.label}</span>
                          <span style={{ fontSize: 12 }}>{correct ? '✅' : '🔄'}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 10, color: '#cbd5e1', fontStyle: 'italic', flex: 1 }}>
                          {selected !== null ? 'Colocar aqui' : '—'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Piece pool */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textAlign: 'center', marginBottom: 2 }}>🧩 Etapas</div>
                {poolPieces.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Todas colocadas!</div>
                ) : poolPieces.map(piece => (
                  <div
                    key={piece.id}
                    onClick={() => handlePieceClick(piece.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${selected === piece.id ? cor : '#e5e7eb'}`,
                      background: selected === piece.id ? `${cor}15` : '#f8fafc',
                      transform: selected === piece.id ? 'scale(1.03)' : 'none',
                      transition: 'all 0.12s', minHeight: 42,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{piece.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>{piece.label}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.3 }}>{piece.desc}</div>
                    </div>
                    {selected === piece.id && <span style={{ fontSize: 12, color: cor, fontWeight: 800 }}>●</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Ciclo completo!' : 'Tempo esgotado!'}
            </h3>
            {!won && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, textAlign: 'left', background: '#f0f9ff', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>Ordem correta:</div>
                {CICLO_AGUA.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', minWidth: 16 }}>{i + 1}.</span>
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

// ─── Palavras Cruzadas mini-game ─────────────────────────────────────────────

const PC_WORD_POOL = [
  { word: 'ETAR',     clue: 'Sigla: Estação de Tratamento de Águas Residuais' },
  { word: 'GRADE',    clue: 'Barreira que remove sólidos grandes na entrada da ETAR' },
  { word: 'AGUA',     clue: 'Líquido que a ETAR trata e devolve ao rio (sem acento)' },
  { word: 'LAMA',     clue: 'Resíduo sólido produzido durante o tratamento' },
  { word: 'LAMAS',    clue: 'Resíduos sólidos produzidos na ETAR' },
  { word: 'RIO',      clue: 'Para onde vai a água depois de ser tratada' },
  { word: 'SOLO',     clue: 'Terra que pode ser contaminada por esgotos' },
  { word: 'CANOS',    clue: 'Tubagens que transportam águas residuais' },
  { word: 'OLEO',     clue: 'Gordura que não deve ser deitada pelo ralo (sem acento)' },
  { word: 'SACO',     clue: 'Embalagem plástica que não deve ir para o esgoto' },
  { word: 'RALO',     clue: 'Por onde a água da pia vai para o esgoto' },
  { word: 'LODO',     clue: 'Resíduo acumulado no fundo dos tanques da ETAR' },
  { word: 'REDE',     clue: 'Sistema de canalizações do saneamento' },
  { word: 'AREIA',    clue: 'Material separado na etapa de desarenação' },
  { word: 'CHUVA',    clue: 'Água que cai do céu e pode entrar nos esgotos' },
  { word: 'FONTE',    clue: 'Local de captação de água limpa da natureza' },
  
  { word: 'VALA',     clue: 'Canal aberto que conduz águas residuais' },
  { word: 'ESGOTO',   clue: 'Canalização que transporta águas usadas' },
  { word: 'FILTRO',   clue: 'Remove impurezas que passaram pelos tanques' },
  { word: 'CLORO',    clue: 'Usado para desinfetar a água tratada (sem acento)' },
  { word: 'ESCUMA',   clue: 'Matéria flutuante removida no pré-tratamento' },
  { word: 'BIOGAS',   clue: 'Gás produzido pelas bactérias ao tratar as lamas' },
  { word: 'NITRATOS', clue: 'Compostos de azoto eliminados no tratamento' },
  { word: 'AFLUENTE', clue: 'Água residual que entra na ETAR' },
  { word: 'DRENO',    clue: 'Tubo que escoa a água do solo' },
  { word: 'RAMAL',    clue: 'Ligação da casa à rede de esgotos' },
  { word: 'ACIDO',    clue: 'pH abaixo de 7 — água ácida precisa de tratamento (sem acento)' },
  { word: 'FOSFORO',  clue: 'Nutriente poluente que a ETAR tem de remover (sem acento)' },
]

function pcCanPlace(cells, word, r, c, dir) {
  if (dir === 'H') {
    if (cells[`${r},${c - 1}`] !== undefined) return false
    if (cells[`${r},${c + word.length}`] !== undefined) return false
  } else {
    if (cells[`${r - 1},${c}`] !== undefined) return false
    if (cells[`${r + word.length},${c}`] !== undefined) return false
  }
  for (let i = 0; i < word.length; i++) {
    const rr = dir === 'H' ? r     : r + i
    const cc = dir === 'H' ? c + i : c
    const ex = cells[`${rr},${cc}`]
    if (ex !== undefined) {
      if (ex !== word[i]) return false
    } else {
      if (dir === 'H') {
        if (cells[`${rr - 1},${cc}`] !== undefined || cells[`${rr + 1},${cc}`] !== undefined) return false
      } else {
        if (cells[`${rr},${cc - 1}`] !== undefined || cells[`${rr},${cc + 1}`] !== undefined) return false
      }
    }
  }
  return true
}

function tryCrosswordLayout(words) {
  const cells = {}
  const placed = []
  const w0 = words[0]
  for (let i = 0; i < w0.word.length; i++) cells[`0,${i}`] = w0.word[i]
  placed.push({ ...w0, dir: 'H', row: 0, col: 0 })
  for (let wi = 1; wi < words.length; wi++) {
    const w = words[wi]
    let ok = false
    const anchors = shuffle([...placed])
    outer: for (const pw of anchors) {
      const newDir = pw.dir === 'H' ? 'V' : 'H'
      const candidates = []
      for (let pi = 0; pi < pw.word.length; pi++)
        for (let wi2 = 0; wi2 < w.word.length; wi2++)
          if (pw.word[pi] === w.word[wi2]) candidates.push({ pi, wi2 })
      for (const { pi, wi2 } of shuffle(candidates)) {
        const r = pw.dir === 'H' ? pw.row - wi2 : pw.row + pi
        const c = pw.dir === 'H' ? pw.col + pi  : pw.col - wi2
        if (pcCanPlace(cells, w.word, r, c, newDir)) {
          for (let i = 0; i < w.word.length; i++) {
            const rr = newDir === 'H' ? r     : r + i
            const cc = newDir === 'H' ? c + i : c
            cells[`${rr},${cc}`] = w.word[i]
          }
          placed.push({ ...w, dir: newDir, row: r, col: c })
          ok = true; break outer
        }
      }
    }
    if (!ok) return null
  }
  const minR = Math.min(...placed.map(p => p.row))
  const minC = Math.min(...placed.map(p => p.col))
  const norm = placed.map((p, i) => ({ ...p, row: p.row - minR, col: p.col - minC, id: i, num: i + 1 }))
  const maxR = Math.max(...norm.map(p => p.dir === 'V' ? p.row + p.word.length - 1 : p.row))
  const maxC = Math.max(...norm.map(p => p.dir === 'H' ? p.col + p.word.length - 1 : p.col))
  return { rows: maxR + 1, cols: maxC + 1, words: norm }
}

function buildCrossword(pool) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const selected = shuffle([...pool]).slice(0, 4)
    const result = tryCrosswordLayout(selected)
    if (result && result.rows <= 11 && result.cols <= 11) return result
  }
  // Guaranteed fallback: GRADE ↔ AREIA ↔ LAMA ↔ CANOS
  return {
    rows: 8, cols: 5,
    words: [
      { word: 'GRADE', clue: 'Barreira que remove sólidos grandes na entrada da ETAR', dir: 'H', row: 1, col: 0, id: 0, num: 1 },
      { word: 'AREIA', clue: 'Material separado na etapa de desarenação',              dir: 'V', row: 0, col: 1, id: 1, num: 2 },
      { word: 'LAMA',  clue: 'Resíduo sólido produzido durante o tratamento',          dir: 'H', row: 4, col: 0, id: 2, num: 3 },
      { word: 'CANOS', clue: 'Tubagens que transportam águas residuais',               dir: 'V', row: 3, col: 3, id: 3, num: 4 },
    ],
  }
}

function pcCellPos(w, i) {
  if (w.dir === 'H') return { r: w.row,     c: w.col + i }
  if (w.dir === 'V') return { r: w.row + i, c: w.col     }
  if (w.dir === 'D') return { r: w.row + i, c: w.col + i }
  if (w.dir === 'L') return { r: w.row + i, c: w.col - i }
  return { r: w.row, c: w.col + i }
}

function buildScenarioMap(words) {
  const map = {}
  for (const w of words) {
    for (let i = 0; i < w.word.length; i++) {
      const { r, c } = pcCellPos(w, i)
      const key = `${r},${c}`
      if (!map[key]) map[key] = { letter: w.word[i], wordIds: [] }
      map[key].wordIds.push(w.id)
      if (i === 0 && !map[key].num) map[key].num = w.num
    }
  }
  return map
}

function MinijogoPalavrasCruzadas({ jogador, cor, onResult }) {
  const [scenario]            = useState(() => buildCrossword(PC_WORD_POOL))
  const cellMap               = useState(() => buildScenarioMap(scenario.words))[0]
  const preRev                = useState(() => {
    const map  = buildScenarioMap(scenario.words)
    const keys = new Set()
    Object.entries(map).forEach(([k, v]) => { if (v.wordIds.length > 1) keys.add(k) })
    scenario.words.forEach(w => {
      [0, w.word.length - 1].forEach(i => {
        const { r, c } = pcCellPos(w, i)
        keys.add(`${r},${c}`)
      })
    })
    return keys
  })[0]
  const [solved, setSolved]   = useState(new Set())
  const [inputs, setInputs]   = useState(() => Object.fromEntries(scenario.words.map(w => [w.id, ''])))
  const [errors, setErrors]   = useState(new Set())
  const [timeLeft, setTimeLeft] = useState(115)
  const [done, setDone]       = useState(false)

  const allSolved = solved.size === scenario.words.length

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
    if (!done && allSolved) setDone(true)
  }, [allSolved, done])

  function normalize(s) {
    return s.toUpperCase().trim()
      .replace(/[ÀÁÂÃ]/g, 'A').replace(/[ÉÊ]/g, 'E')
      .replace(/[ÍÎ]/g, 'I').replace(/[ÓÔÕ]/g, 'O').replace(/[ÚÛ]/g, 'U')
  }

  function checkWord(wordId) {
    if (solved.has(wordId)) return
    const w = scenario.words.find(x => x.id === wordId)
    if (normalize(inputs[wordId]) === w.word) {
      setSolved(prev => new Set([...prev, wordId]))
    } else {
      setErrors(prev => new Set([...prev, wordId]))
      setTimeout(() => setErrors(prev => { const n = new Set(prev); n.delete(wordId); return n }), 700)
    }
  }

  function isCellRevealed(key) {
    const cell = cellMap[key]
    if (!cell) return false
    if (preRev.has(key)) return true
    return cell.wordIds.some(id => solved.has(id))
  }

  const timerColor = timeLeft > 42 ? '#22c55e' : timeLeft > 18 ? '#f59e0b' : '#ef4444'
  const CELL = 38

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '95vh', overflowY: 'auto' }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 2 }}>📝 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Palavras Cruzadas da ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Escreve cada palavra e clica ✔. As letras a cinzento são pistas!</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 30 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{solved.size}/{scenario.words.length}</div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / 115) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            {/* Grelha dinâmica */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${scenario.cols}, ${CELL}px)`,
                gridTemplateRows: `repeat(${scenario.rows}, ${CELL}px)`,
                gap: 2, background: '#1e3a5f', padding: 3, borderRadius: 8,
              }}>
                {Array.from({ length: scenario.rows }, (_, r) =>
                  Array.from({ length: scenario.cols }, (_, c) => {
                    const key = `${r},${c}`
                    const cell = cellMap[key]
                    const revealed = isCellRevealed(key)
                    const isInter = preRev.has(key)
                    return (
                      <div key={key} style={{
                        width: CELL, height: CELL,
                        background: cell ? '#fff' : '#1e3a5f',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', borderRadius: 3,
                      }}>
                        {cell?.num && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 7, fontWeight: 800, color: '#6b7280' }}>{cell.num}</span>}
                        {cell && (
                          <span style={{ fontSize: 16, fontWeight: 800, color: isInter ? '#9ca3af' : revealed ? '#166534' : '#fff' }}>
                            {(revealed || isInter) ? cell.letter : ''}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Pistas + inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenario.words.map(w => {
                const isSolved = solved.has(w.id)
                const isError  = errors.has(w.id)
                const dirLabel = w.dir === 'D' ? ' ↘' : w.dir === 'L' ? ' ↙' : ''
                return (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: isSolved ? '#166534' : '#1e3a5f', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{w.num}</div>
                    <div style={{ flex: 1, fontSize: 11, color: isSolved ? '#166534' : '#374151', textDecoration: isSolved ? 'line-through' : 'none' }}>
                      {w.clue}{dirLabel} <span style={{ color: '#9ca3af' }}>({w.word.length} letras)</span>
                    </div>
                    {!isSolved && (
                      <>
                        <input
                          value={inputs[w.id]}
                          onChange={e => setInputs(p => ({ ...p, [w.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && checkWord(w.id)}
                          maxLength={w.word.length}
                          style={{ width: w.word.length * 16 + 16, padding: '4px 8px', borderRadius: 8, border: `2px solid ${isError ? '#dc2626' : '#e5e7eb'}`, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', outline: 'none' }}
                        />
                        <button onClick={() => checkWord(w.id)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#166534', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>✔</button>
                      </>
                    )}
                    {isSolved && <span style={{ fontSize: 18 }}>✅</span>}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{allSolved ? '🎉' : '⏰'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {allSolved ? 'Palavras todas certas!' : 'Tempo esgotado!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{solved.size}/{scenario.words.length} palavras encontradas</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: allSolved ? '#16a34a' : '#dc2626' }}>
              {allSolved ? '✔ Podes jogar outra vez!' : '✖ Turno terminado.'}
            </p>
            <button onClick={() => onResult(allSolved)} style={{ padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: allSolved ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {allSolved ? 'Jogar Outra Vez! 🎲' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Verdadeiro ou Falso mini-game ───────────────────────────────────────────

const BANCO_PERGUNTAS_VF = [
  { q: 'As águas residuais são as águas usadas em casa que vão para o esgoto.',         r: true  },
  { q: 'Podemos deitar medicamentos pelo esgoto sem fazer mal ao ambiente.',            r: false },
  { q: 'A ETAR serve para limpar a água antes de a devolver ao rio.',                   r: true  },
  { q: 'Os cotonetes podem ser deitados na sanita.',                                    r: false },
  { q: 'As fraldas descartáveis devem ir para o lixo e nunca para a sanita.',          r: true  },
  { q: 'A primeira etapa de tratamento na ETAR chama-se Gradagem.',                    r: true  },
  { q: 'Podemos deitar óleo de cozinha pelo ralo da pia sem qualquer problema.',       r: false },
  { q: 'As bactérias ajudam a limpar a água no tratamento biológico da ETAR.',         r: true  },
  { q: 'A água tratada na ETAR pode ser devolvida ao rio sem poluir.',                  r: true  },
  { q: 'As toalhitas húmidas podem ir pela sanita porque se dissolvem na água.',       r: false },
  { q: 'Os pensos higiénicos e tampões devem ser deitados na sanita.',                 r: false },
  { q: 'A ETAR significa Estação de Tratamento de Águas Residuais.',                   r: true  },
  { q: 'As gorduras de cozinha não causam problemas nas canalizações.',                r: false },
  { q: 'Deitar lixo nos rios pode matar os peixes e contaminar a água.',               r: true  },
  { q: 'Os restos de comida podem ser deitados pelo ralo sem problemas.',              r: false },
  { q: 'A água da chuva e a água do esgoto são tratadas no mesmo local.',              r: false },
  { q: 'Seringas e agulhas usadas devem ser deitadas no lixo comum.',                 r: false },
  { q: 'A desinfeção é a última etapa do tratamento na ETAR antes do rio.',           r: true  },
  { q: 'As lamas produzidas na ETAR podem ser usadas como adubo na agricultura.',     r: true  },
  { q: 'Cabelos e pelos entopem as canalizações e não devem ir pelo ralo.',            r: true  },
  { q: 'A água do mar pode ser tratada numa ETAR normal para ficar potável.',          r: false },
  { q: 'Os plásticos deitados no esgoto podem chegar ao oceano e magoar animais.',    r: true  },
  { q: 'O tratamento biológico da ETAR usa microrganismos para limpar a água.',       r: true  },
  { q: 'As máscaras cirúrgicas podem ser deitadas na sanita.',                        r: false },
  { q: 'Poupar água em casa ajuda a reduzir a quantidade de águas residuais tratadas.', r: true },
  { q: 'A pastilha elástica pode ser deitada pela sanita porque é pequena.',            r: false },
  { q: 'O tratamento primário na ETAR remove sólidos que ficam em suspensão na água.', r: true  },
  { q: 'A água potável e a água residual são tratadas no mesmo tipo de estação.',       r: false },
  { q: 'Deitar tinta ou solventes pelo ralo pode contaminar os solos e os rios.',       r: true  },
  { q: 'As ETARs existem em todo o mundo para proteger o ambiente aquático.',           r: true  },
  { q: 'O esgoto doméstico contém apenas água — não tem micróbios perigosos.',          r: false },
  { q: 'Fechar a torneira enquanto lavas os dentes poupa centenas de litros por ano.',  r: true  },
  { q: 'O cheiro mau do esgoto é causado por gases produzidos por bactérias.',          r: true  },
  { q: 'A água tratada na ETAR pode ser reutilizada para regar jardins públicos.',      r: true  },
  { q: 'Um duche de 5 minutos gasta menos água do que um banho de banheira.',           r: true  },
  { q: 'As ETARs não precisam de eletricidade para funcionar.',                         r: false },
  { q: 'O esgoto não tratado lançado nos rios pode causar doenças nas pessoas.',        r: true  },
  { q: 'As lamas da ETAR não têm qualquer utilidade e são sempre incineradas.',         r: false },
  { q: 'Deitar areia de gato pela sanita pode entupir as canalizações.',                r: true  },
  { q: 'A AINTAR é responsável pelo saneamento e abastecimento de água na região.',     r: true  },
  { q: 'Um litro de óleo pode contaminar um milhão de litros de água.',                 r: true  },
  { q: 'As águas pluviais (chuva) têm sempre a mesma rede que as águas residuais.',     r: false },
  { q: 'A desinfeção com UV usa luz ultravioleta para eliminar micróbios da água.',     r: true  },
  { q: 'Quanto mais água gastamos em casa, menos trabalho têm as ETARs.',               r: false },
  { q: 'As esponjas de lavar a loiça não devem ser deitadas pelo ralo.',                r: true  },
  { q: 'É proibido ligar canos de águas residuais diretamente a linhas de água.',       r: true  },
  { q: 'A água subterrânea nunca pode ser contaminada pelos esgotos.',                  r: false },
  { q: 'Reparar uma torneira a pingar poupa até 30 litros de água por dia.',            r: true  },
  { q: 'O tratamento terciário da ETAR é facultativo e raramente utilizado.',           r: false },
]

function MinijogoVerdadeiroFalso({ jogador, cor, onResult }) {
  const [perguntas]             = useState(() => shuffle([...BANCO_PERGUNTAS_VF]).slice(0, 10))
  const [idx, setIdx]           = useState(0)
  const [timeLeft, setTimeLeft] = useState(6)
  const [flash, setFlash]       = useState(null) // 'correct' | 'wrong'
  const [done, setDone]         = useState(false)
  const [won, setWon]           = useState(false)
  const [errada, setErrada]     = useState(null) // pergunta que errou
  const doneRef                 = useRef(false)
  const timerIdRef              = useRef(null)

  const pergunta = perguntas[idx]

  function startTimer() {
    clearInterval(timerIdRef.current)
    timerIdRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerIdRef.current)
          if (!doneRef.current) responder(null) // tempo esgotado = errou
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerIdRef.current)
  }, [idx])

  function responder(escolha) {
    if (doneRef.current || flash) return
    clearInterval(timerIdRef.current)
    const correto = escolha === pergunta.r
    if (correto) {
      setFlash('correct')
      setTimeout(() => {
        setFlash(null)
        if (idx + 1 >= perguntas.length) {
          doneRef.current = true
          setWon(true)
          setDone(true)
        } else {
          setIdx(i => i + 1)
          setTimeLeft(6)
        }
      }, 600)
    } else {
      setFlash('wrong')
      setErrada(pergunta)
      setTimeout(() => {
        doneRef.current = true
        setDone(true)
      }, 1800)
    }
  }

  const timerPct = (timeLeft / 6) * 100
  const timerColor = timeLeft > 3 ? '#22c55e' : timeLeft > 1 ? '#f59e0b' : '#ef4444'
  const bgFlash = flash === 'correct' ? '#f0fdf4' : flash === 'wrong' ? '#fef2f2' : '#fff'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: bgFlash, borderRadius: 24, padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20, transition: 'background 0.2s' }}>
        {!done ? (
          <>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>✅❌ Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Verdadeiro ou Falso?</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Pergunta {idx + 1} de {perguntas.length}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 3 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: timerColor }}>{timeLeft}</div>
              </div>
            </div>

            {/* Barra de progresso das perguntas */}
            <div style={{ display: 'flex', gap: 4 }}>
              {perguntas.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i < idx ? '#16a34a' : i === idx ? cor : '#e5e7eb', transition: 'background 0.3s' }} />
              ))}
            </div>

            {/* Timer bar */}
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.4s' }} />
            </div>

            {/* Pergunta */}
            <div style={{
              background: '#f8fafc', borderRadius: 16, padding: '24px 20px',
              border: flash === 'correct' ? '2px solid #16a34a' : flash === 'wrong' ? '2px solid #dc2626' : '2px solid #e5e7eb',
              textAlign: 'center', transition: 'border-color 0.2s',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏭</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', lineHeight: 1.5, margin: 0 }}>
                {pergunta.q}
              </p>
              {flash === 'correct' && <div style={{ marginTop: 10, fontSize: 22 }}>✅ Correto!</div>}
              {flash === 'wrong'   && <div style={{ marginTop: 10, fontSize: 22 }}>❌ Errado!</div>}
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => responder(true)}
                disabled={!!flash}
                style={{
                  flex: 1, padding: '18px', borderRadius: 16, border: 'none', cursor: flash ? 'default' : 'pointer',
                  background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 18,
                  opacity: flash ? 0.5 : 1, transition: 'opacity 0.2s',
                  boxShadow: flash ? 'none' : '0 4px 12px rgba(22,163,74,0.4)',
                }}
              >✅ VERDADEIRO</button>
              <button
                onClick={() => responder(false)}
                disabled={!!flash}
                style={{
                  flex: 1, padding: '18px', borderRadius: 16, border: 'none', cursor: flash ? 'default' : 'pointer',
                  background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 18,
                  opacity: flash ? 0.5 : 1, transition: 'opacity 0.2s',
                  boxShadow: flash ? 'none' : '0 4px 12px rgba(220,38,38,0.4)',
                }}
              >❌ FALSO</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 10 }}>{won ? '🎉' : '❌'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>
              {won ? 'Respondeste a tudo certo!' : 'Resposta errada!'}
            </h3>
            {errada && (
              <div style={{ background: '#fef2f2', borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>A resposta correta era:</div>
                <p style={{ fontSize: 13, color: '#374151', margin: '0 0 6px 0', lineHeight: 1.4 }}>{errada.q}</p>
                <span style={{ fontSize: 14, fontWeight: 800, color: errada.r ? '#16a34a' : '#dc2626' }}>
                  {errada.r ? '✅ VERDADEIRO' : '❌ FALSO'}
                </span>
              </div>
            )}
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Ficas na casa!' : '✖ Recuas 6 casas!'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Recuar 6 Casas 😢'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ETAR Ordenar Processos mini-game ────────────────────────────────────────

const ETAPAS_ETAR = [
  { id: 1, label: 'Gradagem',              emoji: '⚙️',  desc: 'Grades removem sólidos grandes (panos, plásticos...)' },
  { id: 2, label: 'Desarenação',           emoji: '🏖️',  desc: 'Areia e partículas pesadas depositam-se no fundo' },
  { id: 3, label: 'Decantação Primária',   emoji: '🪣',  desc: 'Sólidos suspensos sedimentam e formam lamas primárias' },
  { id: 4, label: 'Tratamento Biológico',  emoji: '🦠',  desc: 'Bactérias degradam a matéria orgânica dissolvida' },
  { id: 5, label: 'Decantação Secundária', emoji: '🌊',  desc: 'Lamas ativadas separam-se da água tratada' },
  { id: 6, label: 'Desinfeção',            emoji: '☀️',  desc: 'Eliminação de microrganismos patogénicos (UV ou cloro)' },
  { id: 7, label: 'Rejeição no Rio',       emoji: '🌿',  desc: 'Água tratada e limpa regressa ao meio hídrico' },
]

// slots[0] is pre-filled (id=1), slots[1..6] start null
function MinijogoCanosEtar({ jogador, cor, onResult }) {
  const [pool, setPool] = useState(() => shuffle(ETAPAS_ETAR.slice(1)))
  const [slots, setSlots] = useState(() => [null, null, null, null, null, null]) // positions 2–7
  const [selected, setSelected] = useState(null) // id of selected pool card
  const [done, setDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(65)

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

  const allFilled = slots.every(s => s !== null)

  // Click a pool card
  function selectCard(itemId) {
    if (done) return
    setSelected(s => s === itemId ? null : itemId)
  }

  // Click a slot (index 0–5 = positions 2–7)
  function clickSlot(slotIdx) {
    if (done) return
    const current = slots[slotIdx]
    if (current !== null) {
      // Return card to pool
      const item = ETAPAS_ETAR.find(e => e.id === current)
      setSlots(prev => prev.map((s, i) => i === slotIdx ? null : s))
      setPool(prev => [...prev, item])
      setSelected(null)
      return
    }
    if (selected === null) return
    const item = ETAPAS_ETAR.find(e => e.id === selected)
    setSlots(prev => prev.map((s, i) => i === slotIdx ? selected : s))
    setPool(prev => prev.filter(p => p.id !== selected))
    setSelected(null)
  }

  function handleSubmit() {
    if (done) return
    setSubmitted(true)
    setDone(true)
  }

  // slots[i] should have ETAPAS_ETAR[i+1].id
  const isCorrect = submitted && slots.every((id, idx) => id === ETAPAS_ETAR[idx + 1].id)
  const timerPct = (timeLeft / 65) * 100
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444'
  const won = isCorrect
  const first = ETAPAS_ETAR[0]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '95vh', overflowY: 'auto' }}>
        {!done ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>🏭 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Ordena os Processos da ETAR!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Clica num processo e depois na posição correta. Clica numa posição preenchida para a devolver.
                </div>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 30 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
            </div>

            {/* Timer bar */}
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
            </div>

            {/* Pool — cards to pick from */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Processos disponíveis</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pool.map(item => {
                  const isSel = selected === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => selectCard(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                        background: isSel ? `${cor}18` : '#f8fafc',
                        border: isSel ? `2.5px solid ${cor}` : '2px solid #e5e7eb',
                        transform: isSel ? 'scale(1.05)' : 'none',
                        transition: 'all 0.12s',
                        userSelect: 'none',
                        minWidth: 140, flex: '1 1 140px',
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>{item.label}</div>
                        <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.3 }}>{item.desc}</div>
                      </div>
                    </div>
                  )
                })}
                {pool.length === 0 && (
                  <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Todos os processos foram colocados!</div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: '#e5e7eb' }} />

            {/* Slots — numbered positions */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Ordem da ETAR</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Slot 1 — pre-filled */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: '#f0fdf4', border: '2px solid #16a34a' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#16a34a', minWidth: 22, textAlign: 'center' }}>1</span>
                  <span style={{ fontSize: 20 }}>{first.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>{first.label}</div>
                    <div style={{ fontSize: 9, color: '#6b7280' }}>{first.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>Já revelado</span>
                </div>

                {/* Slots 2–7 */}
                {slots.map((filledId, idx) => {
                  const item = filledId !== null ? ETAPAS_ETAR.find(e => e.id === filledId) : null
                  const slotNum = idx + 2
                  const isEmpty = item === null
                  const isTarget = selected !== null && isEmpty
                  return (
                    <div
                      key={idx}
                      onClick={() => clickSlot(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 12,
                        background: isTarget ? `${cor}10` : isEmpty ? '#fafafa' : '#f0f9ff',
                        border: isTarget ? `2px dashed ${cor}` : isEmpty ? '2px dashed #d1d5db' : `2px solid ${cor}`,
                        cursor: (isEmpty && selected !== null) || !isEmpty ? 'pointer' : 'default',
                        transition: 'all 0.12s',
                        minHeight: 46,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 900, color: isEmpty ? '#d1d5db' : cor, minWidth: 22, textAlign: 'center' }}>{slotNum}</span>
                      {item ? (
                        <>
                          <span style={{ fontSize: 20 }}>{item.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>{item.label}</div>
                            <div style={{ fontSize: 9, color: '#6b7280' }}>{item.desc}</div>
                          </div>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>✕</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: isTarget ? cor : '#d1d5db', fontStyle: 'italic' }}>
                          {isTarget ? `Colocar aqui` : `Posição ${slotNum}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {allFilled && (
              <button
                onClick={handleSubmit}
                style={{ padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', background: cor, color: '#fff', fontWeight: 700, fontSize: 14 }}
              >
                ✅ Confirmar Ordem
              </button>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{!submitted ? '⏰' : won ? '🎉' : '❌'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {!submitted ? 'Tempo esgotado!' : won ? 'Ordem correta!' : 'Ordem errada!'}
            </h3>
            {!won && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, textAlign: 'left', background: '#f0f9ff', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>Ordem correta das etapas:</div>
                {ETAPAS_ETAR.map((item, idx) => (
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
              {won ? '✔ Ficas na casa!' : '✖ Recuas 6 casas!'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Recuar 6 Casas 😢'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sopa de Letras mini-game ─────────────────────────────────────────────────

const SL_CENARIOS = [
  {
    titulo: 'Processos da ETAR',
    emoji: '🏭',
    palavras: ['GRADE', 'BOMBA', 'LAMAS', 'FILTRO', 'ETAR', 'REATOR'],
    cor: '#0284c7',
  },
  {
    titulo: 'Não vai para a Sanita!',
    emoji: '🚽',
    palavras: ['TOALHITAS', 'TAMPAO', 'COTONETES', 'FRALDAS', 'CABELOS', 'PENSOS'],
    cor: '#dc2626',
  },
  {
    titulo: 'Água e Saneamento',
    emoji: '💧',
    palavras: ['ESGOTO', 'VALA', 'RESIDUOS', 'AFLUENTE', 'EFLUENTE', 'REDES'],
    cor: '#0d9488',
  },
  {
    titulo: 'Equipamentos da ETAR',
    emoji: '⚙️',
    palavras: ['BOMBA', 'CRIVO', 'REATOR', 'FILTRO', 'DIGESTOR', 'PRENSA'],
    cor: '#7c3aed',
  },
  {
    titulo: 'Ambiente e Saúde',
    emoji: '🌿',
    palavras: ['LIMPEZA', 'NATUREZA', 'SAUDE', 'RIO', 'VERDE', 'AGUA'],
    cor: '#16a34a',
  },
]

const SL_DIRS = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]]
const SL_ABC  = 'ABCDEFGHIJLMNOPQRSTUVXZ'

function gerarGrelha(palavras, tamanho = 10) {
  const grid   = Array.from({ length: tamanho }, () => Array(tamanho).fill(null))
  const placed = []

  for (const p of palavras) {
    let ok = false
    for (let t = 0; t < 400 && !ok; t++) {
      const [dr, dc] = SL_DIRS[Math.floor(Math.random() * SL_DIRS.length)]
      const r0 = Math.floor(Math.random() * tamanho)
      const c0 = Math.floor(Math.random() * tamanho)
      const er  = r0 + dr * (p.length - 1)
      const ec  = c0 + dc * (p.length - 1)
      if (er < 0 || er >= tamanho || ec < 0 || ec >= tamanho) continue
      let fits = true
      for (let i = 0; i < p.length; i++) {
        const r = r0 + dr * i, c = c0 + dc * i
        if (grid[r][c] !== null && grid[r][c] !== p[i]) { fits = false; break }
      }
      if (!fits) continue
      const cells = []
      for (let i = 0; i < p.length; i++) {
        const r = r0 + dr * i, c = c0 + dc * i
        grid[r][c] = p[i]
        cells.push({ r, c })
      }
      placed.push({ palavra: p, cells })
      ok = true
    }
  }

  for (let r = 0; r < tamanho; r++)
    for (let c = 0; c < tamanho; c++)
      if (grid[r][c] === null)
        grid[r][c] = SL_ABC[Math.floor(Math.random() * SL_ABC.length)]

  return { grid, placed }
}

function slLineCells(start, end) {
  if (!start || !end) return []
  const dr = Math.sign(end.r - start.r)
  const dc = Math.sign(end.c - start.c)
  const dR = Math.abs(end.r - start.r)
  const dC = Math.abs(end.c - start.c)
  if (dr === 0 && dc === 0) return [start]
  if (dr !== 0 && dc !== 0 && dR !== dC) return []
  const len = Math.max(dR, dC) + 1
  return Array.from({ length: len }, (_, i) => ({ r: start.r + dr * i, c: start.c + dc * i }))
}

function MinijogoSopaLetras({ jogador, cor, onResult }) {
  const [cenario]                     = useState(() => SL_CENARIOS[Math.floor(Math.random() * SL_CENARIOS.length)])
  const [{ grid, placed }]            = useState(() => gerarGrelha(cenario.palavras))
  const [encontradas, setEncontradas] = useState(() => new Set())
  const [selStart, setSelStart]       = useState(null)
  const [selHover, setSelHover]       = useState(null)
  const [timeLeft, setTimeLeft]       = useState(120)
  const [done, setDone]               = useState(false)
  const [won, setWon]                 = useState(false)

  const palavrasNaGrelha = placed.map(p => p.palavra)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setDone(true); setWon(false); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (!done && palavrasNaGrelha.length > 0 && encontradas.size === palavrasNaGrelha.length) {
      setDone(true)
      setWon(true)
    }
  }, [encontradas, done, palavrasNaGrelha.length])

  function handleCellClick(r, c) {
    if (done) return
    if (!selStart) {
      setSelStart({ r, c })
      return
    }
    if (selStart.r === r && selStart.c === c) {
      setSelStart(null); setSelHover(null); return
    }
    const cells = slLineCells(selStart, { r, c })
    if (cells.length >= 2) {
      const word  = cells.map(cell => grid[cell.r][cell.c]).join('')
      const wordR = word.split('').reverse().join('')
      const match = placed.find(p => !encontradas.has(p.palavra) && (p.palavra === word || p.palavra === wordR))
      if (match) setEncontradas(prev => new Set([...prev, match.palavra]))
    }
    setSelStart(null); setSelHover(null)
  }

  const selCells = slLineCells(selStart, selHover)

  const foundSet = new Set()
  for (const p of placed)
    if (encontradas.has(p.palavra)) p.cells.forEach(({ r, c }) => foundSet.add(`${r},${c}`))

  const timerPct   = (timeLeft / 120) * 100
  const timerColor = timeLeft > 60 ? '#22c55e' : timeLeft > 25 ? '#f59e0b' : '#ef4444'
  const SIZE = 10

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{won ? '🎉' : '⏰'}</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>
            {won ? 'Todas as palavras encontradas!' : 'Tempo esgotado!'}
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            {won
              ? 'Muito bem! Ficas na casa!'
              : `Encontraste ${encontradas.size} de ${palavrasNaGrelha.length} palavras. Saltas uma jogada!`}
          </p>
          <button onClick={() => onResult(won)} style={{
            padding: '14px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15,
          }}>
            {won ? 'Continuar 🎉' : 'Saltar turno 😢'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '14px 16px', width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '96vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cenario.cor, marginBottom: 2 }}>{cenario.emoji} Sopa de Letras — {jogador}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>{cenario.titulo}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clica na 1ª e na última letra de cada palavra</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: timeLeft > 60 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
        </div>

        {/* Timer bar */}
        <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background-color 0.5s' }} />
        </div>

        {/* Grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2, userSelect: 'none' }}
          onMouseLeave={() => { if (selStart) setSelHover(null) }}
        >
          {grid.map((row, r) => row.map((letter, c) => {
            const key     = `${r},${c}`
            const isFound = foundSet.has(key)
            const isStart = selStart?.r === r && selStart?.c === c
            const inSel   = !isFound && selCells.some(cell => cell.r === r && cell.c === c)
            return (
              <div
                key={key}
                onClick={() => handleCellClick(r, c)}
                onMouseEnter={() => { if (selStart) setSelHover({ r, c }) }}
                style={{
                  aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 'clamp(9px, 2vw, 14px)',
                  borderRadius: 4, cursor: 'pointer',
                  background: isFound ? '#bbf7d0' : isStart ? '#bfdbfe' : inSel ? '#dbeafe' : '#f8fafc',
                  color: isFound ? '#15803d' : isStart ? '#1d4ed8' : inSel ? '#1d4ed8' : '#374151',
                  border: `1px solid ${isFound ? '#86efac' : isStart ? '#93c5fd' : inSel ? '#bfdbfe' : '#e2e8f0'}`,
                  transition: 'background 0.1s',
                }}
              >
                {letter}
              </div>
            )
          }))}
        </div>

        {/* Word list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {palavrasNaGrelha.map(p => (
            <span key={p} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: encontradas.has(p) ? '#bbf7d0' : '#f1f5f9',
              color: encontradas.has(p) ? '#15803d' : '#64748b',
              textDecoration: encontradas.has(p) ? 'line-through' : 'none',
              border: `1px solid ${encontradas.has(p) ? '#86efac' : '#e2e8f0'}`,
            }}>
              {encontradas.has(p) ? '✓ ' : ''}{p}
            </span>
          ))}
        </div>

        {/* Progress + hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {encontradas.size}/{palavrasNaGrelha.length} palavras encontradas
          </div>
          {selStart && (
            <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>
              ✋ Clica na letra final
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Análise da Amostra mini-game ─────────────────────────────────────────────

const AMOSTRAS_AGUA = [
  { ph: 7.2, turbidez: 3,  sst: 12,  odor: 'Nenhum',  segura: true,  dica: 'Todos os parâmetros dentro dos limites! Água tratada e pronta.' },
  { ph: 4.1, turbidez: 58, sst: 130, odor: 'Forte',    segura: false, dica: 'pH ácido, turbidez e sólidos muito acima do limite legal.' },
  { ph: 7.8, turbidez: 6,  sst: 25,  odor: 'Fraco',    segura: true,  dica: 'Parâmetros dentro do aceitável. Água bem tratada.' },
  { ph: 10.8,turbidez: 72, sst: 190, odor: 'Intenso',  segura: false, dica: 'pH alcalino e valores muito acima do permitido pela lei.' },
  { ph: 6.5, turbidez: 9,  sst: 30,  odor: 'Nenhum',   segura: true,  dica: 'Ligeiramente no limite, mas dentro das normas legais.' },
  { ph: 7.3, turbidez: 85, sst: 210, odor: 'Moderado', segura: false, dica: 'Turbidez e sólidos muito acima do permitido. Tratamento insuficiente.' },
  { ph: 8.2, turbidez: 4,  sst: 18,  odor: 'Nenhum',   segura: true,  dica: 'Água muito bem tratada! Pode regressar ao rio.' },
  { ph: 5.2, turbidez: 11, sst: 42,  odor: 'Fraco',    segura: false, dica: 'pH ácido e sólidos suspensos acima do limite legal.' },
]

function isParamOk(key, value) {
  if (key === 'ph')       return value >= 6 && value <= 9
  if (key === 'turbidez') return value <= 10
  if (key === 'sst')      return value <= 35
  if (key === 'odor')     return ['Nenhum', 'Fraco'].includes(value)
  return true
}

function MinijogoAnaliseAmostra({ jogador, cor, onResult }) {
  const WIN_SCORE = 3
  const TOTAL_LIVES = 1
  const TOTAL_TIME = 35

  const [amostras] = useState(() => shuffle([...AMOSTRAS_AGUA]).slice(0, 5))
  const [idx, setIdx] = useState(0)
  const [lives, setLives] = useState(TOTAL_LIVES)
  const livesRef = useRef(TOTAL_LIVES)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [feedback, setFeedback] = useState(null)
  const [chosen, setChosen] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)

  const current = amostras[idx]
  const won = done && scoreRef.current >= WIN_SCORE

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

  function handleChoice(segura) {
    if (feedback !== null || doneRef.current) return
    const correct = segura === current.segura
    setChosen(segura)
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) {
      scoreRef.current++
      setScore(scoreRef.current)
      if (scoreRef.current >= WIN_SCORE) { doneRef.current = true; setTimeout(() => setDone(true), 1100); return }
    } else {
      const nl = Math.max(0, livesRef.current - 1)
      livesRef.current = nl
      setLives(nl)
      if (nl === 0) { doneRef.current = true; setTimeout(() => setDone(true), 1100); return }
    }
    setTimeout(() => {
      const ni = idx + 1
      if (ni >= amostras.length) { doneRef.current = true; setDone(true); return }
      setIdx(ni); setFeedback(null); setChosen(null)
    }, 1100)
  }

  const timerColor = timeLeft > 20 ? '#22c55e' : timeLeft > 10 ? '#f59e0b' : '#ef4444'
  const turbColor = current.turbidez > 25
    ? 'linear-gradient(180deg,#92400e 0%,#78350f 100%)'
    : current.turbidez > 10
    ? 'linear-gradient(180deg,#93c5fd 0%,#60a5fa 100%)'
    : 'linear-gradient(180deg,#38bdf8 0%,#0ea5e9 100%)'

  const params = [
    { key: 'ph',       emoji: '🧪', label: 'pH',       value: current.ph,       display: `${current.ph}`,           desc: 'Normal: 6 – 9' },
    { key: 'turbidez', emoji: '💧', label: 'Turbidez', value: current.turbidez, display: `${current.turbidez} NTU`, desc: 'Normal: < 10 NTU' },
    { key: 'sst',      emoji: '🟤', label: 'Sólidos',  value: current.sst,      display: `${current.sst} mg/L`,     desc: 'Normal: < 35 mg/L' },
    { key: 'odor',     emoji: '👃', label: 'Odor',     value: current.odor,     display: current.odor,              desc: 'Normal: Nenhum/Fraco' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '95vh', overflowY: 'auto' }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>🔬 Mini-Jogo — {jogador}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Análise da Amostra!</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Esta água pode voltar ao rio ou precisa de mais tratamento?</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: timeLeft > 20 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: TOTAL_LIVES }).map((_, i) => (
                    <span key={i} style={{ fontSize: 14 }}>{i < lives ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${(timeLeft / TOTAL_TIME) * 100}%`, background: timerColor, transition: 'width 1s linear' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>⭐ {score} / {WIN_SCORE} corretos</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Amostra {idx + 1} / {amostras.length}</span>
            </div>

            {/* Water sample visual */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af' }}>AMOSTRA Nº {idx + 1}</div>
                <div style={{
                  width: 52, height: 76,
                  borderRadius: '0 0 12px 12px',
                  background: turbColor,
                  border: '3px solid #cbd5e1', borderTop: 'none',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: 'inset 0 -4px 12px rgba(0,0,0,0.15)',
                }}>
                  {current.turbidez <= 10 && (
                    <>
                      <div style={{ position: 'absolute', bottom: 18, left: 10, width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.55)' }} />
                      <div style={{ position: 'absolute', bottom: 34, left: 30, width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.40)' }} />
                    </>
                  )}
                  {current.turbidez > 15 && (
                    <>
                      <div style={{ position: 'absolute', top: 16, left: 8,  width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,0.18)' }} />
                      <div style={{ position: 'absolute', top: 36, left: 28, width: 6, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.14)' }} />
                      <div style={{ position: 'absolute', top: 52, left: 14, width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.18)' }} />
                    </>
                  )}
                </div>
                <div style={{ width: 58, height: 7, borderRadius: '0 0 4px 4px', background: '#cbd5e1', border: '2px solid #94a3b8', borderTop: 'none' }} />
              </div>
            </div>

            {/* Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {params.map(({ key, emoji, label, value, display, desc }) => {
                const ok = isParamOk(key, value)
                return (
                  <div key={key} style={{
                    padding: '10px 12px', borderRadius: 12,
                    background: feedback !== null ? (ok ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
                    border: `2px solid ${feedback !== null ? (ok ? '#86efac' : '#fca5a5') : '#e5e7eb'}`,
                    display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.3s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 14 }}>{emoji}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: '#1e3a5f' }}>{display}</div>
                    <div style={{ fontSize: 9, color: '#9ca3af' }}>{desc}</div>
                    {feedback !== null && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: ok ? '#16a34a' : '#dc2626', marginTop: 1 }}>
                        {ok ? '✓ Dentro do limite' : '✗ Fora do limite'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {feedback !== null && (
              <div style={{
                padding: '10px 14px', borderRadius: 12,
                background: feedback === 'correct' ? '#dcfce7' : '#fee2e2',
                border: `1.5px solid ${feedback === 'correct' ? '#86efac' : '#fca5a5'}`,
                fontSize: 12, fontWeight: 600, color: '#1e3a5f', textAlign: 'center',
              }}>
                {feedback === 'correct' ? '✔ Correto! ' : '✖ Errado! '}{current.dica}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => handleChoice(true)}
                disabled={!!feedback}
                style={{
                  padding: '14px 8px', borderRadius: 14, cursor: feedback ? 'default' : 'pointer',
                  border: `2.5px solid ${chosen === true ? '#16a34a' : '#16a34a44'}`,
                  background: chosen === true ? (feedback === 'correct' ? '#dcfce7' : '#fee2e2') : '#f0fdf4',
                  opacity: feedback && chosen !== true ? 0.5 : 1, transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 26 }}>🌊</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a' }}>Devolver ao Rio</span>
                <span style={{ fontSize: 9, color: '#6b7280' }}>Água tratada ✅</span>
              </button>
              <button
                onClick={() => handleChoice(false)}
                disabled={!!feedback}
                style={{
                  padding: '14px 8px', borderRadius: 14, cursor: feedback ? 'default' : 'pointer',
                  border: `2.5px solid ${chosen === false ? '#dc2626' : '#dc262644'}`,
                  background: chosen === false ? (feedback === 'correct' ? '#dcfce7' : '#fee2e2') : '#fef2f2',
                  opacity: feedback && chosen !== false ? 0.5 : 1, transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 26 }}>⚗️</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>Mais Tratamento</span>
                <span style={{ fontSize: 9, color: '#6b7280' }}>Ainda não está pronta</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{won ? '🔬' : '💔'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
              {won ? 'Ótima análise!' : 'Precisas de estudar mais!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Acertaste: ⭐ {scoreRef.current} / {WIN_SCORE}</p>
            <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 14px', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 8 }}>📊 Limites legais da água tratada:</div>
              {[
                { emoji: '🧪', label: 'pH',       desc: 'Entre 6 e 9' },
                { emoji: '💧', label: 'Turbidez', desc: 'Menos de 10 NTU' },
                { emoji: '🟤', label: 'Sólidos',  desc: 'Menos de 35 mg/L' },
                { emoji: '👃', label: 'Odor',     desc: 'Nenhum ou Fraco' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 3 }}>
                  <span>{item.emoji}</span>
                  <span style={{ fontWeight: 600, color: '#1e3a5f', minWidth: 60 }}>{item.label}</span>
                  <span style={{ color: '#6b7280' }}>{item.desc}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: won ? '#16a34a' : '#dc2626' }}>
              {won ? '✔ Ficas na casa!' : '✖ Perdes a vez nesta ronda.'}
            </p>
            <button onClick={() => onResult(won)} style={{
              padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {won ? 'Continuar 🎉' : 'Próximo Jogador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Roda das Lamas mini-game ─────────────────────────────────────────────────

const RDL_ZONE_SIZES = [90, 75, 60, 45]
const RDL_SPEEDS     = [110, 150, 195, 245]

function rdlPolarXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function rdlSectorPath(cx, cy, r, startDeg, endDeg) {
  const s     = rdlPolarXY(cx, cy, r, startDeg)
  const e     = rdlPolarXY(cx, cy, r, endDeg)
  const span  = ((endDeg - startDeg) + 360) % 360
  const large = span > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

function rdlInZone(angle, zoneSize) {
  const a    = ((angle % 360) + 360) % 360
  const half = zoneSize / 2
  return a <= half || a >= 360 - half
}

function MinijogoRodaLamas({ jogador, onResult }) {
  const [round, setRound]               = useState(0)
  const [displayAngle, setDisplayAngle] = useState(180)
  const [spinning, setSpinning]         = useState(true)
  const [roundResult, setRoundResult]   = useState(null)
  const [score, setScore]               = useState(0)
  const [done, setDone]                 = useState(false)
  const [won, setWon]                   = useState(false)

  const angleRef    = useRef(180)
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)
  const spinningRef = useRef(true)
  const roundRef    = useRef(0)
  const scoreRef    = useRef(0)
  const missesRef   = useRef(0)

  useEffect(() => {
    angleRef.current    = 180
    lastTimeRef.current = null
    spinningRef.current = true
    setSpinning(true)
    setRoundResult(null)
    setDisplayAngle(180)

    function animate(time) {
      if (!spinningRef.current) return
      if (lastTimeRef.current !== null) {
        const delta = (time - lastTimeRef.current) / 1000
        angleRef.current = (angleRef.current + RDL_SPEEDS[roundRef.current] * delta) % 360
        setDisplayAngle(angleRef.current)
      }
      lastTimeRef.current = time
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [round])

  function stopWheel() {
    if (!spinningRef.current) return
    spinningRef.current = false
    setSpinning(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const hit = rdlInZone(angleRef.current, RDL_ZONE_SIZES[roundRef.current])
    setRoundResult(hit ? 'hit' : 'miss')
    if (hit) {
      scoreRef.current += 1
      setScore(scoreRef.current)
    } else {
      missesRef.current += 1
    }

    setTimeout(() => {
      if (missesRef.current >= 1) {
        setDone(true)
        setWon(false)
        return
      }
      const next = roundRef.current + 1
      if (next >= RDL_ZONE_SIZES.length) {
        setDone(true)
        setWon(scoreRef.current >= 2)
      } else {
        roundRef.current = next
        setRound(next)
      }
    }, 1300)
  }

  const CX          = 100
  const CY          = 100
  const R           = 82
  const zoneSize    = RDL_ZONE_SIZES[round]
  const half        = zoneSize / 2
  const needlePt    = rdlPolarXY(CX, CY, R - 6, displayAngle)
  const needleColor = roundResult === 'hit' ? '#16a34a' : roundResult === 'miss' ? '#dc2626' : '#1e3a5f'

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{won ? '🎉' : '🌀'}</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>
            {won ? 'Centrífuga dominada!' : 'Fora de controlo!'}
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            {won
              ? `Acertaste ${scoreRef.current} de 4 rondas! Ficas na casa!`
              : `Só acertaste ${scoreRef.current} de 4 rondas. Saltas uma jogada!`}
          </p>
          <button onClick={() => onResult(won)} style={{
            padding: '14px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: won ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15,
          }}>
            {won ? 'Continuar 🎉' : 'Saltar turno 😢'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '18px 20px', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>

        {/* Header */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 2 }}>🌀 Roda das Lamas — {jogador}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Para a centrífuga na zona verde!</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Ronda {round + 1}/4 · zona verde: {zoneSize}°</div>
        </div>

        {/* Round indicators */}
        <div style={{ display: 'flex', gap: 8 }}>
          {RDL_ZONE_SIZES.map((_, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              background: i < round ? '#f0fdf4' : i === round ? '#7c3aed' : '#f1f5f9',
              border: `2px solid ${i < round ? '#16a34a' : i === round ? '#7c3aed' : '#e2e8f0'}`,
              color: i === round ? '#fff' : i < round ? '#16a34a' : '#94a3b8',
              fontWeight: 800,
            }}>
              {i < round ? '✓' : i + 1}
            </div>
          ))}
        </div>

        {/* SVG Wheel */}
        <div style={{ position: 'relative' }}>
          <svg width={220} height={220} viewBox="0 0 200 200">
            <circle cx={CX} cy={CY} r={R} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
            <circle cx={CX} cy={CY} r={R * 0.62} fill="none" stroke="#e2e8f0" strokeWidth={1} strokeDasharray="5,4" />
            <path d={rdlSectorPath(CX, CY, R, 360 - half, half)} fill="#22c55e" opacity={0.25} />
            <path d={rdlSectorPath(CX, CY, R, 360 - half, half)} fill="none" stroke="#16a34a" strokeWidth={3} />
            <line x1={CX} y1={CY - R - 7} x2={CX} y2={CY - R + 5} stroke="#16a34a" strokeWidth={3.5} strokeLinecap="round" />
            {[0, 60, 120, 180, 240, 300].map(a => {
              const p = rdlPolarXY(CX, CY, R * 0.44, a)
              return <circle key={a} cx={p.x} cy={p.y} r={6} fill="#92400e" opacity={0.22} />
            })}
            <line x1={CX} y1={CY} x2={needlePt.x} y2={needlePt.y}
              stroke={needleColor} strokeWidth={4.5} strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={9} fill="#1e3a5f" />
            <circle cx={CX} cy={CY} r={4.5} fill="#7c3aed" />
          </svg>
          {roundResult && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, pointerEvents: 'none' }}>
              {roundResult === 'hit' ? '✅' : '❌'}
            </div>
          )}
        </div>

        {/* Stop button */}
        <button
          onClick={stopWheel}
          disabled={!spinning}
          style={{
            padding: '16px 52px', borderRadius: 16, border: 'none',
            cursor: spinning ? 'pointer' : 'default',
            background: spinning ? '#7c3aed' : '#e2e8f0',
            color: spinning ? '#fff' : '#94a3b8',
            fontWeight: 800, fontSize: 18,
            boxShadow: spinning ? '0 4px 16px #7c3aed55' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {spinning ? '⏹ PARAR' : roundResult === 'hit' ? '✅ Acertou!' : '❌ Falhou!'}
        </button>

        <div style={{ fontSize: 11, color: '#64748b' }}>
          Acertos: <strong style={{ color: '#7c3aed' }}>{score}/4</strong> — 1 erro = derrota imediata
        </div>
      </div>
    </div>
  )
}

// ─── Detetive do Esgoto mini-game ────────────────────────────────────────────

const DET_CASOS = [
  {
    emoji: '🔬',
    titulo: 'O Suspeito dos Ouvidos',
    pistas: [
      'Tenho uma haste de plástico no centro.',
      'Uso-me para limpar os ouvidos.',
      'Sou muito pequeno mas passo pelas grades da ETAR.',
      'Acabo nos oceanos e confundo-me com comida dos peixes.',
    ],
    culpado: 'Cotonete',
    opcoes: ['Cotonete', 'Algodão', 'Penso', 'Toalhita', 'Palito', 'Fósforo'],
  },
  {
    emoji: '🧻',
    titulo: 'O Sabotador das Tubagens',
    pistas: [
      'Pareço suave e inofensivo, mas nas tubagens sou terrível.',
      'Uso-me para limpar superfícies ou remover maquilhagem.',
      'Não me dissolvo na água como o papel higiénico.',
      'Em grupo formo "icebergs de gordura" nos esgotos.',
    ],
    culpado: 'Toalhita',
    opcoes: ['Toalhita', 'Lenço de Papel', 'Guardanapo', 'Algodão', 'Esponja', 'Fralda'],
  },
  {
    emoji: '🩹',
    titulo: 'O Inimigo Silencioso',
    pistas: [
      'Tenho adesivo e uma camada absorvente.',
      'Uso-me quando há um ferimento ou durante a menstruação.',
      'Bloqueo tubagens quando me atiram para a sanita.',
      'O meu lugar correto é no lixo indiferenciado.',
    ],
    culpado: 'Penso Higiénico',
    opcoes: ['Penso Higiénico', 'Tampão', 'Fralda', 'Toalhita', 'Gaze', 'Algodão'],
  },
  {
    emoji: '😷',
    titulo: 'O Viajante dos Mares',
    pistas: [
      'Protejo o rosto de vírus e bactérias.',
      'Sou feito de material sintético não biodegradável.',
      'Nos oceanos os golfinhos confundem-me com medusas.',
      'Nunca vou para a sanita nem para o chão.',
    ],
    culpado: 'Máscara',
    opcoes: ['Máscara', 'Viseira', 'Gaze', 'Toalhita', 'Lenço', 'Penso'],
  },
  {
    emoji: '🧤',
    titulo: 'O Intruso das Grades',
    pistas: [
      'Protejo as mãos de quem trabalha em limpezas ou hospitais.',
      'Sou feito de látex ou nitrilo.',
      'Numa ETAR fico preso nas grades de entrada.',
      'Depois de usar, o meu destino é o lixo indiferenciado.',
    ],
    culpado: 'Luva Descartável',
    opcoes: ['Luva Descartável', 'Penso', 'Máscara', 'Touca', 'Avental', 'Fralda'],
  },
  {
    emoji: '🍼',
    titulo: 'O Bebé Poluidor',
    pistas: [
      'Uso-me para proteger bebés.',
      'Sou feito de plástico e materiais absorventes.',
      'Quando chego à ETAR entalo nas bombas e máquinas.',
      'Pesado e volumoso, devo ir sempre para o lixo indiferenciado.',
    ],
    culpado: 'Fralda',
    opcoes: ['Fralda', 'Toalhita', 'Penso', 'Algodão', 'Lenço', 'Tampão'],
  },
]

function MinijogoDeitetivoEsgoto({ jogador, cor, onResult }) {
  const [caso]       = useState(() => DET_CASOS[Math.floor(Math.random() * DET_CASOS.length)])
  const [escolha, setEscolha] = useState(null)
  const [confirmado, setConfirmado] = useState(false)
  const [pistaIdx, setPistaIdx]     = useState(0)

  useEffect(() => {
    if (pistaIdx >= caso.pistas.length - 1) return
    const id = setTimeout(() => setPistaIdx(i => i + 1), 1200)
    return () => clearTimeout(id)
  }, [pistaIdx, caso.pistas.length])

  const acertou = confirmado && escolha === caso.culpado

  function confirmar() {
    if (!escolha) return
    setConfirmado(true)
  }

  if (confirmado) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{acertou ? '🕵️' : '❌'}</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>
            {acertou ? 'Caso Resolvido!' : 'Mistério por Resolver...'}
          </h3>
          {!acertou && (
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              O culpado era o <strong style={{ color: '#dc2626' }}>{caso.culpado}</strong>!
            </p>
          )}
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            {acertou ? 'Excelente detetive! Avança 2 casas!' : 'Fica na casa e tenta na próxima vez.'}
          </p>
          <button onClick={() => onResult(acertou)} style={{
            padding: '14px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: acertou ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15,
          }}>
            {acertou ? 'Avançar 2 casas 🎉' : 'Continuar 😢'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '18px 20px', width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '96vh', overflowY: 'auto' }}>

        {/* Header */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>🕵️ Detetive do Esgoto — {jogador}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f' }}>{caso.emoji} {caso.titulo}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Lê as pistas e descobre o culpado!</div>
        </div>

        {/* Pistas */}
        <div style={{ background: '#1e293b', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {caso.pistas.map((p, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              opacity: i <= pistaIdx ? 1 : 0,
              transform: i <= pistaIdx ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.4s, transform 0.4s',
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>#{i + 1}</span>
              <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>

        {/* Opções */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {caso.opcoes.map(op => (
            <button
              key={op}
              onClick={() => setEscolha(op)}
              style={{
                padding: '10px 12px', borderRadius: 12, border: `2px solid ${escolha === op ? '#0284c7' : '#e2e8f0'}`,
                background: escolha === op ? '#eff6ff' : '#f8fafc',
                color: escolha === op ? '#0284c7' : '#374151',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              {escolha === op ? '✔ ' : ''}{op}
            </button>
          ))}
        </div>

        {/* Confirmar */}
        <button
          onClick={confirmar}
          disabled={!escolha}
          style={{
            padding: '13px', borderRadius: 14, border: 'none',
            background: escolha ? '#0284c7' : '#e2e8f0',
            color: escolha ? '#fff' : '#9ca3af',
            fontWeight: 800, fontSize: 14, cursor: escolha ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          🔍 Acusar!
        </button>
      </div>
    </div>
  )
}

// ─── 3D Player Token ──────────────────────────────────────────────────────────

const TOKEN_PALETTE = [
  { base: '#0ea5e9', light: '#e0f2fe', dark: '#0369a1', glow: 'rgba(14,165,233,0.85)' },
  { base: '#16a34a', light: '#dcfce7', dark: '#14532d', glow: 'rgba(22,163,74,0.85)'  },
  { base: '#dc2626', light: '#fee2e2', dark: '#991b1b', glow: 'rgba(220,38,38,0.85)'  },
  { base: '#9333ea', light: '#f3e8ff', dark: '#581c87', glow: 'rgba(147,51,234,0.85)' },
]

// SVG viewBox 100×110 — poop built from overlapping circles + radial gradients

function Peca({ playerIdx, moving, active }) {
  const pal  = TOKEN_PALETTE[playerIdx % TOKEN_PALETTE.length]
  const size = moving ? 54 : 38   // larger for visibility
  const gid  = `pg${playerIdx}`

  const glowFilter = moving
    ? 'drop-shadow(0 0 14px rgba(251,191,36,0.95)) drop-shadow(0 4px 10px rgba(0,0,0,0.7))'
    : active
    ? `drop-shadow(0 0 8px ${pal.glow}) drop-shadow(0 3px 8px rgba(0,0,0,0.55))`
    : 'drop-shadow(0 3px 8px rgba(0,0,0,0.6))'

  const anim = moving
    ? 'tokenBounce 0.75s cubic-bezier(0.22,0.61,0.36,1) forwards'
    : active
    ? 'tokenSpin 3s ease-in-out infinite'
    : 'tokenFloat 4s ease-in-out infinite'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flexShrink: 0, zIndex: moving ? 22 : 1,
    }}>
      <div style={{ animation: anim, filter: glowFilter, transition: 'filter 0.3s' }}>
        <svg width={size} height={Math.round(size * 1.15)}
          viewBox="0 0 100 115"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* userSpaceOnUse with absolute coords — correct for radialGradient */}
            <radialGradient id={`${gid}g`} cx="34" cy="24" r="72" fx="34" fy="24"
              gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#cc7a28" />
              <stop offset="32%"  stopColor="#8b4513" />
              <stop offset="72%"  stopColor="#4c2008" />
              <stop offset="100%" stopColor="#2a1003" />
            </radialGradient>
          </defs>

          {/* ── BODY (overlapping circles — widest at base, spiralling up) ── */}
          <ellipse cx="50" cy="98" rx="46" ry="16"  fill={`url(#${gid}g)`} />
          <circle  cx="50" cy="77" r="34"            fill={`url(#${gid}g)`} />
          <circle  cx="26" cy="56" r="23"            fill={`url(#${gid}g)`} />
          <circle  cx="66" cy="50" r="22"            fill={`url(#${gid}g)`} />
          <ellipse cx="57" cy="30" rx="18" ry="24"
            transform="rotate(-12 57 30)"             fill={`url(#${gid}g)`} />
          <circle  cx="59" cy="9"  r="12"            fill={`url(#${gid}g)`} />

          {/* ── GLOSSY HIGHLIGHT (upper-left convex sheen) ── */}
          <ellipse cx="37" cy="50" rx="15" ry="10"
            transform="rotate(-22 37 50)"
            fill="rgba(255,255,255,0.16)" />
          {/* Secondary highlight on tip */}
          <ellipse cx="54" cy="6" rx="6" ry="4"
            fill="rgba(255,255,255,0.20)" />

          {/* ── PLAYER BLUSH CHEEKS (identifies player) ── */}
          <ellipse cx="20" cy="84" rx="10" ry="7" fill={pal.base} opacity="0.50" />
          <ellipse cx="80" cy="84" rx="10" ry="7" fill={pal.base} opacity="0.50" />

          {/* ── EYES ── */}
          <circle cx="35"  cy="76" r="12"   fill="white" />
          <circle cx="65"  cy="76" r="12"   fill="white" />
          <circle cx="37"  cy="78" r="7.5"  fill="#1a0800" />
          <circle cx="67"  cy="78" r="7.5"  fill="#1a0800" />
          {/* Pupil shine */}
          <circle cx="35"  cy="75" r="3"    fill="rgba(255,255,255,0.90)" />
          <circle cx="65"  cy="75" r="3"    fill="rgba(255,255,255,0.90)" />

          {/* ── SMILE WITH TEETH ── */}
          {/* White teeth fill */}
          <path d="M 30 90 Q 50 107 71 90" fill="white" />
          {/* Gum / inside mouth */}
          <path d="M 30 90 Q 50 97 71 90"  fill="#2a1003" />
          {/* Outline */}
          <path d="M 30 90 Q 50 107 71 90"
            fill="none" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Player colour ring */}
      <div style={{
        width: size * 1.3, height: size * 0.22,
        borderRadius: '50%', marginTop: -size * 0.05,
        border: `${moving ? 2.5 : active ? 2 : 1.5}px solid ${moving ? '#fbbf24' : pal.light}`,
        boxShadow: moving
          ? '0 0 12px rgba(251,191,36,0.9)'
          : `0 0 ${active ? 8 : 3}px ${pal.glow}`,
        opacity: moving || active ? 1 : 0.65,
        animation: active || moving ? 'glowPulse 1.2s ease-in-out infinite' : 'none',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

function TiltCell({ children, row, col }) {
  const ref      = useRef(null)
  const shineRef = useRef(null)

  function onMove(e) {
    const r  = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width  - 0.5   // -0.5 … 0.5
    const py = (e.clientY - r.top)  / r.height - 0.5
    ref.current.style.transform  = `perspective(700px) rotateY(${px * 13}deg) rotateX(${py * -13}deg) scale(1.035)`
    ref.current.style.transition = 'transform 0.06s ease-out'
    if (shineRef.current) {
      shineRef.current.style.opacity    = '1'
      shineRef.current.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.22), transparent 65%)`
    }
  }

  function onLeave() {
    ref.current.style.transform  = 'perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)'
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,0.68,0.35,1)'
    if (shineRef.current) shineRef.current.style.opacity = '0'
  }

  return (
    <div
      ref={ref}
      data-boardcell="true"
      style={{ gridRow: row, gridColumn: col, position: 'relative', transformStyle: 'preserve-3d' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div ref={shineRef} style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        pointerEvents: 'none', zIndex: 28, opacity: 0,
        transition: 'opacity 0.15s, background 0.1s',
      }} />
      {children}
    </div>
  )
}

function Tabuleiro({ posicoes, turnoMovendo, turnoAtual, onCasaClick }) {
  const gridRef = useRef(null)

  useGSAP(() => {
    gsap.from('[data-boardcell]', {
      scale: 0.45,
      opacity: 0,
      y: 24,
      rotateZ: -4,
      duration: 0.5,
      stagger: 0.038,
      ease: 'back.out(1.7)',
      clearProps: 'transform,opacity',
    })
  }, { scope: gridRef, dependencies: [] })

  return (
    <div ref={gridRef} style={{
      background: 'linear-gradient(145deg,#1a472a 0%,#0d3320 50%,#133426 100%)',
      borderRadius: 24, padding: 18, width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 0 40px rgba(0,0,0,0.3)',
    }}>
      {/* Wooden frame */}
      <div style={{
        background: 'linear-gradient(145deg,#8B6914 0%,#A47C18 25%,#6B4F0F 50%,#9A7218 75%,#7A5C10 100%)',
        borderRadius: 18, padding: 12, width: '100%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,0,0.3)',
        border: '1px solid rgba(255,200,50,0.35)',
      }}>
        {/* Parchment surface */}
        <div style={{
          background: 'linear-gradient(160deg,#fdf8f0 0%,#f5ead5 50%,#ede0c0 100%)',
          borderRadius: 12, padding: 10, width: '100%',
        }}>
          <LayoutGroup id="board">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px', width: '100%',
          }}>

            {casas.map(c => {
              const aqui = posicoes.map((_, i) => i).filter(i => posicoes[i] === c.n)
              const hasPlayer = aqui.length > 0
              const isPurple = c.bg === '#7c3aed'
              return (
                <TiltCell key={c.n} row={GRID_POS[c.n][0]} col={GRID_POS[c.n][1]}>
                <div
                  onClick={() => onCasaClick?.(c)}
                  style={{
                  background: c.bg, color: c.fg, position: 'relative',
                  boxShadow: hasPlayer
                    ? `0 1px 0 rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px ${c.bg}aa`
                    : '0 4px 0 rgba(0,0,0,0.22), 0 6px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
                  transform: hasPlayer ? 'translateY(-3px)' : 'none',
                  transition: 'transform 0.35s ease, box-shadow 0.35s ease',
                  animation: isPurple ? 'shimmerPurple 3s ease-in-out infinite' : undefined,
                  height: '100%',
                  cursor: onCasaClick ? 'pointer' : 'default',
                }}
                  className="rounded-xl p-3 flex flex-col items-center text-center border border-white/20 min-h-[148px]"
                >
                  {/* Sheen */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
                    background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)',
                    borderRadius: '9px 9px 0 0', pointerEvents: 'none',
                  }} />
                  <div className="flex justify-between w-full mb-1" style={{ position: 'relative', zIndex: 1 }}>
                    <span className="text-[12px] font-black opacity-75">{c.n}</span>
                    <span className="text-base leading-none opacity-80">{(c.minijogo || c.analise || c.detetivo) ? '🎮' : c.dir}</span>
                  </div>
                  <div className="text-[10px] font-bold leading-tight flex-1 flex items-center justify-center px-1" style={{ position: 'relative', zIndex: 1 }}>
                    {c.t}
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {c.labirinto
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🌀 AVANÇA 2 (LABIRINTO)</div>
                      : c.limpeza
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🚿 JOGA OUTRA VEZ (LIMPEZA)</div>
                      : c.corrida
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🏃 RECUA 3 (CORRIDA)</div>
                      : c.catcher
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🔩 RECUA 2 (GRADE)</div>
                      : c.diferencas
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🔍 DIFERENÇAS (RECUA {c.diferencas})</div>
                      : c.viagem
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🧩 AVANÇA 1 (VIAGEM DA ÁGUA)</div>
                      : c.canos
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🏭 RECUA 6 (ETAR)</div>
                      : c.deposito
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🏗️ SEM JOGAR (DEPÓSITOS)</div>
                      : c.vf
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>✅❌ RECUA 6 (V/F)</div>
                      : c.cruzadas
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>📝 JOGA OUTRA VEZ (CRUZADAS)</div>
                      : c.desembaralha
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🔤 JOGA OUTRA VEZ (PALAVRAS)</div>
                      : c.classifica
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>♻️ AVANÇA 2 (RESÍDUOS)</div>
                      : c.prensa
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>⚙️ SEM JOGAR (PRENSA)</div>
                      : c.sniper
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🎯 SEM JOGAR (SNIPER)</div>
                      : c.detetivo
                      ? <div className="rounded-full px-2 py-0.5 text-[8px] font-bold text-center leading-tight mt-1.5 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.28)', color: '#fff' }}>🕵️ AVANÇA 2 (DETETIVE)</div>
                      : <AcaoBadge a={c.a} />
                    }
                  </div>
                  {aqui.length > 0 && (
                    <div className="flex flex-wrap justify-center" style={{ position: 'relative', zIndex: 1, gap: 3, marginTop: 4 }}>
                      {aqui.map(i => (
                        <motion.div
                          key={i}
                          layoutId={`piece-${i}`}
                          layout
                          transition={{ type: 'spring', stiffness: 55, damping: 14, mass: 2.5 }}
                          style={{ zIndex: i === turnoMovendo ? 22 : 1 }}
                        >
                          <Peca playerIdx={i} moving={i === turnoMovendo} active={i === turnoAtual} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                </TiltCell>
              )
            })}

            {/* Casa 23 — AINTAR centre */}
            <TiltCell row={3} col="3 / 5">
            <div style={{
              background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 40%,#0284c7 70%,#0ea5e9 100%)',
              color: '#fff', position: 'relative',
              animation: 'centerGlow 2.5s ease-in-out infinite',
              height: '100%',
            }}
              className="rounded-xl p-4 flex flex-col items-center justify-center text-center border border-white/30 min-h-[145px]"
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
                background: 'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,transparent 100%)',
                borderRadius: '10px 10px 0 0', pointerEvents: 'none',
              }} />
              <span className="absolute top-2 left-3 text-[11px] font-black opacity-50" style={{ zIndex: 1 }}>23</span>
              <div className="text-2xl font-black tracking-widest" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.35)', position: 'relative', zIndex: 1 }}>AINTAR</div>
              <div className="text-[10px] font-medium opacity-75 italic" style={{ position: 'relative', zIndex: 1 }}>Juntos pelo Ambiente</div>
              <div className="text-2xl mt-1" style={{ animation: 'trophyPulse 1.8s ease-in-out infinite', position: 'relative', zIndex: 1 }}>🏆</div>
              {posicoes.map((p, i) => p === 23 && (
                <motion.div
                  key={i}
                  layoutId={`piece-${i}`}
                  layout
                  transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
                >
                  <Peca playerIdx={i} moving={i === turnoMovendo} active={i === turnoAtual} />
                </motion.div>
              ))}
            </div>
            </TiltCell>

          </div>
          </LayoutGroup>
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
  const [depositoAtivo, setDepositoAtivo] = useState(false)
  const [vfAtivo, setVfAtivo] = useState(false)
  const [cruzadasAtivo, setCruzadasAtivo] = useState(false)
  const [sopaLetrasAtivo, setSopaLetrasAtivo] = useState(false)
  const [detetivoAtivo, setDetetivoAtivo]         = useState(false)
  const [separaFluidosAtivo, setSeparaFluidosAtivo] = useState(false)
  const [desembaralhaAtivo, setDesembaralhaAtivo] = useState(false)
  const [classificaAtivo, setClassificaAtivo] = useState(false)
  const [sniperAtivo, setSniperAtivo] = useState(false)
  const [prensaAtivo, setPrensaAtivo] = useState(false)
  const [analiseAtivo, setAnaliseAtivo] = useState(false)
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
          } else if (casa?.deposito) {
            setDepositoAtivo(true)
          } else if (casa?.vf) {
            setVfAtivo(true)
          } else if (casa?.cruzadas) {
            setCruzadasAtivo(true)
          } else if (casa?.sopaLetras) {
            setSopaLetrasAtivo(true)
          } else if (casa?.detetivo) {
            setDetetivoAtivo(true)
          } else if (casa?.separaFluidos) {
            setSeparaFluidosAtivo(true)
          } else if (casa?.desembaralha) {
            setDesembaralhaAtivo(true)
          } else if (casa?.classifica) {
            setClassificaAtivo(true)
          } else if (casa?.prensa) {
            setPrensaAtivo(true)
          } else if (casa?.sniper) {
            setSniperAtivo(true)
          } else if (casa?.analise) {
            setAnaliseAtivo(true)
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

  function reiniciarJogo() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setDado(DADO_INIT)
    setRolling(false)
    setDieVisible(false)
    setTurno(0)
    setPosicoes(jogadores.map(() => 0))
    setTurnoMovendo(-1)
    setLancou(false)
    setMinijogoAtivo(false)
    setLabirintoAtivo(false)
    setLimpezaAtivo(false)
    setCorridaAtivo(false)
    setCatcherAtivo(false)
    setDiferencasAtivo(false)
    setCasaDiferencasRecua(0)
    setViagemAtivo(false)
    setCanosAtivo(false)
    setDepositoAtivo(false)
    setVfAtivo(false)
    setCruzadasAtivo(false)
    setSopaLetrasAtivo(false)
    setDetetivoAtivo(false)
    setSeparaFluidosAtivo(false)
    setDesembaralhaAtivo(false)
    setClassificaAtivo(false)
    setSniperAtivo(false)
    setPrensaAtivo(false)
    setAnaliseAtivo(false)
    setSkipMsgJogador(null)
    semJogarRef.current = jogadores.map(() => false)
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

  // DEV: click on a board cell to test its mini-game directly
  function handleCasaDebugClick(casa) {
    if (casa.minijogo)       setMinijogoAtivo(true)
    else if (casa.labirinto) setLabirintoAtivo(true)
    else if (casa.limpeza)   setLimpezaAtivo(true)
    else if (casa.corrida)   setCorridaAtivo(true)
    else if (casa.catcher)   setCatcherAtivo(true)
    else if (casa.diferencas){ setCasaDiferencasRecua(casa.diferencas); setDiferencasAtivo(true) }
    else if (casa.viagem)    setViagemAtivo(true)
    else if (casa.canos)     setCanosAtivo(true)
    else if (casa.deposito)  setDepositoAtivo(true)
    else if (casa.vf)        setVfAtivo(true)
    else if (casa.cruzadas)  setCruzadasAtivo(true)
    else if (casa.sopaLetras) setSopaLetrasAtivo(true)
    else if (casa.detetivo)      setDetetivoAtivo(true)
    else if (casa.separaFluidos) setSeparaFluidosAtivo(true)
    else if (casa.desembaralha) setDesembaralhaAtivo(true)
    else if (casa.classifica)setClassificaAtivo(true)
    else if (casa.prensa)    setPrensaAtivo(true)
    else if (casa.sniper)    setSniperAtivo(true)
    else if (casa.analise)   setAnaliseAtivo(true)
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

  function handleDepositoResult(passed) {
    setDepositoAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === turno ? true : v)
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleVfResult(passed) {
    setVfAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      recuarPeca(6, turno, posicoes[turno])
    }
  }

  function handleCruzadasResult(passed) {
    setCruzadasAtivo(false)
    if (passed) {
      setLancou(false) // joga outra vez
    } else {
      setLancou(true)  // turno termina normalmente
    }
  }

  function handleSopaLetrasResult(passed) {
    setSopaLetrasAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === turno ? true : v)
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleDetetivoResult(passed) {
    setDetetivoAtivo(false)
    if (passed) {
      movePoop(2, turno)
    } else {
      setLancou(true)
    }
  }

  function handleSeparaFluidosResult(passed) {
    setSeparaFluidosAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === turno ? true : v)
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleDesembaralhaResult(passed) {
    setDesembaralhaAtivo(false)
    if (passed) {
      setLancou(false) // joga outra vez
    } else {
      setLancou(true)  // turno termina normalmente
    }
  }

  function handlePrensaResult(passed) {
    setPrensaAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleSniperResult(passed) {
    setSniperAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === turno ? true : v)
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleAnaliseResult(passed) {
    setAnaliseAtivo(false)
    if (passed) {
      setLancou(true)
    } else {
      semJogarRef.current = semJogarRef.current.map((v, i) => i === turno ? true : v)
      setTurno(t => (t + 1) % jogadores.length)
      setLancou(false)
    }
  }

  function handleClassificaResult(passed) {
    setClassificaAtivo(false)
    if (passed) {
      movePoop(2, turno)
    } else {
      setLancou(true)
    }
  }

  return (
    <div ref={gameRef} style={isFullscreen ? {
      background: 'linear-gradient(145deg,#0f2d1a 0%,#0a1f10 50%,#0d2215 100%)',
      padding: '16px 20px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100vh', boxSizing: 'border-box',
    } : { position: 'relative' }}>
      <GameStyles />

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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)',
            borderRadius: 24, padding: '36px 52px', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(220,38,38,0.55)', maxWidth: 360,
            animation: 'skipShake 0.6s ease-out',
            color: '#fff',
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>⛔</div>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
              {skipMsgJogador} fica sem jogar!
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Esta jogada passa automaticamente...
            </div>
          </div>
        </div>
      )}
      {minijogoAtivo && (
        <MinijogoMontaEtar
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
        <MinijogoGuardaRede
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
      {depositoAtivo && (
        <MinijogoDeposito
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleDepositoResult}
        />
      )}
      {vfAtivo && (
        <MinijogoVerdadeiroFalso
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleVfResult}
        />
      )}
      {cruzadasAtivo && (
        <MinijogoPalavrasCruzadas
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleCruzadasResult}
        />
      )}
      {sopaLetrasAtivo && (
        <MinijogoSopaLetras
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleSopaLetrasResult}
        />
      )}
      {detetivoAtivo && (
        <MinijogoDeitetivoEsgoto
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleDetetivoResult}
        />
      )}
      {separaFluidosAtivo && (
        <MinijogoRodaLamas
          jogador={jogadorAtual}
          onResult={handleSeparaFluidosResult}
        />
      )}
      {desembaralhaAtivo && (
        <MinijogoDesembaralha
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleDesembaralhaResult}
        />
      )}
      {classificaAtivo && (
        <MinijogoClassificaResiduos
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleClassificaResult}
        />
      )}
      {prensaAtivo && (
        <MinijogoPrensaLamas
          jogador={jogadorAtual}
          onResult={handlePrensaResult}
        />
      )}
      {sniperAtivo && (
        <MinijogoSniperEsgoto
          jogador={jogadorAtual}
          onResult={handleSniperResult}
        />
      )}
      {analiseAtivo && (
        <MinijogoAnaliseAmostra
          jogador={jogadorAtual}
          cor={corAtual}
          onResult={handleAnaliseResult}
        />
      )}

      {/* Header row: status + fullscreen button */}
      <div className="flex items-center justify-between mb-4 gap-2" style={{ width: '100%', maxWidth: 900 }}>
        <div className="flex items-center gap-2 min-h-[22px] flex-1 justify-center">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: corAtual, boxShadow: `0 0 6px ${corAtual}` }} />
          <p className="text-sm font-semibold text-center" style={{ color: isFullscreen ? 'rgba(255,255,255,0.9)' : '#1e3a5f' }}>
            {rolling       ? '🎲 A lançar…'
            : dieVisible   ? `✨ Saiu o ${dado.res}! Avança ${dado.res} casa${dado.res !== 1 ? 's' : ''}!`
            : isMoving     ? `🚶 ${jogadores[turnoMovendo]} a avançar…`
            : lancou       ? `✅ ${jogadorAtual} jogou!`
            :                `🎯 Vez de ${jogadorAtual}`}
          </p>
        </div>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair de ecrã inteiro' : 'Ecrã inteiro'}
          style={{ background: isFullscreen ? 'rgba(255,255,255,0.12)' : '#fff', color: isFullscreen ? '#fff' : '#6b7280', border: isFullscreen ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e5e7eb' }}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Board with die overlay — flex:1 fills remaining height */}
      <div className="relative" style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1200 }}>
        <Tabuleiro posicoes={posicoes} turnoMovendo={turnoMovendo} turnoAtual={turno} onCasaClick={handleCasaDebugClick} />

        {/* Dim backdrop when die is shown */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 19, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.32)', borderRadius: 24,
          opacity: dieVisible ? 1 : 0, transition: 'opacity 0.35s ease',
        }} />

        {/* Die floats centred over board, fades in/out */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20, pointerEvents: 'none',
          opacity: dieVisible ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Dado3D rx={dado.rx} ry={dado.ry} rolling={rolling} />
            {!rolling && dado.res && (
              <div style={{
                background: 'rgba(10,20,10,0.88)', color: '#ffd700',
                fontWeight: 900, fontSize: 18, letterSpacing: 1,
                padding: '8px 24px', borderRadius: 99,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.3)',
              }}>
                {dado.res} ponto{dado.res !== 1 ? 's' : ''} ✨
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Turn controls */}
      <div className="mt-3 flex flex-col items-center gap-4" style={{ width: '100%', maxWidth: 900 }}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {jogadores.map((j, i) => (
            <div key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300"
              style={{
                background: i === turno ? CORES_JOGADOR[i] : isFullscreen ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                color: i === turno ? '#fff' : isFullscreen ? 'rgba(255,255,255,0.5)' : '#6b7280',
                transform: i === turno ? 'scale(1.12)' : 'scale(1)',
                boxShadow: i === turno ? `0 4px 12px ${CORES_JOGADOR[i]}55` : 'none',
                opacity: i === turno ? 1 : 0.5,
              }}
            >
              💩 {j}
              {i === turno && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.25)', borderRadius: 99, padding: '1px 5px' }}>JOGA</span>}
            </div>
          ))}
        </div>

        {isVencedor ? (
          <>
            <Confetti />
            <div style={{
              textAlign: 'center', padding: '32px 40px', borderRadius: 24,
              background: 'linear-gradient(135deg,#1e3a8a 0%,#0284c7 100%)',
              boxShadow: '0 8px 40px rgba(2,132,199,0.5)',
              animation: 'winBounce 1.6s ease-in-out infinite',
              color: '#fff',
            }}>
              <div style={{ fontSize: 80, marginBottom: 8 }}>🏆</div>
              <h3 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 8px 0', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{jogadorAtual} ganhou!</h3>
              <p style={{ fontSize: 14, opacity: 0.8, margin: '0 0 16px 0' }}>Chegou à casa 23! Parabéns campeão! 🌍♻️</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>
                🎉 🌟 🎊 💧 🌿
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={reiniciarJogo}
                  style={{ padding: '12px 24px', borderRadius: 14, border: '2px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                >
                  🔄 Jogar de Novo
                </button>
                <button
                  onClick={onRestart}
                  style={{ padding: '12px 24px', borderRadius: 14, border: '2px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  👥 Mudar Jogadores
                </button>
              </div>
            </div>
          </>
        ) : !lancou ? (
          <button onClick={lancar}
            disabled={rolling || dieVisible || isMoving}
            style={{
              padding: '16px 44px', borderRadius: 20, border: 'none',
              cursor: (rolling || dieVisible || isMoving) ? 'not-allowed' : 'pointer',
              background: (rolling || dieVisible || isMoving) ? '#6b7280' : corAtual,
              color: '#fff', fontWeight: 800, fontSize: 16,
              boxShadow: (rolling || dieVisible || isMoving) ? 'none' : `0 4px 20px ${corAtual}70, 0 2px 8px rgba(0,0,0,0.2)`,
              animation: (rolling || dieVisible || isMoving) ? undefined : 'rollPulse 2s ease-in-out infinite',
              opacity: (rolling || dieVisible || isMoving) ? 0.55 : 1,
              transition: 'background 0.25s, opacity 0.25s, box-shadow 0.25s',
              userSelect: 'none',
            }}
          >
            🎲 Vez de {jogadorAtual} — Lançar Dado
          </button>
        ) : (
          <button onClick={proximoTurno}
            style={{
              padding: '16px 44px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: CORES_JOGADOR[(turno + 1) % jogadores.length],
              color: '#fff', fontWeight: 800, fontSize: 16,
              boxShadow: `0 4px 20px ${CORES_JOGADOR[(turno + 1) % jogadores.length]}70`,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'transform 0.15s',
            }}
            className="hover:-translate-y-0.5 active:scale-95"
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
