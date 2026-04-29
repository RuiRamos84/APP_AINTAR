import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Chip, IconButton, Tooltip,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Collapse, CircularProgress, Alert,
    Divider,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { OrcamentoForm } from './OrcamentoForm';

const formatEuro = (value) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value ?? 0);

const formatDate = (d) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '—';
        const local = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(local);
    } catch {
        return '—';
    }
};

const TIPO_COLORS = {
    'Corrente': 'info',
    'Capital': 'warning',
};

const COL_COUNT = 7;

const ClasseRows = ({ classe, registos, open, onToggle, onEdit, onDelete }) => {
    const total = registos.reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);

    return (
        <>
            {/* Linha de cabeçalho da classe */}
            <TableRow
                onClick={onToggle}
                sx={{
                    bgcolor: 'primary.main',
                    cursor: 'pointer',
                    '& td': { borderBottom: 'none' },
                }}
            >
                <TableCell colSpan={COL_COUNT - 1} sx={{ py: 1.25 }}>
                    <Typography fontWeight="bold" variant="subtitle2" color="primary.contrastText">
                        {classe}
                    </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography fontWeight="bold" variant="subtitle2" color="primary.contrastText">
                            {formatEuro(total)}
                        </Typography>
                        {open
                            ? <ExpandLessIcon sx={{ color: 'primary.contrastText', fontSize: 18 }} />
                            : <ExpandMoreIcon sx={{ color: 'primary.contrastText', fontSize: 18 }} />
                        }
                    </Box>
                </TableCell>
            </TableRow>

            {/* Linhas de dados (colapsáveis) */}
            {open && registos.map((r, i) => (
                <TableRow
                    key={r.pk ?? i}
                    hover
                    sx={{ '&:last-child td': { borderBottom: '2px solid' }, '&:last-child td, &:last-child th': { borderBottomColor: 'divider' } }}
                >
                    <TableCell>{r.subclasse}</TableCell>
                    <TableCell>
                        {r.tipo && (
                            <Chip label={r.tipo} size="small" color={TIPO_COLORS[r.tipo] || 'default'} />
                        )}
                    </TableCell>
                    <TableCell>
                        <Typography variant="caption" color="text.secondary">
                            {r.sncap || '—'}
                        </Typography>
                    </TableCell>
                    <TableCell align="right">
                        <Typography fontWeight="medium">{formatEuro(r.valor)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">{formatDate(r.data_inicio)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">{formatDate(r.data_fim)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => onEdit(r)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => onDelete(r)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
};

const SummaryCards = ({ summary }) => {
    const total = summary.reduce((sum, s) => sum + (parseFloat(s.total_valor) || 0), 0);

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch', mb: 4 }}>
            {summary.map((s) => (
                <Paper
                    key={s.classe}
                    elevation={0}
                    variant="outlined"
                    sx={{ px: 3, py: 2, minWidth: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {s.classe}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                        {formatEuro(s.total_valor)}
                    </Typography>
                </Paper>
            ))}
            {summary.length > 0 && (
                <>
                    <Divider orientation="vertical" flexItem />
                    <Paper
                        elevation={0}
                        sx={{ px: 3, py: 2, minWidth: 180, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                    >
                        <Typography variant="caption" display="block" sx={{ opacity: 0.85 }} gutterBottom>
                            Total Geral
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                            {formatEuro(total)}
                        </Typography>
                    </Paper>
                </>
            )}
        </Box>
    );
};

export const OrcamentoTable = () => {
    const { registos, summary, loading, error, openModal, deleteRegisto, anoSelecionado } = useOrcamentoStore();
    const [collapsed, setCollapsed] = useState({});

    const porClasse = useMemo(() => {
        const map = {};
        registos.forEach(r => {
            if (!map[r.classe]) map[r.classe] = [];
            map[r.classe].push(r);
        });
        return map;
    }, [registos]);

    const toggleClasse = (classe) =>
        setCollapsed(prev => ({ ...prev, [classe]: !prev[classe] }));

    const handleDelete = async (registo) => {
        if (!window.confirm(`Eliminar "${registo.subclasse}" (${registo.ano})?`)) return;
        await deleteRegisto(registo.pk);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    if (registos.length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                Sem registos de orçamento{anoSelecionado ? ` para ${anoSelecionado}` : ''}.
            </Alert>
        );
    }

    return (
        <Box>
            <SummaryCards summary={summary} />

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell><b>Subclasse</b></TableCell>
                                <TableCell><b>Tipo</b></TableCell>
                                <TableCell><b>SNCAP</b></TableCell>
                                <TableCell align="right"><b>Valor</b></TableCell>
                                <TableCell align="right"><b>Data Início</b></TableCell>
                                <TableCell align="right"><b>Data Fim</b></TableCell>
                                <TableCell align="center"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(porClasse).map(([classe, items]) => (
                                <ClasseRows
                                    key={classe}
                                    classe={classe}
                                    registos={items}
                                    open={!collapsed[classe]}
                                    onToggle={() => toggleClasse(classe)}
                                    onEdit={(r) => openModal(r)}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <OrcamentoForm />
        </Box>
    );
};
