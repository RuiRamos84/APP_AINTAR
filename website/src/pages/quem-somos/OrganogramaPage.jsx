import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'

// ── Layout constants ──────────────────────────────────────────────────────────
const FORK_W    = 880
const GAP       = 80
const HALF_W    = (FORK_W - GAP) / 2   // 400
const FORK_L    = HALF_W / 2           // 200 — center of left half
const FORK_R    = FORK_W - FORK_L      // 680 — center of right half
const FORK_MID  = FORK_W / 2           // 440
const FORK_H    = 40
const CURVE_R   = 12
const S_W       = 1.5                  // stroke width
const S_C       = '#ced4da'            // stroke colour
const CHILD_W   = 280                  // fixed width for all leaf nodes

// ── Type config ───────────────────────────────────────────────────────────────
const T = {
  top: {
    bg:    'linear-gradient(150deg,#1f4d85 0%,#183f6e 100%)',
    solid: '#183f6e', text: '#fff', label: 'Órgão Social',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.13), 0 2px 10px rgba(16,38,80,0.25)',
    ring:  '0 0 0 3px rgba(24,63,110,0.32), 0 4px 18px rgba(24,63,110,0.28)',
  },
  secretariado: {
    bg:    'linear-gradient(150deg,#0c88b0 0%,#087192 100%)',
    solid: '#087192', text: '#fff', label: 'Secretariado',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.13), 0 2px 10px rgba(8,113,146,0.25)',
    ring:  '0 0 0 3px rgba(8,113,146,0.32), 0 4px 18px rgba(8,113,146,0.28)',
  },
  divisao: {
    bg:    'linear-gradient(150deg,#d0620e 0%,#b85200 100%)',
    solid: '#b85200', text: '#fff', label: 'Divisão',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.13), 0 2px 10px rgba(184,82,0,0.25)',
    ring:  '0 0 0 3px rgba(184,82,0,0.32), 0 4px 18px rgba(184,82,0,0.28)',
  },
  unidade: {
    bg:    'linear-gradient(150deg,#3ea84c 0%,#32903f 100%)',
    solid: '#32903f', text: '#fff', label: 'Unidade',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.13), 0 2px 10px rgba(50,144,63,0.25)',
    ring:  '0 0 0 3px rgba(50,144,63,0.32), 0 4px 18px rgba(50,144,63,0.28)',
  },
  servico: {
    bg:    '#ffffff',
    solid: '#ffffff', text: '#374151', label: 'Serviço',
    border: '#e2e6ec',
    shadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px #e2e6ec',
    ring:  '0 0 0 3px rgba(99,115,140,0.18), 0 4px 12px rgba(0,0,0,0.09)',
  },
}

// ── Org data ──────────────────────────────────────────────────────────────────
const NODES = {
  assembleia:   { id:'assembleia',   type:'top',          label:'Assembleia\nIntermunicipal', desc:'Órgão deliberativo composto por representantes dos municípios associados. Aprova os planos, orçamentos e contas da AINTAR e delibera sobre as matérias de maior relevância estratégica.' },
  fiscalizacao: { id:'fiscalizacao', type:'top',          label:'Órgão de\nFiscalização',     desc:'Fiscaliza a gestão administrativa, patrimonial e financeira da AINTAR, garantindo o cumprimento das deliberações da Assembleia e a legalidade das decisões.' },
  direcao:      { id:'direcao',      type:'top',          label:'Direção',                    desc:'Órgão executivo da AINTAR. Responsável pela gestão corrente, pela implementação das deliberações da Assembleia Intermunicipal e pela representação da associação.' },
  secretariado: { id:'secretariado', type:'secretariado', label:'Secretariado\nda Direção',   desc:'Apoia a Direção nas funções executivas, de coordenação interna e de comunicação com as unidades orgânicas. Assegura o apoio administrativo aos órgãos sociais.' },
  juridico:     { id:'juridico',     type:'servico',      label:'Gabinete\nJurídico',         desc:'Presta assessoria jurídica à Direção e às diferentes unidades orgânicas da AINTAR, acompanha processos contenciosos e assegura a conformidade legal.' },
  ti:           { id:'ti',           type:'servico',      label:'Sistemas e Tecnologias\nde Informação', desc:'Responsável pela gestão, manutenção e evolução dos sistemas informáticos e infraestrutura tecnológica da AINTAR, garantindo a continuidade e segurança dos serviços digitais.' },
}

const DIV_PROJETOS = {
  id:'div-projetos', type:'divisao',
  label:'Divisão de Projetos,\nAmbiente e Saneamento',
  desc:'Coordena as áreas de projetos de engenharia, ambiente e saneamento básico. Planeia e executa as intervenções nas infraestruturas de abastecimento e drenagem.',
  children:[
    { id:'operacao',      type:'servico',  label:'Operação e Manutenção\nde Sistemas',                desc:'Assegura o funcionamento contínuo das infraestruturas de abastecimento de água e saneamento, garantindo a qualidade do serviço prestado.' },
    { id:'ambiente',      type:'servico',  label:'Ambiente e Controlo de\nQualidade da Água',         desc:'Monitoriza a qualidade da água fornecida aos utilizadores e garante o cumprimento dos padrões ambientais e normativos em vigor.' },
    { id:'planeamento',   type:'unidade',  label:'Planeamento, Projetos e\nControlo de Empreitadas',  desc:'Elabora projetos de engenharia, gere o planeamento estratégico das infraestruturas e controla a execução das empreitadas adjudicadas.' },
    { id:'obras',         type:'servico',  label:'Obras por\nAdministração Direta',                   desc:'Executa obras e intervenções de manutenção utilizando recursos humanos e técnicos próprios da AINTAR, sem recurso a empreiteiros externos.' },
    { id:'licenciamento', type:'servico',  label:'Licenciamento e\nFiscalização',                     desc:'Trata os processos de licenciamento de infraestruturas e fiscaliza o cumprimento das normas técnicas e legais aplicáveis.' },
  ],
}

const DIV_ADMIN = {
  id:'div-admin', type:'divisao',
  label:'Divisão de Administração\nGeral e Finanças',
  desc:'Coordena as funções administrativas, financeiras e de suporte organizacional. Assegura a gestão eficiente dos recursos humanos, materiais e financeiros da associação.',
  children:[
    { id:'atendimento',      type:'servico', label:'Atendimento ao\nCliente',              desc:'Ponto de contacto direto com os clientes e utilizadores dos serviços da AINTAR. Gere reclamações, pedidos e informações.' },
    { id:'frota',            type:'servico', label:'Frota, Logística\ne Armazéns',         desc:'Gere a frota de viaturas, o aprovisionamento de materiais e os armazéns, assegurando os recursos logísticos necessários à operação.' },
    { id:'contabilidade',    type:'unidade', label:'Contabilidade\ne Tesouraria',          desc:'Responsável pela contabilidade geral, controlo financeiro, gestão de tesouraria e elaboração das demonstrações financeiras.' },
    { id:'rh',               type:'servico', label:'Recursos\nHumanos',                   desc:'Gere o capital humano da AINTAR: recrutamento, formação, desenvolvimento profissional e relações laborais.' },
    { id:'faturacao',        type:'servico', label:'Faturação e\nCobranças',               desc:'Responsável pela emissão de faturas, gestão de cobranças e controlo de recebimentos dos serviços prestados.' },
    { id:'aprovisionamento', type:'servico', label:'Aprovisionamento\ne Contratação',      desc:'Gere as aquisições de bens e serviços, incluindo os procedimentos de contratação pública e a gestão de fornecedores.' },
    { id:'patrimonio',       type:'servico', label:'Património',                           desc:'Inventaria e gere o património imóvel e móvel pertencente à AINTAR, assegurando o seu registo e valorização.' },
  ],
}

// ── SVG primitives ────────────────────────────────────────────────────────────
function VLine({ h = 28 }) {
  return (
    <svg width={4} height={h} style={{ display:'block', margin:'0 auto', flexShrink:0, overflow:'visible' }}>
      <line x1={2} y1={0} x2={2} y2={h} stroke={S_C} strokeWidth={S_W} strokeLinecap="round" />
    </svg>
  )
}

function HLine({ w = 24 }) {
  return (
    <svg width={w} height={4} style={{ display:'block', margin:'auto 0', flexShrink:0, overflow:'visible' }}>
      <line x1={0} y1={2} x2={w} y2={2} stroke={S_C} strokeWidth={S_W} strokeLinecap="round" />
    </svg>
  )
}

function ForkConnector() {
  const r = CURVE_R
  return (
    <svg width={FORK_W} height={FORK_H} style={{ display:'block', flexShrink:0, overflow:'visible' }}>
      <path d={`M ${FORK_MID},0 H ${FORK_L+r} Q ${FORK_L},0 ${FORK_L},${r} V ${FORK_H}`}
        fill="none" stroke={S_C} strokeWidth={S_W} strokeLinecap="round" />
      <path d={`M ${FORK_MID},0 H ${FORK_R-r} Q ${FORK_R},0 ${FORK_R},${r} V ${FORK_H}`}
        fill="none" stroke={S_C} strokeWidth={S_W} strokeLinecap="round" />
    </svg>
  )
}

// ── Node ──────────────────────────────────────────────────────────────────────
function OrgNode({ node, onSelect, activeId, minW = 130, fixedW }) {
  const cfg = T[node.type] || T.servico
  const active = activeId === node.id
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type:'spring', stiffness:380, damping:24 }}
      onClick={() => onSelect(active ? null : node)}
      style={{
        background: cfg.bg,
        color: cfg.text,
        border: cfg.border ? `1px solid ${cfg.border}` : 'none',
        minWidth: fixedW ?? minW,
        width:    fixedW,
        maxWidth: fixedW ?? 300,
        padding: '11px 18px',
        borderRadius: 13,
        cursor: 'pointer',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'pre-line',
        flexShrink: 0,
        outline: 'none',
        boxShadow: active ? cfg.ring : cfg.shadow,
        transition: 'box-shadow 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {node.label}
    </motion.button>
  )
}

// ── Arrow (Assembleia → Órgão de Fiscalização) ────────────────────────────────
function Arrow() {
  return (
    <div style={{ display:'flex', alignItems:'center', margin:'auto 0' }}>
      <div style={{ width:28, height:S_W, backgroundColor:S_C }} />
      <div style={{ width:0, height:0, borderTop:`5px solid transparent`, borderBottom:`5px solid transparent`, borderLeft:`7px solid ${S_C}` }} />
    </div>
  )
}

// ── Division section — children centered under header via spine ───────────────
function DivisionSection({ div, onSelect, activeId }) {
  const [open, setOpen] = useState(true)
  const cfg = T[div.type]

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
      <div style={{ position:'relative' }}>
        <OrgNode node={div} onSelect={onSelect} activeId={activeId} minW={280} />
        {/* Collapse toggle — small circle icon in the top-right corner */}
        <motion.button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Recolher' : 'Expandir'}
          whileHover={{ scale: 1.15 }}
          style={{
            position:'absolute', top:-8, right:-8,
            width:20, height:20, borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            background: cfg.solid, border:'2px solid white',
            cursor:'pointer', outline:'none', color:'#fff',
            boxShadow:'0 1px 4px rgba(0,0,0,0.18)',
          }}
        >
          {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="children-wrapper"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '10px 0' }}
          >
            {div.children.map((child, i) => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <VLine h={i === 0 ? 18 : 10} />
                <OrgNode node={child} onSelect={onSelect} activeId={activeId} fixedW={CHILD_W} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Detail panel — responsive overlay/bottomsheet ───────────────────────────
function DetailPanel({ node, onClose }) {
  const cfg = node ? (T[node.type] || T.servico) : null

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[190] bg-aintar-navy/20 backdrop-blur-sm"
          />
          
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed z-[200] bg-white shadow-2xl overflow-hidden
                       bottom-0 left-0 right-0 rounded-t-[32px] 
                       lg:bottom-auto lg:top-1/2 lg:right-8 lg:left-auto lg:-translate-y-1/2 lg:w-[360px] lg:rounded-3xl"
          >
            {/* Colored top bar */}
            <div className="h-1.5 w-full" style={{ background: cfg.bg }} />
            
            {/* Mobile Drag Indicator */}
            <div className="lg:hidden flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="p-6 lg:p-7">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                      style={{ background: cfg.solid + '15', color: cfg.solid }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.solid }} />
                  {cfg.label}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight whitespace-pre-line">
                {node.label}
              </h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">
                {node.desc}
              </p>
              
              <div className="lg:hidden mt-8">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-gray-50 text-gray-600 font-semibold rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Mobile Vertical Tree ──────────────────────────────────────────────────────
function MobileTree({ onSelect, activeId }) {
  const [expanded, setExpanded] = useState(['direcao', 'assembleia'])
  
  const toggle = (id) => setExpanded(prev => 
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const NodeItem = ({ node, level = 0, hasChildren = false }) => {
    const isExpanded = expanded.includes(node.id)
    const cfg = T[node.type] || T.servico
    
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3 py-2">
          {level > 0 && (
            <div className="flex-shrink-0 w-4 h-px bg-gray-200" />
          )}
          
          <button
            onClick={() => onSelect(node)}
            className={`flex-1 text-left p-4 rounded-2xl border transition-all duration-300 ${
              activeId === node.id 
                ? 'border-aintar-blue ring-2 ring-aintar-blue/20 shadow-lg' 
                : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: cfg.solid }}>
                  {cfg.label}
                </div>
                <div className="text-sm font-bold text-gray-900 whitespace-pre-line">
                  {node.label.replace('\n', ' ')}
                </div>
              </div>
              {hasChildren && (
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); toggle(node.id); }}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggle(node.id); } }}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
            </div>
          </button>
        </div>
        
        {hasChildren && isExpanded && node.children && (
          <div className="ml-6 border-l-2 border-gray-100 pl-4">
            {node.children.map((child) => (
              <NodeItem 
                key={child.id} 
                node={child} 
                level={level + 1} 
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <NodeItem node={NODES.assembleia} hasChildren={true} />
      <div className="ml-6 border-l-2 border-gray-100 pl-4">
        {expanded.includes('assembleia') && (
          <NodeItem node={NODES.fiscalizacao} level={1} />
        )}
      </div>
      
      <div className="flex justify-center py-1">
        <VLine h={20} />
      </div>
      
      <NodeItem node={NODES.direcao} hasChildren={true} />
      <div className="ml-6 border-l-2 border-gray-100 pl-4">
        {expanded.includes('direcao') && (
          <>
            <NodeItem node={NODES.juridico} level={1} />
            <NodeItem node={NODES.secretariado} level={1} />
            <NodeItem node={NODES.ti} level={1} />
            <NodeItem node={DIV_PROJETOS} level={1} hasChildren={true} />
            <NodeItem node={DIV_ADMIN} level={1} hasChildren={true} />
          </>
        )}
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ marginBottom:24, paddingBottom:16, borderBottom:'1px solid #f1f3f5', display:'flex', flexWrap:'wrap', gap:'6px 20px', justifyContent:'center' }}>
      {[['top','Órgão Social'],['secretariado','Secretariado'],['divisao','Divisão'],['unidade','Unidade'],['servico','Serviço']].map(([type,label]) => {
        const cfg = T[type]
        return (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:13, height:13, borderRadius:4, background:cfg.bg, border:cfg.border ? `1px solid ${cfg.border}` : 'none' }} />
            <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>{label}</span>
          </div>
        )
      })}
      <p style={{ width:'100%', textAlign:'center', fontSize:12, color:'#c9cfd6', marginTop:4 }}>
        Clique em qualquer nó para ver mais detalhes
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrganogramaPage() {
  const [selected, setSelected] = useState(null)

  return (
    <PageLayout
      title="Organograma"
      subtitle="Estrutura orgânica da AINTAR — hierarquia, divisões e unidades."
      breadcrumbs={[
        { label:'Quem Somos', href:'/quem-somos' },
        { label:'Organograma' },
      ]}
    >
      <section className="section-padding bg-white">
        <div className="section-container" style={{ maxWidth:1160 }}>
          <ScrollReveal>
            <div>
              {/* ── Tree ── */}
              <div className="relative">
                <Legend />

                {/* Desktop Tree View */}
                <div className="hidden lg:block overflow-x-auto pb-8 custom-scrollbar">
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', userSelect:'none', width:FORK_W, margin:'0 auto', paddingTop: 24 }}>

                    {/* Row 1: Assembleia (centered) & Órgão Fiscalização (attached to right) */}
                    <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                      <div style={{ flex:1 }} />
                      <OrgNode node={NODES.assembleia} onSelect={setSelected} activeId={selected?.id} />
                      <div style={{ flex:1, display:'flex', alignItems:'center' }}>
                        <Arrow />
                        <OrgNode node={NODES.fiscalizacao} onSelect={setSelected} activeId={selected?.id} />
                      </div>
                    </div>

                    <VLine h={28} />

                    {/* Row 2: Direção */}
                    <OrgNode node={NODES.direcao} onSelect={setSelected} activeId={selected?.id} minW={150} />

                    <VLine h={28} />

                    {/* Row 3: Gabinete ── Secretariado (centered) ── Sistemas TI */}
                    <div style={{ display:'flex', alignItems:'center', width:FORK_W, justifyContent:'center' }}>
                      <div style={{ flex:1, display:'flex', justifyContent:'flex-end', alignItems:'center' }}>
                        <OrgNode node={NODES.juridico} onSelect={setSelected} activeId={selected?.id} />
                        <HLine w={28} />
                      </div>
                      <OrgNode node={NODES.secretariado} onSelect={setSelected} activeId={selected?.id} minW={165} />
                      <div style={{ flex:1, display:'flex', justifyContent:'flex-start', alignItems:'center' }}>
                        <HLine w={28} />
                        <OrgNode node={NODES.ti} onSelect={setSelected} activeId={selected?.id} />
                      </div>
                    </div>

                    <VLine h={24} />

                    {/* SVG curved fork */}
                    <ForkConnector />

                    {/* Row 4: Two divisions */}
                    <div style={{ display:'flex', width:FORK_W }}>
                      <div style={{ width:HALF_W, display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <DivisionSection div={DIV_PROJETOS} onSelect={setSelected} activeId={selected?.id} />
                      </div>
                      <div style={{ width:GAP }} />
                      <div style={{ width:HALF_W, display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <DivisionSection div={DIV_ADMIN} onSelect={setSelected} activeId={selected?.id} />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Mobile Vertical View */}
                <div className="lg:hidden mt-8">
                  <MobileTree onSelect={setSelected} activeId={selected?.id} />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Detail panel ── */}
      <DetailPanel node={selected} onClose={() => setSelected(null)} />

    </PageLayout>
  )
}
