import React, { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Paper, Grid, TablePagination, useTheme, CircularProgress,
    TableSortLabel, FormControl, InputLabel, Select, MenuItem, Box, Chip, Divider,
    IconButton
} from "@mui/material";
import {
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from "@mui/icons-material";
import { getDocumentRamais, updateDocumentPavenext } from "../../../services/documentService";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import RamalRow from "./RamalRow";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import { prepareRamaisDataForExport, generateExcelFileName } from "./excelExportUtils";
import ExportExcelButton from "./ExportExcelButton";
import "../DocumentListAll/DocumentList.css";

const RamaisList = () => {
    const theme = useTheme();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado para ordenação
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('regnumber');

    // Estado para agrupamento
    const [groupBy, setGroupBy] = useState('');
    const [groupedDocuments, setGroupedDocuments] = useState({});
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Efeito para processar o agrupamento quando os documentos ou o tipo de agrupamento mudam
    useEffect(() => {
        if (!groupBy) {
            setGroupedDocuments({});
            return;
        }

        const groups = {};
        const expandedState = {};

        filteredDocuments.forEach(doc => {
            const groupValue = doc[groupBy] || 'Sem valor';
            if (!groups[groupValue]) {
                groups[groupValue] = [];
                expandedState[groupValue] = true;  // Por padrão, expandir todos os grupos
            }
            groups[groupValue].push(doc);
        });

        setGroupedDocuments(groups);
        setExpandedGroups(expandedState);
    }, [documents, searchTerm, groupBy]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await getDocumentRamais();
            setDocuments(response || []);
        } catch (error) {
            setError("Erro ao carregar ramais");
            notifyError("Erro ao carregar lista de ramais");
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (pk) => {
        try {
            await updateDocumentPavenext(pk);
            notifySuccess("Pedido atualizado com sucesso");
            fetchDocuments(); // Re-carregar toda a lista
        } catch (error) {
            notifyError("Erro ao atualizar pedido");
            console.error("Erro ao atualizar pedido:", error);
        }
    };

    const handleSearch = (term) => setSearchTerm(term);
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Funções para lidar com a ordenação
    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // Função para lidar com a mudança do tipo de agrupamento
    const handleGroupChange = (event) => {
        setGroupBy(event.target.value);
        setPage(0); // Resetar para a primeira página ao mudar o agrupamento
    };

    // Função para alternar a expansão de um grupo
    const toggleGroupExpand = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    function descendingComparator(a, b, orderBy) {
        // Verificar se os valores são numéricos para ordenação apropriada
        if (['comprimento_bet', 'comprimento_gra', 'comprimento_pav', 'area_bet', 'area_gra', 'area_pav'].includes(orderBy)) {
            const valA = parseFloat(a[orderBy] || 0);
            const valB = parseFloat(b[orderBy] || 0);
            return valB - valA;
        }

        // Ordenação para datas (assumindo formato DD/MM/YYYY ou similar)
        if (orderBy === 'submission' || orderBy === 'when_stop') {
            const dateA = a[orderBy] ? new Date(a[orderBy].split('/').reverse().join('-')) : new Date(0);
            const dateB = b[orderBy] ? new Date(b[orderBy].split('/').reverse().join('-')) : new Date(0);
            return dateB - dateA;
        }

        // Ordenação para strings
        if (b[orderBy] < a[orderBy]) {
            return -1;
        }
        if (b[orderBy] > a[orderBy]) {
            return 1;
        }
        return 0;
    }

    function getComparator(order, orderBy) {
        return order === 'desc'
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    }

    // Filtrar documentos baseado no termo de pesquisa
    const filteredDocuments = documents.filter(doc =>
        Object.values(doc).some(value =>
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // Ordenar os documentos filtrados
    const sortedDocuments = filteredDocuments.sort(getComparator(order, orderBy));

    // Aplicar paginação quando não há agrupamento
    const displayedDocuments = !groupBy
        ? sortedDocuments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        : sortedDocuments;

    // Preparar dados para exportação Excel
    const getExportData = () => {
        // Usar os documentos filtrados pela pesquisa para exportar
        return prepareRamaisDataForExport(filteredDocuments, 'active');
    };

    if (loading) return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 'calc(100vh - 64px)'
        }}>
            <CircularProgress />
        </div>
    );
    if (error) return <Typography color="error">{error}</Typography>;

    // Opções para agrupamento
    const groupOptions = [
        { value: '', label: 'Sem agrupamento' },
        // { value: 'ts_entity', label: 'Entidade' },
        { value: 'nut4', label: 'Localidade' },
        { value: 'nut3', label: 'Freguesia' },
        { value: 'nut2', label: 'Concelho' }
    ];

    return (
        <Paper className="paper-list">
            {/* Cabeçalho em grid de linha única */}
            <Grid container className="header-container-list" alignItems="center" spacing={2} style={{ padding: 16 }}>
                <Grid style={{ flexGrow: 0 }}>
                    <Typography variant="h5">Ramais a Pavimentar</Typography>
                </Grid>
                <Grid style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {/* SearchBar (à esquerda) */}
                    <SearchBar onSearch={handleSearch} />

                    {/* Agrupamento (no meio) */}
                    <FormControl variant="outlined" size="small" style={{ minWidth: 180, flexShrink: 0 }}>
                        <InputLabel id="group-by-label">Agrupar por</InputLabel>
                        <Select
                            labelId="group-by-label"
                            id="group-by"
                            value={groupBy}
                            onChange={handleGroupChange}
                            label="Agrupar por"
                        >
                            {groupOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>


                    <ExportExcelButton
                        data={getExportData()}
                        fileName={generateExcelFileName("ramais_a_pavimentar")}
                        buttonProps={{ size: "medium" }}
                    />
                </Grid>
            </Grid>

            <TableContainer className="table-container-list">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ width: 50 }}></TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'regnumber'}
                                    direction={orderBy === 'regnumber' ? order : 'asc'}
                                    onClick={() => handleRequestSort('regnumber')}
                                >
                                    Número
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'ts_entity'}
                                    direction={orderBy === 'ts_entity' ? order : 'asc'}
                                    onClick={() => handleRequestSort('ts_entity')}
                                >
                                    Entidade
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'nut4'}
                                    direction={orderBy === 'nut4' ? order : 'asc'}
                                    onClick={() => handleRequestSort('nut4')}
                                >
                                    Localidade
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'comprimento_gra'}
                                    direction={orderBy === 'comprimento_gra' ? order : 'asc'}
                                    onClick={() => handleRequestSort('comprimento_gra')}
                                >
                                    Comprimento
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'area_gra'}
                                    direction={orderBy === 'area_gra' ? order : 'asc'}
                                    onClick={() => handleRequestSort('area_gra')}
                                >
                                    Área
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'submission'}
                                    direction={orderBy === 'submission' ? order : 'asc'}
                                    onClick={() => handleRequestSort('submission')}
                                >
                                    Submissão
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!groupBy ? (
                            // Exibição sem agrupamento
                            displayedDocuments.map((doc) => (
                                <RamalRow
                                    key={doc.pk}
                                    row={doc}
                                    onComplete={handleComplete}
                                />
                            ))
                        ) : (
                            // Exibição com agrupamento
                            Object.entries(groupedDocuments).map(([groupName, groupDocs]) => (
                                <React.Fragment key={groupName}>
                                    <TableRow>
                                        <TableCell colSpan={8} style={{ backgroundColor: theme.palette.grey[100] }}>
                                            <Box display="flex" alignItems="center">
                                                <IconButton size="small" onClick={() => toggleGroupExpand(groupName)}>
                                                    {expandedGroups[groupName] ?
                                                        <KeyboardArrowUpIcon /> :
                                                        <KeyboardArrowDownIcon />
                                                    }
                                                </IconButton>
                                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', marginLeft: 8 }}>
                                                    {groupOptions.find(opt => opt.value === groupBy)?.label}: {groupName}
                                                </Typography>
                                                <Chip
                                                    label={`${groupDocs.length} ${groupDocs.length === 1 ? 'item' : 'itens'}`}
                                                    size="small"
                                                    style={{ marginLeft: 8 }}
                                                />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    {expandedGroups[groupName] && groupDocs
                                        .sort(getComparator(order, orderBy))
                                        .map(doc => (
                                            <RamalRow
                                                key={doc.pk}
                                                row={doc}
                                                onComplete={handleComplete}
                                            />
                                        ))
                                    }
                                    {expandedGroups[groupName] && <TableRow>
                                        <TableCell colSpan={8}>
                                            <Divider />
                                        </TableCell>
                                    </TableRow>}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {!groupBy && (
                <TablePagination
                    className="table-pagination-list"
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={filteredDocuments.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Pedidos por página:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                    }
                />
            )}
        </Paper>
    );
};

export default RamaisList;