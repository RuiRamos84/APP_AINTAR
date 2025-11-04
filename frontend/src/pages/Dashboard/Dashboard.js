import React, { useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Card,
    CardContent
} from '@mui/material';
import { useDashboardData } from '../../hooks/useDashboardData';

// Componente para mostrar um cartão de categoria
const CategoryCard = ({ category, categoryData }) => {
    if (!categoryData || !categoryData.views) {
        return null;
    }

    const viewsArray = Object.values(categoryData.views);
    const totalViews = viewsArray.length;
    const totalRecords = viewsArray.reduce((sum, view) => sum + (view.total || 0), 0);

    return (
        <Card elevation={3}>
            <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {totalViews} visualizações
                </Typography>
                <Typography variant="h4" color="text.primary" sx={{ mt: 2, fontWeight: 'bold' }}>
                    {totalRecords}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Total de registos
                </Typography>
            </CardContent>
        </Card>
    );
};

// Componente para mostrar um cartão simples
const DataCard = ({ title, value }) => (
    <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6" color="text.secondary">{title}</Typography>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mt: 1 }}>
            {value || 0}
        </Typography>
    </Paper>
);

const Dashboard = () => {
    const [selectedYear, setSelectedYear] = useState('');
    const { dashboardData, isLoading, isError, error } = useDashboardData(selectedYear ? { year: selectedYear } : {});

    const handleYearChange = (event) => {
        setSelectedYear(event.target.value);
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>A carregar dados do Dashboard...</Typography>
            </Box>
        );
    }

    if (isError) {
        return (
            <Alert severity="error" sx={{ m: 3 }}>
                Ocorreu um erro ao carregar os dados do Dashboard: {error?.message || 'Erro desconhecido'}
            </Alert>
        );
    }

    // Verificar se temos dados
    const hasData = dashboardData && dashboardData.data;
    const structure = dashboardData?.structure;

    // Contar totais
    let totalCategories = 0;
    let totalViews = 0;

    if (hasData) {
        totalCategories = Object.keys(dashboardData.data).length;
        Object.values(dashboardData.data).forEach(categoryData => {
            if (categoryData && categoryData.views) {
                totalViews += Object.keys(categoryData.views).length;
            }
        });
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Dashboard Operacional
                </Typography>
                <FormControl sx={{ minWidth: 150 }} size="small">
                    <InputLabel>Ano</InputLabel>
                    <Select value={selectedYear} label="Ano" onChange={handleYearChange}>
                        <MenuItem value="">Todos os anos</MenuItem>
                        {years.map(year => (
                            <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Cards de resumo */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <DataCard title="Categorias" value={totalCategories} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <DataCard title="Visualizações" value={totalViews} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <DataCard title="Estrutura" value={structure?.categories?.length || 0} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <DataCard title="Filtro" value={selectedYear || "Todos"} />
                </Grid>
            </Grid>

            {/* Cards de categorias */}
            {hasData && (
                <>
                    <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
                        Dados por Categoria
                    </Typography>
                    <Grid container spacing={3}>
                        {Object.entries(dashboardData.data).map(([category, categoryData]) => (
                            <Grid item xs={12} sm={6} md={3} key={category}>
                                <CategoryCard category={category} categoryData={categoryData} />
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {!hasData && (
                <Alert severity="info" sx={{ mt: 3 }}>
                    Não há dados disponíveis para o ano selecionado.
                </Alert>
            )}
        </Box>
    );
};

export default Dashboard;