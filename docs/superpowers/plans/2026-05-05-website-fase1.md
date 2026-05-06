# Website Público AINTAR — Fase 1 (Crítico) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar o website público AINTAR de 7/10 para 9/10 implementando as três melhorias críticas: transições de página suaves, meta tags SEO por página, e banner cookie consent RGPD.

**Architecture:** (1) `PageTransition` wraps `<Routes>` via `AnimatePresence` com `key={location.key}` — transição única no topo da árvore, sem modificar cada página. (2) `SeoHead` (react-helmet-async) integrado em `PageLayout` com props `seoDescription` e `seoImage` — cobre todas as páginas interiores de uma vez. (3) `CookieBanner` custom com `localStorage` e Framer Motion — renderizado em `App.jsx` fora das rotas.

**Tech Stack:** Vite 8 · React 19 · React Router DOM v7 · Framer Motion 12 (já instalado) · react-helmet-async (nova dep) · Tailwind CSS v4 · lucide-react

---

## File Map

| Ação | Ficheiro | Responsabilidade |
|---|---|---|
| Criar | `website/src/components/ui/PageTransition.jsx` | motion.div wrapper com variantes fade+slide |
| Criar | `website/src/components/ui/SeoHead.jsx` | Helmet wrapper com title, description, OG tags |
| Criar | `website/src/components/ui/CookieBanner.jsx` | Banner RGPD com localStorage + AnimatePresence |
| Modificar | `website/src/App.jsx` | Extrair AppRoutes, adicionar AnimatePresence + CookieBanner |
| Modificar | `website/src/main.jsx` | Envolver App com HelmetProvider |
| Modificar | `website/src/components/layout/PageLayout.jsx` | Adicionar props seoDescription + seoImage, renderizar SeoHead |
| Modificar | ~23 páginas interiores | Adicionar seoDescription (e seoImage onde aplicável) ao PageLayout |

---

## Task 1 — Instalar react-helmet-async

**Files:**
- Modify: `website/package.json`

- [ ] **Step 1.1: Instalar a dependência**

Executar no diretório `website/`:

```bash
cd website && npm install react-helmet-async
```

- [ ] **Step 1.2: Verificar que o package.json foi atualizado**

```bash
grep "react-helmet-async" website/package.json
```

Saída esperada: `"react-helmet-async": "^2.x.x"` (ou versão mais recente)

- [ ] **Step 1.3: Verificar que o build não quebra**

```bash
cd website && npm run build
```

Saída esperada: `✓ built in X.Xs` sem erros.

---

## Task 2 — Criar PageTransition

**Files:**
- Create: `website/src/components/ui/PageTransition.jsx`

- [ ] **Step 2.1: Criar o componente**

```jsx
// website/src/components/ui/PageTransition.jsx
import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0,  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.20, ease: 'easeIn' } },
}

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2.2: Verificar build**

```bash
cd website && npm run build
```

Saída esperada: sem erros.

---

## Task 3 — Refatorar App.jsx para transições de página

**Files:**
- Modify: `website/src/App.jsx`

- [ ] **Step 3.1: Substituir o conteúdo de App.jsx**

O ficheiro atual tem um único export default `App()`. Extraímos as rotas para `AppRoutes` (necessário para usar `useLocation` dentro do `<BrowserRouter>`) e adicionamos `AnimatePresence`.

```jsx
// website/src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ScrollToTop from './components/layout/ScrollToTop'
import PageTransition from './components/ui/PageTransition'

import HomePage from './pages/HomePage'

// Quem Somos
import QuemSomosPage from './pages/quem-somos/QuemSomosPage'
import OrgaosSociaisPage from './pages/quem-somos/OrgaosSociaisPage'
import OrganogramaPage from './pages/quem-somos/OrganogramaPage'
import EstatutosPage from './pages/quem-somos/EstatutosPage'
import DocumentosFinanceirosPage from './pages/quem-somos/DocumentosFinanceirosPage'
import RecursosHumanosPage from './pages/quem-somos/RecursosHumanosPage'
import ProcedimentoPage from './pages/quem-somos/ProcedimentoPage'
import ContratacaoPublicaPage from './pages/quem-somos/ContratacaoPublicaPage'

// Clientes
import ClientesPage from './pages/clientes/ClientesPage'
import RegulamentoPage from './pages/clientes/RegulamentoPage'
import TarifarioPage from './pages/clientes/TarifarioPage'
import FormulariosPage from './pages/clientes/FormulariosPage'
import CandidaturaPage from './pages/clientes/CandidaturaPage'
import FAQPage from './pages/clientes/FAQPage'

// Saneamento
import SaneamentoPage from './pages/saneamento/SaneamentoPage'
import QualidadeServicoPage from './pages/saneamento/QualidadeServicoPage'

// Projetos & Sustentabilidade
import ProjetosPage from './pages/ProjetosPage'
import SustentabilidadePage from './pages/SustentabilidadePage'

// Comunicação
import NoticiasPage from './pages/comunicacao/NoticiasPage'
import NoticiaPage from './pages/comunicacao/NoticiaPage'
import AvisosPage from './pages/comunicacao/AvisosPage'
import EditaisPage from './pages/comunicacao/EditaisPage'

// Contactos
import ContactosPage from './pages/ContactosPage'
import PoliticaPrivacidadePage from './pages/PoliticaPrivacidadePage'
import TermosUtilizacaoPage from './pages/TermosUtilizacaoPage'

// 404
import NotFoundPage from './pages/NotFoundPage'

function AppRoutes() {
  const location = useLocation()
  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={location.key}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />

            {/* Quem Somos */}
            <Route path="/quem-somos" element={<QuemSomosPage />} />
            <Route path="/quem-somos/organograma" element={<OrganogramaPage />} />
            <Route path="/quem-somos/orgaos-sociais" element={<OrgaosSociaisPage />} />
            <Route path="/quem-somos/estatutos" element={<EstatutosPage />} />
            <Route path="/quem-somos/documentos-financeiros" element={<DocumentosFinanceirosPage />} />
            <Route path="/quem-somos/contratacao-publica" element={<ContratacaoPublicaPage />} />

            {/* Recursos Humanos */}
            <Route path="/recursos-humanos" element={<RecursosHumanosPage />} />
            <Route path="/recursos-humanos/:pk" element={<ProcedimentoPage />} />
            <Route path="/recursos-humanos/candidatura/:pk" element={<CandidaturaPage />} />

            {/* Clientes */}
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/regulamento" element={<RegulamentoPage />} />
            <Route path="/clientes/tarifario" element={<TarifarioPage />} />
            <Route path="/clientes/formularios" element={<FormulariosPage />} />
            <Route path="/clientes/faq" element={<FAQPage />} />

            {/* Saneamento */}
            <Route path="/saneamento" element={<SaneamentoPage />} />
            <Route path="/saneamento/qualidade" element={<QualidadeServicoPage />} />

            {/* Projetos & Sustentabilidade */}
            <Route path="/projetos" element={<ProjetosPage />} />
            <Route path="/sustentabilidade" element={<SustentabilidadePage />} />

            {/* Comunicação */}
            <Route path="/comunicacao/noticias" element={<NoticiasPage />} />
            <Route path="/comunicacao/noticias/:pk" element={<NoticiaPage />} />
            <Route path="/comunicacao/avisos" element={<AvisosPage />} />
            <Route path="/comunicacao/editais" element={<EditaisPage />} />

            {/* Contactos */}
            <Route path="/contactos" element={<ContactosPage />} />

            {/* Legal */}
            <Route path="/politica-privacidade" element={<PoliticaPrivacidadePage />} />
            <Route path="/termos-utilizacao" element={<TermosUtilizacaoPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

> **Nota:** `CookieBanner` será adicionado à Task 11. Neste passo o `App.jsx` fica com a estrutura de transições apenas.

- [ ] **Step 3.2: Verificar build**

```bash
cd website && npm run build
```

Saída esperada: sem erros.

- [ ] **Step 3.3: Verificar transições no browser**

```bash
cd website && npm run dev
```

Abrir http://localhost:5173, navegar entre páginas e confirmar fade suave (~0.35s) em vez de corte abrupto.

- [ ] **Step 3.4: Commit — transições de página**

```bash
git add website/src/App.jsx website/src/components/ui/PageTransition.jsx
git commit -m "feat(website): adicionar transições de página com AnimatePresence"
```

---

## Task 4 — Criar SeoHead

**Files:**
- Create: `website/src/components/ui/SeoHead.jsx`

- [ ] **Step 4.1: Criar o componente**

```jsx
// website/src/components/ui/SeoHead.jsx
import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'AINTAR'
const DEFAULT_TITLE = 'AINTAR — Gestão Sustentável dos Sistemas de Saneamento'
const DEFAULT_DESC  = 'Associação de Municípios para o Sistema Intermunicipal de Águas Residuais. Gestão responsável dos sistemas de saneamento na região Centro de Portugal.'
const DEFAULT_IMAGE = '/logos/logo-horizontal-color.png'

export default function SeoHead({ title, description, image, canonical }) {
  const fullTitle      = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE
  const metaDesc       = description || DEFAULT_DESC
  const metaImage      = image || DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  )
}
```

---

## Task 5 — Envolver App com HelmetProvider em main.jsx

**Files:**
- Modify: `website/src/main.jsx`

- [ ] **Step 5.1: Atualizar main.jsx**

```jsx
// website/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
```

- [ ] **Step 5.2: Verificar build**

```bash
cd website && npm run build
```

Saída esperada: sem erros.

---

## Task 6 — Integrar SeoHead em PageLayout

**Files:**
- Modify: `website/src/components/layout/PageLayout.jsx`

- [ ] **Step 6.1: Atualizar PageLayout**

PageLayout recebe dois novos props opcionais: `seoDescription` e `seoImage`. O `title` já existente é reutilizado como título SEO.

```jsx
// website/src/components/layout/PageLayout.jsx
import Navbar from './Navbar'
import Footer from './Footer'
import PageHeader from './PageHeader'
import SeoHead from '../ui/SeoHead'

export default function PageLayout({ title, subtitle, breadcrumbs, seoDescription, seoImage, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead title={title} description={seoDescription} image={seoImage} />
      <Navbar />
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}
```

> **Nota:** Páginas que não passem `seoDescription` ficam com a descrição default da AINTAR — já é melhor que nada. As descrições específicas são adicionadas na Task 8.

- [ ] **Step 6.2: Verificar build**

```bash
cd website && npm run build
```

Saída esperada: sem erros. Zero breaking changes — novos props são opcionais.

---

## Task 7 — SEO na HomePage

**Files:**
- Modify: `website/src/pages/HomePage.jsx`

- [ ] **Step 7.1: Adicionar SeoHead à HomePage**

A HomePage não usa PageLayout, por isso recebe SeoHead diretamente.

```jsx
// website/src/pages/HomePage.jsx
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import AlertBanner from '../components/ui/AlertBanner'
import HeroSection from '../components/sections/HeroSection'
import StatsSection from '../components/sections/StatsSection'
import AboutSection from '../components/sections/AboutSection'
import ServicesSection from '../components/sections/ServicesSection'
import MunicipalitiesSection from '../components/sections/MunicipalitiesSection'
import NewsSection from '../components/sections/NewsSection'
import PortalSection from '../components/sections/PortalSection'
import ContactSection from '../components/sections/ContactSection'
import FloatingScrollIndicator from '../components/ui/FloatingScrollIndicator'
import SeoHead from '../components/ui/SeoHead'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SeoHead
        description="Servimos os municípios de Carregal do Sal, Santa Comba Dão, Tábua e Tondela com rigor técnico, inovação e compromisso permanente com o ambiente e as gerações futuras."
      />
      <Navbar />
      <AlertBanner />
      <main>
        <HeroSection />
        <AboutSection />
        <StatsSection />
        <ServicesSection />
        <MunicipalitiesSection />
        <NewsSection />
        <PortalSection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingScrollIndicator />
    </div>
  )
}
```

> **Nota:** `title` omitido → usa o DEFAULT_TITLE `"AINTAR — Gestão Sustentável dos Sistemas de Saneamento"`.

---

## Task 8 — Adicionar seoDescription a todas as páginas interiores

**Files:** ~23 páginas (todas usam PageLayout — adicionar apenas o prop seoDescription e, onde indicado, seoImage)

Para cada página abaixo, adicionar `seoDescription="..."` (e `seoImage` quando aplicável) ao `<PageLayout ...>`.

- [ ] **Step 8.1: QuemSomosPage**

```jsx
// website/src/pages/quem-somos/QuemSomosPage.jsx
// Localizar: <PageLayout title="Quem Somos" ...>
// Adicionar: seoDescription="Conheça a AINTAR — associação intermunicipal responsável pelos sistemas de saneamento de águas residuais na região Centro de Portugal."
```

- [ ] **Step 8.2: OrgaosSociaisPage**

```jsx
// Localizar: <PageLayout title="Órgãos Sociais" ...>
// Adicionar: seoDescription="Composição da Assembleia Intermunicipal, Conselho de Administração e Fiscal Único da AINTAR."
```

- [ ] **Step 8.3: OrganogramaPage**

```jsx
// Localizar: <PageLayout title="Organograma" ...>
// Adicionar: seoDescription="Estrutura orgânica e hierarquia de gestão da AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais."
```

- [ ] **Step 8.4: EstatutosPage**

```jsx
// Localizar: <PageLayout title="Estatutos" ...>
// Adicionar: seoDescription="Consulte e descarregue os estatutos oficiais da AINTAR."
```

- [ ] **Step 8.5: DocumentosFinanceirosPage**

```jsx
// Localizar: <PageLayout title="Documentos Financeiros" ...>
// Adicionar: seoDescription="Relatórios de contas, documentos provisórios e informação financeira da AINTAR por ano."
```

- [ ] **Step 8.6: RecursosHumanosPage**

```jsx
// Localizar: <PageLayout title="Recursos Humanos" ...>
// Adicionar: seoDescription="Oportunidades de emprego e concursos públicos de recrutamento na AINTAR."
```

- [ ] **Step 8.7: ProcedimentoPage** (dinâmica — usa pk)

```jsx
// Localizar: <PageLayout title={...} ...>
// Adicionar: seoDescription="Detalhe do procedimento de recrutamento da AINTAR."
```

- [ ] **Step 8.8: ContratacaoPublicaPage**

```jsx
// Localizar: <PageLayout title="Contratação Pública" ...>
// Adicionar: seoDescription="Contratos públicos e ajustes diretos publicados pela AINTAR no portal BASE."
```

- [ ] **Step 8.9: ClientesPage**

```jsx
// Localizar: <PageLayout title="Área de Clientes" ...>
// Adicionar: seoDescription="Informação para clientes AINTAR: regulamento, tarifário, formulários e apoio ao cliente."
```

- [ ] **Step 8.10: RegulamentoPage**

```jsx
// Localizar: <PageLayout title="Regulamento de Serviço" ...>
// Adicionar: seoDescription="Regulamento de serviço da AINTAR — condições gerais do fornecimento do serviço de saneamento."
```

- [ ] **Step 8.11: TarifarioPage**

```jsx
// Localizar: <PageLayout title="Tarifário" ...>
// Adicionar: seoDescription="Tarifário em vigor para os serviços de saneamento prestados pela AINTAR em 2026."
```

- [ ] **Step 8.12: FormulariosPage**

```jsx
// Localizar: <PageLayout title="Formulários" ...>
// Adicionar: seoDescription="Descarregue formulários para pedidos de serviço, ligações, reclamações e outros requerimentos à AINTAR."
```

- [ ] **Step 8.13: CandidaturaPage**

```jsx
// Localizar: <PageLayout title={...} ...>
// Adicionar: seoDescription="Submeta a sua candidatura a um processo de recrutamento da AINTAR."
```

- [ ] **Step 8.14: FAQPage**

```jsx
// Localizar: <PageLayout title="Perguntas Frequentes" ...>
// Adicionar: seoDescription="Respostas às perguntas mais frequentes sobre os serviços de saneamento prestados pela AINTAR."
```

- [ ] **Step 8.15: SaneamentoPage**

```jsx
// Localizar: <PageLayout title="Sistemas de Saneamento" ...>
// Adicionar: seoDescription="Gestão de 700 km de rede de coletores, 145 ETARs e 91 estações elevatórias nos municípios de Carregal do Sal, Santa Comba Dão, Tábua e Tondela."
```

- [ ] **Step 8.16: QualidadeServicoPage**

```jsx
// Localizar: <PageLayout title="Qualidade do Serviço" ...>
// Adicionar: seoDescription="Indicadores de qualidade do serviço de saneamento prestado pela AINTAR — conformidade, reclamações e monitorização."
```

- [ ] **Step 8.17: ProjetosPage**

```jsx
// Localizar: <PageLayout title="Projetos" ...>
// Adicionar: seoDescription="Projetos de modernização e investimento em infraestruturas de saneamento financiados pela AINTAR com fundos europeus."
```

- [ ] **Step 8.18: SustentabilidadePage**

```jsx
// Localizar: <PageLayout title="Sustentabilidade" ...>
// Adicionar: seoDescription="Compromisso da AINTAR com a sustentabilidade ambiental e a economia circular — Juntos pelo Ambiente."
```

- [ ] **Step 8.19: NoticiasPage**

```jsx
// Localizar: <PageLayout title="Notícias" ...>
// Adicionar: seoDescription="Últimas notícias, comunicados e atividades da AINTAR — Associação de Municípios para o Sistema Intermunicipal de Águas Residuais."
```

- [ ] **Step 8.20: NoticiaPage** (dinâmica — usa noticia do CMS)

```jsx
// Localizar: <PageLayout title={noticia?.titulo ?? ''} ...>
// Adicionar: seoDescription={noticia?.resumo ?? 'Notícia da AINTAR.'}
//            seoImage={noticia?.imagem_url ? fileUrl(noticia.imagem_url) : undefined}
```

- [ ] **Step 8.21: AvisosPage**

```jsx
// Localizar: <PageLayout title="Avisos de Serviço" ...>
// Adicionar: seoDescription="Avisos de serviço e comunicações operacionais da AINTAR aos clientes."
```

- [ ] **Step 8.22: EditaisPage**

```jsx
// Localizar: <PageLayout title="Editais" ...>
// Adicionar: seoDescription="Editais e publicações oficiais da AINTAR."
```

- [ ] **Step 8.23: ContactosPage**

```jsx
// Localizar: <PageLayout title="Contactos" ...>
// Adicionar: seoDescription="Contacte a AINTAR: telefone 232 017 073, email geral@aintar.pt, sede em Carregal do Sal. Atendimento seg-sex 09h-13h / 14h-16h30."
```

- [ ] **Step 8.24: PoliticaPrivacidadePage**

```jsx
// Localizar: <PageLayout title="Política de Privacidade" ...>
// Adicionar: seoDescription="Política de privacidade e proteção de dados pessoais da AINTAR, em conformidade com o RGPD."
```

- [ ] **Step 8.25: TermosUtilizacaoPage**

```jsx
// Localizar: <PageLayout title="Termos de Utilização" ...>
// Adicionar: seoDescription="Termos e condições de utilização do website da AINTAR."
```

- [ ] **Step 8.26: Verificar build**

```bash
cd website && npm run build
```

Saída esperada: sem erros.

- [ ] **Step 8.27: Verificar SEO no browser**

```bash
cd website && npm run dev
```

Abrir http://localhost:5173, navegar para qualquer página interna, abrir DevTools → Elements e confirmar que `<title>` e `<meta name="description">` têm o valor correto.

- [ ] **Step 8.28: Commit — SEO**

```bash
git add website/src/components/ui/SeoHead.jsx website/src/main.jsx website/src/components/layout/PageLayout.jsx website/src/pages/
git commit -m "feat(website): adicionar meta tags SEO e Open Graph em todas as páginas"
```

---

## Task 9 — Criar CookieBanner

**Files:**
- Create: `website/src/components/ui/CookieBanner.jsx`

- [ ] **Step 9.1: Criar o componente**

```jsx
// website/src/components/ui/CookieBanner.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'

const STORAGE_KEY = 'aintar_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY))

  const accept = (value) => {
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{    y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[60] glass border-t border-aintar-sky/20 shadow-2xl shadow-aintar-navy/10"
        >
          <div className="section-container py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-grow">
                <Cookie size={20} className="text-aintar-sky flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-aintar-navy font-semibold text-sm">Este website utiliza cookies</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    Usamos cookies essenciais para o correto funcionamento do site.{' '}
                    <Link to="/politica-privacidade" className="text-aintar-sky hover:underline">
                      Política de Privacidade
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => accept('essential')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold border-2 border-aintar-blue text-aintar-blue hover:bg-aintar-blue hover:text-white transition-all duration-200"
                >
                  Apenas Essenciais
                </button>
                <button
                  onClick={() => accept('all')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold bg-aintar-sky text-white hover:bg-aintar-blue transition-all duration-200"
                >
                  Aceitar Todos
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

## Task 10 — Adicionar CookieBanner ao App.jsx

**Files:**
- Modify: `website/src/App.jsx`

- [ ] **Step 10.1: Importar e renderizar CookieBanner**

Adicionar import e `<CookieBanner />` dentro de `<BrowserRouter>` antes de `<AppRoutes />`:

```jsx
// website/src/App.jsx — apenas as linhas novas (inserir após imports existentes)
import CookieBanner from './components/ui/CookieBanner'

// Dentro de App():
export default function App() {
  return (
    <BrowserRouter>
      <CookieBanner />
      <AppRoutes />
    </BrowserRouter>
  )
}
```

> **Nota importante:** `CookieBanner` usa `<Link>` do React Router, por isso tem de estar dentro de `<BrowserRouter>`. O posicionamento antes de `<AppRoutes />` garante que o banner fica sempre visível independentemente da rota ativa.

---

## Task 11 — Atualizar Footer com "Gerir Cookies"

**Files:**
- Modify: `website/src/components/layout/Footer.jsx`

- [ ] **Step 11.1: Adicionar link "Gerir Cookies" na barra inferior**

Localizar a barra inferior do footer (`// Bottom bar`). O bloco de links legais (Política de Privacidade, Termos de Utilização, Livro de Reclamações) está no `<div className="flex items-center gap-4">`. Adicionar o botão de "Gerir Cookies" nesse bloco:

```jsx
// Adicionar dentro do div.flex.items-center.gap-4 da Bottom bar:
<button
  onClick={() => {
    localStorage.removeItem('aintar_consent')
    window.location.reload()
  }}
  className="hover:text-white/70 transition-colors"
>
  Gerir Cookies
</button>
```

O bloco final fica assim:

```jsx
<div className="flex items-center gap-4">
  <Link to="/politica-privacidade" className="hover:text-white/70 transition-colors">Política de Privacidade</Link>
  <Link to="/termos-utilizacao" className="hover:text-white/70 transition-colors">Termos de Utilização</Link>
  <button
    onClick={() => {
      localStorage.removeItem('aintar_consent')
      window.location.reload()
    }}
    className="hover:text-white/70 transition-colors"
  >
    Gerir Cookies
  </button>
  <a
    href="https://www.livroreclamacoes.pt"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-white/70 transition-colors flex items-center gap-1"
  >
    Livro de Reclamações <ExternalLink size={10} />
  </a>
</div>
```

---

## Task 12 — Verificação final e commit

**Files:** nenhum novo

- [ ] **Step 12.1: Build final limpo**

```bash
cd website && npm run build
```

Saída esperada: `✓ built in X.Xs` sem warnings de erros.

- [ ] **Step 12.2: Verificar as 3 funcionalidades no browser**

```bash
cd website && npm run dev
```

Verificar:
1. **Transições:** navegar entre / e /quem-somos e /contactos — deve haver fade suave ~0.35s
2. **SEO:** abrir DevTools → Elements, confirmar `<title>Contactos — AINTAR</title>` e `<meta name="description">`
3. **Cookie banner:** abrir em modo privado (sem localStorage) — banner deve aparecer; clicar "Aceitar Todos" → banner desaparece; recarregar → banner não aparece; ir ao Footer → "Gerir Cookies" → banner reaparece

- [ ] **Step 12.3: Commit final cookie consent**

```bash
git add website/src/components/ui/CookieBanner.jsx website/src/App.jsx website/src/components/layout/Footer.jsx
git commit -m "feat(website): adicionar banner cookie consent RGPD"
```

- [ ] **Step 12.4: Commit do spec e plano**

```bash
git add docs/superpowers/specs/2026-05-05-website-fase1-design.md docs/superpowers/plans/2026-05-05-website-fase1.md
git commit -m "docs: spec e plano website fase 1 — transições, SEO, RGPD"
```
