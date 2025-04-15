import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Description as DocumentIcon,
  Storage as DatabaseIcon,
  Notifications as NotificationIcon,
  History as HistoryIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

// Importando componentes existentes
import ReopenDocument from './ReopenDocument';

// Importar os componentes criados para área admin
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import SystemSettings from './SystemSettings';
import ActivityLogs from './ActivityLogs';
import DatabaseManagement from './DatabaseManagement';

// Componentes placeholder
const DocumentManagement = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Gestão de Documentos</Typography>
    <Typography>Esta funcionalidade ainda não foi implementada.</Typography>
  </Box>
);

const Reports = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Relatórios</Typography>
    <Typography>Esta funcionalidade ainda não foi implementada.</Typography>
  </Box>
);

// Definição das abas
const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> },
  { id: 'users', label: 'Utilizadores', icon: <PeopleIcon fontSize="small" /> },
  { id: 'documents', label: 'Documentos', icon: <DocumentIcon fontSize="small" /> },
  { id: 'reopen', label: 'Reabertura', icon: <HistoryIcon fontSize="small" /> },
  { id: 'database', label: 'Base de Dados', icon: <DatabaseIcon fontSize="small" /> },
  { id: 'logs', label: 'Logs', icon: <NotificationIcon fontSize="small" /> },
  { id: 'reports', label: 'Relatórios', icon: <ChartIcon fontSize="small" /> },
  { id: 'settings', label: 'Configurações', icon: <SettingsIcon fontSize="small" /> },
];

const AdminDashboard = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Obter o tab da URL
  const getTabFromUrl = () => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    const tabIndex = tabs.findIndex(tab => tab.id === tabParam);
    return tabIndex >= 0 ? tabIndex : 0; // Padrão para dashboard se não especificado
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl());

  // Atualizar o estado quando a URL muda
  useEffect(() => {
    setActiveTab(getTabFromUrl());
  }, [location.search]);

  // Atualizar a URL quando o tab muda
  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
    const tabId = tabs[newValue].id;
    navigate(`/settings?tab=${tabId}`, { replace: true });
  };

  // Renderizar o conteúdo baseado na tab ativa
  const renderContent = () => {
    switch (tabs[activeTab].id) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UserManagement />;
      case 'documents':
        return <DocumentManagement />;
      case 'reopen':
        return <ReopenDocument />;
      case 'database':
        return <DatabaseManagement />;
      case 'logs':
        return <ActivityLogs />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Box sx={{ width: '100%', pt: 1 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Área de Administração
      </Typography>

      <Box sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 3,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: '8px 8px 0 0',
      }}>
        <Tabs
          value={activeTab}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: '48px',
              textTransform: 'none',
              fontSize: '0.875rem',
            }
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 1 }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default AdminDashboard;