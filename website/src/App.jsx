import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/layout/ScrollToTop'

import HomePage from './pages/HomePage'

// Quem Somos
import QuemSomosPage from './pages/quem-somos/QuemSomosPage'
import OrgaosSociaisPage from './pages/quem-somos/OrgaosSociaisPage'
import DocumentosFinanceirosPage from './pages/quem-somos/DocumentosFinanceirosPage'
import RecursosHumanosPage from './pages/quem-somos/RecursosHumanosPage'
import ContratacaoPublicaPage from './pages/quem-somos/ContratacaoPublicaPage'

// Clientes
import ClientesPage from './pages/clientes/ClientesPage'
import RegulamentoPage from './pages/clientes/RegulamentoPage'
import TarifarioPage from './pages/clientes/TarifarioPage'
import FormulariosPage from './pages/clientes/FormulariosPage'
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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Quem Somos */}
        <Route path="/quem-somos" element={<QuemSomosPage />} />
        <Route path="/quem-somos/orgaos-sociais" element={<OrgaosSociaisPage />} />
        <Route path="/quem-somos/documentos-financeiros" element={<DocumentosFinanceirosPage />} />
        <Route path="/quem-somos/recursos-humanos" element={<RecursosHumanosPage />} />
        <Route path="/quem-somos/contratacao-publica" element={<ContratacaoPublicaPage />} />

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
    </BrowserRouter>
  )
}
