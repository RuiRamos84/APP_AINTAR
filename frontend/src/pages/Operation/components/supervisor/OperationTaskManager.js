// components/supervisor/OperationTaskManager.js
import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell, CircularProgress, TextField,
    TableContainer, TableHead, TableRow, IconButton, Chip, Button,
    Paper, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    Divider, Stack, DialogContentText, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import {
    Edit, Delete, Add, Visibility, Close, Warning, CheckCircle, HourglassEmpty, AttachFile
} from '@mui/icons-material';
import operationsApi from '../../services/operationsApi';
import { useMetaData } from '../../../../contexts/MetaDataContext';

const OperationTaskManager = ({ operationsData, onCreateTask, onEditTask, onDeleteTask }) => {
    // Usar dados correlacionados (metas + execuções) com fallbacks seguros e forçar recarregamento
    const tasks = operationsData?.operations || operationsData?.metas || [];
    const loading = operationsData?.isLoading || false;

    // Buscar metadados para opções de classificação de controlo
    const { metaData } = useMetaData();
    const opcontroloOptions = metaData?.opcontrolo || [];

    // Estados para modais
    const [selectedTask, setSelectedTask] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationDetails, setValidationDetails] = useState(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [previewImageTitle, setPreviewImageTitle] = useState('');
    const [validationStatus, setValidationStatus] = useState('1'); // '1' para Validado, '0' para Rejeitado
    const [validationComment, setValidationComment] = useState('');
    const [validationPhoto, setValidationPhoto] = useState(null);
    const [validationPhotoName, setValidationPhotoName] = useState('');
    const [validationPreviewUrl, setValidationPreviewUrl] = useState('');
    const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    // Nota: vbl_operacaometa já retorna todos os campos como texto (nomes), não IDs
    // Campos como tb_instalacao, tt_operacaoaccao, tt_operacaomodo, ts_operador1, etc.
    // vêm diretamente com os valores legíveis do backend

    // Funções para ações
    const handleViewDetails = (task) => {
        console.log('🔍🔍🔍 TODOS OS DADOS DA TAREFA SELECIONADA:', task);
        console.log('📊 Campos disponíveis:', Object.keys(task));
        console.log('🏭 Instalação:', {
            tb_instalacao: task.tb_instalacao,
            tb_instalacao_nome: task.tb_instalacao_nome,
            pk_instalacao: task.pk_instalacao,
            tt_instalacaolicenciamento: task.tt_instalacaolicenciamento
        });
        console.log('⚙️ Operação:', {
            tt_operacaoaccao: task.tt_operacaoaccao,
            tt_operacaoaccao_nome: task.tt_operacaoaccao_nome,
            tt_operacaomodo: task.tt_operacaomodo,
            tt_operacaomodo_nome: task.tt_operacaomodo_nome,
            tt_operacaodia: task.tt_operacaodia,
            tt_operacaodia_nome: task.tt_operacaodia_nome,
            descr: task.descr
        });
        console.log('👥 Operadores:', {
            ts_operador1: task.ts_operador1,
            ts_operador1_nome: task.ts_operador1_nome,
            ts_operador2: task.ts_operador2,
            ts_operador2_nome: task.ts_operador2_nome
        });
        console.log('✅ Execuções:', {
            hasExecutions: task.hasExecutions,
            executionCount: task.executionCount,
            executions: task.executions
        });
        if (task.executions && task.executions.length > 0) {
            console.log('📋 Primeira execução detalhada:', task.executions[0]);
            console.log('📋 Campos da execução:', Object.keys(task.executions[0]));
        }
        setSelectedTask(task);
        setShowDetailsModal(true);
    };

    const handleEditTask = (task) => {
        setShowDetailsModal(false);
        onEditTask(task);
    };

    const handleDeleteClick = (task) => {
        console.log('🗑️ Delete clicked for task:', task);
        setTaskToDelete(task);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        console.log('✅ Confirming delete for task:', taskToDelete);
        if (taskToDelete) {
            await onDeleteTask(taskToDelete.pk);
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
        }
    };

    const handleOpenValidationModal = async (execution) => {
        setValidationDetails(execution);
        setValidationPreviewUrl(''); // Limpa a preview anterior

        // Preenche o modal com dados existentes, se houver
        // Nova lógica: control_tt_operacaocontrolo !== null = Validado
        if (execution.control_tt_operacaocontrolo !== null) {
            setValidationStatus(String(execution.control_tt_operacaocontrolo));
            setValidationComment(execution.control_memo || '');
            setValidationPhotoName(execution.control_foto || '');

            // Se houver foto, carrega para pré-visualização
            if (execution.control_foto) {
                try {
                    const response = await operationsApi.downloadOperationPhoto(execution.control_foto);
                    const blob = new Blob([response.data], { type: response.headers['content-type'] });
                    const url = window.URL.createObjectURL(blob);
                    setValidationPreviewUrl(url);
                } catch (error) {
                    console.error("Erro ao carregar foto de validação para preview:", error);
                }
            }
        } else {
            // Reseta para uma nova validação (control_tt_operacaocontrolo IS NULL = Aguarda Validação)
            setValidationStatus('1');
            setValidationComment('');
            setValidationPhoto(null);
            setValidationPhotoName('');
        }
        setShowValidationModal(true);
    };

    const handleCloseValidationModal = () => {
        setShowValidationModal(false);
        // Limpa o estado para não interferir com a próxima abertura
        setValidationDetails(null);
        setValidationComment('');
        setValidationPhoto(null);
        setValidationPhotoName('');
        // Limpa o URL do blob para libertar memória
        if (validationPreviewUrl) {
            URL.revokeObjectURL(validationPreviewUrl);
            setValidationPreviewUrl('');
        }
    };

    const handleSubmitValidation = async () => {
        if (!validationDetails) return;
        setIsSubmittingValidation(true);
        try {
            await operationsApi.submitTaskValidation(validationDetails.pk, {
                control_tt_operacaocontrolo: parseInt(validationStatus, 10),
                control_memo: validationComment,
                control_foto: validationPhoto,
            });
            handleCloseValidationModal();
        } catch (error) {
            console.error("Erro ao submeter validação:", error);
            alert("Ocorreu um erro ao submeter a validação. Tente novamente.");
        } finally {
            setIsSubmittingValidation(false);
        }
    };

    const handleOpenPreview = async (photoPath) => {
        setPreviewImageTitle(photoPath.split(/[/\\]/).pop());
        setPreviewModalOpen(true);
        setImageLoading(true);
        setPreviewImageUrl(''); // Limpa a imagem anterior

        try {
            console.log('🔗 Abrindo foto:', photoPath);
            const response = await operationsApi.downloadOperationPhoto(photoPath);
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            setPreviewImageUrl(url);
        } catch (error) {
            console.error('Erro ao carregar foto para preview:', error);
            alert('Erro ao carregar a foto. Verifique os logs.');
            setPreviewModalOpen(false);
        } finally {
            setImageLoading(false);
        }
    };

    const handleClosePreview = () => {
        // Remove o foco de qualquer elemento ativo (como o botão "Fechar") antes de fechar o modal.
        // Isto evita o aviso de acessibilidade "Blocked aria-hidden on an element because its descendant retained focus".
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setPreviewModalOpen(false);
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6">Carregando tarefas...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Gestão de Tarefas de Operação
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onCreateTask}
                >
                    Nova Tarefa
                </Button>
            </Box>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Tarefas Definidas ({tasks.length})
                    </Typography>

                    {tasks.length > 0 ? (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Validação</TableCell>
                                        <TableCell>Instalação</TableCell>
                                        <TableCell>Ação</TableCell>
                                        <TableCell>Modo</TableCell>
                                        <TableCell>Dia</TableCell>
                                        <TableCell>Operador Principal</TableCell>
                                        <TableCell>Operador Secundário</TableCell>
                                        <TableCell align="center">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task.pk}>
                                            <TableCell>{task.pk}</TableCell>
                                            <TableCell>
                                                {task.hasExecutions ? (
                                                    <Tooltip title={`${task.executionCount} execução(ões)`}>
                                                        <Chip
                                                            icon={<CheckCircle />}
                                                            label="Concluída"
                                                            color="success"
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Sem execuções registadas">
                                                        <Chip
                                                            icon={<HourglassEmpty />}
                                                            label="Pendente"
                                                            color="warning"
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    // Nova lógica: control_tt_operacaocontrolo !== null = Validado
                                                    const validatedExec = task.executions?.find(exec => exec.control_tt_operacaocontrolo !== null);

                                                    if (validatedExec) {
                                                        return (
                                                            <Chip
                                                                label="✅ Validado"
                                                                color="success"
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleOpenValidationModal(validatedExec)}
                                                                sx={{ cursor: 'pointer' }}
                                                            />
                                                        );
                                                    } else if (task.hasExecutions) {
                                                        return (
                                                            <Chip
                                                                label="⏳ Aguarda Validação"
                                                                color="warning"
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => {
                                                                    // Assumimos que a validação é sobre a primeira execução pendente
                                                                    const pendingExec = task.executions.find(exec => exec.control_tt_operacaocontrolo === null);
                                                                    if (pendingExec) handleOpenValidationModal(pendingExec);
                                                                }}
                                                            />
                                                        );
                                                    } else {
                                                        return <span>-</span>;
                                                    }
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={task.tb_instalacao_nome || task.tb_instalacao || '-'}
                                                    color="primary"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <span>{task.tt_operacaoaccao_nome || task.tt_operacaoaccao || '-'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span>{task.tt_operacaomodo_nome || task.tt_operacaomodo || '-'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span>{task.tt_operacaodia_nome || task.tt_operacaodia || '-'}</span>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    // Verificar se este operador específico concluiu
                                                    const execution = task.executions?.find(exec =>
                                                        exec.ts_operador1 === task.ts_operador1 ||
                                                        exec.ts_operador2 === task.ts_operador1
                                                    );

                                                    return execution ? (
                                                        <Box>
                                                            <Chip
                                                                icon={<CheckCircle />}
                                                                label={task.ts_operador1_nome || task.ts_operador1 || '-'}
                                                                color="success"
                                                                size="small"
                                                            />
                                                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                                                {new Date(execution.data || execution.updt_time).toLocaleString('pt-PT')}
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <span>{task.ts_operador1_nome || task.ts_operador1 || '-'}</span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    // Verificar se este operador específico concluiu
                                                    const execution = task.executions?.find(exec =>
                                                        exec.ts_operador1 === task.ts_operador2 ||
                                                        exec.ts_operador2 === task.ts_operador2
                                                    );

                                                    return execution ? (
                                                        <Box>
                                                            <Chip
                                                                icon={<CheckCircle />}
                                                                label={task.ts_operador2_nome || task.ts_operador2 || '-'}
                                                                color="success"
                                                                size="small"
                                                            />
                                                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                                                {new Date(execution.data || execution.updt_time).toLocaleString('pt-PT')}
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <span>{task.ts_operador2_nome || task.ts_operador2 || '-'}</span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Ver detalhes">
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            console.log('🖱️ Details button clicked for task:', task.pk);
                                                            handleViewDetails(task);
                                                        }}
                                                    >
                                                        <Visibility fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {!task.hasExecutions && (
                                                    <>
                                                        <Tooltip title="Editar">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleEditTask(task);
                                                                }}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Para eliminar esta tarefa, contacte o administrador do sistema">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            py={4}
                        >
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhuma tarefa definida
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Crie tarefas para definir que operações os operadores devem executar
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={onCreateTask}
                            >
                                Criar Primeira Tarefa
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Detalhes da Tarefa */}
            <Dialog
                open={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        📋 Detalhes da Tarefa #{selectedTask?.pk}
                    </Box>
                    <IconButton onClick={() => setShowDetailsModal(false)}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {selectedTask && (
                        <Stack spacing={3}>
                            {/* GRUPO 1: Instalação */}
                            <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
                                <CardContent>
                                    <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
                                        🏭 Instalação
                                    </Typography>
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                                        gap: 2,
                                        alignItems: 'center'
                                    }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Chip
                                                label={(selectedTask.tb_instalacao || '').includes('ETAR') ? 'ETAR' : 'EE'}
                                                color={(selectedTask.tb_instalacao || '').includes('ETAR') ? 'primary' : 'secondary'}
                                                size="small"
                                            />
                                            <Typography variant="body1" fontWeight="600">
                                                {selectedTask.tb_instalacao || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            {selectedTask.hasExecutions ? (
                                                <Chip
                                                    icon={<CheckCircle />}
                                                    label={`${selectedTask.executionCount || 0} Execução(ões)`}
                                                    color="success"
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip
                                                    icon={<HourglassEmpty />}
                                                    label="Pendente"
                                                    color="warning"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* GRUPO 2: Detalhes da Operação */}
                            <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
                                <CardContent>
                                    <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
                                        ⚙️ Detalhes da Operação
                                    </Typography>
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                                        gap: 2
                                    }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                AÇÃO
                                            </Typography>
                                            <Typography variant="body2" fontWeight="600">
                                                {selectedTask.tt_operacaoaccao || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                MODO
                                            </Typography>
                                            <Typography variant="body2" fontWeight="600">
                                                {selectedTask.tt_operacaomodo || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                FREQUÊNCIA
                                            </Typography>
                                            <Typography variant="body2" fontWeight="600">
                                                {selectedTask.tt_operacaodia || '-'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {selectedTask.descr && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                    DESCRIÇÃO
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                    {selectedTask.descr}
                                                </Typography>
                                            </Box>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* GRUPO 3: Operadores Atribuídos */}
                            <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'info.main' }}>
                                <CardContent>
                                    <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
                                        👥 Operadores Atribuídos
                                    </Typography>
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                        gap: 2
                                    }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                OPERADOR PRINCIPAL
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={selectedTask.ts_operador1 || '-'}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            </Box>
                                        </Box>
                                        {selectedTask.ts_operador2 && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                    OPERADOR SECUNDÁRIO
                                                </Typography>
                                                <Box sx={{ mt: 0.5 }}>
                                                    <Chip
                                                        label={selectedTask.ts_operador2}
                                                        color="secondary"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* GRUPO 4: Execuções Registadas */}
                            {selectedTask.hasExecutions && selectedTask.executions && selectedTask.executions.length > 0 ? (
                                <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'success.main' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography variant="h6" color="primary" fontWeight="bold">
                                                ✅ Execuções Registadas
                                            </Typography>
                                            <Chip label={selectedTask.executions.length} size="small" color="success" />
                                        </Box>

                                        <Stack spacing={2}>
                                            {selectedTask.executions.map((exec, idx) => (
                                                <Paper
                                                    key={idx}
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: exec.control_tt_operacaocontrolo !== null ? 'success.lighter' : 'warning.lighter',
                                                        border: 1,
                                                        borderColor: exec.control_tt_operacaocontrolo !== null ? 'success.main' : 'warning.main'
                                                    }}
                                                    elevation={0}
                                                >
                                                    {/* Cabeçalho */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            Execução #{exec.pk}
                                                        </Typography>
                                                        {exec.control_tt_operacaocontrolo !== null ? (
                                                            <Chip label="✅ Validado" color="success" size="small" />
                                                        ) : (
                                                            <Chip label="⏳ Aguarda Validação" color="warning" size="small" />
                                                        )}
                                                    </Box>

                                                    <Divider sx={{ mb: 2 }} />

                                                    {/* Informações principais - Grid 2 colunas */}
                                                    <Box sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                                        gap: 2,
                                                        mb: 2
                                                    }}>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                                EXECUTADO POR
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="600">
                                                                {exec.updt_client || '-'}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                                                                DATA DE EXECUÇÃO
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="600">
                                                                {exec.updt_time ? new Date(exec.updt_time).toLocaleString('pt-PT') : '-'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    {/* Resultado */}
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" gutterBottom>
                                                            RESULTADO
                                                        </Typography>
                                                        {exec.valuetext && (
                                                            <Typography variant="body2" fontWeight="600">
                                                                {exec.valuetext}
                                                            </Typography>
                                                        )}
                                                        {exec.valuememo && (
                                                            <Paper sx={{ p: 1.5, bgcolor: 'background.paper', mt: 1 }} elevation={1}>
                                                                <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" gutterBottom>
                                                                    Observações:
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                    {exec.valuememo}
                                                                </Typography>
                                                            </Paper>
                                                        )}
                                                        {exec.photo_path && (
                                                            <Box sx={{ mt: 1 }}>
                                                                <Button
                                                                    variant="outlined"
                                                                    color="info"
                                                                    size="small"
                                                                    startIcon={<Visibility />}
                                                                    onClick={() => handleOpenPreview(exec.photo_path)}
                                                                    sx={{ mr: 1 }}
                                                                >
                                                                    Ver Foto
                                                                </Button>
                                                                <IconButton
                                                                    size="small"
                                                                    color="info"
                                                                    onClick={async () => {
                                                                        try {
                                                                            console.log('💾 Descarregando foto:', exec.photo_path);
                                                                            const response = await operationsApi.downloadOperationPhoto(exec.photo_path);
                                                                            const blob = new Blob([response.data], { type: response.headers['content-type'] });
                                                                            const url = window.URL.createObjectURL(blob);
                                                                            const link = document.createElement('a');
                                                                            link.href = url;
                                                                            link.download = exec.photo_path.split(/[/\\]/).pop();
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                            window.URL.revokeObjectURL(url);
                                                                        } catch (error) {
                                                                            console.error('Erro ao descarregar foto:', error);
                                                                            alert('Erro ao descarregar foto. Verifique os logs.');
                                                                        }
                                                                    }}
                                                                    title="Descarregar foto"
                                                                >
                                                                    <AttachFile />
                                                                </IconButton>
                                                            </Box>
                                                        )}
                                                        {!exec.valuetext && !exec.valuememo && (
                                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                                Sem resultado registado
                                                            </Typography>
                                                        )}
                                                    </Box>

                                                    {/* Parecer do Supervisor */}
                                                    {exec.control_memo && (
                                                        <>
                                                            <Divider sx={{ mb: 2 }} />
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" gutterBottom>
                                                                    PARECER DO SUPERVISOR
                                                                </Typography>
                                                                <Paper sx={{ p: 1.5, bgcolor: 'warning.light' }} elevation={0}>
                                                                    <Typography variant="body2" fontWeight="500">
                                                                        {exec.control_memo}
                                                                    </Typography>
                                                                </Paper>
                                                            </Box>
                                                        </>
                                                    )}
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
                                    <CardContent>
                                        <Box sx={{ textAlign: 'center', py: 2 }}>
                                            <HourglassEmpty sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                                            <Typography variant="h6" color="warning.dark" fontWeight="600" gutterBottom>
                                                Sem Execuções Registadas
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Esta tarefa ainda não foi executada pelos operadores atribuídos
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => handleEditTask(selectedTask)}
                        variant="contained"
                        startIcon={<Edit />}
                    >
                        Editar Tarefa
                    </Button>
                    <Button onClick={() => setShowDetailsModal(false)}>
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Confirmação de Eliminação */}
            <Dialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="error" />
                    <Typography variant="h6" color="error">
                        Confirmar Eliminação
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {taskToDelete && (
                        <Box>
                            <Typography variant="body1" mb={2}>
                                Tem certeza que deseja eliminar a seguinte tarefa?
                            </Typography>
                            <Card variant="outlined" sx={{ backgroundColor: 'error.light', color: 'error.contrastText' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" gutterBottom>
                                        <strong>Tarefa #{taskToDelete.pk}</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Instalação:</strong> {taskToDelete.tb_instalacao_nome || taskToDelete.tb_instalacao || '-'}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Ação:</strong> {taskToDelete.tt_operacaoaccao_nome || taskToDelete.tt_operacaoaccao || '-'}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Operador:</strong> {taskToDelete.ts_operador1_nome || taskToDelete.ts_operador1 || '-'}
                                    </Typography>
                                </CardContent>
                            </Card>
                            <Typography variant="body2" color="text.secondary" mt={2}>
                                ⚠️ Esta ação não pode ser desfeita.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteConfirm(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        startIcon={<Delete />}
                    >
                        Eliminar Definitivamente
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Detalhes da Validação */}
            <Dialog open={showValidationModal} onClose={handleCloseValidationModal} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            {validationDetails?.control_tt_operacaocontrolo !== null ? 'Detalhes da Validação' : 'Realizar Validação'}
                        </Typography>
                        <IconButton onClick={handleCloseValidationModal} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {validationDetails && (
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Classificação da Validação (control_tt_operacaocontrolo)</FormLabel>
                                <RadioGroup
                                    row
                                    aria-label="validation-status"
                                    name="validation-status-group"
                                    value={validationStatus}
                                    onChange={(e) => setValidationStatus(e.target.value)}
                                >
                                    {opcontroloOptions.length > 0 ? (
                                        opcontroloOptions.map((option) => (
                                            <FormControlLabel
                                                key={option.pk}
                                                value={String(option.pk)}
                                                control={<Radio color={option.pk === 1 ? "success" : option.pk === 2 ? "warning" : "error"} />}
                                                label={option.value}
                                                disabled={validationDetails?.control_tt_operacaocontrolo !== null}
                                            />
                                        ))
                                    ) : (
                                        // Fallback caso metadados ainda não estejam carregados
                                        <>
                                            <FormControlLabel value="1" control={<Radio color="success" />} label="Conforme" disabled={validationDetails?.control_tt_operacaocontrolo !== null} />
                                            <FormControlLabel value="2" control={<Radio color="warning" />} label="Com Observações" disabled={validationDetails?.control_tt_operacaocontrolo !== null} />
                                            <FormControlLabel value="3" control={<Radio color="error" />} label="Não Conforme" disabled={validationDetails?.control_tt_operacaocontrolo !== null} />
                                        </>
                                    )}
                                </RadioGroup>
                            </FormControl>

                            <TextField
                                label="Parecer do Supervisor (control_memo)"
                                multiline
                                rows={4}
                                variant="outlined"
                                fullWidth
                                value={validationComment}
                                onChange={(e) => setValidationComment(e.target.value)}
                                InputProps={{
                                    readOnly: validationDetails.control_tt_operacaocontrolo !== null,
                                }}
                            />

                            <Box>
                                <FormLabel component="legend" sx={{ mb: 1 }}>Anexo (control_foto)</FormLabel>
                                {validationDetails.control_tt_operacaocontrolo !== null ? (
                                    validationPreviewUrl ? (
                                        <Box
                                            component="img"
                                            src={validationPreviewUrl}
                                            alt={`Anexo: ${validationPhotoName}`}
                                            sx={{
                                                maxWidth: '100%',
                                                maxHeight: 300,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                cursor: 'pointer',
                                                objectFit: 'cover'
                                            }}
                                            onClick={() => handleOpenPreview(validationPhotoName)}
                                            title="Clique para ampliar"
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">Sem anexo.</Typography>
                                    )
                                ) : (
                                    <Box>
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={<AttachFile />}
                                        >
                                            Carregar Foto
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setValidationPhoto(file);
                                                        setValidationPhotoName(file.name);
                                                    }
                                                }}
                                            />
                                        </Button>
                                        {validationPhotoName && <Typography sx={{ display: 'inline', ml: 2 }}>{validationPhotoName}</Typography>}
                                    </Box>
                                )}
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseValidationModal}>Cancelar</Button>
                    {validationDetails?.control_tt_operacaocontrolo === null && (
                        <Button onClick={handleSubmitValidation} variant="contained" color="primary" disabled={isSubmittingValidation}>
                            {isSubmittingValidation ? <CircularProgress size={24} /> : 'Submeter Validação'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Modal de Pré-visualização de Imagem */}
            <Dialog
                open={previewModalOpen}
                onClose={handleClosePreview}
                TransitionProps={{
                    onExited: () => {
                        if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
                    }
                }}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="div" noWrap sx={{ flex: 1 }}>{previewImageTitle}</Typography>
                    <IconButton onClick={handleClosePreview} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', p: 1 }}>
                    {imageLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                            <CircularProgress />
                        </Box>
                    ) : previewImageUrl ? (
                        <img src={previewImageUrl} alt={previewImageTitle} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
                    ) : (
                        <DialogContentText>Não foi possível carregar a imagem.</DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    {previewImageUrl && !imageLoading && (
                        <Button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = previewImageUrl;
                                link.download = previewImageTitle;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            startIcon={<AttachFile />}
                            variant="outlined"
                            color="primary"
                        >
                            Download
                        </Button>
                    )}
                    <Button onClick={handleClosePreview} sx={{ ml: 'auto' }}>
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OperationTaskManager;