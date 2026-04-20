import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'

const inputClass = `w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-aintar-navy text-sm
  focus:outline-none focus:ring-2 focus:ring-aintar-sky/30 focus:border-aintar-sky
  hover:border-gray-300 transition-colors placeholder-gray-400`

export default function ContactForm({ rows = 5 }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/website/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Ocorreu um erro ao enviar a mensagem. Por favor contacte-nos diretamente para geral@aintar.pt.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-aintar-light h-full min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-aintar-teal/15 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-aintar-teal" />
        </div>
        <h3 className="font-heading font-bold text-aintar-navy text-xl mb-2">Mensagem enviada!</h3>
        <p className="text-gray-500 text-sm max-w-xs">
          Obrigado pelo contacto. Responderemos em breve.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Nome *
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="O seu nome"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="o.seu@email.pt"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Assunto *
        </label>
        <input
          type="text"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          required
          placeholder="Qual o motivo do contacto?"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Mensagem *
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={rows}
          placeholder="Escreva a sua mensagem aqui..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl
          bg-aintar-blue text-white font-semibold text-sm
          hover:bg-aintar-blueMid transition-all duration-300
          hover:shadow-lg hover:shadow-aintar-blue/30 hover:-translate-y-0.5
          disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            A enviar...
          </>
        ) : (
          <>
            <Send size={16} />
            Enviar Mensagem
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Os seus dados são tratados de acordo com a nossa{' '}
        <Link to="/politica-privacidade" className="text-aintar-blue hover:underline">Política de Privacidade</Link>
      </p>
    </form>
  )
}
