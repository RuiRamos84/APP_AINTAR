import React, { useState, useEffect } from 'react';
import { Box, Paper, Tabs, Tab, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useMetaData } from '../../contexts/MetaDataContext';
import { getAllDashboardData, getDashboardStructure } from '../../services/dashboardService';
import { DEFAULT_VIEW_TYPES, DASHBOARD_CATEGORIES } from './constants';
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
import CategorySelector from './components/CategorySelector';
import OverviewTab from './tabs/OverviewTab';
import DetailsTab from './tabs/DetailsTab';
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
  const [dashboardStructure, setDashboardStructure] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [viewTypes, setViewTypes] = useState(DEFAULT_VIEW_TYPES);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Efeito para carregar a estrutura do dashboard (uma vez)
  useEffect(() => {
    const fetchStructure = async () => {
      try {
        const structure = await getDashboardStructure();
        setDashboardStructure(structure);
      } catch (err) {
        console.error("Erro ao carregar estrutura do dashboard:", err);
      }
    };

    fetchStructure();
  }, []);

  // Efeito para carregar os dados do dashboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Preparar filtros
        const filters = {};
        if (selectedYear) filters.year = selectedYear;
        if (selectedMonth) filters.month = selectedMonth;

        // Buscar dados do dashboard
        const dashboardDataResponse = await getAllDashboardData(filters);
        setDashboardData(dashboardDataResponse);

        console.log("Dados do dashboard carregados:", dashboardDataResponse);

        // Extrair anos disponíveis
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
  }, [selectedYear, selectedMonth]);

  // Manipuladores de eventos
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setAnimationComplete(false);
    const filters = {};
    if (selectedYear) filters.year = selectedYear;
    if (selectedMonth) filters.month = selectedMonth;

    getAllDashboardData(filters).then((data) => {
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

  // Filtrar dados por categoria selecionada
  const getFilteredData = () => {
    if (!dashboardData || !dashboardData.data) return {};

    if (selectedCategory === null) {
      // Retornar todas as categorias
      return dashboardData.data;
    }

    // Retornar apenas a categoria selecionada
    return {
      [selectedCategory]: dashboardData.data[selectedCategory]
    };
  };

  // Calcular contagem de views por categoria
  const getCategoryCounts = () => {
    if (!dashboardData || !dashboardData.data) return {};

    const counts = {};
    Object.entries(dashboardData.data).forEach(([category, categoryData]) => {
      if (categoryData && categoryData.views) {
        counts[category] = Object.keys(categoryData.views).length;
      }
    });
    return counts;
  };

  // Renderização condicional para estados de loading e erro
  if (loading) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={handleRefresh} />;

  const filteredData = getFilteredData();
  const categoryCounts = getCategoryCounts();

  return (
    <Box sx={{ p: 3 }}>
      {/* Cabeçalho */}
      <DashboardHeader
        selectedYear={selectedYear}
        availableYears={availableYears}
        onYearChange={handleYearChange}
        onRefresh={handleRefresh}
      />

      {/* Filtros adicionais: Mês */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Mês</InputLabel>
          <Select
            value={selectedMonth}
            label="Mês"
            onChange={handleMonthChange}
          >
            <MenuItem value="">Todos os meses</MenuItem>
            <MenuItem value="1">Janeiro</MenuItem>
            <MenuItem value="2">Fevereiro</MenuItem>
            <MenuItem value="3">Março</MenuItem>
            <MenuItem value="4">Abril</MenuItem>
            <MenuItem value="5">Maio</MenuItem>
            <MenuItem value="6">Junho</MenuItem>
            <MenuItem value="7">Julho</MenuItem>
            <MenuItem value="8">Agosto</MenuItem>
            <MenuItem value="9">Setembro</MenuItem>
            <MenuItem value="10">Outubro</MenuItem>
            <MenuItem value="11">Novembro</MenuItem>
            <MenuItem value="12">Dezembro</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Seletor de categorias */}
      <CategorySelector
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        categoryCounts={categoryCounts}
      />

      {/* Cards de estatísticas */}
      <SummaryStats
        data={filteredData}
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
          data={filteredData}
          viewTypes={viewTypes}
          onViewTypeChange={handleViewTypeChange}
          getViewTitle={getViewTitleWithMetadata}
        />
      )}

      {tabValue === 1 && (
        <DetailsTab
          data={filteredData}
          viewTypes={viewTypes}
          onViewTypeChange={handleViewTypeChange}
          getViewTitle={getViewTitleWithMetadata}
        />
      )}

      {tabValue === 2 && (
        <PerformanceTab
          data={filteredData}
          viewTypes={viewTypes}
          onViewTypeChange={handleViewTypeChange}
          getViewTitle={getViewTitleWithMetadata}
        />
      )}
    </Box>
  );
};

export default Dashboard;
