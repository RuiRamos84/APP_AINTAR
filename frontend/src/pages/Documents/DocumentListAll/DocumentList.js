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
    Chip,
    Grid
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
        totalCount,
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
        const statusLower = status?.toLowerCase();
        if (statusLower?.includes('concluído')) return 'success';
        if (statusLower?.includes('pendente')) return 'warning';
        if (statusLower?.includes('anulado')) return 'error';
        return 'default';
    };

    if (isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Erro ao carregar documentos: {error?.message}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
                    <Typography variant="h4">
                        Lista de Pedidos
                        {totalCount > 0 && (
                            <Chip
                                label={`${totalCount} total`}
                                size="small"
                                sx={{ ml: 2 }}
                            />
                        )}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 8, md: 4, lg: 4 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Pesquisar por nº registo, entidade, tipo..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: isFetching && <CircularProgress size={20} />
                            }
                        }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2, lg: 2 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => openModal('CREATE_DOCUMENT')}
                    >
                        Novo Pedido
                    </Button>
                </Grid>
            </Grid>

            <Paper
                elevation={2}
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
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
                                        <TableCell sx={{ fontWeight: 'medium' }}>
                                            {doc.regnumber}
                                        </TableCell>
                                        <TableCell>{doc.ts_entity}</TableCell>
                                        <TableCell>{doc.tt_type}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={doc.what}
                                                size="small"
                                                color={getStatusColor(doc.what)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {new Date(doc.submission).toLocaleDateString('pt-PT')}
                                        </TableCell>
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={handlePageChange}
                            color="primary"
                            showFirstButton
                            showLastButton
                        />
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default DocumentList;