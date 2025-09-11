import { CssBaseline, ThemeProvider, useMediaQuery, Box, AppBar, Toolbar, Typography, Button } from "@mui/material";
import React, { useEffect, useState, useCallback } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Sidebar from "./components/common/Sidebar/Sidebar";
import PrivateRoute from "./contexts/AuthContextProvider";
import { ThemedToaster } from "./components/common/Toaster/ThemedToaster";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EpiProvider } from "./contexts/EpiContext";
import { MetaDataProvider } from "./contexts/MetaDataContext";
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { SocketProvider } from "./contexts/SocketContext";
import { PaymentProvider } from './features/Payment/context/PaymentContext';
import { initializeInterfaceMap } from './features/Payment/services/paymentTypes';
import api from './services/api';
import "./styles/global.css";
import "./styles/sessionAlert.css";
import { darkTheme, lightTheme } from "./styles/theme";
import logo from "./assets/images/logo.png";

// ===== IMPORTAÇÕES DE COMPONENTES =====
import Navbar from "./components/common/Navbar/Navbar";
import Activation from "./pages/Activation/Activation";
import AdminDashboard from "./pages/Administration/AdminDashboard";
import ChangePassword from "./pages/ChangePassword/ChangePassword";
import CreateUser from "./pages/CreateUser/CreateUser";
import Dashboard from "./pages/Dashboard/Dashboard";
import DocumentPage from "./pages/DocumentPage/DocumentPage";
import CreateDocument from "./pages/Documents/DocumentCreate/CreateDocument";
import CreateDocumentModal from "./pages/Documents/DocumentCreate/CreateDocumentModal";
import DocumentList from "./pages/Documents/DocumentListAll/DocumentList";
import CreatedByMe from "./pages/Documents/DocumentOner/CreatedByMe";
import AssignedToMe from "./pages/Documents/DocumentSelf/AssignedToMe";
import CreateEntity from "./pages/Entity/CreateEntity/CreateEntity";
import EntityDetail from "./pages/Entity/EntityDetail/EntityDetail";
import EntityList from "./pages/Entity/EntityList/EntityList";
import EpiArea from "./pages/EPIs/EpiArea";
import Home from "./pages/Home/Home";
import InternalArea from "./pages/Internal/index";
import LetterManagement from "./pages/Letters/LetterManagement";
import Login from "./pages/Login/Login";
import ModernDocuments from "./pages/ModernDocuments";
import Operation from "./pages/Operation";
import PasswordRecovery from "./pages/PasswordRecovery/PasswordRecovery";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Settings from "./pages/Settings/Settings";
import GlobalModule from "./pages/Global";
import UserInfo from "./pages/UserInfo/UserInfo";
import {
  AllTasks,
  CompletedTasks,
  CreatedTasks,
  MyTasks,
  TaskManagement
} from './pages/Tasks/index.js';
import {
  PendingPavimentations,
  ExecutedPavimentations,
  CompletedPavimentations
} from "./features/Pavimentations";
import DocumentPaymentFlow from './features/Payment/modals/DocumentPaymentFlow';
import PaymentAdminPage from './features/Payment/components/PaymentAdminPage';

// ===== CONFIGURAÇÃO DE ROTAS =====

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/create-user",
  "/activation",
  "/password-recovery",
  "/reset-password"
];

const ROUTE_COMPONENTS = {
  // Rotas públicas
  "/": Home,
  "/create-user": CreateUser,
  "/activation/:id/:activation_code": Activation,
  "/password-recovery": PasswordRecovery,
  "/reset-password/:id/:reset_code": ResetPassword,

  // Rotas privadas principais
  "/settings": AdminDashboard,
  "/user-info": UserInfo,
  "/change-password": ChangePassword,
  "/entities": EntityList,
  "/entities/:id": EntityDetail,
  "/add-entity": CreateEntity,
  "/operation": Operation,
  "/modern-documents": ModernDocuments,
  "/documents": DocumentList,
  "/documents/:id": DocumentPage,
  "/create_document": CreateDocument,
  "/document_owner": CreatedByMe,
  "/document_self": AssignedToMe,
  "/ramais": PendingPavimentations,
  "/ramais/executed": ExecutedPavimentations,
  "/ramais/concluded": CompletedPavimentations,
  "/dashboard": Dashboard,
  "/letters": LetterManagement,
  "/tasks": TaskManagement,
  "/internal": InternalArea,
  "/global": GlobalModule,
  "/epi": EpiArea,
  "/payment/:regnumber": ({ user }) => <DocumentPaymentFlow userInfo={user} />,
  "/payment-admin": ({ user }) => <PaymentAdminPage userInfo={user} />
};

const NESTED_ROUTES = {
  "/tasks": [
    { path: "", element: <Navigate to="/tasks/all" replace /> },
    { path: "all", component: AllTasks },
    { path: "my", component: MyTasks },
    { path: "created", component: CreatedTasks },
    { path: "completed", component: CompletedTasks }
  ]
};

// ===== HOOKS =====

const useAppEffects = (user, isLoading, isLoggingOut, navigate, location, sidebarMode, isDarkMode) => {
  // Redirecionamento para login
  useEffect(() => {
    if (!isLoading && !user && !isLoggingOut) {
      if (!PUBLIC_ROUTES.some(route => location.pathname.startsWith(route))) {
        navigate("/login");
      }
    }
  }, [user, isLoading, isLoggingOut, navigate, location.pathname]);

  // CSS sidebar margin baseado no contexto (apenas para utilizadores autenticados)
  useEffect(() => {
    if (user) {
      let marginValue;
      switch (sidebarMode) {
        case 'full':
          marginValue = "8.5vw";
          break;
        case 'compact':
          marginValue = "2.5vw";
          break;
        case 'closed':
        default:
          marginValue = "0vw";
          break;
      }

      document.documentElement.style.setProperty(
        "--sidebar-margin",
        marginValue
      );
    } else {
      // Para não autenticados, sem margem da sidebar
      document.documentElement.style.setProperty("--sidebar-margin", "0vw");
    }
  }, [sidebarMode, user]);

  // Theme color
  useEffect(() => {
    const updateThemeColor = (color) => {
      let metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.name = "theme-color";
        document.getElementsByTagName("head")[0].appendChild(metaThemeColor);
      }
      metaThemeColor.content = color;
    };

    const themeColor = isDarkMode
      ? darkTheme.palette.background.default
      : lightTheme.palette.background.default;
    updateThemeColor(themeColor);
  }, [isDarkMode]);
};

const useModalState = () => {
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isCreateEntityModalOpen, setIsCreateEntityModalOpen] = useState(false);

  const openNewDocumentModal = () => setIsCreateDocumentModalOpen(true);
  const closeNewDocumentModal = () => setIsCreateDocumentModalOpen(false);
  const openEntityModal = () => setIsCreateEntityModalOpen(true);
  const closeEntityModal = () => setIsCreateEntityModalOpen(false);

  return {
    isCreateDocumentModalOpen,
    isCreateEntityModalOpen,
    openNewDocumentModal,
    closeNewDocumentModal,
    openEntityModal,
    closeEntityModal
  };
};

// ===== COMPONENTES =====

const RouteRenderer = ({ path, component: Component, user }) => {
  if (typeof Component === 'function' && Component.length > 0) {
    return <Component user={user} />;
  }
  return <Component />;
};

// Navbar para utilizadores não autenticados
const PublicNavbar = () => {
  const navigate = useNavigate();

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1
      }}
    >
      <Toolbar>
        <Box
          onClick={() => navigate('/')}
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexGrow: 1
          }}
        >
          <img src={logo} alt="Logo" style={{ height: 32, marginRight: 16 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            SISTEMA
          </Typography>
        </Box>

        <Button
          color="primary"
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{ ml: 2 }}
        >
          Login
        </Button>
      </Toolbar>
    </AppBar>
  );
};

const AppRoutes = ({ user }) => (
  <Routes>
    {/* Rota de login especial */}
    <Route
      path="/login"
      element={user ? <Navigate to="/" /> : <Login />}
    />

    {/* Rota especial para pedidos modernos (pública) */}
    <Route path="/pedidos-modernos" element={<ModernDocuments />} />

    {/* Rotas públicas */}
    {Object.entries(ROUTE_COMPONENTS)
      .filter(([path]) => PUBLIC_ROUTES.includes(path.split('/')[1] ? `/${path.split('/')[1]}` : path))
      .map(([path, Component]) => (
        <Route key={path} path={path} element={<Component />} />
      ))}

    {/* Rotas privadas simples */}
    {Object.entries(ROUTE_COMPONENTS)
      .filter(([path]) => !PUBLIC_ROUTES.includes(path.split('/')[1] ? `/${path.split('/')[1]}` : path))
      .filter(([path]) => !NESTED_ROUTES[path])
      .map(([path, Component]) => (
        <Route
          key={path}
          path={path}
          element={
            <PrivateRoute>
              <RouteRenderer path={path} component={Component} user={user} />
            </PrivateRoute>
          }
        />
      ))}

    {/* Rotas aninhadas */}
    {Object.entries(NESTED_ROUTES).map(([parentPath, children]) => (
      <Route
        key={parentPath}
        path={parentPath}
        element={
          <PrivateRoute>
            <RouteRenderer path={parentPath} component={ROUTE_COMPONENTS[parentPath]} user={user} />
          </PrivateRoute>
        }
      >
        {children.map(({ path, element, component: ChildComponent }) => (
          <Route
            key={path}
            path={path}
            element={element || (
              <PrivateRoute>
                <ChildComponent />
              </PrivateRoute>
            )}
          />
        ))}
      </Route>
    ))}

    {/* Rotas legacy (manter temporariamente) */}
    <Route path="/ramais1" element={<PendingPavimentations />} />
    <Route path="/ramais/executed1" element={<ExecutedPavimentations />} />
    <Route path="/ramais/concluded1" element={<CompletedPavimentations />} />
  </Routes>
);

const AppModals = ({
  isCreateDocumentModalOpen,
  closeNewDocumentModal,
  isCreateEntityModalOpen,
  closeEntityModal
}) => (
  <>
    <CreateDocumentModal
      open={isCreateDocumentModalOpen}
      onClose={closeNewDocumentModal}
    />
    <CreateEntity
      open={isCreateEntityModalOpen}
      onClose={closeEntityModal}
    />
  </>
);

// ===== COMPONENTE PRINCIPAL =====

const AppContent = () => {
  const { user, isLoading, isLoggingOut } = useAuth();
  const { sidebarMode } = useSidebar();
  const isDarkMode = user ? user.dark_mode : false;
  const navigate = useNavigate();
  const location = useLocation();
  const isTablet = useMediaQuery('(max-width: 1920px) and (min-width: 768px)');
  const isTouch = 'ontouchstart' in window;

  const {
    isCreateDocumentModalOpen,
    isCreateEntityModalOpen,
    openNewDocumentModal,
    closeNewDocumentModal,
    openEntityModal,
    closeEntityModal
  } = useModalState();

  useAppEffects(user, isLoading, isLoggingOut, navigate, location, sidebarMode, isDarkMode);

  if (isTablet && isTouch) {
    document.body.style.touchAction = 'pan-y';
  }

  // Layout condicional baseado na autenticação
  if (!user) {
    // Layout para utilizadores não autenticados
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh' }}>
          <Navbar />
          <Box sx={{ mt: 8 }}>
            <AppRoutes user={user} />
          </Box>
        </Box>
        <ThemedToaster />
      </ThemeProvider>
    );
  }

  // Layout para utilizadores autenticados
  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Sidebar
          onNewDocument={openNewDocumentModal}
          onNewEntity={openEntityModal}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            backgroundColor: 'background.default'
          }}
        >
          <Box sx={{ p: 2.5 }}>
            <AppRoutes user={user} />
          </Box>
        </Box>

        <AppModals
          isCreateDocumentModalOpen={isCreateDocumentModalOpen}
          closeNewDocumentModal={closeNewDocumentModal}
          isCreateEntityModalOpen={isCreateEntityModalOpen}
          closeEntityModal={closeEntityModal}
        />
      </Box>
      <ThemedToaster />
    </ThemeProvider>
  );
};

const App = () => (
  <Router>
    <ErrorBoundary>
      <AuthProvider>
        <SidebarProvider>
          <SocketProvider>
            <MetaDataProvider>
              <EpiProvider>
                <PaymentProvider>
                  <AppContent />
                </PaymentProvider>
              </EpiProvider>
            </MetaDataProvider>
          </SocketProvider>
        </SidebarProvider>
      </AuthProvider>
    </ErrorBoundary>
  </Router>
);

export default App;