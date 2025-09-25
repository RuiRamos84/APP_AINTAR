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
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { getDocuments } from '../../../services/documentService';
import { normalizeText } from '../../../utils/textUtils';
import Row from './Row';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import CreateDocumentModal from '../DocumentCreate/CreateDocumentModal';
import { notifySuccess, notifyError } from '../../../components/common/Toaster/ThemedToaster';

const DocumentList = () => {
    const theme = useTheme();
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

    const fetchDocuments = useCallback(async (showNotification = false) => {
        setLoading(true);
        setError(null);
        try {
            const fetchedDocuments = await getDocuments();
            setDocuments(fetchedDocuments);
            if (showNotification) {
                notifySuccess('Documentos carregados com sucesso');
            }
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
        fetchDocuments(true);
    };

    if (metaLoading || loading) {
        return (
            <Box sx={{
                height: 'calc(96vh - 64px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    if (metaError || error || !metaData?.columns) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    {metaError || error || "Metadados indisponíveis"}
                </Alert>
            </Box>
        );
    }

    const filteredDocuments = documents.filter((document) => {
        return metaData.columns.some((column) => {
            const value = document[column.id]?.toString();
            if (!value) return false;
            return normalizeText(value).includes(normalizeText(searchTerm));
        });
    });

    const sortedDocuments = filteredDocuments.sort((a, b) => {
        if (typeof a[orderBy] === "number") {
            return order === "asc" ? a[orderBy] - b[orderBy] : b[orderBy] - a[orderBy];
        }
        return order === "asc"
            ? a[orderBy].localeCompare(b[orderBy])
            : b[orderBy].localeCompare(a[orderBy]);
    });

    const desiredColumns = ["regnumber", "nipc", "ts_entity", "ts_associate", "tt_type", "submission"];
    const columnsWithValues = metaData.columns.filter(
        (column) =>
            desiredColumns.includes(column.id) &&
            documents.some(
                (doc) =>
                    doc[column.id] !== null &&
                    doc[column.id] !== undefined &&
                    doc[column.id] !== ""
            )
    );

    return (
        <Paper
            sx={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                height: 'calc(96vh - 64px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
                        <Typography variant="h4">Todos os Pedidos</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8, md: 4, lg: 4 }}>
                        <SearchBar onSearch={handleSearch} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2, lg: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenModal(true)}
                            fullWidth
                        >
                            Novo Pedido
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            <TableContainer sx={{ flexGrow: 1 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow
                            sx={{
                                backgroundColor: theme.palette.table?.header?.backgroundColor || theme.palette.grey[100],
                                color: theme.palette.table?.header?.color || theme.palette.text.primary,
                            }}
                        >
                            <TableCell />
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === "regnumber"}
                                    direction={orderBy === "regnumber" ? order : "asc"}
                                    onClick={() => handleRequestSort("regnumber")}
                                >
                                    Nº de Registo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === "nipc"}
                                    direction={orderBy === "nipc" ? order : "asc"}
                                    onClick={() => handleRequestSort("nipc")}
                                >
                                    Nº Fiscal
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === "ts_entity"}
                                    direction={orderBy === "ts_entity" ? order : "asc"}
                                    onClick={() => handleRequestSort("ts_entity")}
                                >
                                    Entidade
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === "ts_associate"}
                                    direction={orderBy === "ts_associate" ? order : "asc"}
                                    onClick={() => handleRequestSort("ts_associate")}
                                >
                                    Associado
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === "tt_type"}
                                    direction={orderBy === "tt_type" ? order : "asc"}
                                    onClick={() => handleRequestSort("tt_type")}
                                >
                                    Tipo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === "submission"}
                                    direction={orderBy === "submission" ? order : "asc"}
                                    onClick={() => handleRequestSort("submission")}
                                >
                                    Submissão
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Box sx={{ py: 5 }}>
                                        <CircularProgress />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : sortedDocuments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography variant="h6" color="text.secondary">
                                        Nenhum documento encontrado
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedDocuments
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((document) => (
                                    <Row
                                        key={document.pk}
                                        row={document}
                                        metaData={{ ...metaData, columns: columnsWithValues }}
                                        isAssignedToMe={false}
                                        showComprovativo={false}
                                        onSave={fetchDocuments}
                                        isOpenControlled={true}
                                        isOpen={openRowId === document.pk}
                                        onToggle={(rowId, isOpen) => setOpenRowId(isOpen ? rowId : null)}
                                    />
                                ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {filteredDocuments.length > rowsPerPage && (
                <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 100]}
                        component="div"
                        count={filteredDocuments.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Pedidos por página:"
                        sx={{ px: 2 }}
                    />
                </Box>
            )}

            <CreateDocumentModal
                open={openModal}
                onClose={() => setOpenModal(false)}
            />
        </Paper>
    );
};

export default DocumentList;