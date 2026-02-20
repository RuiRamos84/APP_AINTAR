import React, { useState } from 'react';
import {
    Box, Typography, Tab, Tabs, Stack, Chip, Fab, IconButton, Tooltip,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
    alpha, useTheme, Collapse
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Assignment as AssignmentIcon,
    People as PeopleIcon,
    Analytics as AnalyticsIcon,
    Refresh as RefreshIcon,
    FilterList,
    KeyboardArrowDown
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

    const {
        analytics, recentActivity, operatorStats, operations,
        weekDistribution, dayDistribution, metaData,
        weekFilter, setWeekFilter, dayFilter, setDayFilter,
        availableWeeks, availableDays, filterInfo,
        isLoading, hasError, error, refresh,
        createMeta, updateMeta, deleteMeta, validateExecution
    } = useSupervisorData();

    const handleValidate = (formData) => {
        validateExecution.mutate(formData);
    };

    const handleExportExcel = () => {
        exportSupervisorDataToExcel(operations, operatorStats, {
            filename: 'Supervisao_Operacoes'
        });
    };

    const hasActiveFilters = weekFilter !== 'all' || dayFilter !== 'all';

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
                <Stack direction="row" spacing={2} sx={{ mb: 2, p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 2 }}>
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
                    {hasActiveFilters && (
                        <Chip
                            label="Limpar"
                            onDelete={() => { setWeekFilter('all'); setDayFilter('all'); }}
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

            {/* Tabs */}
            {!isLoading && !hasError && (
                <>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, val) => setActiveTab(val)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {TABS.map(tab => (
                                <Tab key={tab.id} icon={tab.icon} label={tab.label} iconPosition="start"
                                    sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
                            ))}
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
                            onCreateMeta={(data) => createMeta.mutate(data)}
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
                            onValidate={handleValidate}
                            metaData={metaData}
                        />
                    )}

                    {activeTab === 3 && (
                        <AnalyticsPanel
                            analytics={analytics}
                            operatorStats={operatorStats}
                        />
                    )}
                </>
            )}
        </ModulePage>
    );
};

export default SupervisorPage;
