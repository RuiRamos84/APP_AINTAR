import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Tabs, Tab, Button,
    Chip, IconButton, Tooltip, Drawer, TextField, Stack,
    MenuItem, FormControl, InputLabel, FormHelperText, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    Dashboard, People, Assignment, Analytics, Add,
    SwapHoriz, FilterList, Download, Refresh, Settings, Warning, History,
    Visibility, Close, FactCheck
} from '@mui/icons-material';

// Componentes específicos
import SupervisorDashboard from './SupervisorDashboard';
import OperationTaskManager from './OperationTaskManager';
import OperatorMonitoring from './OperatorMonitoring';
import AnalyticsPanel from './AnalyticsPanel';
import ProgressiveTaskFormV2 from '../forms/ProgressiveTaskFormV2';

// Componentes comuns
import LoadingContainer from '../common/LoadingContainer';
import ErrorContainer from '../common/ErrorContainer';
import AccessibleSelect from '../../../../components/common/AccessibleSelect';

// Hooks
import { useSupervisorData } from '../../hooks/useSupervisorData';
import { useUserRole } from '../../hooks/useUserRole';

// Contexts
import { useMetaData } from '../../../../contexts/MetaDataContext';

// Utils
import { normalizeText, textIncludes } from '../../utils/textUtils';
import operationsApi from '../../services/operationsApi';

/**
 * VIEW SUPERVISOR DESKTOP OTIMIZADA
 *
 * Características:
 * - Interface simplificada mas robusta
 * - Uso do hook unificado
 * - Estados centralizados
 * - Performance otimizada
 */
const SupervisorDesktopView = ({
    operationsData, // Mantido por compatibilidade
    user,
    onViewModeChange,
    allowViewSwitch,
    deviceInfo
}) => {
    // Helper para obter dia da semana em português
    const getCurrentDayOfWeek = () => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return days[new Date().getDay()];
    };

    // Helper para obter semana atual (W1, W2, W3, W4)
    const getCurrentWeek = () => {
        const today = new Date();
        const dayOfMonth = today.getDate();
        if (dayOfMonth <= 7) return 'W1';
        if (dayOfMonth <= 14) return 'W2';
        if (dayOfMonth <= 21) return 'W3';
        return 'W4';
    };

    // Estados locais - com valores padrão para dia atual
    const [activeTab, setActiveTab] = useState(0);
    const [createTaskOpen, setCreateTaskOpen] = useState(false);
    const [createOperationOpen, setCreateOperationOpen] = useState(false); // NOVO: Modal para criar operações
    const [editingTask, setEditingTask] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [weekFilter, setWeekFilter] = useState(getCurrentWeek()); // Semana atual
    const [dayFilter, setDayFilter] = useState(getCurrentDayOfWeek()); // Dia atual

    // Obter role do utilizador
    const { userRole } = useUserRole(user);

    // NOVO: Usar dados enriquecidos de supervisor com filtros
    const supervisorData = useSupervisorData({
        weekFilter,
        dayFilter,
        limit: 500 // Limite maior para voltas recorrentes
    });

    // Handlers usando supervisorData
    const handleCreateTask = () => {
        setEditingTask(null);
        setCreateTaskOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setCreateTaskOpen(true);
    };

    const handleDeleteTask = async (taskId) => {
        // OPERAÇÃO DESABILITADA POR SEGURANÇA
        alert('Para eliminar esta tarefa, contacte o administrador do sistema.');
    };

    const handleSaveTask = async (taskData) => {
        try {
            if (editingTask) {
                await supervisorData.updateMeta(editingTask.pk, taskData);
            } else {
                await supervisorData.createMeta(taskData);
            }
            setCreateTaskOpen(false);
        } catch (error) {
            console.error('Erro ao guardar tarefa:', error);
        }
    };

    // NOVO: Handler para criar operação (execução real)
    const handleCreateOperation = () => {
        setCreateOperationOpen(true);
    };

    const handleSaveOperation = async (operationData) => {
        try {
            await operationsApi.createOperacao(operationData);
            setCreateOperationOpen(false);
            // Refresh dos dados
            await supervisorData.refresh();
            alert('Operação criada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar operação:', error);
            alert(`Erro ao criar operação: ${error.response?.data?.error || error.message}`);
        }
    };

    const tabs = [
        { label: 'Dashboard', icon: <Dashboard />, count: supervisorData.analytics?.overview?.totalOperations },
        { label: 'Gestão de Tarefas', icon: <Assignment />, count: supervisorData.metas?.length },
        { label: 'Monitorização', icon: <People />, count: supervisorData.operatorStats?.length },
        { label: 'Histórico', icon: <History /> },
        { label: 'Analytics', icon: <Analytics /> }
    ];

    // Loading state específico para supervisor
    if (supervisorData.isLoading) {
        return (
            <LoadingContainer
                message="Carregando dados de supervisão..."
                variant="linear"
                showProgress={true}
                fullHeight={false}
                inline={true}
            />
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header simplificado */}
            <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h5" fontWeight="bold">
                                Supervisão - Operações
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                Olá, {user?.user_name || (userRole === 'supervisor' ? 'Supervisor' : userRole === 'manager' ? 'Gestor' : 'Operador')}
                            </Typography>
                        </Box>
                        <Box display="flex" gap={1} mt={1} alignItems="center" flexWrap="wrap">
                            {/* Filtros de Semana */}
                            <Chip
                                size="small"
                                label="Todas as Semanas"
                                color={weekFilter === 'all' ? 'primary' : 'default'}
                                onClick={() => setWeekFilter('all')}
                                sx={{ cursor: 'pointer' }}
                            />
                            {supervisorData.availableWeeks?.map(week => (
                                <Chip
                                    key={week}
                                    size="small"
                                    label={week}
                                    color={weekFilter === week ? 'primary' : 'default'}
                                    onClick={() => setWeekFilter(week)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}

                            {/* Separador */}
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                            {/* Filtros de Dia */}
                            <Chip
                                size="small"
                                label="Todos os Dias"
                                color={dayFilter === 'all' ? 'primary' : 'default'}
                                onClick={() => setDayFilter('all')}
                                sx={{ cursor: 'pointer' }}
                            />
                            {supervisorData.availableDays?.slice(0, 5).map(day => (
                                <Chip
                                    key={day}
                                    size="small"
                                    label={day}
                                    color={dayFilter === day ? 'primary' : 'default'}
                                    onClick={() => setDayFilter(day)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}

                            {/* Info */}
                            <Chip
                                size="small"
                                label={`${supervisorData.filterInfo?.showing || 0} de ${supervisorData.filterInfo?.totalInDatabase || 0} voltas`}
                                color="info"
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    <Box display="flex" gap={1} alignItems="center">
                        <Tooltip title="Configurações">
                            <IconButton onClick={() => setFiltersOpen(true)}>
                                <Settings />
                            </IconButton>
                        </Tooltip>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Download />}
                        >
                            Exportar
                        </Button>

                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<Add />}
                            onClick={handleCreateOperation}
                        >
                            Nova Operação
                        </Button>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Refresh />}
                            onClick={supervisorData.refresh}
                            disabled={supervisorData.isLoading}
                        >
                            Atualizar
                        </Button>

                        {allowViewSwitch && (
                            <Tooltip title="Mudar vista">
                                <IconButton onClick={() => onViewModeChange('unified-responsive')}>
                                    <SwapHoriz />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </Paper>

            {/* Tabs otimizados */}
            <Paper elevation={1} sx={{ mx: 1, mb: 1 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    variant="fullWidth"
                    indicatorColor="primary"
                >
                    {tabs.map((tab, index) => (
                        <Tab
                            key={index}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (
                                        <Chip
                                            size="small"
                                            label={tab.count}
                                            color="primary"
                                            sx={{ minWidth: 20, height: 20 }}
                                        />
                                    )}
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Paper>

            {/* Conteúdo principal com props unificadas */}
            <Box sx={{ flex: 1, mx: 1, mb: 1, overflow: 'auto' }}>
                {activeTab === 0 && (
                    <SupervisorDashboard
                        operationsData={supervisorData}
                        analytics={supervisorData.analytics}
                        recentActivity={supervisorData.recentActivity}
                        operatorStats={supervisorData.operatorStats}
                        onCreateTask={handleCreateTask}
                    />
                )}

                {activeTab === 1 && (
                    <OperationTaskManager
                        operationsData={supervisorData}
                        onCreateTask={handleCreateTask}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                    />
                )}

                {activeTab === 2 && (
                    <OperatorMonitoring
                        operationsData={supervisorData}
                        operatorStats={supervisorData.operatorStats}
                    />
                )}

                {activeTab === 3 && (
                    <HistoricoValidacoes supervisorData={supervisorData} />
                )}

                {activeTab === 4 && (
                    <AnalyticsPanel
                        operationsData={supervisorData}
                        analytics={supervisorData.analytics}
                    />
                )}
            </Box>

            {/* Drawer para tarefas simplificado */}
            <Drawer
                anchor="right"
                open={createTaskOpen}
                onClose={() => setCreateTaskOpen(false)}
                sx={{ '& .MuiDrawer-paper': { width: 400 } }}
            >
                <OperationTaskForm
                    task={editingTask}
                    operationsData={supervisorData}
                    onSave={handleSaveTask}
                    onCancel={() => setCreateTaskOpen(false)}
                />
            </Drawer>

            {/* Drawer para configurações */}
            <Drawer
                anchor="right"
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                sx={{ '& .MuiDrawer-paper': { width: 320 } }}
            >
                <SupervisorSettings
                    operationsData={supervisorData}
                    onClose={() => setFiltersOpen(false)}
                />
            </Drawer>

            {/* NOVO: Dialog para criar Operação (execução real) */}
            <Dialog
                open={createOperationOpen}
                onClose={() => setCreateOperationOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Criar Nova Operação
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Registe uma execução pontual de operação com data específica
                    </Typography>
                    <ProgressiveTaskFormV2
                        onSubmit={handleSaveOperation}
                        onCancel={() => setCreateOperationOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

// Formulário de Operação com UX Senior - Progressive Disclosure
const OperationTaskForm = ({ task, operationsData, onSave, onCancel }) => {
    const { metaData, loading: metaDataLoading } = useMetaData();

    // Estados do formulário com smart defaults
    const [formData, setFormData] = useState({
        tb_instalacao: task?.tb_instalacao || '',
        tt_operacaoaccao: task?.tt_operacaoaccao || '',
        tt_operacaomodo: task?.tt_operacaomodo || 1, // Default: modo mais comum
        tt_operacaodia: task?.tt_operacaodia || 1,   // Default: hoje/diário
        ts_operador1: task?.ts_operador1 || '',
        ts_operador2: task?.ts_operador2 || ''
    });

    // Estados de UI/UX
    const [currentStep, setCurrentStep] = useState(1); // Progressive disclosure
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState(''); // Pesquisa aninhada (opcional)
    const [selectedAssociate, setSelectedAssociate] = useState('all'); // Filtro por associado
    const [selectedType, setSelectedType] = useState('all'); // Filtro por tipo (ETAR/EE)
    const [showAdvanced, setShowAdvanced] = useState(false); // Para opções avançadas

    // Preparar dados otimizados - UX Senior: dados normalized e indexed
    // IMPORTANTE: Declarar antes do useEffect para evitar hoisting issues
    const installations = useMemo(() => {
        if (!metaData || !metaData.etar || !metaData.ee) return [];

        const combined = [
            ...(metaData.etar || []).map(item => ({
                id: item.pk,
                name: item.nome,
                type: 'ETAR',
                entity: item.ts_entity || 'Não Atribuído',
                // Normalizar texto para pesquisa sem acentos
                searchText: normalizeText(`${item.nome} ETAR ${item.ts_entity || ''}`),
                originalText: `${item.nome} ETAR ${item.ts_entity || ''}`,
                priority: item.ts_entity === 'Tondela' ? 1 : 2 // Tondela primeiro
            })),
            ...(metaData.ee || []).map(item => ({
                id: item.pk,
                name: item.nome,
                type: 'EE',
                entity: item.ts_entity || 'Não Atribuído',
                // Normalizar texto para pesquisa sem acentos
                searchText: normalizeText(`${item.nome} EE ${item.ts_entity || ''}`),
                originalText: `${item.nome} EE ${item.ts_entity || ''}`,
                priority: item.ts_entity === 'Tondela' ? 1 : 2
            }))
        ];

        return combined.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.name.localeCompare(b.name);
        });
    }, [metaData]);

    // Atualizar formulário quando task mudar (para edição)
    useEffect(() => {
        if (task) {

            // IMPORTANTE: O backend retorna tanto IDs quanto nomes:
            // - Campo sem sufixo (ex: tb_instalacao) = ID numérico
            // - Campo com _nome (ex: tb_instalacao_nome) = nome legível
            // Para edição, usamos os IDs numéricos diretamente

            const preloadedData = {
                tb_instalacao: task.tb_instalacao || '',
                tt_operacaoaccao: task.tt_operacaoaccao || '',
                tt_operacaomodo: task.tt_operacaomodo || 1,
                tt_operacaodia: task.tt_operacaodia || 1,
                ts_operador1: task.ts_operador1 || '',
                ts_operador2: task.ts_operador2 || ''
            };

            setFormData(preloadedData);

            // Para tarefas existentes, mostrar todos os passos
            setCurrentStep(3);
            // Se tem operador secundário, mostrar opções avançadas
            setShowAdvanced(!!task.ts_operador2);

            // Limpar erros
            setErrors({});
        } else {
            // Nova tarefa - reset
            setFormData({
                tb_instalacao: '',
                tt_operacaoaccao: '',
                tt_operacaomodo: 1,
                tt_operacaodia: 1,
                ts_operador1: '',
                ts_operador2: ''
            });
            setCurrentStep(1);
            setShowAdvanced(false);
            setSearchTerm('');
            setSelectedAssociate('all');
            setSelectedType('all');
        }
    }, [task]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.tt_operacaomodo) {
            newErrors.tt_operacaomodo = 'Modo de operação é obrigatório';
        }
        if (!formData.tb_instalacao) {
            newErrors.tb_instalacao = 'Instalação é obrigatória';
        }
        if (!formData.tt_operacaodia) {
            newErrors.tt_operacaodia = 'Dia de operação é obrigatório';
        }
        if (!formData.tt_operacaoaccao) {
            newErrors.tt_operacaoaccao = 'Ação é obrigatória';
        }
        if (!formData.ts_operador1) {
            newErrors.ts_operador1 = 'Operador principal é obrigatório';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Preparar dados garantindo que valores vazios sejam null
        const cleanData = {
            ...formData,
            tt_operacaomodo: parseInt(formData.tt_operacaomodo, 10),
            tb_instalacao: parseInt(formData.tb_instalacao, 10),
            tt_operacaodia: parseInt(formData.tt_operacaodia, 10),
            tt_operacaoaccao: parseInt(formData.tt_operacaoaccao, 10),
            ts_operador1: parseInt(formData.ts_operador1, 10),
            ts_operador2: formData.ts_operador2 ? parseInt(formData.ts_operador2, 10) : null
        };

        // Validar duplicatas (constraint UNIQUE)
        const isDuplicate = (operationsData?.metas || []).some(meta =>
            meta.pk !== task?.pk && // Ignorar a própria tarefa em edição
            meta.tt_operacaomodo === cleanData.tt_operacaomodo &&
            meta.tb_instalacao === cleanData.tb_instalacao &&
            meta.tt_operacaodia === cleanData.tt_operacaodia &&
            meta.tt_operacaoaccao === cleanData.tt_operacaoaccao
        );

        if (isDuplicate) {
            setErrors({
                ...errors,
                tt_operacaodia: 'Já existe uma tarefa com esta combinação de Modo/Instalação/Dia/Ação'
            });
            return;
        }

        setSaving(true);
        try {
            await onSave(cleanData);
        } finally {
            setSaving(false);
        }
    };

    // Extrair lista única de associados
    const associates = useMemo(() => {
        const uniqueAssociates = [...new Set(
            installations.map(inst => inst.entity).filter(Boolean)
        )].sort();
        return ['all', ...uniqueAssociates];
    }, [installations]);

    // Filtros inteligentes em cascata: Associado -> Tipo -> Instalação -> Pesquisa
    const filteredInstallations = useMemo(() => {
        let filtered = installations;

        // 1. Filtrar por Associado (se selecionado)
        if (selectedAssociate && selectedAssociate !== 'all') {
            filtered = filtered.filter(inst => inst.entity === selectedAssociate);
        }

        // 2. Filtrar por Tipo (ETAR/EE) (se selecionado)
        if (selectedType && selectedType !== 'all') {
            filtered = filtered.filter(inst => inst.type === selectedType);
        }

        // 3. Filtrar por Pesquisa de Texto (opcional/aninhado)
        if (searchTerm.trim()) {
            const normalizedSearch = normalizeText(searchTerm);
            filtered = filtered.filter(inst =>
                inst.searchText.includes(normalizedSearch)
            );
        }

        return filtered;
    }, [installations, selectedAssociate, selectedType, searchTerm]);

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user selects
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    if (metaDataLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" mb={3}>Carregando dados...</Typography>
                <LoadingContainer />
            </Box>
        );
    }

    if (!metaData) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" mb={3}>Erro ao carregar dados</Typography>
                <Button onClick={onCancel}>Fechar</Button>
            </Box>
        );
    }

    // Validação contextual inteligente
    const getFieldStatus = (field) => {
        if (errors[field]) return 'error';
        if (formData[field]) return 'success';
        return 'default';
    };

    return (
        <Box sx={{ p: 3, maxWidth: 600 }}>
            <Typography variant="h5" mb={1} color="primary">
                {task ? `✏️ Editar Tarefa #${task.pk}` : '➕ Nova Tarefa de Operação'}
            </Typography>

            <Typography variant="body2" color="text.secondary" mb={3}>
                {task
                    ? `Modifique os dados da tarefa existente - todos os campos estão pré-carregados`
                    : 'Preencha os dados essenciais para criar a tarefa'
                }
            </Typography>

            {/* Progress Indicator - UX Senior */}
            <Box mb={3}>
                <Box display="flex" gap={1}>
                    {[1, 2, 3].map(step => (
                        <Box
                            key={step}
                            sx={{
                                width: '33%',
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: step <= currentStep ? 'primary.main' : 'grey.300'
                            }}
                        />
                    ))}
                </Box>
                <Typography variant="caption" color="text.secondary" mt={1}>
                    Passo {currentStep} de 3
                </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                    {/* PASSO 1: ONDE - Instalação (mais importante) */}
                    {currentStep >= 1 && (
                        <Box>
                            <Typography variant="h6" color="primary" mb={2}>
                                🏭 Onde? - Selecione a Instalação
                            </Typography>

                            {/* Filtros em linha */}
                            <Stack direction="row" spacing={2} mb={2}>
                                {/* 1. Filtro por Associado */}
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Associado</InputLabel>
                                    <AccessibleSelect
                                        value={selectedAssociate}
                                        onChange={(e) => setSelectedAssociate(e.target.value)}
                                        label="Associado"
                                    >
                                        <MenuItem value="all">
                                            <em>Todos os Associados</em>
                                        </MenuItem>
                                        {associates.filter(a => a !== 'all').map(associate => (
                                            <MenuItem key={associate} value={associate}>
                                                {associate}
                                            </MenuItem>
                                        ))}
                                    </AccessibleSelect>
                                </FormControl>

                                {/* 2. Filtro por Tipo */}
                                <FormControl sx={{ minWidth: 150 }}>
                                    <InputLabel>Tipo</InputLabel>
                                    <AccessibleSelect
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        label="Tipo"
                                    >
                                        <MenuItem value="all">
                                            <em>ETAR + EE</em>
                                        </MenuItem>
                                        <MenuItem value="ETAR">
                                            <Chip size="small" label="ETAR" color="primary" />
                                        </MenuItem>
                                        <MenuItem value="EE">
                                            <Chip size="small" label="EE" color="secondary" />
                                        </MenuItem>
                                    </AccessibleSelect>
                                </FormControl>
                            </Stack>

                            {/* 3. Pesquisa Aninhada (Opcional) */}
                            <TextField
                                label="🔍 Pesquisar por nome (opcional)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Ex: Tábua, São João..."
                                fullWidth
                                helperText={
                                    `${filteredInstallations.length} instalação(ões) disponível(eis)${
                                        selectedAssociate !== 'all' || selectedType !== 'all' || searchTerm
                                            ? ' (filtrado)'
                                            : ''
                                    }`
                                }
                                variant="outlined"
                                sx={{ mb: 2 }}
                            />

                            {/* Select de Instalação */}
                            <FormControl fullWidth required error={!!errors.tb_instalacao}>
                                <InputLabel>Instalação *</InputLabel>
                                <AccessibleSelect
                                    value={formData.tb_instalacao}
                                    onChange={(e) => {
                                        handleFieldChange('tb_instalacao', e.target.value);
                                        if (e.target.value && currentStep === 1) {
                                            setCurrentStep(2); // Auto-advance
                                        }
                                    }}
                                    label="Instalação *"
                                    MenuProps={{
                                        PaperProps: { style: { maxHeight: 300 } },
                                    }}
                                >
                                    {filteredInstallations.length === 0 ? (
                                        <MenuItem disabled>
                                            <Typography variant="body2" color="text.secondary">
                                                Nenhuma instalação encontrada com os filtros atuais
                                            </Typography>
                                        </MenuItem>
                                    ) : (
                                        filteredInstallations.map((inst) => (
                                            <MenuItem key={inst.id} value={inst.id}>
                                                <Box display="flex" alignItems="center" gap={1} width="100%">
                                                    <Chip
                                                        size="small"
                                                        label={inst.type}
                                                        color={inst.type === 'ETAR' ? 'primary' : 'secondary'}
                                                        sx={{ minWidth: 50 }}
                                                    />
                                                    <Box flex={1}>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {inst.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {inst.entity}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="primary">
                                                        #{inst.id}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))
                                    )}
                                </AccessibleSelect>
                                <FormHelperText>
                                    {errors.tb_instalacao || 'Selecione a instalação onde será realizada a operação'}
                                </FormHelperText>
                            </FormControl>
                        </Box>
                    )}

                    {/* PASSO 2: O QUE - Ação */}
                    {currentStep >= 2 && formData.tb_instalacao && (
                        <Box>
                            <Typography variant="h6" color="primary" mb={2}>
                                ⚙️ O que? - Tipo de Operação
                            </Typography>

                            <FormControl fullWidth required error={!!errors.tt_operacaoaccao}>
                                <InputLabel>Ação</InputLabel>
                                <AccessibleSelect
                                    value={formData.tt_operacaoaccao}
                                    onChange={(e) => {
                                        handleFieldChange('tt_operacaoaccao', e.target.value);
                                        if (e.target.value && currentStep === 2) {
                                            setCurrentStep(3); // Auto-advance
                                        }
                                    }}
                                    label="Ação"
                                >
                                    {(metaData.operacaoaccao || []).map((accao) => (
                                        <MenuItem key={accao.pk} value={accao.pk}>
                                            <Typography>{accao.name || accao.value}</Typography>
                                        </MenuItem>
                                    ))}
                                </AccessibleSelect>
                                <FormHelperText>
                                    {errors.tt_operacaoaccao || 'Que tipo de operação será executada?'}
                                </FormHelperText>
                            </FormControl>
                        </Box>
                    )}

                    {/* PASSO 3: QUEM - Operador */}
                    {currentStep >= 3 && formData.tt_operacaoaccao && (
                        <Box>
                            <Typography variant="h6" color="primary" mb={2}>
                                👤 Quem? - Responsável pela Execução
                            </Typography>

                            <FormControl fullWidth required error={!!errors.ts_operador1}>
                                <InputLabel>Operador Principal</InputLabel>
                                <AccessibleSelect
                                    value={formData.ts_operador1}
                                    onChange={(e) => handleFieldChange('ts_operador1', e.target.value)}
                                    label="Operador Principal"
                                >
                                    {(metaData.who || []).map((operator) => (
                                        <MenuItem key={operator.pk} value={operator.pk}>
                                            {operator.name || operator.value}
                                        </MenuItem>
                                    ))}
                                </AccessibleSelect>
                                <FormHelperText>
                                    {errors.ts_operador1 || 'Quem será o responsável principal?'}
                                </FormHelperText>
                            </FormControl>

                            {/* Opções Avançadas - Colapsáveis */}
                            <Button
                                variant="text"
                                size="small"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                sx={{ mt: 2 }}
                            >
                                {showAdvanced ? '▼' : '▶'} Opções Avançadas
                            </Button>

                            {showAdvanced && (
                                <Stack spacing={2} mt={2}>
                                    <FormControl fullWidth>
                                        <InputLabel>Operador Secundário (Opcional)</InputLabel>
                                        <AccessibleSelect
                                            value={formData.ts_operador2}
                                            onChange={(e) => handleFieldChange('ts_operador2', e.target.value)}
                                            label="Operador Secundário (Opcional)"
                                        >
                                            <MenuItem value="">Nenhum</MenuItem>
                                            {(metaData.who || [])
                                                .filter(op => op.pk !== parseInt(formData.ts_operador1))
                                                .map((operator) => (
                                                    <MenuItem key={operator.pk} value={operator.pk}>
                                                        {operator.name || operator.value}
                                                    </MenuItem>
                                                ))}
                                        </AccessibleSelect>
                                    </FormControl>

                                    <FormControl fullWidth>
                                        <InputLabel>Modo</InputLabel>
                                        <AccessibleSelect
                                            value={formData.tt_operacaomodo}
                                            onChange={(e) => handleFieldChange('tt_operacaomodo', e.target.value)}
                                            label="Modo"
                                        >
                                            {(metaData.operacamodo || []).map((modo) => (
                                                <MenuItem key={modo.pk} value={modo.pk}>
                                                    {modo.value}
                                                </MenuItem>
                                            ))}
                                        </AccessibleSelect>
                                    </FormControl>

                                    <FormControl fullWidth>
                                        <InputLabel>Frequência</InputLabel>
                                        <AccessibleSelect
                                            value={formData.tt_operacaodia}
                                            onChange={(e) => handleFieldChange('tt_operacaodia', e.target.value)}
                                            label="Frequência"
                                        >
                                            {(metaData.operacaodia || []).map((dia) => (
                                                <MenuItem key={dia.pk} value={dia.pk}>
                                                    {dia.value}
                                                </MenuItem>
                                            ))}
                                        </AccessibleSelect>
                                    </FormControl>
                                </Stack>
                            )}
                        </Box>
                    )}

                    {/* Navigation & Actions */}
                    <Box display="flex" gap={2} mt={4} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        {currentStep > 1 && (
                            <Button
                                variant="outlined"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                disabled={saving}
                            >
                                ← Anterior
                            </Button>
                        )}

                        <Button
                            variant="outlined"
                            onClick={onCancel}
                            disabled={saving}
                            sx={{ ml: 'auto' }}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving || currentStep < 3 || !formData.tb_instalacao || !formData.tt_operacaoaccao || !formData.ts_operador1}
                            startIcon={saving ? null : (task ? '💾' : '✅')}
                        >
                            {saving ? 'Salvando...' : (task ? 'Atualizar' : 'Criar Tarefa')}
                        </Button>
                    </Box>
                </Stack>
            </form>
        </Box>
    );
};

// Componente para configurações do supervisor
const SupervisorSettings = ({ operationsData, onClose }) => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" mb={3}>
                Configurações de Supervisão
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
                <Typography variant="body2" color="text.secondary">
                    Configurações e filtros avançados serão implementados aqui.
                </Typography>

                <Button
                    variant="outlined"
                    onClick={operationsData.refresh}
                    startIcon={<Refresh />}
                    fullWidth
                >
                    Atualizar Todos os Dados
                </Button>

                <Button
                    variant="outlined"
                    onClick={onClose}
                    fullWidth
                >
                    Fechar
                </Button>
            </Box>
        </Box>
    );
};
const HistoricoValidacoes = ({ supervisorData }) => {
    const { metaData } = useMetaData();
    const [execucoes, setExecucoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState({
        dataInicio: '',
        dataFim: '',
        instalacao: 'all',
        statusValidacao: 'all'
    });
    const [selectedExecution, setSelectedExecution] = useState(null);
    const [validationDialogOpen, setValidationDialogOpen] = useState(false);
    const [validationData, setValidationData] = useState({ control_check: 1, control_memo: '' });
    const [validating, setValidating] = useState(false);

    const buscarHistorico = async () => {
        setLoading(true);
        try {
            // Se tem filtros de data, buscar via API para cada instalação
            if (filtros.dataInicio || filtros.dataFim) {
                // Calcular last_days baseado nas datas
                let lastDays = 30; // default
                if (filtros.dataInicio) {
                    const diff = Math.ceil((new Date() - new Date(filtros.dataInicio)) / (1000 * 60 * 60 * 24));
                    lastDays = Math.max(diff, 1);
                }

                const operationsApi = (await import('../../services/operationsApi')).default;

                // Se tem instalação específica, buscar só dela
                if (filtros.instalacao !== 'all') {
                    const response = await operationsApi.queryOperationControl({
                        tb_instalacao: parseInt(filtros.instalacao),
                        last_days: lastDays
                    });

                    let filtered = response.data?.data || [];

                    // Aplicar filtros de data
                    if (filtros.dataInicio) {
                        filtered = filtered.filter(e => new Date(e.data) >= new Date(filtros.dataInicio));
                    }
                    if (filtros.dataFim) {
                        filtered = filtered.filter(e => new Date(e.data) <= new Date(filtros.dataFim));
                    }

                    // Filtrar por status de validação
                    if (filtros.statusValidacao !== 'all') {
                        if (filtros.statusValidacao === 'validado') {
                            filtered = filtered.filter(e => e.control_check === 1);
                        } else if (filtros.statusValidacao === 'rejeitado') {
                            filtered = filtered.filter(e => e.control_check === 0);
                        } else if (filtros.statusValidacao === 'pendente') {
                            filtered = filtered.filter(e => e.control_check === null || e.control_check === undefined);
                        }
                    }

                    setExecucoes(filtered);
                } else {
                    // Buscar de todas as instalações não é suportado (evita rate limiting)
                    alert('Para buscar histórico de TODAS as instalações, por favor selecione uma instalação específica ou use os dados de hoje disponíveis.');
                    setExecucoes(supervisorData?.executedOperations || []);
                    return;
                }
            } else if (filtros.instalacao !== 'all') {
                // Tem instalação mas sem filtro de data - buscar últimos 7 dias
                const operationsApi = (await import('../../services/operationsApi')).default;
                const response = await operationsApi.queryOperationControl({
                    tb_instalacao: parseInt(filtros.instalacao),
                    last_days: 7
                });

                let filtered = response.data?.data || [];

                if (filtros.statusValidacao !== 'all') {
                    if (filtros.statusValidacao === 'validado') {
                        filtered = filtered.filter(e => e.control_check === 1);
                    } else if (filtros.statusValidacao === 'rejeitado') {
                        filtered = filtered.filter(e => e.control_check === 0);
                    } else if (filtros.statusValidacao === 'pendente') {
                        filtered = filtered.filter(e => e.control_check === null || e.control_check === undefined);
                    }
                }

                setExecucoes(filtered);
            } else {
                // Sem filtros, mostrar execuções de hoje do cache
                let filtered = supervisorData?.executedOperations || [];

                if (filtros.statusValidacao !== 'all') {
                    if (filtros.statusValidacao === 'validado') {
                        filtered = filtered.filter(e => e.control_check === 1);
                    } else if (filtros.statusValidacao === 'rejeitado') {
                        filtered = filtered.filter(e => e.control_check === 0);
                    } else if (filtros.statusValidacao === 'pendente') {
                        filtered = filtered.filter(e => e.control_check === null || e.control_check === undefined);
                    }
                }

                setExecucoes(filtered);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            setExecucoes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleValidateClick = (execution) => {
        setSelectedExecution(execution);
        setValidationData({
            control_check: execution.control_check ?? 1,
            control_memo: execution.control_memo || ''
        });
        setValidationDialogOpen(true);
    };

    const handleValidationSubmit = async () => {
        if (!selectedExecution) return;

        setValidating(true);
        try {
            const operationsApi = (await import('../../services/operationsApi')).default;
            await operationsApi.updateOperationControl({
                pk: selectedExecution.pk,
                control_check: validationData.control_check,
                control_memo: validationData.control_memo
            });

            setValidationDialogOpen(false);
            buscarHistorico();
        } catch (error) {
            console.error('Erro ao validar:', error);
            alert('Erro ao validar execução');
        } finally {
            setValidating(false);
        }
    };

    useEffect(() => {
        // Carregar execuções de hoje na inicialização
        if (supervisorData?.executedOperations) {
            setExecucoes(supervisorData.executedOperations);
        }
    }, []);

    const instalacoes = useMemo(() => {
        const all = [...(metaData?.etar || []), ...(metaData?.ee || [])];
        return all.map(i => ({ pk: i.pk, nome: i.nome, tipo: i.tipo }));
    }, [metaData]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Histórico de Validações
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Apenas tarefas concluídas pelos operadores são apresentadas para validação.
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <TextField
                            type="date"
                            label="Data Início"
                            value={filtros.dataInicio}
                            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="date"
                            label="Data Fim"
                            value={filtros.dataFim}
                            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Instalação</InputLabel>
                            <AccessibleSelect
                                value={filtros.instalacao}
                                onChange={(e) => setFiltros({ ...filtros, instalacao: e.target.value })}
                                label="Instalação"
                            >
                                <MenuItem value="all">Todas</MenuItem>
                                {instalacoes.map(i => (
                                    <MenuItem key={i.pk} value={i.pk}>
                                        {i.nome} ({i.tipo === 1 ? 'ETAR' : 'EE'})
                                    </MenuItem>
                                ))}
                            </AccessibleSelect>
                        </FormControl>
                        <FormControl sx={{ minWidth: 180 }}>
                            <InputLabel>Estado Validação</InputLabel>
                            <AccessibleSelect
                                value={filtros.statusValidacao}
                                onChange={(e) => setFiltros({ ...filtros, statusValidacao: e.target.value })}
                                label="Estado Validação"
                            >
                                <MenuItem value="all">Todos</MenuItem>
                                <MenuItem value="validado">✅ Validado</MenuItem>
                                <MenuItem value="rejeitado">❌ Rejeitado</MenuItem>
                                <MenuItem value="pendente">⏳ Pendente</MenuItem>
                            </AccessibleSelect>
                        </FormControl>
                        <Button
                            variant="contained"
                            onClick={buscarHistorico}
                            startIcon={<FilterList />}
                        >
                            Filtrar
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {loading ? (
                <LoadingContainer message="Carregando histórico..." />
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                        {execucoes.length} execuções encontradas
                    </Typography>

                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Instalação</TableCell>
                                    <TableCell>Ação</TableCell>
                                    <TableCell>Operador</TableCell>
                                    <TableCell>Validação</TableCell>
                                    <TableCell align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {execucoes.map((exec) => (
                                    <TableRow key={exec.pk}>
                                        <TableCell>
                                            {new Date(exec.data).toLocaleDateString('pt-PT')}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={exec.tb_instalacao_nome || exec.tb_instalacao}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{exec.tt_operacaoaccao_nome || exec.tt_operacaoaccao}</TableCell>
                                        <TableCell>{exec.ts_operador1_nome || exec.ts_operador1}</TableCell>
                                        <TableCell>
                                            {exec.control_check === 1 ? (
                                                <Chip label="✅ Validado" color="success" size="small" />
                                            ) : exec.control_check === 0 ? (
                                                <Chip label="❌ Rejeitado" color="error" size="small" />
                                            ) : (
                                                <Chip label="⏳ Pendente" color="warning" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleValidateClick(exec)}
                                                title="Validar/Ver Detalhes"
                                            >
                                                {exec.control_check != null ? <Visibility /> : <Add />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">Validar Execução</Typography>
                        <IconButton onClick={() => setValidationDialogOpen(false)} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedExecution && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Data:</strong> {new Date(selectedExecution.data).toLocaleString('pt-PT')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Instalação:</strong> {selectedExecution.tb_instalacao_nome || selectedExecution.tb_instalacao}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Ação:</strong> {selectedExecution.tt_operacaoaccao_nome || selectedExecution.tt_operacaoaccao}
                            </Typography>

                            <FormControl fullWidth sx={{ mt: 3 }}>
                                <InputLabel>Estado</InputLabel>
                                <AccessibleSelect
                                    value={validationData.control_check}
                                    onChange={(e) => setValidationData({ ...validationData, control_check: e.target.value })}
                                    label="Estado"
                                >
                                    <MenuItem value={1}>✅ Validado / Correto</MenuItem>
                                    <MenuItem value={0}>❌ Requer Correção</MenuItem>
                                </AccessibleSelect>
                            </FormControl>

                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Observações"
                                value={validationData.control_memo}
                                onChange={(e) => setValidationData({ ...validationData, control_memo: e.target.value })}
                                sx={{ mt: 2 }}
                                placeholder="Adicione observações sobre a validação..."
                            />

                            {selectedExecution.control_foto && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Anexos Existentes
                                    </Typography>
                                    {selectedExecution.control_foto.split(',').map((f, i) => (
                                        <Chip key={i} label={f} size="small" sx={{ mr: 1 }} />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidationDialogOpen(false)} disabled={validating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleValidationSubmit}
                        variant="contained"
                        disabled={validating}
                    >
                        {validating ? 'Guardando...' : 'Guardar Validação'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SupervisorDesktopView;