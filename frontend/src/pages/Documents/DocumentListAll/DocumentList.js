import React from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    InputAdornment,
    Button,
    Pagination,
    Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';

import { useDocuments } from '../../../hooks/useDocuments';
import { useModal } from '../../../contexts/ModalContext';

const DocumentList = () => {
    const navigate = useNavigate();
    const { openModal } = useModal();

    const {
        documents,
        totalPages,
        isLoading,
        isError,
        error,
        page,
        setPage,
        filters,
        handleFilterChange,
        isFetching,
    } = useDocuments();

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const getStatusColor = (status) => {
        if (status?.toLowerCase().includes('concluído')) return 'success';
        if (status?.toLowerCase().includes('pendente')) return 'warning';
        if (status?.toLowerCase().includes('anulado')) return 'error';
        return 'default';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Lista de Pedidos
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openModal('CREATE_DOCUMENT')}
                >
                    Novo Pedido
                </Button>
            </Box>

            <Paper elevation={2} sx={{ mb: 3 }}>
                <Box sx={{ p: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Pesquisar por nº registo, entidade, tipo..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: isFetching && <CircularProgress size={20} />
                        }}
                    />
                </Box>
            </Paper>

            {isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Ocorreu um erro ao carregar os documentos: {error.message}
                </Alert>
            )}

            <Paper elevation={2}>
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nº Registo</TableCell>
                                <TableCell>Entidade</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell>Data</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : documents.length > 0 ? (
                                documents.map((doc) => (
                                    <TableRow
                                        key={doc.pk}
                                        hover
                                        onClick={() => navigate(`/documents/${doc.regnumber}`)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell sx={{ fontWeight: 'medium' }}>{doc.regnumber}</TableCell>
                                        <TableCell>{doc.ts_entity}</TableCell>
                                        <TableCell>{doc.tt_type}</TableCell>
                                        <TableCell>
                                            <Chip label={doc.what} size="small" color={getStatusColor(doc.what)} />
                                        </TableCell>
                                        <TableCell>{new Date(doc.submission).toLocaleDateString('pt-PT')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            Nenhum documento encontrado.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default DocumentList;