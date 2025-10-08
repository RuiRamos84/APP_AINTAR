// components/supervisor/OperationMetaManager.js
import React from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Chip, Button,
    Paper, Tooltip
} from '@mui/material';
import {
    Edit, Delete, Add, Visibility
} from '@mui/icons-material';

const OperationMetaManager = ({ operationsData, onCreateMeta, onEditMeta, onDeleteMeta }) => {
    // Usar dados do hook unificado com fallbacks seguros
    const metas = operationsData?.metas || [];
    const loading = operationsData?.isLoading || false;

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6">Carregando metas...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Gestão de Metas de Operação
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onCreateMeta}
                >
                    Nova Tarefa
                </Button>
            </Box>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Tarefas Definidas ({metas.length})
                    </Typography>

                    {metas.length > 0 ? (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
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
                                    {metas.map((meta) => (
                                        <TableRow key={meta.pk}>
                                            <TableCell>{meta.pk}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={meta.tb_instalacao}
                                                    color="primary"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{meta.tt_operacaoaccao}</TableCell>
                                            <TableCell>{meta.tt_operacaomodo}</TableCell>
                                            <TableCell>{meta.tt_operacaodia}</TableCell>
                                            <TableCell>{meta.ts_operador1}</TableCell>
                                            <TableCell>
                                                {meta.ts_operador2 || '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Ver detalhes">
                                                    <IconButton size="small" color="info">
                                                        <Visibility fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Editar">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => onEditMeta(meta)}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Eliminar">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => onDeleteMeta(meta.pk)}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
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
                                Nenhuma meta definida
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Crie metas para definir que tarefas os operadores devem executar
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={onCreateMeta}
                            >
                                Criar Primeira Meta
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default OperationMetaManager;