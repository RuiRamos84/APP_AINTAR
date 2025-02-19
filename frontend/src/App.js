import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/common/Navbar/Navbar";
import Sidebar from "./components/common/Sidebar/Sidebar";
import Dashboard from "./pages/Dashboard/Dashboard";
import InternalArea from "./pages/Internal/InternalArea";
import DocumentPage from "./pages/DocumentPage/DocumentPage";
import Settings from "./pages/Settings/Settings";
import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import CreateUser from "./pages/CreateUser/CreateUser";
import Activation from "./pages/Activation/Activation";
import UserInfo from "./pages/UserInfo/UserInfo";
import ChangePassword from "./pages/ChangePassword/ChangePassword";
import PasswordRecovery from "./pages/PasswordRecovery/PasswordRecovery";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import EntityList from "./pages/Entity/EntityList/EntityList";
import EntityDetail from "./pages/Entity/EntityDetail/EntityDetail";
import CreateEntity from "./pages/Entity/CreateEntity/CreateEntity";
import DocumentList from "./pages/Documents/DocumentListAll/DocumentList";
import RamaisList from "./pages/Documents/RamaisList/RamalList";
import RamaisListConcluded from "./pages/Documents/RamaisList/RamaisConcludedList";
import CreateDocument from "./pages/Documents/DocumentCreate/CreateDocument";
import CreateDocumentModal from "./pages/Documents/DocumentCreate/CreateDocumentModal";
import AssignedToMe from "./pages/Documents/DocumentSelf/AssignedToMe";
import CreatedByMe from "./pages/Documents/DocumentOner/CreatedByMe";
import EpiArea from "./pages/EPIs/EpiArea";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MetaDataProvider } from "./contexts/MetaDataContext";
import { SocketProvider } from "./contexts/SocketContext";
import { lightTheme, darkTheme } from "./styles/theme";
import ErrorBoundary from "./components/common/ErrorBoundary";
import PrivateRoute from "./contexts/AuthContextProvider";
import { ThemedToaster } from "./components/common/Toaster/ThemedToaster";
import { initializeSessionManagement } from "./services/authService";
import LetterManagement from "./pages/Letters/LetterManagement";
import { EpiProvider } from "./contexts/EpiContext";
import TaskBoard from "./pages/Tasks/TaskBoard"; // Novo componente para tarefas
// Importações de páginas antigas de tarefas podem ser removidas se não forem mais necessárias
// import TaskList from "./pages/Tasks/TaskList";
// import MyTasks from "./pages/Tasks/MyTasks";
// import CompletedTasks from "./pages/Tasks/CompletedTasks";

import "./styles/global.css";
import "./styles/sessionAlert.css";
import "./App.css";

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
        <div className="main-content">
          {user && (
            <Sidebar
              isOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              openNewDocumentModal={openNewDocumentModal}
              openEntityModal={openEntityModal}
            />
          )}
          <div className="content">
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
                  <PrivateRoute>
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
                  <PrivateRoute>
                    <EpiArea />
                  </PrivateRoute>
                }
              />
              {/* Rota para as tarefas com TaskBoard */}
              <Route
                path="/tasks"
                element={
                  <PrivateRoute>
                    <TaskBoard />
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
          <SocketProvider>
            <MetaDataProvider>
              <EpiProvider>
                <AppContent />
              </EpiProvider>
            </MetaDataProvider>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
