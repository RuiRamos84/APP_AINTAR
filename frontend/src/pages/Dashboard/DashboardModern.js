import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Card,
    CardContent,
    Tab,
    Tabs,
    Button,
    Chip,
    IconButton,
    Tooltip,
    useTheme,
    alpha
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Refresh as RefreshIcon,
    FileDownload as FileDownloadIcon,
    FilterList as FilterListIcon,
    Visibility as VisibilityIcon,
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    ShowChart as ShowChartIcon,
    TableChart as TableChartIcon
} from '@mui/icons-material';
import { useDashboardData } from '../../hooks/useDashboardData';
import { getDashboardStructure } from '../../services/dashboardService';
import { DASHBOARD_CATEGORIES } from './constants';
import CategorySelector from './components/CategorySelector';

// Componentes de visualização
import KPICard from './components/modern/KPICard';
import ChartContainer from './components/modern/ChartContainer';
import DataTableView from './components/modern/DataTableView';
import FilterPanel from './components/modern/FilterPanel';

/**
 * Dashboard Moderno - Versão profissional com visualizações avançadas
 * Desenvolvido seguindo princípios de UX/UI e melhores práticas
 */
const DashboardModern = () => {
    const theme = useTheme();

    // Estados principais
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState('overview'); // overview, detailed, table
    const [dashboardStructure, setDashboardStructure] = useState(null);

    // Hook de dados
    const filters = useMemo(() => {
        const f = {};
        if (selectedYear) f.year = selectedYear;
        if (selectedMonth) f.month = selectedMonth;
        return f;
    }, [selectedYear, selectedMonth]);

    const { dashboardData, isLoading, isError, error, refetch } = useDashboardData(filters);

    // Carregar estrutura
    useEffect(() => {
        const loadStructure = async () => {
            try {
                const structure = await getDashboardStructure();
                setDashboardStructure(structure);
            } catch (err) {
                console.error('Erro ao carregar estrutura:', err);
            }
        };
        loadStructure();
    }, []);

    // Handlers
    const handleYearChange = (event) => setSelectedYear(event.target.value);
    const handleMonthChange = (event) => setSelectedMonth(event.target.value);
    const handleCategoryChange = (category) => setSelectedCategory(category);
    const handleTabChange = (event, newValue) => setActiveTab(newValue);
    const handleRefresh = () => refetch();

    // Processar dados para KPIs
    const kpiData = useMemo(() => {
        if (!dashboardData?.data) return [];

        const kpis = [];
        const data = dashboardData.data;

        // KPIs por categoria
        Object.entries(data).forEach(([category, categoryData]) => {
            if (!categoryData?.views) return;

            const viewsArray = Object.values(categoryData.views);
            const totalRecords = viewsArray.reduce((sum, view) => sum + (view.total || 0), 0);
            const totalViews = viewsArray.length;

            const categoryInfo = DASHBOARD_CATEGORIES[category];

            kpis.push({
                id: category,
                title: categoryInfo?.name || category,
                value: totalRecords,
                subtitle: `${totalViews} visualizações`,
                trend: null,
                icon: categoryInfo?.icon || 'assignment',
                color: getCategoryColor(category, theme)
            });
        });

        return kpis;
    }, [dashboardData, theme]);

    // Filtrar dados por categoria
    const filteredData = useMemo(() => {
        if (!dashboardData?.data) return {};
        if (!selectedCategory) return dashboardData.data;

        return {
            [selectedCategory]: dashboardData.data[selectedCategory]
        };
    }, [dashboardData, selectedCategory]);

    // Calcular contagens
    const getCategoryCounts = () => {
        if (!dashboardData?.data) return {};

        const counts = {};
        Object.entries(dashboardData.data).forEach(([category, categoryData]) => {
            if (categoryData?.views) {
                counts[category] = Object.keys(categoryData.views).length;
            }
        });
        return counts;
    };

    // Anos disponíveis
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    // Estados de loading e erro
    if (isLoading) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80vh',
                gap: 2
            }}>
                <CircularProgress size={60} />
                <Typography variant="h6" color="text.secondary">
                    A carregar dados do Dashboard...
                </Typography>
            </Box>
        );
    }

    if (isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={handleRefresh}>
                            Tentar Novamente
                        </Button>
                    }
                >
                    <Typography variant="body1" fontWeight="bold">
                        Erro ao carregar dados do Dashboard
                    </Typography>
                    <Typography variant="body2">
                        {error?.message || 'Erro desconhecido. Por favor, tente novamente.'}
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Dashboard Operacional
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Análise completa de dados e métricas
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Filtro de Ano */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Ano</InputLabel>
                        <Select value={selectedYear} label="Ano" onChange={handleYearChange}>
                            <MenuItem value="">Todos os anos</MenuItem>
                            {years.map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Filtro de Mês */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Mês</InputLabel>
                        <Select value={selectedMonth} label="Mês" onChange={handleMonthChange}>
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

                    {/* Botões de ação */}
                    <Tooltip title="Atualizar dados">
                        <IconButton
                            onClick={handleRefresh}
                            sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Exportar dados">
                        <IconButton
                            sx={{
                                backgroundColor: alpha(theme.palette.success.main, 0.1),
                                '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.2) }
                            }}
                        >
                            <FileDownloadIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* KPIs - Sempre visíveis */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {kpiData.map((kpi) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.id}>
                        <KPICard {...kpi} />
                    </Grid>
                ))}
            </Grid>

            {/* Seletor de Categorias */}
            <CategorySelector
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                categoryCounts={getCategoryCounts()}
            />

            {/* Tabs de Visualização */}
            <Paper sx={{ mb: 3, mt: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab icon={<BarChartIcon />} label="Visão Geral" iconPosition="start" />
                    <Tab icon={<ShowChartIcon />} label="Análise Detalhada" iconPosition="start" />
                    <Tab icon={<TableChartIcon />} label="Dados Tabulares" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Conteúdo das Tabs */}
            <Box sx={{ minHeight: '600px' }}>
                {activeTab === 0 && (
                    <ChartContainer
                        data={filteredData}
                        viewMode="overview"
                        selectedCategory={selectedCategory}
                    />
                )}

                {activeTab === 1 && (
                    <ChartContainer
                        data={filteredData}
                        viewMode="detailed"
                        selectedCategory={selectedCategory}
                    />
                )}

                {activeTab === 2 && (
                    <DataTableView
                        data={filteredData}
                        selectedCategory={selectedCategory}
                    />
                )}
            </Box>

            {/* Mensagem se não houver dados */}
            {(!dashboardData?.data || Object.keys(dashboardData.data).length === 0) && (
                <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body1" fontWeight="bold">
                        Não há dados disponíveis
                    </Typography>
                    <Typography variant="body2">
                        Selecione diferentes filtros ou verifique se as views do banco de dados estão configuradas corretamente.
                    </Typography>
                </Alert>
            )}
        </Box>
    );
};

// Função auxiliar para cores por categoria
const getCategoryColor = (category, theme) => {
    const colors = {
        pedidos: theme.palette.primary.main,
        ramais: theme.palette.secondary.main,
        fossas: theme.palette.success.main,
        instalacoes: theme.palette.warning.main
    };
    return colors[category] || theme.palette.info.main;
};

export default DashboardModern;
