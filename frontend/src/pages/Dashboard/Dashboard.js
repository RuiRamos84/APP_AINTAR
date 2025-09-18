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
    InputLabel
} from '@mui/material';
import { useDashboardData } from '../../hooks/useDashboardData';

// Um componente de exemplo para mostrar um cartão de dados
const DataCard = ({ title, data }) => (
    <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6" color="text.secondary">{title}</Typography>
        {data ? (
            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {data.total || 0}
            </Typography>
        ) : (
            <Typography variant="body2" color="text.secondary">Sem dados</Typography>
        )}
    </Paper>
);

const Dashboard = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { dashboardData, isLoading, isError, error } = useDashboardData(selectedYear);

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
                Ocorreu um erro ao carregar os dados do Dashboard: {error.message}
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Dashboard Operacional
                </Typography>
                <FormControl sx={{ minWidth: 120 }} size="small">
                    <InputLabel>Ano</InputLabel>
                    <Select value={selectedYear} label="Ano" onChange={handleYearChange}>
                        {years.map(year => (
                            <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Grid container spacing={3}>
                {dashboardData && Object.entries(dashboardData).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                        <DataCard title={value?.name || key} data={value} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Dashboard;