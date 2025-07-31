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
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import RamalGenericRow from "./RamalGenericRow";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import { prepareRamaisDataForExport, generateExcelFileName } from "./excelExportUtils";
import ExportExcelButton from "./ExportExcelButton";
import "../DocumentListAll/DocumentList.css";

const RamalGenericList = ({
    title,
    getData,
    onComplete,
    isConcluded,
    showExport = false,
    exportType = 'active',
    actionLabel = "Concluir",
    actionTooltip = "Concluir",
    confirmTitle = "Concluir Ramal",
    confirmMessage = null
}) => {
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

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await getData();
            setDocuments(response || []);
        } catch (error) {
            setError(`Erro ao carregar ${title.toLowerCase()}`);
            notifyError(`Erro ao carregar ${title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Função para extrair o ano-mês de uma data
    const getYearMonth = (dateString) => {
        if (!dateString) return 'Sem data';

        try {
            // Para datas no formato "2025-02-27 às 11:29"
            if (dateString.includes(' às ')) {
                const datePart = dateString.split(' às ')[0];
                const [year, month] = datePart.split('-');
                return `${year}-${month}`;
            }
            // Para outros formatos, tentar parseamento genérico
            const date = new Date(dateString);
            if (!isNaN(date)) {
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            return 'Formato inválido';
        } catch (error) {
            console.error('Erro ao processar data:', dateString, error);
            return 'Formato inválido';
        }
    };

    // Função para formatar o nome do mês para exibição
    const formatYearMonth = (yearMonth) => {
        if (yearMonth === 'Sem data' || yearMonth === 'Formato inválido') return yearMonth;

        const [year, month] = yearMonth.split('-');
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        return `${monthNames[parseInt(month) - 1]} de ${year}`;
    };

    // Efeito para processar o agrupamento
    useEffect(() => {
        if (!groupBy) {
            setGroupedDocuments({});
            return;
        }

        const groups = {};
        const expandedState = {};

        filteredDocuments.forEach(doc => {
            let groupValue;

            // Tratamento especial para agrupamento por data
            if (groupBy === 'submission') {
                groupValue = getYearMonth(doc[groupBy]);
            } else {
                groupValue = doc[groupBy] || 'Sem valor';
            }

            if (!groups[groupValue]) {
                groups[groupValue] = [];
                expandedState[groupValue] = true;
            }
            groups[groupValue].push(doc);
        });

        // Ordenar grupos de data cronologicamente
        if (groupBy === 'submission') {
            const orderedGroups = {};
            Object.keys(groups)
                .sort((a, b) => b.localeCompare(a))
                .forEach(key => {
                    orderedGroups[key] = groups[key];
                });
            setGroupedDocuments(orderedGroups);
        } else {
            setGroupedDocuments(groups);
        }

        setExpandedGroups(expandedState);
    }, [documents, searchTerm, groupBy]);

    const handleComplete = async (pk) => {
        try {
            await onComplete(pk);

            // Mensagem de sucesso personalizada baseada no tipo de ação
            if (actionLabel.toLowerCase().includes('pago')) {
                notifySuccess("Ramal marcado como pago com sucesso");
            } else {
                notifySuccess("Pedido atualizado com sucesso");
            }

            // Remover da lista local
            setDocuments(prevDocs => prevDocs.filter(doc => doc.pk !== pk));

        } catch (error) {
            if (actionLabel.toLowerCase().includes('pago')) {
                notifyError("Erro ao marcar ramal como pago");
            } else {
                notifyError("Erro ao atualizar pedido");
            }
        }
    };

    const handleSearch = (term) => setSearchTerm(term);
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleGroupChange = (event) => {
        setGroupBy(event.target.value);
        setPage(0);
    };

    const toggleGroupExpand = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    function descendingComparator(a, b, orderBy) {
        // Cálculo dinâmico para totais
        if (orderBy === 'comprimento_total') {
            const totalA = (parseFloat(a.comprimento_bet || 0) + parseFloat(a.comprimento_gra || 0) + parseFloat(a.comprimento_pav || 0));
            const totalB = (parseFloat(b.comprimento_bet || 0) + parseFloat(b.comprimento_gra || 0) + parseFloat(b.comprimento_pav || 0));
            return totalB - totalA;
        }

        if (orderBy === 'area_total') {
            const totalA = (parseFloat(a.area_bet || 0) + parseFloat(a.area_gra || 0) + parseFloat(a.area_pav || 0));
            const totalB = (parseFloat(b.area_bet || 0) + parseFloat(b.area_gra || 0) + parseFloat(b.area_pav || 0));
            return totalB - totalA;
        }

        // Valores numéricos individuais
        if (['comprimento_gra', 'area_gra', 'comprimento_bet', 'area_bet', 'comprimento_pav', 'area_pav'].includes(orderBy)) {
            const valA = parseFloat(a[orderBy] || 0);
            const valB = parseFloat(b[orderBy] || 0);
            return valB - valA;
        }

        // Datas
        if (orderBy === 'submission') {
            if (a[orderBy] && a[orderBy].includes(' às ')) {
                const datePartA = a[orderBy].split(' às ')[0];
                const datePartB = b[orderBy] ? b[orderBy].split(' às ')[0] : '';
                return datePartB.localeCompare(datePartA);
            }
            const dateA = a[orderBy] ? new Date(a[orderBy]) : new Date(0);
            const dateB = b[orderBy] ? new Date(b[orderBy]) : new Date(0);
            return dateB - dateA;
        }

        // Strings
        const valA = a[orderBy] || '';
        const valB = b[orderBy] || '';
        return valB.toString().localeCompare(valA.toString());
    }

    function getComparator(order, orderBy) {
        return order === 'desc'
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    }

    // Filtrar documentos
    const filteredDocuments = documents.filter(doc =>
        Object.values(doc).some(value =>
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // Ordenar documentos
    const sortedDocuments = filteredDocuments.sort(getComparator(order, orderBy));

    // Paginação (quando não há agrupamento)
    const displayedDocuments = !groupBy
        ? sortedDocuments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        : sortedDocuments;

    // Dados para exportação
    const getExportData = () => {
        return prepareRamaisDataForExport(filteredDocuments, exportType);
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

    // Opções de agrupamento
    const groupOptions = [
        { value: '', label: 'Sem agrupamento' },
        { value: 'nut4', label: 'Localidade' },
        { value: 'nut3', label: 'Freguesia' },
        { value: 'nut2', label: 'Concelho' },
        { value: 'submission', label: isConcluded ? 'Data de Conclusão' : 'Data de Submissão' }
    ];

    // Colunas da tabela
    const getDateColumn = () => 'submission';
    const getDateLabel = () => {
        if (isConcluded) return 'Concluído em';
        if (exportType === 'executed') return 'Executado em';
        return 'Submissão';
    };

    return (
        <Paper className="paper-list">
            <Grid container className="header-container-list" alignItems="center" spacing={2} style={{ padding: 16 }}>
                <Grid style={{ flexGrow: 1 }}>
                    <Typography variant="h5">{title}</Typography>
                </Grid>

                <Grid style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <SearchBar onSearch={handleSearch} />

                    <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
                        <InputLabel id="group-by-label">Agrupar por</InputLabel>
                        <Select
                            labelId="group-by-label"
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

                    {showExport && (
                        <ExportExcelButton
                            data={getExportData()}
                            fileName={generateExcelFileName(title.toLowerCase().replace(/\s+/g, '_'))}
                            buttonProps={{ size: "medium" }}
                        />
                    )}
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
                                    active={orderBy === 'comprimento_total'}
                                    direction={orderBy === 'comprimento_total' ? order : 'asc'}
                                    onClick={() => handleRequestSort('comprimento_total')}
                                >
                                    Comprimento
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'area_total'}
                                    direction={orderBy === 'area_total' ? order : 'asc'}
                                    onClick={() => handleRequestSort('area_total')}
                                >
                                    Área
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === getDateColumn()}
                                    direction={orderBy === getDateColumn() ? order : 'asc'}
                                    onClick={() => handleRequestSort(getDateColumn())}
                                >
                                    {getDateLabel()}
                                </TableSortLabel>
                            </TableCell>
                            {!isConcluded && <TableCell>Ações</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!groupBy ? (
                            // Sem agrupamento
                            displayedDocuments.map((doc) => (
                                <RamalGenericRow
                                    key={doc.pk}
                                    row={doc}
                                    onComplete={handleComplete}
                                    isConcluded={isConcluded}
                                    actionLabel={actionLabel}
                                    actionTooltip={actionTooltip}
                                    confirmTitle={confirmTitle}
                                    confirmMessage={confirmMessage}
                                />
                            ))
                        ) : (
                            // Com agrupamento
                            Object.entries(groupedDocuments).map(([groupName, groupDocs]) => (
                                <React.Fragment key={groupName}>
                                    <TableRow>
                                        <TableCell colSpan={isConcluded ? 7 : 8} style={{ backgroundColor: theme.palette.grey[100] }}>
                                            <Box display="flex" alignItems="center">
                                                <IconButton size="small" onClick={() => toggleGroupExpand(groupName)}>
                                                    {expandedGroups[groupName] ?
                                                        <KeyboardArrowUpIcon /> :
                                                        <KeyboardArrowDownIcon />
                                                    }
                                                </IconButton>
                                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', marginLeft: 8 }}>
                                                    {groupBy === 'submission'
                                                        ? `${groupOptions.find(opt => opt.value === groupBy)?.label}: ${formatYearMonth(groupName)}`
                                                        : `${groupOptions.find(opt => opt.value === groupBy)?.label}: ${groupName}`
                                                    }
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
                                            <RamalGenericRow
                                                key={doc.pk}
                                                row={doc}
                                                onComplete={handleComplete}
                                                isConcluded={isConcluded}
                                                actionLabel={actionLabel}
                                                actionTooltip={actionTooltip}
                                                confirmTitle={confirmTitle}
                                                confirmMessage={confirmMessage}
                                            />
                                        ))
                                    }
                                    {expandedGroups[groupName] && <TableRow>
                                        <TableCell colSpan={isConcluded ? 7 : 8}>
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
                    labelRowsPerPage="Itens por página:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                    }
                />
            )}
        </Paper>
    );
};

export default RamalGenericList;