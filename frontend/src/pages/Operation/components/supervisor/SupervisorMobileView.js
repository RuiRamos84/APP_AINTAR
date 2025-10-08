import React from 'react';
import {
    Box, AppBar, Toolbar, Typography, IconButton, Card, CardContent,
    Stack, Chip, LinearProgress, List, ListItem, ListItemText, Divider,
    Container, Avatar
} from '@mui/material';
import {
    Refresh, Dashboard, CheckCircle, Schedule, Assignment,
    TrendingUp, Person
} from '@mui/icons-material';

// Components
import LoadingContainer from '../common/LoadingContainer';
import { useSupervisorData } from '../../hooks/useSupervisorData';

/**
 * VISTA MOBILE DE SUPERVISOR
 *
 * Interface simplificada para supervisão em smartphone
 * - KPIs principais
 * - Performance resumida da equipa
 * - Atividades recentes
 */
const SupervisorMobileView = ({ user, deviceInfo }) => {
    // Dados de supervisor
    const {
        analytics,
        recentActivity,
        operatorStats,
        isLoading,
        refresh
    } = useSupervisorData();

    if (isLoading) {
        return <LoadingContainer message="A carregar supervisão..." fullHeight />;
    }

    const overview = analytics?.overview || {
        totalOperations: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionRate: 0
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            {/* AppBar */}
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <Dashboard sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Supervisão
                    </Typography>
                    <IconButton color="inherit" onClick={refresh}>
                        <Refresh />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Conteúdo */}
            <Box sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
                <Container maxWidth="sm" sx={{ py: 2 }}>
                    {/* KPIs Compactos */}
                    <Card sx={{ mb: 2, bgcolor: 'primary.main', color: 'white' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} justifyContent="space-around">
                                <Box textAlign="center">
                                    <Typography variant="h4" fontWeight="bold">
                                        {overview.totalOperations}
                                    </Typography>
                                    <Typography variant="caption">Total</Typography>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'white', opacity: 0.3 }} />
                                <Box textAlign="center">
                                    <Typography variant="h4" fontWeight="bold">
                                        {overview.completedTasks}
                                    </Typography>
                                    <Typography variant="caption">Concluídas</Typography>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'white', opacity: 0.3 }} />
                                <Box textAlign="center">
                                    <Typography variant="h4" fontWeight="bold">
                                        {overview.completionRate}%
                                    </Typography>
                                    <Typography variant="caption">Taxa</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Progresso */}
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle2" fontWeight="600">
                                    Progresso Geral
                                </Typography>
                                <Chip
                                    label={`${overview.completionRate}%`}
                                    color={overview.completionRate >= 80 ? 'success' : 'warning'}
                                    size="small"
                                />
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={overview.completionRate}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                        </CardContent>
                    </Card>

                    {/* Equipa */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person /> Equipa ({operatorStats?.length || 0})
                    </Typography>

                    {operatorStats?.length === 0 ? (
                        <Card>
                            <CardContent>
                                <Typography variant="body2" color="text.secondary" align="center">
                                    Nenhum operador com tarefas
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        <Stack spacing={1}>
                            {(operatorStats || []).slice(0, 5).map((op) => (
                                <Card key={op.id}>
                                    <CardContent sx={{ py: 1.5 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                                    {op.name?.charAt(0) || 'O'}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {op.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {op.completedTasks}/{op.totalTasks}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Chip
                                                label={`${op.efficiency}%`}
                                                color={op.efficiency >= 80 ? 'success' : op.efficiency >= 50 ? 'warning' : 'error'}
                                                size="small"
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}

                    {/* Atividades */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule /> Atividades Recentes
                    </Typography>

                    <Card>
                        <List dense>
                            {(recentActivity || []).slice(0, 5).map((activity, index) => (
                                <React.Fragment key={activity.id || index}>
                                    <ListItem>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" noWrap>
                                                    {activity.description}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box component="span" display="inline-flex" alignItems="center" gap={1} mt={0.5}>
                                                    <Chip
                                                        label={activity.operator}
                                                        size="small"
                                                        sx={{ height: 18, fontSize: '0.7rem' }}
                                                    />
                                                    <Typography component="span" variant="caption" color="text.secondary">
                                                        {new Date(activity.timestamp).toLocaleDateString('pt-PT')}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < Math.min(5, (recentActivity || []).length) - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                            {(!recentActivity || recentActivity.length === 0) && (
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" color="text.secondary" align="center">
                                                Nenhuma atividade recente
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            )}
                        </List>
                    </Card>
                </Container>
            </Box>
        </Box>
    );
};

export default SupervisorMobileView;
