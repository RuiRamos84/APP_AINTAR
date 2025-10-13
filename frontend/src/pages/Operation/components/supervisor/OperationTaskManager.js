// components/supervisor/OperationTaskManager.js
import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Chip, Button,
    Paper, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, Divider, Stack
} from '@mui/material';
import {
    Edit, Delete, Add, Visibility, Close, Warning, CheckCircle, HourglassEmpty
} from '@mui/icons-material';

const OperationTaskManager = ({ operationsData, onCreateTask, onEditTask, onDeleteTask }) => {
    // Usar dados correlacionados (metas + execuções) com fallbacks seguros
    const tasks = operationsData?.operations || operationsData?.metas || [];
    const loading = operationsData?.isLoading || false;

    // Estados para modais
    const [selectedTask, setSelectedTask] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationDetails, setValidationDetails] = useState(null);

    // Nota: vbl_operacaometa já retorna todos os campos como texto (nomes), não IDs
    // Campos como tb_instalacao, tt_operacaoaccao, tt_operacaomodo, ts_operador1, etc.
    // vêm diretamente com os valores legíveis do backend

    // Funções para ações
    const handleViewDetails = (task) => {
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
                                                    // Verificar se alguma execução foi validada
                                                    const validatedExec = task.executions?.find(exec => exec.control_check === 1);
                                                    const rejectedExec = task.executions?.find(exec => exec.control_check === 0);
                                                    const validationExec = validatedExec || rejectedExec;

                                                    if (validationExec) {
                                                        const isValidated = validationExec.control_check === 1;
                                                        return (
                                                            <Chip
                                                                label={isValidated ? "✅ Validado" : "❌ Requer Correção"}
                                                                color={isValidated ? "success" : "error"}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => {
                                                                    setValidationDetails(validationExec);
                                                                    setShowValidationModal(true);
                                                                }}
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
                    <Typography variant="h6" color="primary">
                        📋 Detalhes da Tarefa #{selectedTask?.pk}
                    </Typography>
                    <IconButton onClick={() => setShowDetailsModal(false)}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedTask && (
                        <Stack spacing={3}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        🏭 Instalação
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip
                                            label={(selectedTask.tb_instalacao_nome || selectedTask.tb_instalacao || '').includes('ETAR') ? 'ETAR' : 'EE'}
                                            color={(selectedTask.tb_instalacao_nome || selectedTask.tb_instalacao || '').includes('ETAR') ? 'primary' : 'secondary'}
                                            size="small"
                                        />
                                        <Typography variant="body1" fontWeight="bold">
                                            {selectedTask.tb_instalacao_nome || selectedTask.tb_instalacao || '-'}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        ⚙️ Operação
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemText
                                                primary="Ação"
                                                secondary={selectedTask.tt_operacaoaccao_nome || selectedTask.tt_operacaoaccao || '-'}
                                            />
                                        </ListItem>
                                        <Divider />
                                        <ListItem>
                                            <ListItemText
                                                primary="Modo"
                                                secondary={selectedTask.tt_operacaomodo_nome || selectedTask.tt_operacaomodo || '-'}
                                            />
                                        </ListItem>
                                        <Divider />
                                        <ListItem>
                                            <ListItemText
                                                primary="Frequência"
                                                secondary={selectedTask.tt_operacaodia_nome || selectedTask.tt_operacaodia || '-'}
                                            />
                                        </ListItem>
                                    </List>
                                </CardContent>
                            </Card>

                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        👥 Operadores
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemText
                                                primary="Operador Principal"
                                                secondary={selectedTask.ts_operador1_nome || selectedTask.ts_operador1 || '-'}
                                            />
                                        </ListItem>
                                        {(selectedTask.ts_operador2_nome || selectedTask.ts_operador2) && (
                                            <>
                                                <Divider />
                                                <ListItem>
                                                    <ListItemText
                                                        primary="Operador Secundário"
                                                        secondary={selectedTask.ts_operador2_nome || selectedTask.ts_operador2 || '-'}
                                                    />
                                                </ListItem>
                                            </>
                                        )}
                                    </List>
                                </CardContent>
                            </Card>
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
            <Dialog open={showValidationModal} onClose={() => setShowValidationModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">Detalhes da Validação</Typography>
                        <IconButton onClick={() => setShowValidationModal(false)} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {validationDetails && (
                        <Box>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Estado</Typography>
                                    <Chip
                                        label={validationDetails.control_check === 1 ? "✅ Validado" : "❌ Requer Correção"}
                                        color={validationDetails.control_check === 1 ? "success" : "error"}
                                        sx={{ mt: 1 }}
                                    />
                                </Box>

                                {validationDetails.control_memo && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Parecer do Supervisor</Typography>
                                        <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                                            <Typography variant="body2">{validationDetails.control_memo}</Typography>
                                        </Paper>
                                    </Box>
                                )}

                                {validationDetails.control_foto && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Anexos ({validationDetails.control_foto.split(',').length})
                                        </Typography>
                                        <Stack spacing={1}>
                                            {validationDetails.control_foto.split(',').map((filename, index) => (
                                                <Paper key={index} sx={{ p: 1.5 }}>
                                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                                        <Typography variant="body2">{filename}</Typography>
                                                        <Button
                                                            size="small"
                                                            href={`/api/v1/operation_control/download/${validationDetails.pk}?filename=${filename}`}
                                                            target="_blank"
                                                        >
                                                            Download
                                                        </Button>
                                                    </Box>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                <Divider />

                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Data da Validação</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        {validationDetails.updt_time ? new Date(validationDetails.updt_time).toLocaleString('pt-PT') : '-'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowValidationModal(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OperationTaskManager;