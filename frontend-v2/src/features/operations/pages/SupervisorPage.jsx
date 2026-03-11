import React, { useState, useCallback } from 'react';
import {
    Box, Typography, Tab, Tabs, Stack, Chip, Fab, IconButton, Tooltip, Button,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
    alpha, useTheme, Collapse, Badge, TextField
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Assignment as AssignmentIcon,
    People as PeopleIcon,
    Analytics as AnalyticsIcon,
    Refresh as RefreshIcon,
    FilterList,
    Folder as FolderIcon,
    DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSupervisorData } from '../hooks/useSupervisorData';
import { exportSupervisorDataToExcel } from '../services/exportService';
import ExportButton from '../components/ExportButton';
import SupervisorDashboard from '../components/supervisor/SupervisorDashboard';
import OperatorMonitoring from '../components/supervisor/OperatorMonitoring';
import OperationTaskManager from '../components/supervisor/OperationTaskManager';
import AnalyticsPanel from '../components/supervisor/AnalyticsPanel';
import PedidosPanel from '../components/supervisor/PedidosPanel';

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'tasks', label: 'Gestão de Tarefas', icon: <AssignmentIcon /> },
    { id: 'monitoring', label: 'Equipa', icon: <PeopleIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
];

const SupervisorPage = () => {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [pedidosVisited, setPedidosVisited] = useState(false);

    const handleTabChange = useCallback((_, val) => {
        setActiveTab(val);
        if (val === 4) setPedidosVisited(true);
    }, []);

    const {
        analytics, recentActivity, operatorStats, operations,
        weekDistribution, dayDistribution, metaData,
        weekFilter, setWeekFilter, dayFilter, setDayFilter,
        operatorFilter, setOperatorFilter,
        availableWeeks, availableDays, filterInfo,
        dateRange, setDateRange,
        isLoading, hasError, error, refresh,
        createTask, createDirect, createMeta, updateMeta, deleteMeta, validateExecution,
        pedidos, pedidosLoading, pedidosError,
    } = useSupervisorData({ activeTab, pedidosVisited });

    const unvalidatedCount = analytics?.overview?.unvalidatedCount ?? 0;

    const handleValidate = (formData) => {
        validateExecution.mutate(formData);
    };

    const handleExportExcel = () => {
        exportSupervisorDataToExcel(operations, operatorStats, {
            filename: 'Supervisao_Operacoes'
        });
    };

    const hasActiveFilters = weekFilter !== 'all' || dayFilter !== 'all' || operatorFilter !== 'all';

    return (
        <ModulePage
            title="Supervisão de Operações"
            subtitle="Gestão e monitorização de tarefas operacionais"
            icon={DashboardIcon}
            color="#1565c0"
            breadcrumbs={[
                { label: 'Operação', path: '/operation' },
                { label: 'Supervisão' },
            ]}
            actions={
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        icon={<DateRangeIcon />}
                        label={`${dateRange.fromDate} → ${dateRange.toDate}`}
                        size="small"
                        variant="outlined"
                        color="default"
                        onClick={() => setShowFilters(true)}
                    />
                    {filterInfo && (
                        <Chip
                            label={`${filterInfo.showing} de ${filterInfo.totalInDatabase}`}
                            size="small" variant="outlined"
                        />
                    )}
                    <ExportButton
                        onExportExcel={handleExportExcel}
                        count={operations?.length || 0}
                        disabled={isLoading}
                    />
                    <Tooltip title={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}>
                        <IconButton
                            onClick={() => setShowFilters(!showFilters)}
                            color={hasActiveFilters ? 'primary' : 'default'}
                            sx={{
                                bgcolor: hasActiveFilters ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                            }}
                        >
                            <Badge color="primary" variant="dot" invisible={!hasActiveFilters}>
                                <FilterList />
                            </Badge>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Atualizar dados">
                        <span>
                            <Fab color="primary" size="small" onClick={refresh} disabled={isLoading}>
                                {isLoading ? <CircularProgress size={22} color="inherit" /> : <RefreshIcon />}
                            </Fab>
                        </span>
                    </Tooltip>
                </Stack>
            }
        >
            {/* Filters - collapsible */}
            <Collapse in={showFilters}>
                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2, p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 2 }}>
                    {/* Período das execuções */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <DateRangeIcon fontSize="small" color="action" />
                        <TextField
                            label="De"
                            type="date"
                            size="small"
                            value={dateRange.fromDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 150 }}
                        />
                        <TextField
                            label="Até"
                            type="date"
                            size="small"
                            value={dateRange.toDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 150 }}
                        />
                    </Stack>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Semana</InputLabel>
                        <Select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} label="Semana">
                            <MenuItem value="all">Todas</MenuItem>
                            {availableWeeks.map(w => (
                                <MenuItem key={w} value={w}>{w}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Dia</InputLabel>
                        <Select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} label="Dia">
                            <MenuItem value="all">Todos</MenuItem>
                            {availableDays.map(d => (
                                <MenuItem key={d} value={d}>{d}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Operador</InputLabel>
                        <Select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} label="Operador">
                            <MenuItem value="all">Todos</MenuItem>
                            {(operatorStats || []).map(op => (
                                <MenuItem key={op.pk} value={String(op.pk)}>{op.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {hasActiveFilters && (
                        <Chip
                            label="Limpar"
                            onDelete={() => { setWeekFilter('all'); setDayFilter('all'); setOperatorFilter('all'); }}
                            size="small" variant="outlined" color="primary"
                        />
                    )}
                </Stack>
            </Collapse>

            {/* Loading */}
            {isLoading && (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            )}

            {/* Error */}
            {hasError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Erro ao carregar dados: {error?.message || 'Erro desconhecido'}
                </Alert>
            )}

            {/* Alerta de validações pendentes */}
            {!isLoading && !hasError && unvalidatedCount > 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => setActiveTab(1)}>
                            Ver Agora
                        </Button>
                    }
                >
                    <strong>{unvalidatedCount}</strong> execução{unvalidatedCount !== 1 ? 'ões' : ''} por validar.
                    Aceda ao separador <strong>Controlo de Tarefas</strong>.
                </Alert>
            )}

            {/* Tabs */}
            {!isLoading && !hasError && (
                <>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab icon={<DashboardIcon />} label="Dashboard" iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
                            <Tab
                                icon={
                                    <Badge badgeContent={unvalidatedCount || 0} color="error" max={99}>
                                        <AssignmentIcon />
                                    </Badge>
                                }
                                label="Controlo de Tarefas"
                                iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
                            />
                            <Tab icon={<PeopleIcon />} label="Equipa" iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
                            <Tab icon={<AnalyticsIcon />} label="Analytics" iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
                            <Tab icon={<FolderIcon />} label="Pedidos" iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    {activeTab === 0 && (
                        <SupervisorDashboard
                            analytics={analytics}
                            operatorStats={operatorStats}
                            weekDistribution={weekDistribution}
                            dayDistribution={dayDistribution}
                            filterInfo={filterInfo}
                        />
                    )}

                    {activeTab === 1 && (
                        <OperationTaskManager
                            operations={operations}
                            metaData={metaData}
                            onCreateTask={(data) => createTask.mutate(data)}
                            onCreateDirect={(data) => createDirect.mutateAsync(data)}
                            onUpdateMeta={(id, data) => updateMeta.mutate({ id, data })}
                            onDeleteMeta={(id) => deleteMeta.mutate(id)}
                            onValidate={handleValidate}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 2 && (
                        <OperatorMonitoring
                            operatorStats={operatorStats}
                            recentActivity={recentActivity}
                            onNavigateToControl={() => setActiveTab(1)}
                        />
                    )}

                    {activeTab === 3 && (
                        <AnalyticsPanel
                            analytics={analytics}
                            operatorStats={operatorStats}
                        />
                    )}

                    {activeTab === 4 && (
                        <PedidosPanel
                            pedidos={pedidos}
                            metaData={metaData}
                            isLoading={pedidosLoading}
                            error={pedidosError}
                        />
                    )}
                </>
            )}
        </ModulePage>
    );
};

export default SupervisorPage;
