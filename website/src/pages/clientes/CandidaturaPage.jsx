import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getConcursalReferencias, submitConcursalCandidatura } from '../../services/cmsApi'

const STEPS = [
  'Identificação',
  'Habilitações',
  'Situação Profissional',
  'Declarações',
]

const SEXOS = ['Masculino', 'Feminino', 'Outro']
const TIPOS_DOC = ['Cartão de Cidadão', 'Bilhete de Identidade', 'Passaporte', 'Outro']
const SITUACOES = ['Em exercício de funções', 'Em licença', 'Regime de Valorização Profissional']

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

function Select({ children, className = '', ...props }) {
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
  telemovel: '', telefone: '', email: '',
  tt_nivel_hab: '', area_formacao_academica: '', area_formacao_profissional: '',
  outras_formacoes: '', formacao_substitutiva: '',
  titular_vinculo_publico: false, tt_tipo_vinculo: '', modalidade_vinculo: '',
  situacao_profissional_atual: '', orgao_servico: '', carreira_categoria: '',
  atividade_exercida: '', posicao_nivel_remuneratorio: '', avaliacao_desempenho: '',
  afasta_metodos_obrigatorios: false,
  grau_incapacidade: '', tipo_incapacidade: '', condicoes_especiais: '',
  declara_requisitos: false, declara_veracidade: false,
  localidade_assinatura: '', data_assinatura: new Date().toISOString().slice(0, 10),
}

export default function CandidaturaPage() {
  const { pk } = useParams()
  const navigate = useNavigate()

  const [step, setStep]           = useState(0)
  const [form, setForm]           = useState(EMPTY)
  const [refs, setRefs]           = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    getConcursalReferencias()
      .then(data => setRefs(data))
      .catch(() => setRefs({ niveis_hab: [], tipos_vinculo: [], tipos_documento: [] }))
  }, [])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setFieldErrors(e => ({ ...e, [field]: undefined }))
  }

  const validateStep = () => {
    const errs = {}
    if (step === 0) {
      if (!form.nome_completo.trim()) errs.nome_completo = 'Campo obrigatório'
      if (!form.nif.trim()) errs.nif = 'Campo obrigatório'
      if (!form.email.trim()) errs.email = 'Campo obrigatório'
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = 'Email inválido'
    }
    if (step === 3) {
      if (!form.declara_requisitos) errs.declara_requisitos = 'Obrigatório'
      if (!form.declara_veracidade) errs.declara_veracidade = 'Obrigatório'
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

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    setError(null)
    try {
      await submitConcursalCandidatura({ ...form, tb_procedimento: Number(pk) })
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

  const inputCls = (f) => fieldErrors[f]
    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
    : ''

  if (submitted) {
    return (
      <PageLayout
        title="Candidatura Submetida"
        breadcrumbs={[
          { label: 'Clientes', href: '/clientes' },
          { label: 'Formulários', href: '/clientes/formularios' },
          { label: 'Candidatura' },
        ]}
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
              A sua candidatura foi registada. Receberá um email de confirmação com os detalhes.
              A AINTAR entrará em contacto através do email indicado.
            </p>
            <button
              onClick={() => navigate('/clientes/formularios')}
              className="btn-primary"
            >
              Voltar aos Formulários
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
        { label: 'Clientes', href: '/clientes' },
        { label: 'Formulários', href: '/clientes/formularios' },
        { label: 'Candidatura' },
      ]}
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
                  <div className={`flex-1 h-0.5 mx-1 mt-[-12px] transition-colors
                    ${i < step ? 'bg-aintar-blue' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0 — Identificação */}
          {step === 0 && (
            <ScrollReveal>
              <h3 className="font-heading font-bold text-aintar-navy text-lg mb-6 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-aintar-sky" />
                Identificação do Candidato
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldRow label="Nome completo" required>
                    <Input value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)}
                      placeholder="Nome completo" className={inputCls('nome_completo')} />
                    {err('nome_completo')}
                  </FieldRow>
                </div>
                <FieldRow label="Data de nascimento">
                  <Input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
                </FieldRow>
                <FieldRow label="Sexo">
                  <Select value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                    <option value="">Selecionar...</option>
                    {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FieldRow>
                <FieldRow label="Documento de identificação">
                  <Select value={form.tipo_doc_id} onChange={e => set('tipo_doc_id', e.target.value)}>
                    <option value="">Selecionar...</option>
                    {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FieldRow>
                <FieldRow label="N.º de identificação civil">
                  <Input value={form.num_doc_id} onChange={e => set('num_doc_id', e.target.value)}
                    placeholder="N.º documento" />
                </FieldRow>
                <FieldRow label="Nacionalidade">
                  <Input value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)}
                    placeholder="Nacionalidade" />
                </FieldRow>
                <FieldRow label="País de residência">
                  <Input value={form.pais_residencia} onChange={e => set('pais_residencia', e.target.value)}
                    placeholder="País de residência" />
                </FieldRow>
                <FieldRow label="NIF" required>
                  <Input value={form.nif} onChange={e => set('nif', e.target.value)}
                    placeholder="Número de identificação fiscal" className={inputCls('nif')} />
                  {err('nif')}
                </FieldRow>
                <div className="sm:col-span-2">
                  <FieldRow label="Morada">
                    <Input value={form.morada} onChange={e => set('morada', e.target.value)}
                      placeholder="Morada completa" />
                  </FieldRow>
                </div>
                <FieldRow label="Código postal">
                  <Input value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)}
                    placeholder="0000-000" />
                </FieldRow>
                <FieldRow label="Localidade">
                  <Input value={form.localidade} onChange={e => set('localidade', e.target.value)}
                    placeholder="Localidade" />
                </FieldRow>
                <FieldRow label="Distrito">
                  <Input value={form.distrito} onChange={e => set('distrito', e.target.value)}
                    placeholder="Distrito" />
                </FieldRow>
                <FieldRow label="Concelho">
                  <Input value={form.concelho} onChange={e => set('concelho', e.target.value)}
                    placeholder="Concelho" />
                </FieldRow>
                <FieldRow label="Telemóvel">
                  <Input type="tel" value={form.telemovel} onChange={e => set('telemovel', e.target.value)}
                    placeholder="+351 9XX XXX XXX" />
                </FieldRow>
                <FieldRow label="Telefone">
                  <Input type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)}
                    placeholder="+351 2XX XXX XXX" />
                </FieldRow>
                <div className="sm:col-span-2">
                  <FieldRow label="Email" required>
                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="email@exemplo.pt" className={inputCls('email')} />
                    {err('email')}
                  </FieldRow>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Step 1 — Habilitações */}
          {step === 1 && (
            <ScrollReveal>
              <h3 className="font-heading font-bold text-aintar-navy text-lg mb-6 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-aintar-sky" />
                Nível Habilitacional
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <FieldRow label="Nível de escolaridade">
                  <Select value={form.tt_nivel_hab} onChange={e => set('tt_nivel_hab', e.target.value)}>
                    <option value="">Selecionar...</option>
                    {refs?.niveis_hab?.map(n => (
                      <option key={n.pk} value={n.pk}>{n.codigo} — {n.descricao}</option>
                    ))}
                  </Select>
                </FieldRow>
                <FieldRow label="Área de formação académica">
                  <Input value={form.area_formacao_academica}
                    onChange={e => set('area_formacao_academica', e.target.value)}
                    placeholder="Ex: Engenharia Civil" />
                </FieldRow>
                <FieldRow label="Área de formação profissional">
                  <Input value={form.area_formacao_profissional}
                    onChange={e => set('area_formacao_profissional', e.target.value)}
                    placeholder="Ex: Gestão de Sistemas de Saneamento" />
                </FieldRow>
                <FieldRow label="Outras formações académicas e profissionais relevantes">
                  <Textarea value={form.outras_formacoes}
                    onChange={e => set('outras_formacoes', e.target.value)}
                    placeholder="Descreva outras formações relevantes..." />
                </FieldRow>
                <div className="p-4 bg-aintar-light rounded-xl border border-aintar-blue/10">
                  <p className="text-xs font-semibold text-aintar-navy uppercase tracking-wide mb-2">
                    Formação ou experiência substitutiva (ponto 4.2)
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Preencha apenas se o aviso de abertura previr substituição do nível habilitacional.
                  </p>
                  <Textarea value={form.formacao_substitutiva}
                    onChange={e => set('formacao_substitutiva', e.target.value)}
                    placeholder="Descreva a formação ou experiência profissional substitutiva..." />
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Step 2 — Situação Profissional */}
          {step === 2 && (
            <ScrollReveal>
              <h3 className="font-heading font-bold text-aintar-navy text-lg mb-6 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-aintar-sky" />
                Situação Jurídico-Funcional
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <FieldRow label="É titular de vínculo de emprego público?">
                  <div className="flex gap-6 pt-1">
                    {[['Sim', true], ['Não', false]].map(([label, val]) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="vinculo_publico"
                          checked={form.titular_vinculo_publico === val}
                          onChange={() => set('titular_vinculo_publico', val)}
                          className="text-aintar-blue focus:ring-aintar-blue/20" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </FieldRow>

                {form.titular_vinculo_publico && (
                  <>
                    <FieldRow label="Tipo de vínculo">
                      <Select value={form.tt_tipo_vinculo} onChange={e => set('tt_tipo_vinculo', e.target.value)}>
                        <option value="">Selecionar...</option>
                        {refs?.tipos_vinculo?.map(v => (
                          <option key={v.pk} value={v.pk}>{v.descricao}</option>
                        ))}
                      </Select>
                    </FieldRow>
                    <FieldRow label="Situação profissional atual">
                      <Select value={form.situacao_profissional_atual}
                        onChange={e => set('situacao_profissional_atual', e.target.value)}>
                        <option value="">Selecionar...</option>
                        {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </FieldRow>
                    <FieldRow label="Órgão ou serviço onde exerce (ou exerceu) funções">
                      <Input value={form.orgao_servico} onChange={e => set('orgao_servico', e.target.value)}
                        placeholder="Nome do órgão/serviço" />
                    </FieldRow>
                    <FieldRow label="Carreira e categoria">
                      <Input value={form.carreira_categoria} onChange={e => set('carreira_categoria', e.target.value)}
                        placeholder="Ex: Técnico Superior" />
                    </FieldRow>
                    <FieldRow label="Atividade exercida">
                      <Textarea value={form.atividade_exercida} onChange={e => set('atividade_exercida', e.target.value)}
                        placeholder="Descreva a atividade exercida..." />
                    </FieldRow>
                    <FieldRow label="Posição e nível remuneratórios">
                      <Input value={form.posicao_nivel_remuneratorio}
                        onChange={e => set('posicao_nivel_remuneratorio', e.target.value)}
                        placeholder="Ex: Posição 1, Nível 10" />
                    </FieldRow>
                    <FieldRow label="Avaliação de desempenho">
                      <Input value={form.avaliacao_desempenho}
                        onChange={e => set('avaliacao_desempenho', e.target.value)}
                        placeholder="Ex: Relevante / Adequado" />
                    </FieldRow>
                  </>
                )}

                <div className="p-4 bg-aintar-light rounded-xl border border-aintar-blue/10">
                  <p className="text-xs font-semibold text-aintar-navy uppercase tracking-wide mb-3">
                    Opção por métodos de seleção (ponto 6)
                  </p>
                  <CheckField
                    id="afasta_metodos"
                    checked={form.afasta_metodos_obrigatorios}
                    onChange={e => set('afasta_metodos_obrigatorios', e.target.checked)}
                    label='Declaro que afasto os métodos de seleção obrigatórios (Avaliação Curricular e Entrevista de Avaliação de Competências) e opto por "Prova de Conhecimentos" e, quando aplicável, "Avaliação Psicológica".'
                  />
                </div>

                <div className="p-4 bg-aintar-light rounded-xl border border-aintar-blue/10">
                  <p className="text-xs font-semibold text-aintar-navy uppercase tracking-wide mb-3">
                    Necessidades especiais (ponto 7)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldRow label="Grau de incapacidade">
                      <Input value={form.grau_incapacidade}
                        onChange={e => set('grau_incapacidade', e.target.value)}
                        placeholder="Ex: 60%" />
                    </FieldRow>
                    <FieldRow label="Tipo de incapacidade">
                      <Input value={form.tipo_incapacidade}
                        onChange={e => set('tipo_incapacidade', e.target.value)}
                        placeholder="Ex: Motora" />
                    </FieldRow>
                    <div className="sm:col-span-2">
                      <FieldRow label="Condições especiais necessárias para os métodos de seleção">
                        <Textarea value={form.condicoes_especiais}
                          onChange={e => set('condicoes_especiais', e.target.value)}
                          placeholder="Especifique as condições especiais necessárias..." />
                      </FieldRow>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Step 3 — Declarações */}
          {step === 3 && (
            <ScrollReveal>
              <h3 className="font-heading font-bold text-aintar-navy text-lg mb-6 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-aintar-sky" />
                Declarações Finais
              </h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${fieldErrors.declara_requisitos ? 'border-red-300 bg-red-50' : 'bg-aintar-light border-aintar-blue/10'}`}>
                  <CheckField
                    id="declara_requisitos"
                    checked={form.declara_requisitos}
                    onChange={e => set('declara_requisitos', e.target.checked)}
                    label='Declaro que reúno os requisitos previstos no artigo 17.º da Lei Geral do Trabalho em Funções Públicas, bem como os constantes no Aviso de Abertura do Procedimento Concursal.'
                  />
                  {err('declara_requisitos')}
                </div>

                <div className={`p-4 rounded-xl border ${fieldErrors.declara_veracidade ? 'border-red-300 bg-red-50' : 'bg-aintar-light border-aintar-blue/10'}`}>
                  <CheckField
                    id="declara_veracidade"
                    checked={form.declara_veracidade}
                    onChange={e => set('declara_veracidade', e.target.checked)}
                    label='Nos termos e para os efeitos do disposto na alínea g), n.º 1 do artigo 13.º da Portaria n.º 233/2022, de 9 de setembro, declaro que são verdadeiras as informações acima prestadas.'
                  />
                  {err('declara_veracidade')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Localidade">
                    <Input value={form.localidade_assinatura}
                      onChange={e => set('localidade_assinatura', e.target.value)}
                      placeholder="Localidade" />
                  </FieldRow>
                  <FieldRow label="Data">
                    <Input type="date" value={form.data_assinatura}
                      onChange={e => set('data_assinatura', e.target.value)} />
                  </FieldRow>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-aintar-blue/20">
                  <p className="text-xs font-semibold text-aintar-navy mb-2 uppercase tracking-wide">
                    Documentos a anexar (secção 9)
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Após submeter o formulário, envie os documentos por email para{' '}
                    <a href="mailto:rh@aintar.pt" className="text-aintar-blue font-medium hover:underline">
                      rh@aintar.pt
                    </a>{' '}
                    indicando o seu nome e NIF. Os documentos obrigatórios são:
                  </p>
                  <ul className="space-y-1">
                    {refs?.tipos_documento?.filter(d => d.obrigatorio).map(d => (
                      <li key={d.pk} className="flex items-center gap-2 text-xs text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-aintar-blue flex-shrink-0" />
                        {d.descricao}
                      </li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={step === 0 ? () => navigate('/clientes/formularios') : prev}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-aintar-navy transition"
            >
              <ChevronLeft size={18} />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={next} className="btn-primary flex items-center gap-2">
                Seguinte
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> A submeter...</>
                ) : (
                  <><CheckCircle size={18} /> Submeter candidatura</>
                )}
              </button>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
