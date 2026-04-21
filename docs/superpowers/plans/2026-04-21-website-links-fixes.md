# Website Links & Buttons Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os links mortos, números placeholder, navegação em falta e endpoint do formulário de contacto no website AINTAR.

**Architecture:** Todas as alterações são no frontend (`website/src/`). O backend já tem o endpoint de contacto implementado em `POST /api/v1/website/contacto` — só é necessário corrigir o URL no frontend. As páginas legais seguem o padrão `PageLayout` existente.

**Tech Stack:** React 19, React Router 7, Tailwind CSS, PageLayout component pattern

---

## Ficheiros a modificar

| Ficheiro | O que muda |
|---|---|
| `website/src/components/ui/ContactForm.jsx` | URL `/api/contact` → `/api/v1/website/contacto`; link Política de Privacidade |
| `website/src/components/layout/Footer.jsx` | WhatsApp real; links legais; âncoras saneamento |
| `website/src/components/layout/Navbar.jsx` | Adicionar "Área de Clientes" ao dropdown Clientes |
| `website/src/pages/clientes/ClientesPage.jsx` | Número de emergência real |
| `website/src/pages/saneamento/SaneamentoPage.jsx` | Adicionar IDs de âncora às secções |
| `website/src/App.jsx` | Registar as duas novas rotas legais |

## Ficheiros a criar

| Ficheiro | O que é |
|---|---|
| `website/src/pages/PoliticaPrivacidadePage.jsx` | Página RGPD — Política de Privacidade |
| `website/src/pages/TermosUtilizacaoPage.jsx` | Página de Termos de Utilização |

---

### Task 1: Corrigir URL do formulário de contacto

**Files:**
- Modify: `website/src/components/ui/ContactForm.jsx:21`

O backend já tem o endpoint em `/api/v1/website/contacto`. O frontend chamava `/api/contact` (inexistente).

- [ ] **Step 1: Corrigir o URL do fetch**

Em `website/src/components/ui/ContactForm.jsx`, linha 21, alterar:

```jsx
const res = await fetch('/api/v1/website/contacto', {
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/ui/ContactForm.jsx
git commit -m "fix: corrigir URL do endpoint de contacto no formulário"
```

---

### Task 2: Corrigir números placeholder

**Files:**
- Modify: `website/src/components/layout/Footer.jsx:179`
- Modify: `website/src/pages/clientes/ClientesPage.jsx:115-118`

- [ ] **Step 1: Corrigir WhatsApp no Footer**

Em `website/src/components/layout/Footer.jsx`, linha 179, alterar:

```jsx
<a href="https://wa.me/351927242740"
```

- [ ] **Step 2: Corrigir linha de emergência na ClientesPage**

Em `website/src/pages/clientes/ClientesPage.jsx`, linhas 115-118, alterar:

```jsx
<a href="tel:+351963612484"
  className="px-6 py-3 rounded-full bg-amber-500 text-white font-bold text-sm hover:bg-amber-400 transition-colors flex-shrink-0">
  963 612 484
</a>
```

E na div acima (linha 111-113), atualizar o label:

```jsx
<div className="font-heading font-bold text-white text-base">Piquete 24 Horas</div>
<div className="text-white/60 text-sm">Para avarias urgentes fora do horário normal</div>
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/layout/Footer.jsx website/src/pages/clientes/ClientesPage.jsx
git commit -m "fix: substituir números placeholder por números reais"
```

---

### Task 3: Adicionar "Área de Clientes" ao Navbar

**Files:**
- Modify: `website/src/components/layout/Navbar.jsx:17-26`

- [ ] **Step 1: Adicionar item no dropdown Clientes**

Em `website/src/components/layout/Navbar.jsx`, dentro do objeto `{ label: 'Clientes', children: [...] }`, adicionar como **primeiro item** do array `children`:

```js
{
  label: 'Clientes',
  children: [
    { label: 'Área de Clientes', href: '/clientes' },
    { label: 'Regulamento de Serviço', href: '/clientes/regulamento' },
    { label: 'Tarifário', href: '/clientes/tarifario' },
    { label: 'Formulários', href: '/clientes/formularios' },
    { label: 'Perguntas Frequentes', href: '/clientes/faq' },
    { label: '2ª Via de Fatura', href: 'https://app.aintar.pt', external: true },
  ],
},
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/layout/Navbar.jsx
git commit -m "feat: adicionar acesso direto à página Clientes no navbar"
```

---

### Task 4: Adicionar âncoras à SaneamentoPage e corrigir links do Footer

**Files:**
- Modify: `website/src/pages/saneamento/SaneamentoPage.jsx`
- Modify: `website/src/components/layout/Footer.jsx`

A `SaneamentoPage` tem uma secção única com `bg-white`. O conteúdo trata sistemas em alta e em baixa. Vamos dividir em sub-secções identificadas por ID.

- [ ] **Step 1: Adicionar IDs de âncora à SaneamentoPage**

Em `website/src/pages/saneamento/SaneamentoPage.jsx`, substituir a estrutura da secção principal para ter IDs distinguíveis:

```jsx
export default function SaneamentoPage() {
  return (
    <PageLayout
      title="Sistemas de Tratamento"
      subtitle="Infraestruturas de saneamento de águas residuais geridas pela AINTAR na região Centro."
      breadcrumbs={[{ label: 'Saneamento' }]}
    >
      {/* Saneamento em Alta */}
      <section id="alta" className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <ScrollReveal>
              <span className="section-tag bg-aintar-sky/10 text-aintar-sky border border-aintar-sky/20 mb-4">
                Saneamento em Alta
              </span>
              <h2 className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
                Rede de saneamento <span className="text-gradient">integrada e moderna</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                A AINTAR opera uma rede integrada de infraestruturas de saneamento em alta,
                que incluem estações de tratamento de águas residuais (ETAR), sistemas de águas residuais (SAR),
                redes de emissários e estações elevatórias.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Todas as instalações operam com processos de monitorização contínua, assegurando o
                cumprimento dos padrões ambientais e a proteção dos recursos hídricos da região.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Factory, label: 'ETARs em Operação', value: '4+', color: 'aintar-sky' },
                  { icon: Droplets, label: 'SARs Activos', value: '8+', color: 'aintar-teal' },
                  { icon: Activity, label: 'Monitorização', value: '24/7', color: 'aintar-blue' },
                  { icon: Factory, label: 'Eficiência', value: '98%', color: 'aintar-teal' },
                ].map((s) => (
                  <div key={s.label}
                    className="p-5 rounded-2xl bg-aintar-light border border-aintar-blue/10 text-center">
                    <s.icon size={22} className={`text-${s.color} mx-auto mb-2`} />
                    <div className={`text-2xl font-extrabold font-heading text-${s.color} mb-1`}>{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Instalações */}
          <ScrollReveal>
            <h2 className="font-heading font-bold text-aintar-navy text-xl mb-6">Principais Instalações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {instalacoes.map((inst) => (
                <div key={inst.nome}
                  className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-aintar-sky/30
                    hover:shadow-md transition-all">
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-3
                    ${inst.tipo === 'ETAR' ? 'bg-aintar-sky/10 text-aintar-sky' : 'bg-aintar-teal/10 text-aintar-teal'}`}>
                    {inst.tipo}
                  </div>
                  <div className="font-heading font-bold text-aintar-navy text-sm mb-1">{inst.nome}</div>
                  <div className="text-xs text-gray-400">{inst.municipio}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Saneamento em Baixa */}
      <section id="baixa" className="section-padding bg-aintar-light">
        <div className="section-container">
          <ScrollReveal>
            <span className="section-tag bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20 mb-4">
              Saneamento em Baixa
            </span>
            <h2 className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
              style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
              Redes de recolha e transporte <span className="text-gradient">de águas residuais</span>
            </h2>
            <p className="text-gray-600 leading-relaxed max-w-3xl">
              A AINTAR gere cerca de 700 km de coletores e 91 estações elevatórias distribuídas pelos
              quatro municípios associados — Carregal do Sal, Santa Comba Dão, Tábua e Tondela —
              assegurando a recolha e transporte das águas residuais domésticas e industriais até
              às instalações de tratamento.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                { value: '700 km', label: 'Rede de Coletores', sub: 'Distribuídos pelos 4 municípios' },
                { value: '91', label: 'Estações Elevatórias', sub: 'Em operação contínua' },
                { value: '26 mil', label: 'Clientes Servidos', sub: 'Cerca de 56.000 habitantes' },
              ].map((s) => (
                <div key={s.label} className="p-6 rounded-2xl bg-white border border-aintar-blue/10 text-center">
                  <div className="text-3xl font-extrabold font-heading text-aintar-blue mb-1">{s.value}</div>
                  <div className="font-semibold text-aintar-navy text-sm mb-1">{s.label}</div>
                  <div className="text-xs text-gray-400">{s.sub}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Tratamento de Efluentes */}
      <section id="efluentes" className="section-padding bg-white">
        <div className="section-container">
          <ScrollReveal>
            <span className="section-tag bg-aintar-blue/10 text-aintar-blue border border-aintar-blue/20 mb-4">
              Tratamento de Efluentes
            </span>
            <h2 className="font-heading font-extrabold text-aintar-navy mb-5 leading-tight"
              style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}>
              Processo de tratamento <span className="text-gradient">ambientalmente responsável</span>
            </h2>
            <p className="text-gray-600 leading-relaxed max-w-3xl mb-8">
              O tratamento das águas residuais é realizado em conformidade com a legislação ambiental
              em vigor, garantindo que os efluentes tratados apresentam a qualidade necessária para
              rejeição no meio hídrico sem comprometer os ecossistemas locais.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2} className="text-center">
            <Link to="/saneamento/qualidade" className="btn-outline-blue">
              Consultar Qualidade do Serviço
              <ArrowRight size={16} />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </PageLayout>
  )
}
```

- [ ] **Step 2: Atualizar links do Footer para usar âncoras**

Em `website/src/components/layout/Footer.jsx`, dentro de `footerLinks.servicos`, alterar os hrefs:

```js
servicos: [
  { label: 'Saneamento em Alta',      href: '/saneamento#alta' },
  { label: 'Saneamento em Baixa',     href: '/saneamento#baixa' },
  { label: 'Tratamento de Efluentes', href: '/saneamento#efluentes' },
  { label: 'Qualidade do Serviço',    href: '/saneamento/qualidade' },
],
```

- [ ] **Step 3: Commit**

```bash
git add website/src/pages/saneamento/SaneamentoPage.jsx website/src/components/layout/Footer.jsx
git commit -m "feat: adicionar âncoras à página de saneamento e corrigir links do footer"
```

---

### Task 5: Criar PoliticaPrivacidadePage

**Files:**
- Create: `website/src/pages/PoliticaPrivacidadePage.jsx`

- [ ] **Step 1: Criar a página**

Criar `website/src/pages/PoliticaPrivacidadePage.jsx`:

```jsx
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const sections = [
  {
    title: '1. Responsável pelo Tratamento',
    content: `A AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais é a entidade responsável pelo tratamento dos dados pessoais recolhidos através deste website. Sede: Região Centro, Portugal. Contacto: geral@aintar.pt`,
  },
  {
    title: '2. Dados Recolhidos',
    content: `Recolhemos apenas os dados necessários para responder às suas solicitações: nome, endereço de e-mail, número de telefone (opcional) e o conteúdo da mensagem submetida através do formulário de contacto. Não recolhemos dados de forma automatizada para fins comerciais.`,
  },
  {
    title: '3. Finalidade e Base Legal',
    content: `Os seus dados são tratados exclusivamente para: (a) responder às suas questões e pedidos de informação; (b) cumprir obrigações legais aplicáveis à AINTAR enquanto entidade gestora de serviços públicos. A base legal é o interesse legítimo na prestação do serviço (Art.º 6.º, n.º 1, alínea f) do RGPD) e o cumprimento de obrigação legal (alínea c).`,
  },
  {
    title: '4. Conservação dos Dados',
    content: `Os dados pessoais submetidos através do formulário de contacto são conservados pelo prazo estritamente necessário para dar resposta à sua solicitação, não excedendo 12 meses salvo obrigação legal em contrário.`,
  },
  {
    title: '5. Partilha de Dados',
    content: `A AINTAR não vende nem partilha os seus dados pessoais com terceiros para fins comerciais. Os dados podem ser partilhados com entidades públicas quando exigido por lei ou por ordem judicial.`,
  },
  {
    title: '6. Os Seus Direitos',
    content: `Ao abrigo do RGPD (Regulamento UE 2016/679), tem direito a: aceder aos seus dados pessoais; solicitar a retificação ou apagamento; opor-se ao tratamento; solicitar a limitação do tratamento; apresentar reclamação à autoridade de controlo (CNPD — www.cnpd.pt). Para exercer os seus direitos, contacte-nos através de geral@aintar.pt.`,
  },
  {
    title: '7. Cookies',
    content: `Este website utiliza apenas cookies técnicos essenciais ao seu funcionamento. Não são utilizados cookies de rastreamento ou publicidade.`,
  },
  {
    title: '8. Atualizações',
    content: `Esta política pode ser atualizada periodicamente. A versão mais recente estará sempre disponível nesta página. Última atualização: Janeiro de 2025.`,
  },
]

export default function PoliticaPrivacidadePage() {
  return (
    <PageLayout
      title="Política de Privacidade"
      subtitle="Como recolhemos, usamos e protegemos os seus dados pessoais."
      breadcrumbs={[{ label: 'Política de Privacidade' }]}
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto space-y-8">
            {sections.map((s, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className="border-b border-gray-100 pb-8 last:border-0">
                  <h2 className="font-heading font-bold text-aintar-navy text-lg mb-3">{s.title}</h2>
                  <p className="text-gray-600 leading-relaxed text-sm">{s.content}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/pages/PoliticaPrivacidadePage.jsx
git commit -m "feat: criar página de Política de Privacidade (RGPD)"
```

---

### Task 6: Criar TermosUtilizacaoPage

**Files:**
- Create: `website/src/pages/TermosUtilizacaoPage.jsx`

- [ ] **Step 1: Criar a página**

Criar `website/src/pages/TermosUtilizacaoPage.jsx`:

```jsx
import PageLayout from '../components/layout/PageLayout'
import ScrollReveal from '../components/ui/ScrollReveal'

const sections = [
  {
    title: '1. Objeto',
    content: `Os presentes Termos de Utilização regulam o acesso e utilização do website da AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais, disponível em aintar.pt. A utilização deste website implica a aceitação plena destes termos.`,
  },
  {
    title: '2. Utilização do Website',
    content: `O website da AINTAR destina-se a disponibilizar informação institucional, documentos públicos e meios de contacto com a entidade. É proibido utilizar este website para fins ilícitos, transmitir conteúdos ofensivos ou tentar comprometer a segurança dos sistemas informáticos da AINTAR.`,
  },
  {
    title: '3. Propriedade Intelectual',
    content: `Todos os conteúdos deste website — textos, imagens, logótipos e marca — são propriedade da AINTAR ou de terceiros que autorizaram a sua utilização. É proibida a reprodução total ou parcial sem autorização prévia e escrita da AINTAR.`,
  },
  {
    title: '4. Hiperligações',
    content: `Este website pode conter ligações para websites externos. A AINTAR não é responsável pelo conteúdo ou políticas de privacidade desses websites e a inclusão de uma ligação não implica qualquer endosso ou parceria.`,
  },
  {
    title: '5. Disponibilidade',
    content: `A AINTAR empenha-se em assegurar a disponibilidade contínua deste website, mas não garante que o serviço esteja sempre disponível, podendo ocorrer interrupções para manutenção ou por razões técnicas fora do seu controlo.`,
  },
  {
    title: '6. Responsabilidade',
    content: `A AINTAR não se responsabiliza por quaisquer danos resultantes da utilização ou impossibilidade de utilização deste website, nem pela inexatidão de informações fornecidas por terceiros.`,
  },
  {
    title: '7. Lei Aplicável',
    content: `Estes Termos de Utilização são regidos pela lei portuguesa. Qualquer litígio será submetido aos tribunais competentes da comarca de Viseu.`,
  },
  {
    title: '8. Contacto',
    content: `Para quaisquer questões relacionadas com estes termos, contacte-nos através de geral@aintar.pt ou pelo telefone 232 017 073.`,
  },
]

export default function TermosUtilizacaoPage() {
  return (
    <PageLayout
      title="Termos de Utilização"
      subtitle="Condições de acesso e utilização do website da AINTAR."
      breadcrumbs={[{ label: 'Termos de Utilização' }]}
    >
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto space-y-8">
            {sections.map((s, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className="border-b border-gray-100 pb-8 last:border-0">
                  <h2 className="font-heading font-bold text-aintar-navy text-lg mb-3">{s.title}</h2>
                  <p className="text-gray-600 leading-relaxed text-sm">{s.content}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/pages/TermosUtilizacaoPage.jsx
git commit -m "feat: criar página de Termos de Utilização"
```

---

### Task 7: Registar rotas em App.jsx e corrigir links legais

**Files:**
- Modify: `website/src/App.jsx`
- Modify: `website/src/components/layout/Footer.jsx`
- Modify: `website/src/components/ui/ContactForm.jsx`

- [ ] **Step 1: Adicionar imports e rotas em App.jsx**

Em `website/src/App.jsx`, adicionar depois dos imports existentes (após a linha do `ContactosPage`):

```jsx
import PoliticaPrivacidadePage from './pages/PoliticaPrivacidadePage'
import TermosUtilizacaoPage from './pages/TermosUtilizacaoPage'
```

E dentro de `<Routes>`, antes da rota `*`:

```jsx
{/* Legal */}
<Route path="/politica-privacidade" element={<PoliticaPrivacidadePage />} />
<Route path="/termos-utilizacao" element={<TermosUtilizacaoPage />} />
```

- [ ] **Step 2: Corrigir links legais no Footer**

Em `website/src/components/layout/Footer.jsx`, linha 227-228, substituir as `<a href="#">` por `<Link>`:

```jsx
import { Link } from 'react-router-dom'  {/* já importado no topo */}

{/* Substituir as duas linhas: */}
<Link to="/politica-privacidade" className="hover:text-white/70 transition-colors">Política de Privacidade</Link>
<Link to="/termos-utilizacao" className="hover:text-white/70 transition-colors">Termos de Utilização</Link>
```

- [ ] **Step 3: Corrigir link no ContactForm**

Em `website/src/components/ui/ContactForm.jsx`, linha 143, substituir o `<a href="#">` por `<Link>`:

Adicionar import no topo do ficheiro:
```jsx
import { Link } from 'react-router-dom'
```

Substituir linha 143:
```jsx
<Link to="/politica-privacidade" className="text-aintar-blue hover:underline">Política de Privacidade</Link>
```

- [ ] **Step 4: Commit final**

```bash
git add website/src/App.jsx website/src/components/layout/Footer.jsx website/src/components/ui/ContactForm.jsx
git commit -m "feat: registar rotas legais e corrigir links mortos no footer e formulário"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1 — URL `/api/contact` → `/api/v1/website/contacto`
- ✅ Task 2 — Números reais (WhatsApp + emergência)
- ✅ Task 3 — Navbar "Área de Clientes"
- ✅ Task 4 — Âncoras saneamento + footer links
- ✅ Task 5 — PoliticaPrivacidadePage
- ✅ Task 6 — TermosUtilizacaoPage
- ✅ Task 7 — Rotas + links legais

**Placeholders:** Nenhum — todos os passos têm código completo.

**Consistência de tipos:** `<Link>` do React Router usado consistentemente para rotas internas; `<a>` para URLs externas e tel:/mailto:.
