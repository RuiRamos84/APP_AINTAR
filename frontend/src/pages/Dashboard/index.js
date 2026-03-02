import React from 'react';
import { Box, Paper, Tabs, Tab, Typography, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
    Dashboard as DashboardIcon,
    Assessment as AssessmentIcon
} from '@mui/icons-material';
import DashboardResumo from './DashboardResumo';
import DashboardModern from './DashboardModern';

const DashboardWrapper = () => {
    const theme = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'geral' ? 1 : 0;

    const handleTabChange = (_, v) => {
        if (v === 1) setSearchParams({ tab: 'geral' });
        else setSearchParams({});
    };

    return (
        <Box sx={{ backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
            <Paper square elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Dashboard Operacional
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Análise completa de dados e métricas
                </Typography>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                >
                    <Tab icon={<DashboardIcon />} label="Resumo" iconPosition="start" />
                    <Tab icon={<AssessmentIcon />} label="Geral" iconPosition="start" />
                </Tabs>
            </Paper>

            {activeTab === 0 && <DashboardResumo />}
            {activeTab === 1 && <DashboardModern />}
        </Box>
    );
};

export default DashboardWrapper;

// Manter a versão antiga disponível para fallback se necessário
export { default as DashboardLegacy } from './Dashboard';
