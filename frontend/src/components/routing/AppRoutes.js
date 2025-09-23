// frontend/src/components/routing/AppRoutes.js - NOVO ARQUIVO

import React, { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "../../contexts/AuthContextProvider";

// === IMPORTAÇÕES DE PÁGINAS ===
const Home = lazy(() => import("../../pages/Home/Home"));
const Login = lazy(() => import("../../pages/Login/Login"));
const CreateUser = lazy(() => import("../../pages/CreateUser/CreateUser"));
const Activation = lazy(() => import("../../pages/Activation/Activation"));
const PasswordRecovery = lazy(() => import("../../pages/PasswordRecovery/PasswordRecovery"));
const ResetPassword = lazy(() => import("../../pages/ResetPassword/ResetPassword"));

// Páginas privadas
const AdminDashboard = lazy(() => import("../../pages/Administration/AdminDashboard"));
const UserInfo = lazy(() => import("../../pages/UserInfo/UserInfo"));
const ChangePassword = lazy(() => import("../../pages/ChangePassword/ChangePassword"));
const EntityList = lazy(() => import("../../pages/Entity/EntityList/EntityList"));
const EntityDetail = lazy(() => import("../../pages/Entity/EntityDetail/EntityDetail"));
const CreateEntity = lazy(() => import("../../pages/Entity/CreateEntity/CreateEntity"));
const Operation = lazy(() => import("../../pages/Operation"));
const ModernDocuments = lazy(() => import("../../pages/ModernDocuments"));
const DocumentList = lazy(() => import("../../pages/Documents/DocumentListAll/DocumentList"));
const DocumentPage = lazy(() => import("../../pages/DocumentPage/DocumentPage"));
const CreateDocument = lazy(() => import("../../pages/Documents/DocumentCreate/CreateDocument"));
const CreatedByMe = lazy(() => import("../../pages/Documents/DocumentOner/CreatedByMe"));
const AssignedToMe = lazy(() => import("../../pages/Documents/DocumentSelf/AssignedToMe"));

// Correção para lazy loading de named exports
const PendingPavimentations = lazy(() => import("../../features/Pavimentations").then(module => ({ default: module.PendingPavimentations })));
const ExecutedPavimentations = lazy(() => import("../../features/Pavimentations").then(module => ({ default: module.ExecutedPavimentations })));
const CompletedPavimentations = lazy(() => import("../../features/Pavimentations").then(module => ({ default: module.CompletedPavimentations })));

const Dashboard = lazy(() => import("../../pages/Dashboard/Dashboard"));
const LetterManagement = lazy(() => import("../../pages/Letters/LetterManagement"));

const AllTasks = lazy(() => import('../../pages/Tasks/index.js').then(module => ({ default: module.AllTasks })));
const CompletedTasks = lazy(() => import('../../pages/Tasks/index.js').then(module => ({ default: module.CompletedTasks })));
const CreatedTasks = lazy(() => import('../../pages/Tasks/index.js').then(module => ({ default: module.CreatedTasks })));
const MyTasks = lazy(() => import('../../pages/Tasks/index.js').then(module => ({ default: module.MyTasks })));
const TaskManagement = lazy(() => import('../../pages/Tasks/index.js').then(module => ({ default: module.TaskManagement })));

const InternalArea = lazy(() => import("../../pages/Internal/index"));
const GlobalModule = lazy(() => import("../../pages/Global"));
const EpiArea = lazy(() => import("../../pages/EPIs/EpiArea"));
const DocumentPaymentFlow = lazy(() => import('../../features/Payment/modals/DocumentPaymentFlow'));
const PaymentAdminPage = lazy(() => import('../../features/Payment/components/PaymentAdminPage'));

// === CONFIGURAÇÃO DE ROTAS ===
const PUBLIC_ROUTES = ["/", "/login", "/create-user", "/activation", "/password-recovery", "/reset-password"];

// Componente para renderizar rotas dinâmicas
const RouteRenderer = ({ Component, user }) => {
    if (typeof Component === 'function' && Component.length > 0) {
        return <Component user={user} />;
    }
    return <Component />;
};

const AppRoutes = ({ user }) => (
    <Routes>
        {/* === ROTAS PÚBLICAS === */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/create-user" element={<CreateUser />} />
        <Route path="/activation/:id/:activation_code" element={<Activation />} />
        <Route path="/password-recovery" element={<PasswordRecovery />} />
        <Route path="/reset-password/:id/:reset_code" element={<ResetPassword />} />

        {/* === ROTAS ADMINISTRATIVAS === */}
        <Route path="/settings" element={
            <PrivateRoute requiredPermission={1}>
                <AdminDashboard />
            </PrivateRoute>
        } />

        {/* === ROTAS DE UTILIZADOR === */}
        <Route path="/user-info" element={<PrivateRoute><UserInfo /></PrivateRoute>} />
        <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

        {/* === ROTAS DE ENTIDADES === */}
        <Route path="/entities" element={<PrivateRoute><EntityList /></PrivateRoute>} />
        <Route path="/entities/:id" element={<PrivateRoute><EntityDetail /></PrivateRoute>} />
        <Route path="/add-entity" element={<PrivateRoute><CreateEntity /></PrivateRoute>} />

        {/* === ROTAS OPERACIONAIS === */}
        <Route path="/operation" element={
            <PrivateRoute requiredPermission={16}>
                <Operation />
            </PrivateRoute>
        } />

        <Route path="/dashboard" element={
            <PrivateRoute requiredPermission={17}>
                <Dashboard />
            </PrivateRoute>
        } />

        {/* === ROTAS DE DOCUMENTOS === */}
        <Route path="/pedidos-modernos" element={
        <PrivateRoute requiredPermission={20}>
                <ModernDocuments />
            </PrivateRoute>
        } />

        <Route path="/documents" element={
        <PrivateRoute requiredPermission={18}>
                <DocumentList />
            </PrivateRoute>
        } />
        <Route path="/documents/:id" element={<PrivateRoute><DocumentPage /></PrivateRoute>} />
        <Route path="/create_document" element={<PrivateRoute><CreateDocument /></PrivateRoute>} />
    <Route path="/document_owner" element={<PrivateRoute requiredPermission={21}><CreatedByMe /></PrivateRoute>} />
        <Route path="/document_self" element={
        <PrivateRoute requiredPermission={19}>
                <AssignedToMe />
            </PrivateRoute>
        } />

        {/* === ROTAS DE PAVIMENTAÇÕES === */}
        <Route path="/ramais" element={<PrivateRoute><PendingPavimentations /></PrivateRoute>} />
        <Route path="/ramais/executed" element={<PrivateRoute><ExecutedPavimentations /></PrivateRoute>} />
        <Route path="/ramais/concluded" element={<PrivateRoute><CompletedPavimentations /></PrivateRoute>} />

        {/* === ROTAS DE GESTÃO === */}
        <Route path="/letters" element={
        <PrivateRoute requiredPermission={7}>
                <LetterManagement />
            </PrivateRoute>
        } />

        <Route path="/epi" element={
        <PrivateRoute requiredPermission={6}>
                <EpiArea />
            </PrivateRoute>
        } />

        <Route path="/internal" element={
        <PrivateRoute requiredPermission={8}>
                <InternalArea />
            </PrivateRoute>
        } />

        {/* === ROTAS DE TAREFAS === */}
        <Route path="/tasks" element={
        <PrivateRoute requiredPermission={5}>
                <TaskManagement />
            </PrivateRoute>
        }>
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={
                <PrivateRoute requiredPermission={5}>
                    <AllTasks />
                </PrivateRoute>
            } />
            <Route path="my" element={<MyTasks />} />
            <Route path="created" element={<CreatedTasks />} />
            <Route path="completed" element={<CompletedTasks />} />
        </Route>

        {/* === ROTAS DE PAGAMENTOS === */}
        <Route path="/payment/:regnumber" element={
            <PrivateRoute>
                <RouteRenderer Component={DocumentPaymentFlow} user={user} />
            </PrivateRoute>
        } />

        <Route path="/payment-admin" element={
        <PrivateRoute requiredPermission={3}>
                <RouteRenderer Component={PaymentAdminPage} user={user} />
            </PrivateRoute>
        } />

        {/* === ROTAS ESPECIAIS === */}
        <Route path="/global" element={
            <PrivateRoute requiredPermission={1}>
                <GlobalModule />
            </PrivateRoute>
        } />
    </Routes>
);

export default AppRoutes;
