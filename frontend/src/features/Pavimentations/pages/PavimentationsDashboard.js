import React, { useState } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Tabs,
    Tab,
    Badge,
    useTheme,
    alpha
} from '@mui/material';
import {
    PAVIMENTATION_STATUS,
    StatusUtils
} from '../constants/pavimentationTypes';
import { usePavimentations } from '../hooks/usePavimentations';
import PavimentationList from '../components/PavimentationList';
import PavimentationStats from '../components/PavimentationList/PavimentationStats';

/**
 * Dashboard completo de pavimentações com todas as abas
 */
const PavimentationsDashboard = () => {
    const theme = useTheme();
    const [currentTab, setCurrentTab] = useState(0);

    // Hooks para contadores das abas
    const pendingData = usePavimentations('pending', { autoRefresh: true });
    const executedData = usePavimentations('executed', { autoRefresh: true });
    const completedData = usePavimentations('completed', { autoRefresh: false });

    const tabsConfig = [
        {
            label: 'Pendentes',
            status: 'pending',
            data: pendingData,
            component: <PavimentationList status="pending" allowActions={true} />
        },
        {
            label: 'Executadas',
            status: 'executed',
            data: executedData,
            component: <PavimentationList status="executed" allowActions={true} />
        },
        {
            label: 'Concluídas',
            status: 'completed',
            data: completedData,
            component: <PavimentationList status="completed" allowActions={false} />
        }
    ];

    /**
     * Renderizar aba
     */
    const renderTab = (config, index) => {
        const statusConfig = StatusUtils.getStatusConfig(config.status);
        const count = config.data.totalCount;
        const loading = config.data.loading;

        return (
            <Tab
                key={config.status}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <statusConfig.icon sx={{ fontSize: 20 }} />
                        <span>{config.label}</span>
                        <Badge
                            badgeContent={loading ? '...' : count}
                            color={statusConfig.color}
                            showZero
                            sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.75rem',
                                    minWidth: '20px',
                                    height: '20px'
                                }
                            }}
                        />
                    </Box>
                }
                sx={{
                    textTransform: 'none',
                    minWidth: 120,
                    '&.Mui-selected': {
                        color: `${statusConfig.color}.main`
                    }
                }}
            />
        );
    };

    /**
     * Renderizar estatísticas globais
     */
    const renderGlobalStats = () => {
        const totalPending = pendingData.totalCount;
        const totalExecuted = executedData.totalCount;
        const totalCompleted = completedData.totalCount;
        const totalItems = totalPending + totalExecuted + totalCompleted;

        if (totalItems === 0) return null;

        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Resumo Geral das Pavimentações
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary.main">
                                {totalItems.toLocaleString('pt-PT')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total de Pavimentações
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main">
                                {totalPending.toLocaleString('pt-PT')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Pendentes
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main">
                                {totalExecuted.toLocaleString('pt-PT')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Executadas
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                                {totalCompleted.toLocaleString('pt-PT')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Concluídas
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Cabeçalho */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gestão de Pavimentações
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Controle completo do processo de pavimentação desde o pedido até a conclusão
                </Typography>
            </Box>

            {/* Estatísticas globais */}
            {renderGlobalStats()}

            {/* Abas */}
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={currentTab}
                    onChange={(e, newValue) => setCurrentTab(newValue)}
                    variant="fullWidth"
                    sx={{
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '& .MuiTab-root': {
                            py: 2
                        }
                    }}
                >
                    {tabsConfig.map((config, index) => renderTab(config, index))}
                </Tabs>
            </Paper>

            {/* Conteúdo da aba atual */}
            <Box>
                {tabsConfig[currentTab]?.component}
            </Box>
        </Container>
    );
};

export default PavimentationsDashboard;