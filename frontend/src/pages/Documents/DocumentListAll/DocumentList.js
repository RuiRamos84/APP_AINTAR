import React, { useEffect, useState, useCallback } from 'react';
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
    Button,
    TablePagination,
    useTheme,
    TableSortLabel,
    Grid,
    useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { getDocuments } from '../../../services/documentService';
import Row from './Row';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import CreateDocumentModal from '../DocumentCreate/CreateDocumentModal';
import { notifySuccess, notifyError } from '../../../components/common/Toaster/ThemedToaster';

const DocumentList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { metaData, loading: metaLoading, error: metaError } = useMetaData();

    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('submission');
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openRowId, setOpenRowId] = useState(null);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedDocuments = await getDocuments();
            setDocuments(fetchedDocuments);
            notifySuccess('Documentos carregados com sucesso');
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
            setError('Erro ao carregar documentos.');
            notifyError('Erro ao carregar documentos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleSearch = (term) => setSearchTerm(term);
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleRefresh = () => {
        fetchDocuments();
    };

    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower?.includes('concluído')) return 'success';
        if (statusLower?.includes('pendente')) return 'warning';
        if (statusLower?.includes('anulado')) return 'error';
        return 'default';
    };

    const filteredDocuments = documents.filter((doc) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            doc.regnumber?.toLowerCase().includes(searchLower) ||
            doc.ts_entity?.toLowerCase().includes(searchLower) ||
            doc.tt_type?.toLowerCase().includes(searchLower)
        );
    });

    const sortedDocuments = filteredDocuments.sort((a, b) => {
        const aValue = a[orderBy] || '';
        const bValue = b[orderBy] || '';

        if (order === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });

    const paginatedDocuments = sortedDocuments.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    {error}
                </Alert>
            </Box>
        );
    }

    if (metaError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Erro ao carregar metadados: {metaError.message}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{
            p: { xs: 1, sm: 2, md: 3 },
            height: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                    <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                        Todos os Pedidos ({filteredDocuments.length})
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <SearchBar onSearch={handleSearch} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleRefresh}
                        disabled={loading}
                        startIcon={<RefreshIcon />}
                        sx={{ minHeight: '40px' }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Atualizar</Box>
                    </Button>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenModal(true)}
                        sx={{ minHeight: '40px' }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Novo</Box>
                    </Button>
                </Grid>
            </Grid>

            <Paper elevation={2} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TableContainer sx={{
                    flexGrow: 1,
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: theme.palette.grey[100],
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: theme.palette.grey[400],
                        borderRadius: '4px',
                    },
                }}>
                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" sx={{ width: '48px', minWidth: '48px' }} />
                                {metaData.columns && metaData.columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        sortDirection={orderBy === column.id ? order : false}
                                        sx={{
                                            minWidth: column.id === 'regnumber' ? '120px' :
                                                     column.id === 'ts_entity' ? '150px' :
                                                     column.id === 'tt_type' ? '120px' :
                                                     column.id === 'what' ? '120px' :
                                                     column.id === 'submission' ? '140px' : '100px',
                                            display: {
                                                xs: ['regnumber', 'ts_entity'].includes(column.id) ? 'table-cell' : 'none',
                                                sm: ['regnumber', 'ts_entity', 'tt_type'].includes(column.id) ? 'table-cell' : 'none',
                                                md: 'table-cell'
                                            }
                                        }}
                                    >
                                        <TableSortLabel
                                            active={orderBy === column.id}
                                            direction={orderBy === column.id ? order : 'asc'}
                                            onClick={() => handleRequestSort(column.id)}
                                        >
                                            {column.label || column.name}
                                        </TableSortLabel>
                                    </TableCell>
                                ))}
                                <TableCell
                                    align="center"
                                    sx={{
                                        minWidth: '200px',
                                        width: '200px',
                                        display: { xs: 'none', sm: 'table-cell' }
                                    }}
                                >
                                    Ações
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading || metaLoading ? (
                                <TableRow>
                                    <TableCell colSpan={metaData.columns ? metaData.columns.length + 2 : 7} align="center" sx={{ py: 5 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedDocuments.length > 0 ? (
                                paginatedDocuments.map((doc) => (
                                    <Row
                                        key={doc.pk}
                                        row={doc}
                                        metaData={metaData}
                                        isOpen={openRowId === doc.pk}
                                        onToggle={() => setOpenRowId(openRowId === doc.pk ? null : doc.pk)}
                                        isOpenControlled={true}
                                    />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={metaData.columns ? metaData.columns.length + 2 : 7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {searchTerm ? 'Nenhum documento encontrado para a pesquisa.' : 'Nenhum documento encontrado.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={filteredDocuments.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Linhas por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                />
            </Paper>

            <CreateDocumentModal open={openModal} onClose={() => setOpenModal(false)} />
        </Box>
    );
};

export default DocumentList;