import React, { useState, useEffect } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';
import { useMetaData } from '../../contexts/MetaDataContext';
import { getAllDashboardData } from '../../services/dashboardService';
import { DEFAULT_VIEW_TYPES } from './constants';
import { getViewTitle } from './utils/viewHelpers';

// Ícones
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';

// Componentes
import LoadingView from './components/LoadingView';
import ErrorView from './components/ErrorView';
import DashboardHeader from './components/DashboardHeader';
import SummaryStats from './components/SummaryStats';
import OverviewTab from './tabs/OverviewTab';
import DetailsTab from './DetailsTab'; // Corrigido o caminho de importação
import PerformanceTab from './tabs/PerformanceTab';

/**
 * Componente principal do Dashboard
 * 
 * @returns {React.ReactElement}
 */
const Dashboard = () => {
  const { metaData } = useMetaData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [viewTypes, setViewTypes] = useState(DEFAULT_VIEW_TYPES);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Efeito para carregar os dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar dados do dashboard
        const dashboardDataResponse = await getAllDashboardData(selectedYear);
        setDashboardData(dashboardDataResponse);

        console.log("Dados do dashboard carregados:", dashboardDataResponse);

        // Extrair anos disponíveis
        // Na implementação real, isso poderia vir da API
        const currentYear = new Date().getFullYear();
        const yearsArray = Array.from(
          { length: 5 },
          (_, i) => (currentYear - i).toString()
        );
        setAvailableYears(yearsArray);

        setLoading(false);

        // Permitir que as animações iniciais sejam concluídas
        setTimeout(() => {
          setAnimationComplete(true);
        }, 300);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setError(
          "Não foi possível carregar os dados do dashboard. Por favor, tente novamente mais tarde."
        );
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Manipuladores de eventos
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setAnimationComplete(false);
    getAllDashboardData(selectedYear).then((data) => {
      setDashboardData(data);
      setTimeout(() => {
        setAnimationComplete(true);
      }, 300);
    });
  };

  const handleViewTypeChange = (viewName, newViewType) => {
    setViewTypes(prev => ({
      ...prev,
      [viewName]: newViewType
    }));
  };

  // Função para obter título da view com metadados
  const getViewTitleWithMetadata = (viewName) => {
    return getViewTitle(metaData, viewName);
  };

  // Renderização condicional para estados de loading e erro
  if (loading) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={handleRefresh} />;

  return (
    <Box sx={{ p: 3 }}>
      {/* Cabeçalho */}
      <DashboardHeader
        selectedYear={selectedYear}
        availableYears={availableYears}
        onYearChange={handleYearChange}
        onRefresh={handleRefresh}
      />

      {/* Cards de estatísticas */}
      <SummaryStats
        data={dashboardData}
        animationComplete={animationComplete}
      />

      {/* Tabs para organizar visualizações */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<DonutLargeIcon />} label="Visão Geral" />
          <Tab icon={<AssessmentIcon />} label="Análise Detalhada" />
          <Tab icon={<PersonIcon />} label="Desempenho por Técnico" />
        </Tabs>
      </Paper>

      {/* Conteúdo das tabs */}
      {tabValue === 0 && (
        <OverviewTab
          data={dashboardData}
          viewTypes={viewTypes}
          onViewTypeChange={handleViewTypeChange}
          getViewTitle={getViewTitleWithMetadata}
        />
      )}

      {tabValue === 1 && (
        <DetailsTab
          data={dashboardData}
          viewTypes={viewTypes}
          onViewTypeChange={handleViewTypeChange}
          getViewTitle={getViewTitleWithMetadata}
        />
      )}

      {tabValue === 2 && (
        <PerformanceTab
          data={dashboardData}
          viewTypes={viewTypes}
          onViewTypeChange={handleViewTypeChange}
          getViewTitle={getViewTitleWithMetadata}
        />
      )}
    </Box>
  );
};

export default Dashboard;