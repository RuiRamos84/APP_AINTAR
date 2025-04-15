import { CssBaseline, ThemeProvider } from "@mui/material";
import React, { useEffect, useState } from "react";
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
import Navbar from "./components/common/Navbar/Navbar";
import Sidebar from "./components/common/Sidebar/Sidebar";
import { ThemedToaster } from "./components/common/Toaster/ThemedToaster";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PrivateRoute from "./contexts/AuthContextProvider";
import { EpiProvider } from "./contexts/EpiContext";
import { MetaDataProvider } from "./contexts/MetaDataContext";
import { SidebarProvider } from './contexts/SidebarContext';
import { SocketProvider } from "./contexts/SocketContext";
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
import RamaisListConcluded from "./pages/Documents/RamaisList/RamaisConcludedList";
import RamaisList from "./pages/Documents/RamaisList/RamalList";
import CreateEntity from "./pages/Entity/CreateEntity/CreateEntity";
import EntityDetail from "./pages/Entity/EntityDetail/EntityDetail";
import EntityList from "./pages/Entity/EntityList/EntityList";
import EpiArea from "./pages/EPIs/EpiArea";
import Home from "./pages/Home/Home";
import InternalArea from "./pages/Internal/InternalArea";
import LetterManagement from "./pages/Letters/LetterManagement";
import Login from "./pages/Login/Login";
import ModernDocuments from "./pages/ModernDocuments";
import Operations from "./pages/Operação/Operations";
import PasswordRecovery from "./pages/PasswordRecovery/PasswordRecovery";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Settings from "./pages/Settings/Settings";
import {
  AllTasks,
  CompletedTasks,
  CreatedTasks,
  MyTasks,
  TaskManagement
} from './pages/Tasks/index.js';
import UserInfo from "./pages/UserInfo/UserInfo";
import { initializeSessionManagement } from "./services/authService";
import "./styles/global.css";
import "./styles/sessionAlert.css";
import { darkTheme, lightTheme } from "./styles/theme";

const AppContent = () => {
  const { user, isLoading, isLoggingOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isDarkMode = user ? user.dark_mode : false;
  const navigate = useNavigate();
  const location = useLocation();

  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isCreateEntityModalOpen, setIsCreateEntityModalOpen] = useState(false);

  useEffect(() => {
    initializeSessionManagement();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-margin",
      isSidebarOpen ? "8.5vw" : "2.5vw"
    );
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isLoading && !user && !isLoggingOut) {
      const publicRoutes = [
        "/",
        "/login",
        "/create-user",
        "/activation",
        "/password-recovery",
        "/reset-password",
      ];
      if (!publicRoutes.some((route) => location.pathname.startsWith(route))) {
        navigate("/login");
      }
    }
  }, [user, isLoading, isLoggingOut, navigate, location.pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openEntityModal = () => {
    setIsCreateEntityModalOpen(true);
  };

  const openNewDocumentModal = () => {
    setIsCreateDocumentModalOpen(true);
  };

  const closeNewDocumentModal = () => {
    setIsCreateDocumentModalOpen(false);
  };

  useEffect(() => {
    // Atualiza a cor do meta tag theme-color conforme o tema selecionado
    const updateThemeColor = (color) => {
      let metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        document.getElementsByTagName("head")[0].appendChild(metaThemeColor);
      }
      metaThemeColor.content = color;
    };

    const themeColor = isDarkMode
      ? darkTheme.palette.background.default
      : lightTheme.palette.background.default;
    updateThemeColor(themeColor);
  }, [isDarkMode]);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <div className="App">
        <Navbar />
        <div className="main-content-app">
          {user && (
            <Sidebar
              isOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              openNewDocumentModal={openNewDocumentModal}
              handleOpenModal={openEntityModal}
            />
          )}
          <div className="content-app">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create-user" element={<CreateUser />} />
              <Route path="/activation/:id/:activation_code" element={<Activation />} />
              <Route path="/password-recovery" element={<PasswordRecovery />} />
              <Route path="/reset-password/:id/:reset_code" element={<ResetPassword />} />
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
              <Route
                path="/user-info"
                element={
                  <PrivateRoute>
                    <UserInfo />
                  </PrivateRoute>
                }
              />
              <Route
                path="/change-password"
                element={
                  <PrivateRoute>
                    <ChangePassword />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute requiredProfil="0">
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/entities"
                element={
                  <PrivateRoute>
                    <EntityList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/entities/:id"
                element={
                  <PrivateRoute>
                    <EntityDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/add-entity"
                element={
                  <PrivateRoute>
                    <CreateEntity />
                  </PrivateRoute>
                }
              />
              <Route
                path="/operation"
                element={
                  <PrivateRoute>
                    <Operations />
                  </PrivateRoute>
                }
              />
              <Route path="/pedidos-modernos" element={<ModernDocuments />} />
              <Route
                path="/modern-documents"
                element={
                  <PrivateRoute requiredProfil="0">
                    <ModernDocuments />
                  </PrivateRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <PrivateRoute>
                    <DocumentList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/documents/:id"
                element={
                  <PrivateRoute>
                    <DocumentPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create_document"
                element={
                  <PrivateRoute>
                    <CreateDocument />
                  </PrivateRoute>
                }
              />
              <Route
                path="/document_owner"
                element={
                  <PrivateRoute>
                    <CreatedByMe />
                  </PrivateRoute>
                }
              />
              <Route
                path="/document_self"
                element={
                  <PrivateRoute>
                    <AssignedToMe />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ramais"
                element={
                  <PrivateRoute>
                    <RamaisList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ramais/concluded"
                element={
                  <PrivateRoute>
                    <RamaisListConcluded />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute requiredProfil="0">
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/letters"
                element={
                  <PrivateRoute>
                    <LetterManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <PrivateRoute>
                    <TaskManagement />
                  </PrivateRoute>
                }
              >
                <Route path="" element={<Navigate to="/tasks/all" replace />} />
                <Route
                  path="all"
                  element={
                    <PrivateRoute requiredProfil="0">
                      <AllTasks />
                    </PrivateRoute>
                  }
                />
                <Route path="my" element={<MyTasks />} />
                <Route path="created" element={<CreatedTasks />} />
                <Route path="completed" element={<CompletedTasks />} />
              </Route>
              <Route
                path="/internal"
                element={
                  <PrivateRoute>
                    <InternalArea />
                  </PrivateRoute>
                }
              />
              <Route
                path="/epi"
                element={
                  <PrivateRoute allowedUserIds={[12, 11, 82]}>
                    <EpiArea />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </div>
        <CreateDocumentModal open={isCreateDocumentModalOpen} onClose={closeNewDocumentModal} />
        <CreateEntity open={isCreateEntityModalOpen} onClose={() => setIsCreateEntityModalOpen(false)} />
        <ThemedToaster />
      </div>
    </ThemeProvider>
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <SidebarProvider>
            <SocketProvider>
              <MetaDataProvider>
                <EpiProvider>
                  <AppContent />
                </EpiProvider>
              </MetaDataProvider>
            </SocketProvider>
          </SidebarProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;