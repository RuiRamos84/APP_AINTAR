import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    useTheme,
    alpha,
    Button,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Refresh as RefreshIcon,
    BarChart as BarChartIcon,
    ShowChart as ShowChartIcon,
    TableChart as TableChartIcon
} from '@mui/icons-material';
import { useDashboardData } from '../../hooks/useDashboardData';
import { DASHBOARD_CATEGORIES } from './constants';
import ChartContainer from './components/modern/ChartContainer';
import DataTableView from './components/modern/DataTableView';
import DetailedChartView from './components/modern/DetailedChartView';

const getCategoryColor = (category, theme) => {
    const colors = {
        pedidos: theme.palette.primary.main,
        ramais: theme.palette.secondary.main,
        fossas: theme.palette.success.main,
        instalacoes: theme.palette.warning.main,
        analises: theme.palette.info.main,
        incumprimentos: theme.palette.error.main,
        repavimentacoes: theme.palette.warning.dark,
        transmitacoes: theme.palette.secondary.dark,
    };
    return colors[category] || theme.palette.primary.main;
};

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CategoryPage = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const [activeTab, setActiveTab] = useState(0);
    const [initialChartId, setInitialChartId] = useState(null);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    const filters = useMemo(() => {
        const f = {};
        if (selectedYear) f.year = selectedYear;
        if (selectedMonth) f.month = selectedMonth;
        return f;
    }, [selectedYear, selectedMonth]);

    const { dashboardData, isLoading, isFetching, isError, error, refetch, forceRefetch } = useDashboardData(filters);

    const categoryInfo = DASHBOARD_CATEGORIES[category];
    const color = getCategoryColor(category, theme);

    const categoryData = useMemo(() => {
        if (!dashboardData?.data) return {};
        return { [category]: dashboardData.data[category] };
    }, [dashboardData, category]);

    const viewCount = useMemo(() => {
        const cat = dashboardData?.data?.[category];
        return cat?.views ? Object.keys(cat.views).length : 0;
    }, [dashboardData, category]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    if (!categoryInfo) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Categoria não encontrada.</Typography>
                <Button variant="contained" onClick={() => navigate(-1)}>
                    Voltar ao Dashboard
                </Button>
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
                <CircularProgress size={48} thickness={3} />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>A obter os dados mais recentes...</Typography>
                <Typography variant="body2" color="text.disabled">Estamos a preparar os gráficos de {categoryInfo.name} para si.</Typography>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h4" fontWeight="bold">
                            {categoryInfo.name}
                        </Typography>
                        {viewCount > 0 && (
                            <Chip
                                label={`${viewCount} gráfico${viewCount !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                    backgroundColor: alpha(color, 0.15),
                                    color,
                                    fontWeight: 600
                                }}
                            />
                        )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {categoryInfo.description}
                    </Typography>
                </Box>

                {/* Botões direita */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title={isFetching ? 'A atualizar...' : 'Atualizar dados'}>
                        <span>
                            <IconButton
                                onClick={() => forceRefetch()}
                                disabled={isFetching}
                                sx={{
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                                    '& svg': {
                                        animation: isFetching ? 'spin 0.8s linear infinite' : 'none',
                                        '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
                                    }
                                }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Voltar ao Dashboard">
                        <IconButton
                            onClick={() => navigate(-1)}
                            sx={{
                                backgroundColor: alpha(color, 0.1),
                                '&:hover': { backgroundColor: alpha(color, 0.2) }
                            }}
                        >
                            <ArrowBackIcon sx={{ color }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab icon={<BarChartIcon />} label="Visão Geral" iconPosition="start" />
                    <Tab icon={<ShowChartIcon />} label="Análise Detalhada" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Erro */}
            {isError && (
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={() => refetch()}>
                            Tentar Novamente
                        </Button>
                    }
                >
                    {error?.message || 'Erro ao carregar dados.'}
                </Alert>
            )}

            {/* Conteúdo das Tabs */}
            {!isError && (
                <Box sx={{ minHeight: '600px' }}>
                    {activeTab === 0 && (
                        <ChartContainer
                            data={categoryData}
                            viewMode="overview"
                            selectedCategory={category}
                            onDetailClick={(chartId) => { setInitialChartId(chartId); setActiveTab(1); }}
                        />
                    )}
                    {activeTab === 1 && (
                        <DetailedChartView
                            data={categoryData}
                            selectedCategory={category}
                            initialChartId={initialChartId}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
};

export default CategoryPage;
