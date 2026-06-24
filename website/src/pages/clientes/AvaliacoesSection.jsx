import { useState, useEffect, useMemo } from 'react'
import { Star, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { motion } from 'framer-motion'
import ScrollReveal from '../../components/ui/ScrollReveal'
import DarkBgDecorations from '../../components/ui/DarkBgDecorations'
import { getAvaliacoes, submitAvaliacao } from '../../services/cmsApi'

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function StarRow({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? 'text-amber-400 fill-amber-400' : 'text-white/20 fill-white/10'}
        />
      ))}
    </div>
  )
}

function StarRowLight({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}
        />
      ))}
    </div>
  )
}

// ── Bloco de estatísticas (fundo escuro) ──────────────────────────────────────

function BlocoEstatisticas({ total, media, distribuicao }) {
  const notaLabel = ['', 'Muito Mau', 'Mau', 'Razoável', 'Bom', 'Muito Bom']

  return (
    <section className="py-16 bg-hero-gradient relative overflow-hidden">
      <DarkBgDecorations particles={false} intensity="low" />
      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto">

          {/* Linha superior: nota + barra de distribuição */}
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

            {/* Nota grande */}
            <ScrollReveal className="flex flex-col items-center flex-shrink-0">
              <span className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                Avaliação Global
              </span>
              <span className="font-heading font-extrabold text-gradient leading-none"
                style={{ fontSize: '5.5rem' }}>
                {media.toFixed(1)}
              </span>
              <div className="mt-2 mb-3">
                <StarRow value={Math.round(media)} size={22} />
              </div>
              <span className="text-white/50 text-xs">
                Baseado em <span className="text-white font-semibold">{total}</span>{' '}
                {total === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </ScrollReveal>

            {/* Separador vertical */}
            <div className="hidden md:block w-px h-40 bg-white/10 flex-shrink-0" />
            <div className="md:hidden w-24 h-px bg-white/10" />

            {/* Barras de distribuição */}
            <ScrollReveal className="flex-1 w-full flex flex-col gap-3">
              {[5, 4, 3, 2, 1].map((estrela, idx) => {
                const count = distribuicao[String(estrela)] ?? 0
                const pct   = total > 0 ? (count / total) * 100 : 0
                return (
                  <div key={estrela} className="flex items-center gap-3">
                    <span className="text-white/60 text-xs w-3 text-right flex-shrink-0">{estrela}</span>
                    <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: pct > 0
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : 'transparent',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-white/40 text-xs w-8 text-right flex-shrink-0">
                      {count > 0 ? count : '—'}
                    </span>
                    <span className="text-white/30 text-[10px] w-8 text-right flex-shrink-0 hidden sm:block">
                      {pct > 0 ? `${Math.round(pct)}%` : ''}
                    </span>
                  </div>
                )
              })}
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Card de avaliação ─────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-aintar-blue to-aintar-sky',
  'from-aintar-teal to-aintar-sky',
  'from-aintar-blue to-aintar-teal',
  'from-purple-500 to-aintar-blue',
  'from-aintar-sky to-aintar-teal',
]

function ReviewCard({ r, index, delay }) {
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
  return (
    <ScrollReveal delay={delay}>
      <div className="card p-6 flex flex-col gap-4 h-full group hover:-translate-y-1 transition-transform duration-300">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold font-heading text-base flex-shrink-0 shadow-sm`}>
              {r.nome.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-heading font-bold text-aintar-navy text-sm leading-tight">{r.nome}</div>
              <div className="text-gray-400 text-[11px] mt-0.5">{formatDate(r.created_at)}</div>
            </div>
          </div>
          <MessageSquare size={15} className="text-gray-200 flex-shrink-0 mt-0.5 group-hover:text-aintar-sky/40 transition-colors" />
        </div>

        {/* Estrelas */}
        <StarRowLight value={r.nota} size={15} />

        {/* Comentário */}
        {r.comentario ? (
          <p className="text-gray-500 text-[13px] leading-relaxed flex-1 relative pl-3 border-l-2 border-aintar-sky/25">
            {r.comentario}
          </p>
        ) : (
          <p className="text-gray-300 text-xs italic flex-1">{r.nota_descricao}</p>
        )}
      </div>
    </ScrollReveal>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AvaliacoesSection() {
  const [avaliacoes, setAvaliacoes]   = useState([])
  const [stats, setStats]             = useState({ total: 0, media: 0, distribuicao: {} })
  const [loadingReviews, setLoading]  = useState(true)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const [nome,       setNome]       = useState('')
  const [nota,       setNota]       = useState(0)
  const [hovered,    setHovered]    = useState(0)
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback,   setFeedback]   = useState(null)

  function loadData() {
    return getAvaliacoes()
      .then((json) => {
        setAvaliacoes(json.avaliacoes || [])
        setStats({
          total:        json.total        ?? 0,
          media:        json.media        ?? 0,
          distribuicao: json.distribuicao ?? {},
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const avaliacoesPorNota = useMemo(
    () => [...avaliacoes].sort((a, b) => {
      const temComentarioA = a.comentario ? 1 : 0
      const temComentarioB = b.comentario ? 1 : 0
      return (
        b.nota - a.nota ||
        temComentarioB - temComentarioA ||
        new Date(b.created_at) - new Date(a.created_at)
      )
    }),
    [avaliacoes]
  )
  const visiveis = mostrarTodos ? avaliacoesPorNota : avaliacoesPorNota.slice(0, 3)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) { setFeedback({ type: 'error', msg: 'Por favor introduza o seu nome.' }); return }
    if (!nota)        { setFeedback({ type: 'error', msg: 'Por favor selecione uma avaliação (1 a 5 estrelas).' }); return }

    setSubmitting(true)
    setFeedback(null)
    try {
      await submitAvaliacao({ nome: nome.trim(), nota, comentario: comentario.trim() || null })
      setFeedback({ type: 'success', msg: 'Obrigado! A sua opinião foi publicada com sucesso.' })
      setNome('')
      setNota(0)
      setComentario('')
      await loadData()
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Erro ao submeter. Tente novamente.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* ── Estatísticas (fundo escuro) ── */}
      {!loadingReviews && stats.total > 0 && (
        <BlocoEstatisticas
          total={stats.total}
          media={stats.media}
          distribuicao={stats.distribuicao}
        />
      )}

      {/* ── Avaliações + Formulário (fundo claro) ── */}
      <section className="section-padding bg-aintar-light">
        <div className="section-container">

          {/* Cabeçalho */}
          <ScrollReveal className="text-center mb-12">
            <span className="section-tag mb-3">Opiniões</span>
            <h2 className="font-heading font-bold text-aintar-navy text-3xl lg:text-4xl">
              O Que Dizem os Nossos Clientes
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto text-sm leading-relaxed">
              Partilhe a sua experiência e ajude-nos a melhorar continuamente os nossos serviços.
            </p>
          </ScrollReveal>

          {/* Loading */}
          {loadingReviews && (
            <div className="flex justify-center mb-14">
              <div className="w-6 h-6 rounded-full border-2 border-aintar-blue/30 border-t-aintar-blue animate-spin" />
            </div>
          )}

          {/* Grelha de avaliações */}
          {!loadingReviews && avaliacoesPorNota.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {visiveis.map((r, i) => (
                  <ReviewCard key={r.pk} r={r} index={i} delay={mostrarTodos ? 0 : i * 0.07} />
                ))}
              </div>

              {avaliacoesPorNota.length > 3 && (
                <div className="flex justify-center mb-16">
                  <button
                    onClick={() => setMostrarTodos((v) => !v)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-aintar-blue/20 text-aintar-blue text-sm font-semibold hover:bg-aintar-blue hover:text-white hover:border-aintar-blue transition-all duration-200"
                  >
                    {mostrarTodos ? (
                      <><ChevronUp size={15} /> Ver Menos</>
                    ) : (
                      <><ChevronDown size={15} /> Ver Todas ({avaliacoesPorNota.length})</>
                    )}
                  </button>
                </div>
              )}

              {avaliacoesPorNota.length <= 3 && <div className="mb-16" />}
            </>
          )}

          {!loadingReviews && avaliacoesPorNota.length === 0 && (
            <p className="text-center text-gray-400 text-sm mb-16 italic">
              Ainda não há opiniões. Seja o primeiro a partilhar!
            </p>
          )}

          {/* Formulário */}
          <ScrollReveal>
            <div className="max-w-xl mx-auto">
              <div className="card p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-aintar-blue/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={17} className="text-aintar-blue" />
                  </div>
                  <h3 className="font-heading font-bold text-aintar-navy text-lg">
                    Deixe a Sua Opinião
                  </h3>
                </div>
                <p className="text-gray-400 text-xs mb-7 pl-12">
                  A sua opinião é importante para continuarmos a melhorar.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-semibold text-aintar-navy mb-1.5">
                      Nome <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      maxLength={255}
                      placeholder="O seu nome"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-aintar-navy placeholder-gray-300 focus:outline-none focus:border-aintar-blue focus:ring-2 focus:ring-aintar-blue/10 transition-all bg-gray-50 hover:bg-white"
                    />
                  </div>

                  {/* Avaliação */}
                  <div>
                    <label className="block text-xs font-semibold text-aintar-navy mb-2">
                      Avaliação <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHovered(s)}
                          onMouseLeave={() => setHovered(0)}
                          onClick={() => setNota(s)}
                          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                          aria-label={`${s} estrela${s > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={32}
                            className={`transition-all duration-150 ${
                              s <= (hovered || nota)
                                ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                : 'text-gray-200 fill-gray-100'
                            }`}
                          />
                        </button>
                      ))}
                      {(hovered || nota) > 0 && (
                        <span className="ml-2 text-xs font-semibold text-amber-500">
                          {['', 'Muito Mau', 'Mau', 'Razoável', 'Bom', 'Muito Bom'][hovered || nota]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Comentário */}
                  <div>
                    <label className="block text-xs font-semibold text-aintar-navy mb-1.5">
                      Comentário{' '}
                      <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      placeholder="Partilhe a sua experiência com os serviços da AINTAR…"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-aintar-navy placeholder-gray-300 focus:outline-none focus:border-aintar-blue focus:ring-2 focus:ring-aintar-blue/10 transition-all resize-none bg-gray-50 hover:bg-white"
                    />
                    <div className="text-right text-[10px] text-gray-300 mt-1">
                      {comentario.length}/2000
                    </div>
                  </div>

                  {/* Feedback */}
                  {feedback && (
                    <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
                      feedback.type === 'success'
                        ? 'bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20'
                        : 'bg-red-50 text-red-500 border border-red-100'
                    }`}>
                      {feedback.msg}
                    </div>
                  )}

                  {/* Botão */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Send size={14} className={submitting ? 'animate-pulse' : ''} />
                      {submitting ? 'A enviar…' : 'Enviar Opinião'}
                    </button>
                    <span className="text-[10px] text-gray-300">
                      Os campos com <span className="text-red-400">*</span> são obrigatórios
                    </span>
                  </div>
                </form>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
