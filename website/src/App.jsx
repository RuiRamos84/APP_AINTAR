import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ScrollToTop from './components/layout/ScrollToTop'
import PageTransition from './components/ui/PageTransition'
import CookieBanner from './components/ui/CookieBanner'
import LenisProvider from './components/layout/LenisProvider'

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
import OpinioesPage from './pages/clientes/OpinioesPage'

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

// Educação Ambiental
import EducacaoAmbientalPage from './pages/EducacaoAmbientalPage'
import AintarKidsPage from './pages/AintarKidsPage'
import JogoPage from './pages/JogoPage'
import MinijogosPage from './pages/MinijogosPage'

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
      <AnimatePresence mode="sync" initial={false}>
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
            <Route path="/clientes/opinioes" element={<OpinioesPage />} />

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

            {/* Educação Ambiental */}
            <Route path="/educacao-ambiental" element={<EducacaoAmbientalPage />} />
            <Route path="/educacao-ambiental/aintar-kids" element={<AintarKidsPage />} />
            <Route path="/educacao-ambiental/aintar-kids/jogo" element={<JogoPage />} />
            <Route path="/educacao-ambiental/aintar-kids/jogos" element={<MinijogosPage />} />

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
      <LenisProvider>
        <CookieBanner />
        <AppRoutes />
      </LenisProvider>
    </BrowserRouter>
  )
}
