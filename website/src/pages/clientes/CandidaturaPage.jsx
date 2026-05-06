import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertCircle, Paperclip, X, Plus } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getConcursalReferencias, getConcursalProcedimento, submitConcursalCandidatura } from '../../services/cmsApi'

function validateNIF(nif) {
  const n = nif.replace(/\s/g, '')
  if (!/^\d{9}$/.test(n)) return false
  if (!['1','2','3','5','6','7','8','9'].includes(n[0])) return false
  let sum = 0
  for (let i = 0; i < 8; i++) sum += parseInt(n[i]) * (9 - i)
  const rem = sum % 11
  const check = rem < 2 ? 0 : 11 - rem
  return check === parseInt(n[8])
}

function validateNumDocId(num, tipo) {
  if (!num) return true
  const n = num.replace(/[\s-]/g, '').toUpperCase()
  if (tipo === 'Cartão de Cidadão') return /^\d{8}[A-Z0-9]{0,4}$/.test(n)
  if (tipo === 'Bilhete de Identidade') return /^\d{5,8}[A-Z]?$/.test(n)
  if (tipo === 'Passaporte') return /^[A-Z]{1,2}\d{5,8}$/.test(n)
  return n.length > 0
}

const STEPS = ['Identificação', 'Habilitações', 'Situação Profissional', 'Declarações']
const SEXOS = ['Masculino', 'Feminino', 'Outro']
const TIPOS_DOC = ['Cartão de Cidadão', 'Bilhete de Identidade', 'Passaporte', 'Outro']
const SITUACOES_PROF = [
  'Em exercício de funções',
  'Em licença',
  'Ao abrigo do Regime de Valorização Profissional, aprovado pela Lei n.º 25/2017, de 30 de maio',
]
const GRUPOS_VINCULO = ['Nomeação', 'Contrato de trabalho em funções públicas']
// PKs de tipos de documento que aceitam mais do que 1 ficheiro
const MULTI_DOC_PKS = new Set([2, 9, 10])
const VINCULO_OPTIONS = [
  { grupo: 'Nomeação', modalidade: 'Definitiva' },
  { grupo: 'Nomeação', modalidade: 'A termo resolutivo certo' },
  { grupo: 'Nomeação', modalidade: 'A termo resolutivo incerto' },
  { grupo: 'Contrato de trabalho em funções públicas', modalidade: 'Por tempo indeterminado' },
  { grupo: 'Contrato de trabalho em funções públicas', modalidade: 'A termo resolutivo certo' },
  { grupo: 'Contrato de trabalho em funções públicas', modalidade: 'A termo resolutivo incerto' },
]

function SectionHeader({ number, title }) {
  return (
    <h3 className="font-heading font-bold text-aintar-navy text-sm uppercase tracking-widest mb-4 pb-2 border-b-2 border-aintar-navy/20 flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-aintar-navy text-white text-xs flex items-center justify-center flex-shrink-0">{number}</span>
      {title}
    </h3>
  )
}

function SubsectionHeader({ number, title }) {
  return (
    <p className="text-xs font-bold text-aintar-navy uppercase tracking-wide mb-3 mt-5">
      {number} — {title}
    </p>
  )
}

function FieldRow({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-aintar-navy uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800
        focus:outline-none focus:border-aintar-blue focus:ring-1 focus:ring-aintar-blue/20
        placeholder:text-gray-300 transition ${className}`}
      {...props}
    />
  )
}

function SelectField({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800
        focus:outline-none focus:border-aintar-blue focus:ring-1 focus:ring-aintar-blue/20
        bg-white transition ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      rows={3}
      className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800
        focus:outline-none focus:border-aintar-blue focus:ring-1 focus:ring-aintar-blue/20
        placeholder:text-gray-300 transition resize-none ${className}`}
      {...props}
    />
  )
}

function CheckField({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-aintar-blue
          focus:ring-aintar-blue/20 cursor-pointer flex-shrink-0"
      />
      <span className="text-sm text-gray-700 leading-snug group-hover:text-aintar-navy transition">
        {label}
      </span>
    </label>
  )
}

const EMPTY = {
  nome_completo: '', data_nascimento: '', sexo: '', tipo_doc_id: '', num_doc_id: '',
  nacionalidade: 'Portuguesa', pais_residencia: 'Portugal', nif: '',
  morada: '', codigo_postal: '', localidade: '', distrito: '', concelho: '',
  telemovel: '+351', telefone: '', email: '',
  tt_nivel_hab: '', area_formacao_academica: '', area_formacao_profissional: '',
  outras_formacoes: '', formacao_substitutiva: '',
  titular_vinculo_publico: false, tt_tipo_vinculo: '', modalidade_vinculo: '',
  situacao_profissional_atual: '', orgao_servico: '', carreira_categoria: '',
  atividade_exercida: '', posicao_nivel_remuneratorio: '', avaliacao_desempenho: '',
  afasta_metodos_obrigatorios: false,
  grau_incapacidade: '', tipo_incapacidade: '', condicoes_especiais: '',
  declara_requisitos: false, declara_veracidade: false, declara_rgpd: false,
  localidade_assinatura: '', data_assinatura: new Date().toISOString().slice(0, 10),
}

export default function CandidaturaPage() {
  const { pk } = useParams()
  const navigate = useNavigate()

  const [step, setStep]             = useState(0)
  const [form, setForm]             = useState(EMPTY)
  const [refs, setRefs]             = useState(null)
  const [proc, setProc]             = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [vinculoSel, setVinculoSel] = useState(null)
  const [docFiles, setDocFiles]     = useState({}) // { [tipo_pk]: File[] }
  const fileInputRefs               = useRef({})

  useEffect(() => {
    getConcursalReferencias()
      .then(data => setRefs(data))
      .catch(() => setRefs({ niveis_hab: [], tipos_vinculo: [], tipos_documento: [] }))
    if (pk) {
      getConcursalProcedimento(pk)
        .then(({ procedimento }) => setProc(procedimento))
        .catch(() => {})
    }
  }, [pk])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setFieldErrors(e => ({ ...e, [field]: undefined }))
  }

  const handleVinculoSelect = (opt) => {
    setVinculoSel(opt)
    const refMatch = refs?.tipos_vinculo?.find(v => {
      const d = (v.descricao || '').toLowerCase()
      return opt.grupo.toLowerCase().startsWith('nome') ? d.includes('nome') : d.includes('contrato')
    })
    setForm(f => ({
      ...f,
      tt_tipo_vinculo: refMatch?.pk ?? '',
      modalidade_vinculo: `${opt.grupo} – ${opt.modalidade}`,
    }))
    setFieldErrors(e => ({ ...e, modalidade_vinculo: undefined }))
  }

  const validateStep = () => {
    const errs = {}
    if (step === 0) {
      if (!form.nome_completo.trim())    errs.nome_completo  = 'Campo obrigatório'
      if (!form.data_nascimento)         errs.data_nascimento = 'Campo obrigatório'
      if (!form.sexo)                    errs.sexo           = 'Campo obrigatório'
      if (!form.tipo_doc_id)             errs.tipo_doc_id    = 'Campo obrigatório'
      if (!form.num_doc_id?.trim())      errs.num_doc_id     = 'Campo obrigatório'
      else if (!validateNumDocId(form.num_doc_id, form.tipo_doc_id))
        errs.num_doc_id = form.tipo_doc_id ? `Formato inválido para ${form.tipo_doc_id}` : 'Formato inválido'
      if (!form.nacionalidade?.trim())   errs.nacionalidade  = 'Campo obrigatório'
      if (!form.pais_residencia?.trim()) errs.pais_residencia = 'Campo obrigatório'
      if (!form.nif.trim()) {
        errs.nif = 'Campo obrigatório'
      } else if (!validateNIF(form.nif)) {
        errs.nif = 'NIF inválido'
      }
      if (!form.morada?.trim())          errs.morada         = 'Campo obrigatório'
      if (!form.codigo_postal?.trim())   errs.codigo_postal  = 'Campo obrigatório'
      if (!form.localidade?.trim())      errs.localidade     = 'Campo obrigatório'
      if (!form.distrito?.trim())        errs.distrito       = 'Campo obrigatório'
      if (!form.concelho?.trim())        errs.concelho       = 'Campo obrigatório'
      if (!form.telemovel?.trim())       errs.telemovel      = 'Campo obrigatório'
      if (!form.email.trim())            errs.email          = 'Campo obrigatório'
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido'
    }
    if (step === 3) {
      if (!form.declara_requisitos) errs.declara_requisitos = 'Obrigatório'
      if (!form.declara_veracidade) errs.declara_veracidade = 'Obrigatório'
      if (!form.declara_rgpd) errs.declara_rgpd = 'Obrigatório'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!validateStep()) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const prev = () => {
    setStep(s => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addDocFile = (tipoPk, file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Apenas são aceites ficheiros PDF.')
      return
    }
    const current = docFiles[tipoPk]?.length ?? 0
    if (!MULTI_DOC_PKS.has(tipoPk) && current >= 1) return
    if (MULTI_DOC_PKS.has(tipoPk) && current >= 10) {
      setError('Limite máximo de 10 ficheiros atingido para este tipo de documento.')
      return
    }
    setDocFiles(prev => ({
      ...prev,
      [tipoPk]: [...(prev[tipoPk] || []), file],
    }))
    setError(null)
  }

  const removeDocFile = (tipoPk, idx) => {
    setDocFiles(prev => ({
      ...prev,
      [tipoPk]: (prev[tipoPk] || []).filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    setError(null)
    try {
      await submitConcursalCandidatura({ ...form, tb_procedimento: Number(pk) }, docFiles)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e.message || 'Ocorreu um erro ao submeter a candidatura.')
    } finally {
      setSubmitting(false)
    }
  }

  const err = (f) => fieldErrors[f]
    ? <p className="text-xs text-red-500 mt-1">{fieldErrors[f]}</p>
    : null

  const inputCls = (f) => fieldErrors[f] ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''

  if (submitted) {
    return (
      <PageLayout
        title="Candidatura Submetida"
        breadcrumbs={[
          { label: 'Recursos Humanos', href: '/recursos-humanos' },
          { label: 'Candidatura' },
        ]}
        seoDescription="Submeta a sua candidatura a um processo de recrutamento da AINTAR."
      >
        <section className="section-padding bg-white">
          <div className="section-container max-w-2xl text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle size={64} className="text-green-500" />
            </div>
            <h2 className="font-heading font-bold text-aintar-navy text-2xl mb-3">
              Candidatura submetida com sucesso!
            </h2>
            <p className="text-gray-600 mb-8">
              A sua candidatura foi registada. A AINTAR entrará em contacto através do email indicado.
            </p>
            <button onClick={() => navigate('/recursos-humanos')} className="btn-primary">
              Voltar a Recursos Humanos
            </button>
          </div>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Formulário de Candidatura"
      subtitle="Formulário de candidatura a procedimento concursal — DAGF_RH_FR_01"
      breadcrumbs={[
        { label: 'Recursos Humanos', href: '/recursos-humanos' },
        { label: 'Candidatura' },
      ]}
      seoDescription="Submeta a sua candidatura a um processo de recrutamento da AINTAR."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">

          {/* Stepper */}
          <div className="flex items-center gap-0 mb-10">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${i < step ? 'bg-aintar-blue text-white' : i === step ? 'bg-aintar-navy text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {i < step ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium whitespace-nowrap hidden sm:block
                    ${i === step ? 'text-aintar-navy' : i < step ? 'text-aintar-blue' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mt-[-12px] transition-colors ${i < step ? 'bg-aintar-blue' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── Passo 0 — Identificação (Secções 1, 2, 3) ── */}
          {step === 0 && (
            <ScrollReveal>
              {/* 1. Identificação do Procedimento */}
              <SectionHeader number="1" title="Identificação do Procedimento" />
              <div className="overflow-hidden rounded-lg border border-gray-200 mb-8 text-sm">
                <div className="grid grid-cols-[auto_1fr] divide-y divide-gray-200">
                  <div className="px-4 py-3 bg-gray-50 font-medium text-aintar-navy">Entidade que realiza o procedimento</div>
                  <div className="px-4 py-3 font-semibold text-aintar-navy">AINTAR – Associação de Municípios para o Sistema Intermunicipal de Águas Residuais</div>
                  <div className="px-4 py-3 bg-gray-50 font-medium text-aintar-navy">Código de oferta na BEP</div>
                  <div className={`px-4 py-3 ${proc?.codigo_bep ? 'text-gray-800 font-semibold' : 'text-gray-300 italic'}`}>
                    {proc?.codigo_bep || '—'}
                  </div>
                </div>
              </div>

              {/* 2. Caracterização do Posto de Trabalho */}
              <SectionHeader number="2" title="Caracterização do Posto de Trabalho" />
              <div className="overflow-hidden rounded-lg border border-gray-200 mb-8 text-sm">
                {[
                  ['Carreira',          proc?.carreira],
                  ['Categoria',         proc?.categoria],
                  ['Área de atividade', proc?.area_atividade],
                  ['Empregador Público', proc?.empregador || 'AINTAR – Associação de Municípios para o Sistema Intermunicipal de Águas Residuais'],
                  ['Tipo de contrato',  proc?.tipo_contrato_descricao],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[auto_1fr] border-b border-gray-100 last:border-0">
                    <div className="px-4 py-3 bg-gray-50 font-medium text-aintar-navy whitespace-nowrap w-48">{label}</div>
                    <div className={`px-4 py-3 ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Identificação do Candidato */}
              <SectionHeader number="3" title="Identificação do Candidato" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldRow label="Nome completo" required>
                    <Input value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)}
                      placeholder="Nome completo" className={inputCls('nome_completo')} />
                    {err('nome_completo')}
                  </FieldRow>
                </div>
                <FieldRow label="Data de nascimento" required>
                  <Input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} className={inputCls('data_nascimento')} />
                  {err('data_nascimento')}
                </FieldRow>
                <FieldRow label="Sexo" required>
                  <SelectField value={form.sexo} onChange={e => set('sexo', e.target.value)} className={inputCls('sexo')}>
                    <option value="">Selecionar...</option>
                    {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </SelectField>
                  {err('sexo')}
                </FieldRow>
                <FieldRow label="Documento de Identificação Civil" required>
                  <SelectField value={form.tipo_doc_id} onChange={e => set('tipo_doc_id', e.target.value)} className={inputCls('tipo_doc_id')}>
                    <option value="">Selecionar...</option>
                    {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                  {err('tipo_doc_id')}
                </FieldRow>
                <FieldRow label="N.º de Identificação Civil" required>
                  <Input value={form.num_doc_id} onChange={e => set('num_doc_id', e.target.value)}
                    placeholder="N.º documento" className={inputCls('num_doc_id')} />
                  {err('num_doc_id')}
                </FieldRow>
                <FieldRow label="Nacionalidade" required>
                  <Input value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)} placeholder="Nacionalidade" className={inputCls('nacionalidade')} />
                  {err('nacionalidade')}
                </FieldRow>
                <FieldRow label="País de Residência" required>
                  <Input value={form.pais_residencia} onChange={e => set('pais_residencia', e.target.value)} placeholder="País de residência" className={inputCls('pais_residencia')} />
                  {err('pais_residencia')}
                </FieldRow>
                <div className="sm:col-span-2">
                  <FieldRow label="Identificação Fiscal (NIF)" required>
                    <Input value={form.nif} onChange={e => set('nif', e.target.value)}
                      placeholder="Número de identificação fiscal" className={inputCls('nif')} />
                    {err('nif')}
                  </FieldRow>
                </div>
                <div className="sm:col-span-2">
                  <FieldRow label="Morada" required>
                    <Input value={form.morada} onChange={e => set('morada', e.target.value)} placeholder="Morada completa" className={inputCls('morada')} />
                    {err('morada')}
                  </FieldRow>
                </div>
                <FieldRow label="Código Postal" required>
                  <Input value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} placeholder="0000-000" className={inputCls('codigo_postal')} />
                  {err('codigo_postal')}
                </FieldRow>
                <FieldRow label="Localidade" required>
                  <Input value={form.localidade} onChange={e => set('localidade', e.target.value)} placeholder="Localidade" className={inputCls('localidade')} />
                  {err('localidade')}
                </FieldRow>
                <FieldRow label="Distrito" required>
                  <Input value={form.distrito} onChange={e => set('distrito', e.target.value)} placeholder="Distrito" className={inputCls('distrito')} />
                  {err('distrito')}
                </FieldRow>
                <FieldRow label="Concelho" required>
                  <Input value={form.concelho} onChange={e => set('concelho', e.target.value)} placeholder="Concelho" className={inputCls('concelho')} />
                  {err('concelho')}
                </FieldRow>
                <FieldRow label="Telemóvel" required>
                  <Input type="tel" value={form.telemovel} onChange={e => set('telemovel', e.target.value)} placeholder="+351 9XX XXX XXX" className={inputCls('telemovel')} />
                  {err('telemovel')}
                </FieldRow>
                <FieldRow label="Telefone">
                  <Input type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="+351 2XX XXX XXX" />
                </FieldRow>
                <div className="sm:col-span-2">
                  <FieldRow label="Endereço de correio eletrónico" required>
                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="email@exemplo.pt" className={inputCls('email')} />
                    {err('email')}
                  </FieldRow>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Passo 1 — Habilitações (Secção 4) ── */}
          {step === 1 && (
            <ScrollReveal>
              <SectionHeader number="4" title="Nível Habilitacional" />
              <p className="text-sm text-gray-600 mb-4">Assinale o campo apropriado:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                {refs?.niveis_hab?.map(nivel => (
                  <label key={nivel.pk}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition
                      ${String(form.tt_nivel_hab) === String(nivel.pk)
                        ? 'border-aintar-blue bg-aintar-blue/5'
                        : 'border-gray-200 hover:border-aintar-blue/40'}`}
                  >
                    <input type="radio" name="tt_nivel_hab"
                      checked={String(form.tt_nivel_hab) === String(nivel.pk)}
                      onChange={() => set('tt_nivel_hab', nivel.pk)}
                      className="text-aintar-blue focus:ring-aintar-blue/20 flex-shrink-0" />
                    <span className="text-xs font-bold text-aintar-navy w-6 flex-shrink-0">{nivel.codigo}</span>
                    <span className="text-sm text-gray-700 leading-snug">{nivel.descricao}</span>
                  </label>
                ))}
              </div>

              <SubsectionHeader number="4.1." title="Formação Académica/Profissional" />
              <div className="grid grid-cols-1 gap-4 mb-6">
                <FieldRow label="Área de formação académica">
                  <Input value={form.area_formacao_academica} onChange={e => set('area_formacao_academica', e.target.value)} placeholder="Ex: Engenharia Civil" />
                </FieldRow>
                <FieldRow label="Área de formação profissional">
                  <Input value={form.area_formacao_profissional} onChange={e => set('area_formacao_profissional', e.target.value)} placeholder="Ex: Gestão de Sistemas de Saneamento" />
                </FieldRow>
                <FieldRow label="Outras formações académicas e profissionais relevantes">
                  <Textarea value={form.outras_formacoes} onChange={e => set('outras_formacoes', e.target.value)} placeholder="Descreva outras formações relevantes..." />
                </FieldRow>
              </div>

              <SubsectionHeader number="4.2." title="Formação ou Experiência Profissional Substitutiva do Nível Habilitacional Exigido" />
              <p className="text-xs text-gray-500 mb-3">
                No caso de a publicitação do procedimento concursal prever a possibilidade de substituição do nível habilitacional exigido por formação ou experiência profissional substitutiva, indique-a no quadro seguinte.
              </p>
              <Textarea value={form.formacao_substitutiva} onChange={e => set('formacao_substitutiva', e.target.value)} placeholder="Descreva a formação ou experiência profissional substitutiva..." rows={4} />
            </ScrollReveal>
          )}

          {/* ── Passo 2 — Situação Profissional (Secções 5, 6, 7) ── */}
          {step === 2 && (
            <ScrollReveal>
              <SectionHeader number="5" title="Situação Jurídico-Funcional do Trabalhador" />

              {/* Titular de vínculo? */}
              <div className="overflow-hidden rounded-lg border border-gray-200 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50">
                  <span className="text-sm font-medium text-aintar-navy">É titular de vínculo de emprego público?</span>
                  <div className="flex gap-6">
                    {[['Sim', true], ['Não', false]].map(([label, val]) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="vinculo_publico"
                          checked={form.titular_vinculo_publico === val}
                          onChange={() => set('titular_vinculo_publico', val)}
                          className="text-aintar-blue focus:ring-aintar-blue/20" />
                        <span className="text-sm text-gray-700 font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {form.titular_vinculo_publico && (
                <>
                  <SubsectionHeader number="5.1." title="Modalidade de Vínculo de Emprego Público" />
                  <div className="overflow-hidden rounded-lg border border-gray-200 mb-6">
                    {GRUPOS_VINCULO.map((grupo, gi) => (
                      <div key={grupo} className={gi > 0 ? 'border-t-2 border-aintar-navy/20' : ''}>
                        <div className="px-4 py-2.5 bg-aintar-light">
                          <span className="text-xs font-bold text-aintar-navy uppercase tracking-wide">{grupo}</span>
                        </div>
                        {VINCULO_OPTIONS.filter(o => o.grupo === grupo).map(opt => (
                          <label key={opt.modalidade}
                            className={`flex items-center gap-3 px-4 py-3 border-t border-gray-100 cursor-pointer transition
                              ${vinculoSel?.grupo === opt.grupo && vinculoSel?.modalidade === opt.modalidade
                                ? 'bg-aintar-blue/5'
                                : 'hover:bg-aintar-light/50'}`}
                          >
                            <input type="radio" name="modalidade_vinculo"
                              checked={vinculoSel?.grupo === opt.grupo && vinculoSel?.modalidade === opt.modalidade}
                              onChange={() => handleVinculoSelect(opt)}
                              className="text-aintar-blue focus:ring-aintar-blue/20 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{opt.modalidade}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>

                  <SubsectionHeader number="5.2." title="Situação Profissional" />
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <FieldRow label="Situação profissional atual">
                      <div className="flex flex-col gap-2 pt-1">
                        {SITUACOES_PROF.map(s => (
                          <label key={s} className="flex items-start gap-2.5 cursor-pointer">
                            <input type="radio" name="situacao_prof"
                              checked={form.situacao_profissional_atual === s}
                              onChange={() => set('situacao_profissional_atual', s)}
                              className="mt-0.5 text-aintar-blue focus:ring-aintar-blue/20 flex-shrink-0" />
                            <span className="text-sm text-gray-700 leading-snug">{s}</span>
                          </label>
                        ))}
                      </div>
                    </FieldRow>
                    <FieldRow label="Órgão ou serviço onde exerce ou, por último, exerceu funções">
                      <Input value={form.orgao_servico} onChange={e => set('orgao_servico', e.target.value)} placeholder="Nome do órgão/serviço" />
                    </FieldRow>
                    <FieldRow label="Carreira e categoria">
                      <Input value={form.carreira_categoria} onChange={e => set('carreira_categoria', e.target.value)} placeholder="Ex: Técnico Superior" />
                    </FieldRow>
                    <FieldRow label="Atividade exercida ou que, por último, exerceu no órgão ou serviço">
                      <Textarea value={form.atividade_exercida} onChange={e => set('atividade_exercida', e.target.value)} placeholder="Descreva a atividade exercida..." />
                    </FieldRow>
                    <FieldRow label="Posição e nível remuneratórios detidos">
                      <Input value={form.posicao_nivel_remuneratorio} onChange={e => set('posicao_nivel_remuneratorio', e.target.value)} placeholder="Ex: Posição 1, Nível 10" />
                    </FieldRow>
                    <FieldRow label="Avaliação de desempenho">
                      <Input value={form.avaliacao_desempenho} onChange={e => set('avaliacao_desempenho', e.target.value)} placeholder="Ex: Relevante / Adequado" />
                    </FieldRow>
                  </div>
                </>
              )}

              {/* 6. Opção por Métodos de Seleção */}
              <SectionHeader number="6" title="Opção por Métodos de Seleção" />
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Se se encontra a cumprir ou executar a atribuição, competência ou atividade caracterizadora do(s) posto(s) de trabalho publicitado(s) ou, encontrando-se ao abrigo do Regime de Valorização Profissional, aprovado pela Lei n.º 25/2017, de 30 de maio, as cumpriu ou executou por último, e pretende afastar os métodos de seleção obrigatórios, nos termos do n.º 3 do artigo 36.º da Lei Geral do Trabalho em Funções Públicas, aprovada pela Lei n.º 35/2014, de 20 de junho, assinale a seguinte declaração:
              </p>
              <div className="p-4 bg-aintar-light rounded-xl border border-aintar-blue/10 mb-8">
                <CheckField
                  id="afasta_metodos"
                  checked={form.afasta_metodos_obrigatorios}
                  onChange={e => set('afasta_metodos_obrigatorios', e.target.checked)}
                  label='"Declaro que afasto os métodos de seleção obrigatórios Avaliação Curricular e, quando aplicável, Entrevista de Avaliação de Competências, e opto pelos métodos de seleção "Prova de Conhecimentos" e, quando aplicável, "Avaliação Psicológica", nos termos dos n.ºs 3 e 5 do artigo 36.º da Lei Geral do Trabalho em Funções Públicas.'
                />
              </div>

              {/* 7. Necessidades Especiais */}
              <SectionHeader number="7" title="Necessidades Especiais" />
              <p className="text-xs text-gray-600 italic mb-4 leading-relaxed">
                Caso lhe tenha sido reconhecido, legalmente, algum grau de incapacidade, indique o respetivo grau, o tipo de deficiência e se necessita de meios / condições especiais para a realização dos métodos de seleção.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <FieldRow label="Grau de incapacidade">
                  <Input value={form.grau_incapacidade} onChange={e => set('grau_incapacidade', e.target.value)} placeholder="Ex: 60%" />
                </FieldRow>
                <FieldRow label="Tipo de incapacidade">
                  <Input value={form.tipo_incapacidade} onChange={e => set('tipo_incapacidade', e.target.value)} placeholder="Ex: Motora" />
                </FieldRow>
              </div>
              <SubsectionHeader number="7.1." title="Especifique as condições especiais necessárias para a realização dos métodos de seleção" />
              <Textarea value={form.condicoes_especiais} onChange={e => set('condicoes_especiais', e.target.value)} placeholder="Especifique as condições especiais necessárias..." rows={4} />
            </ScrollReveal>
          )}

          {/* ── Passo 3 — Declarações (Secções 8, 9 + RGPD) ── */}
          {step === 3 && (
            <ScrollReveal>
              {/* 8. Declarações Finais */}
              <SectionHeader number="8" title="Declarações Finais" />
              <p className="text-sm text-gray-600 italic mb-4">Assinale com X os campos seguintes, se concordar e autorizar.</p>
              <div className="space-y-4 mb-8">
                <div className={`p-4 rounded-xl border ${fieldErrors.declara_requisitos ? 'border-red-300 bg-red-50' : 'bg-aintar-light border-aintar-blue/10'}`}>
                  <CheckField
                    id="declara_requisitos"
                    checked={form.declara_requisitos}
                    onChange={e => set('declara_requisitos', e.target.checked)}
                    label='"Declaro que reúno os requisitos previstos no artigo 17.º da Lei Geral do Trabalho em Funções Públicas, bem como os constantes no Aviso de Abertura do Procedimento Concursal."'
                  />
                  {err('declara_requisitos')}
                </div>
                <div className={`p-4 rounded-xl border ${fieldErrors.declara_veracidade ? 'border-red-300 bg-red-50' : 'bg-aintar-light border-aintar-blue/10'}`}>
                  <CheckField
                    id="declara_veracidade"
                    checked={form.declara_veracidade}
                    onChange={e => set('declara_veracidade', e.target.checked)}
                    label='"Nos termos e para os efeitos do disposto na alínea g), n.º 1 do artigo 13.º da Portaria n.º 233/2022, de 9 de setembro, declaro que são verdadeiras as informações acima prestadas."'
                  />
                  {err('declara_veracidade')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <FieldRow label="Localidade">
                    <Input value={form.localidade_assinatura} onChange={e => set('localidade_assinatura', e.target.value)} placeholder="Localidade" />
                  </FieldRow>
                  <FieldRow label="Data">
                    <Input type="date" value={form.data_assinatura} onChange={e => set('data_assinatura', e.target.value)} />
                  </FieldRow>
                </div>
              </div>

              {/* 9. Documentos Anexos */}
              <SectionHeader number="9" title="Documentos Anexos" />
              <p className="text-xs text-gray-500 mb-4">Apenas são aceites ficheiros PDF. Pode anexar mais do que um ficheiro por tipo de documento.</p>
              {refs?.tipos_documento?.length > 0 && (
                <div className="space-y-3 mb-8">
                  {refs.tipos_documento.map(d => {
                    const files = docFiles[d.pk] || []
                    return (
                      <div key={d.pk} className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip size={14} className="text-aintar-teal flex-shrink-0" />
                            <span className="text-sm font-medium text-aintar-navy truncate">{d.descricao}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {d.obrigatorio
                              ? <span className="text-xs font-semibold text-aintar-teal bg-aintar-teal/10 px-2 py-0.5 rounded-full">Obrigatório</span>
                              : <span className="text-xs text-gray-400">Quando aplicável</span>
                            }
                            <input
                              ref={el => fileInputRefs.current[d.pk] = el}
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={e => {
                                addDocFile(d.pk, e.target.files?.[0])
                                e.target.value = ''
                              }}
                            />
                            <button
                              type="button"
                              disabled={
                                (!MULTI_DOC_PKS.has(d.pk) && (docFiles[d.pk]?.length ?? 0) >= 1) ||
                                (MULTI_DOC_PKS.has(d.pk) && (docFiles[d.pk]?.length ?? 0) >= 10)
                              }
                              onClick={() => fileInputRefs.current[d.pk]?.click()}
                              className="flex items-center gap-1 text-xs font-medium text-aintar-blue hover:text-aintar-navy transition px-2 py-1 rounded border border-aintar-blue/30 hover:border-aintar-navy/40 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus size={12} /> {MULTI_DOC_PKS.has(d.pk) ? `Adicionar PDF ${(docFiles[d.pk]?.length ?? 0) > 0 ? `(${docFiles[d.pk].length}/10)` : ''}` : 'Selecionar PDF'}
                            </button>
                          </div>
                        </div>
                        {files.length > 0 && (
                          <ul className="divide-y divide-gray-100">
                            {files.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 px-4 py-2 bg-white">
                                <span className="text-xs text-aintar-teal flex-shrink-0">PDF</span>
                                <span className="text-xs text-gray-700 truncate flex-1">{f.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocFile(d.pk, i)}
                                  className="text-gray-300 hover:text-red-400 transition flex-shrink-0"
                                >
                                  <X size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Anexo RGPD */}
              <div className={`p-4 rounded-xl border ${fieldErrors.declara_rgpd ? 'border-red-300 bg-red-50' : 'bg-blue-50 border-aintar-blue/20'}`}>
                <p className="text-xs font-bold text-aintar-navy uppercase tracking-wide mb-2">
                  Anexo — Direito de Informação e Acesso aos Dados Pessoais (RGPD)
                </p>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  A AINTAR, no âmbito das suas atribuições, é responsável pela proteção e tratamento dos dados pessoais no estrito cumprimento do Regulamento (UE) 2016/679 (RGPD) e da Lei n.º 58/2019. Os dados disponibilizados são usados exclusivamente no âmbito do processo de recrutamento e podem ser acedidos, retificados ou apagados pelo seu titular.
                </p>
                <CheckField
                  id="declara_rgpd"
                  checked={form.declara_rgpd}
                  onChange={e => set('declara_rgpd', e.target.checked)}
                  label="Tomei conhecimento da política de proteção de dados pessoais da AINTAR no âmbito deste procedimento concursal."
                />
                {err('declara_rgpd')}
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </ScrollReveal>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={step === 0 ? () => navigate(-1) : prev}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-aintar-navy transition"
            >
              <ChevronLeft size={18} />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="btn-primary flex items-center gap-2">
                Seguinte <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> A submeter...</>
                  : <><CheckCircle size={18} /> Submeter candidatura</>
                }
              </button>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
