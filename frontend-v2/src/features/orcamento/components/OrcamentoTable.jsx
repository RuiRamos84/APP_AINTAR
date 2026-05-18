import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Chip, IconButton, Tooltip,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress,
    Alert, Stack, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    alpha, useTheme, useMediaQuery,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    WarningAmber as WarnIcon,
    AccountBalance as OrcamentoIcon,
    EuroOutlined as EuroIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useOrcamentoStore } from '../store/orcamentoStore';
import {
    useOrcamentoDetalhe,
    useDeleteRegisto,
} from '../hooks/useOrcamentoQueries';
import { useSearch } from '@/shared/hooks';
import { YearNavigator } from '../pages/OrcamentoPage';

/* ─── helpers ─────────────────────────────────────────────────── */
const fmt = (v) =>
    new Intl.NumberFormat('pt-PT', {
        style: 'currency', currency: 'EUR',
    }).format(v ?? 0);

const fmtCompact = (v) =>
    new Intl.NumberFormat('pt-PT', {
        style: 'currency', currency: 'EUR',
        notation: 'compact', maximumFractionDigits: 1,
    }).format(v ?? 0);

const fmtDate = (d) => {
    if (!d) return '—';
    try {
        const dt    = new Date(d);
        const local = new Date(
            dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()
        );
        return new Intl.DateTimeFormat('pt-PT', {
            day: 'numeric', month: 'short', year: 'numeric',
        }).format(local);
    } catch { return '—'; }
};

const pct = (part, total) =>
    total > 0 ? Math.round((part / total) * 100) : 0;

/* ─── KPI cards ───────────────────────────────────────────────── */
const ProgressBar = ({ value, color, bgColor }) => (
    <Box sx={{
        height: 5, borderRadius: 3, overflow: 'hidden',
        bgcolor: bgColor ?? alpha(color, 0.15),
    }}>
        <Box sx={{
            width: `${Math.min(value, 100)}%`, height: '100%',
            bgcolor: color, borderRadius: 3,
            transition: 'width .4s ease',
        }} />
    </Box>
);

/* Card Total — barra bicolor + legenda Corrente/Capital */
const KpiCardTotal = ({ total, totCorr, totCap, corrPct, capPct }) => (
    <Paper variant="outlined" sx={{
        flex: 1, p: { xs: 1.5, sm: 2 }, borderRadius: 2,
        borderLeft: '4px solid #059669', minWidth: 0, position: 'relative',
    }}>
        <Box sx={{
            position: 'absolute', top: 12, right: 12,
            width: 36, height: 36, borderRadius: 1.5,
            bgcolor: alpha('#059669', 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <OrcamentoIcon sx={{ fontSize: 18, color: '#059669' }} />
        </Box>
        <Typography variant="caption" fontWeight={700} letterSpacing={0.8}
            color="text.secondary" sx={{ textTransform: 'uppercase' }}>
            Total Geral
        </Typography>
        <Typography variant="h6" fontWeight={700} mt={0.5} mb={1} noWrap
            sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
            {fmt(total)}
        </Typography>
        {/* Barra bicolor */}
        <Box sx={{
            display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', mb: 0.75,
        }}>
            <Box sx={{ width: `${corrPct}%`, bgcolor: '#0891b2', transition: 'width .4s ease' }} />
            <Box sx={{ flex: 1, bgcolor: '#d97706' }} />
        </Box>
        <Stack direction="row" spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0891b2' }} />
                <Typography variant="caption" color="text.secondary">
                    Corrente {corrPct}%
                </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d97706' }} />
                <Typography variant="caption" color="text.secondary">
                    Capital {capPct}%
                </Typography>
            </Stack>
        </Stack>
    </Paper>
);

/* Card Corrente / Capital — barra simples + % do total */
const KpiCardTipo = ({ label, value, count, pctVal, color, icon: Icon }) => (
    <Paper variant="outlined" sx={{
        flex: 1, p: { xs: 1.5, sm: 2 }, borderRadius: 2,
        borderLeft: `4px solid ${color}`, minWidth: 0, position: 'relative',
    }}>
        <Box sx={{
            position: 'absolute', top: 12, right: 12,
            width: 36, height: 36, borderRadius: 1.5,
            bgcolor: alpha(color, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Icon sx={{ fontSize: 18, color }} />
        </Box>
        <Typography variant="caption" fontWeight={700} letterSpacing={0.8}
            color="text.secondary" sx={{ textTransform: 'uppercase' }}>
            {label}
        </Typography>
        <Typography variant="h6" fontWeight={700} mt={0.5} noWrap
            sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
            {fmt(value)}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.75 }}>
            {count} dotaç{count !== 1 ? 'ões' : 'ão'}
        </Typography>
        <ProgressBar value={pctVal} color={color} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {pctVal}% do total
        </Typography>
    </Paper>
);

const KpiCards = ({ registos }) => {
    const total    = registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    const corrente = registos.filter(r => r.tipo === 'Corrente');
    const capital  = registos.filter(r => r.tipo === 'Capital');
    const totCorr  = corrente.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    const totCap   = capital.reduce((s, r)  => s + (parseFloat(r.valor) || 0), 0);
    const corrPct  = pct(totCorr, total);
    const capPct   = pct(totCap, total);

    if (total === 0) return null;

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
            <KpiCardTotal
                total={total}
                totCorr={totCorr}
                totCap={totCap}
                corrPct={corrPct}
                capPct={capPct}
            />
            <KpiCardTipo
                label="Despesas Correntes"
                value={totCorr}
                count={corrente.length}
                pctVal={corrPct}
                color="#0891b2"
                icon={EuroIcon}
            />
            <KpiCardTipo
                label="Despesas Capital"
                value={totCap}
                count={capital.length}
                pctVal={capPct}
                color="#d97706"
                icon={EuroIcon}
            />
        </Stack>
    );
};

/* ─── ClasseSection ───────────────────────────────────────────── */
const TIPO_COLOR = {
    Corrente: 'info',
    Capital:  'warning',
};

/* Retorna um Fragment de rows diretos na tabela pai — sem inner table,
   garantindo alinhamento perfeito com o cabeçalho. */
const ClasseSection = ({
    classe, registos, open, onToggle, onEdit, onDelete, totalGlobal,
}) => {
    const total = registos.reduce(
        (s, r) => s + (parseFloat(r.valor) || 0), 0
    );

    return (
        <>
            {/* ── Linha de cabeçalho da classe ── */}
            <TableRow onClick={onToggle} sx={{
                cursor: 'pointer',
                bgcolor: alpha('#059669', 0.08),
                '&:hover': { bgcolor: alpha('#059669', 0.13) },
                transition: 'background-color .15s',
            }}>
                <TableCell colSpan={6} sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle2" fontWeight={700}
                            color="#059669" sx={{ fontSize: '0.8rem' }}>
                            {classe}
                        </Typography>
                        <Chip label={registos.length} size="small" sx={{
                            height: 16, fontSize: '0.65rem',
                            bgcolor: alpha('#059669', 0.15),
                            color: '#059669', fontWeight: 700,
                        }} />
                    </Stack>
                </TableCell>
                <TableCell align="right" sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center"
                        justifyContent="flex-end" spacing={0.5}>
                        <Typography variant="body2" fontWeight={700}
                            color="#059669" sx={{ fontSize: '0.8rem' }}>
                            {fmt(total)}
                        </Typography>
                        {open
                            ? <ExpandLessIcon sx={{ fontSize: 16, color: '#059669' }} />
                            : <ExpandMoreIcon sx={{ fontSize: 16, color: '#059669' }} />
                        }
                    </Stack>
                </TableCell>
                <TableCell />
            </TableRow>

            {/* ── Linhas de dados — na mesma tabela, visibilidade via display ── */}
            {registos.map((r, i) => (
                <TableRow key={r.pk ?? i} hover sx={{
                    display: open ? 'table-row' : 'none',
                    bgcolor: i % 2 === 0
                        ? 'background.paper'
                        : alpha('#059669', 0.02),
                    '&:last-child td': open
                        ? { borderBottom: `2px solid ${alpha('#059669', 0.15)}` }
                        : {},
                }}>
                    <TableCell sx={{ pl: { xs: 2, sm: 3 } }}>
                        <Typography variant="body2" noWrap>
                            {r.subclasse}
                        </Typography>
                    </TableCell>
                    <TableCell>
                        {r.tipo && (
                            <Chip label={r.tipo} size="small"
                                color={TIPO_COLOR[r.tipo] || 'default'} />
                        )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="caption" color="text.disabled"
                            fontFamily="monospace" noWrap>
                            {r.sncap || '—'}
                        </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Typography variant="caption" color="text.secondary"
                            noWrap title={r.memo || ''}>
                            {r.memo || '—'}
                        </Typography>
                    </TableCell>
                    <TableCell align="right"
                        sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {fmtDate(r.data_inicio)}
                        </Typography>
                    </TableCell>
                    <TableCell align="right"
                        sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {fmtDate(r.data_fim)}
                        </Typography>
                    </TableCell>
                    <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}
                            sx={{ fontSize: '0.82rem' }}>
                            {fmt(r.valor)}
                        </Typography>
                        {totalGlobal > 0 && (
                            <Typography variant="caption" color="text.disabled"
                                sx={{ fontSize: '0.68rem' }}>
                                {((parseFloat(r.valor) || 0) / totalGlobal * 100).toFixed(1)}%
                            </Typography>
                        )}
                    </TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                        <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => onEdit(r)}>
                                <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                            <IconButton size="small" color="error"
                                onClick={() => onDelete(r)}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
};

/* ─── DeleteDialog ────────────────────────────────────────────── */
const DeleteDialog = ({ target, onConfirm, onClose, loading }) => (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarnIcon color="error" />
            Eliminar dotação
        </DialogTitle>
        <DialogContent>
            <Typography>
                Tem a certeza que pretende eliminar a dotação{' '}
                <strong>{target?.subclasse}</strong>
                {target?.ano ? ` (${target.ano})` : ''}?
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Esta ação não pode ser revertida.
            </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} color="inherit" disabled={loading}>
                Cancelar
            </Button>
            <Button variant="contained" color="error"
                onClick={onConfirm} disabled={loading}>
                Eliminar
            </Button>
        </DialogActions>
    </Dialog>
);

/* ─── Cabeçalhos da tabela ────────────────────────────────────── */
const HEAD_COLS = [
    { label: 'Subclasse',  align: 'left',  sx: {} },
    { label: 'Tipo',       align: 'left',  sx: {} },
    { label: 'SNC-AP',     align: 'left',  sx: { whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } } },
    { label: 'Descrição',  align: 'left',  sx: { display: { xs: 'none', lg: 'table-cell' } } },
    { label: 'Início',     align: 'right', sx: { display: { xs: 'none', md: 'table-cell' } } },
    { label: 'Fim',        align: 'right', sx: { display: { xs: 'none', md: 'table-cell' } } },
    { label: 'Dotação',    align: 'right', sx: {} },
];

const thSx = {
    fontWeight: 700,
    color: 'text.secondary',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    py: 1,
};

/* ─── OrcamentoTable ──────────────────────────────────────────── */
export const OrcamentoTable = ({ searchTerm = '', tipoFilter = 'todos' }) => {
    const { anoSelecionado, openModal } = useOrcamentoStore();
    const { data: registos = [], isLoading, error } =
        useOrcamentoDetalhe(anoSelecionado);
    const deleteMutation = useDeleteRegisto(anoSelecionado);

    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [collapsed,    setCollapsed]    = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Total global do ano (sempre sobre todos os registos, independente de filtros)
    const totalGlobal = useMemo(() =>
        registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0),
    [registos]);

    // Filtro por tipo
    const byTipo = useMemo(() =>
        tipoFilter === 'todos'
            ? registos
            : registos.filter(r => r.tipo === tipoFilter),
    [registos, tipoFilter]);

    // Pesquisa full-text via hook partilhado
    const searched = useSearch(byTipo, searchTerm);

    // Agrupamento por classe
    const porClasse = useMemo(() => {
        const map = {};
        searched.forEach(r => {
            if (!map[r.classe]) map[r.classe] = [];
            map[r.classe].push(r);
        });
        return map;
    }, [searched]);

    const activeClasses = useMemo(() => Object.keys(porClasse), [porClasse]);
    const isFiltering   = searchTerm.trim().length > 0 || tipoFilter !== 'todos';
    const isOpen        = (c) => isFiltering || !collapsed[c];
    const toggleClasse  = (c) =>
        setCollapsed(prev => ({ ...prev, [c]: !prev[c] }));

    const handleDeleteConfirm = async () => {
        try {
            await deleteMutation.mutateAsync(deleteTarget.pk);
            toast.success('Dotação eliminada.');
        } catch {
            toast.error('Erro ao eliminar dotação.');
        } finally {
            setDeleteTarget(null);
        }
    };

    if (isLoading) return (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress sx={{ color: '#059669' }} />
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ mt: 1 }}>
            Erro ao carregar dotações.
        </Alert>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* KPI cards — mostram sempre totais globais (não filtrados) */}
            <KpiCards registos={registos} />

            {/* Resultados / tabela */}
            {activeClasses.length === 0 ? (
                <Box sx={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    py: 8, gap: 1.5, color: 'text.disabled',
                }}>
                    <OrcamentoIcon sx={{ fontSize: 48, opacity: 0.25 }} />
                    <Typography variant="body1" fontWeight={500}
                        textAlign="center">
                        {isFiltering
                            ? 'Nenhum resultado encontrado'
                            : `Sem dotações registadas${anoSelecionado ? ` para ${anoSelecionado}` : ''}`
                        }
                    </Typography>
                    {isFiltering && (
                        <Typography variant="caption" color="text.secondary"
                            textAlign="center">
                            {searched.length === 0 && registos.length > 0
                                ? `Pesquisa sem resultados em ${registos.length} dotações.`
                                : 'Tenta ajustar os filtros ou o termo de pesquisa.'
                            }
                        </Typography>
                    )}
                    {/* Em mobile, mostra o navegador de ano para confirmar o ano activo */}
                    {isMobile && !isFiltering && (
                        <Box mt={1}>
                            <YearNavigator compact />
                        </Box>
                    )}
                </Box>
            ) : (
                <>
                    {/* Contagem quando há filtro activo */}
                    {isFiltering && (
                        <Typography variant="caption" color="text.secondary"
                            sx={{ mb: 1, display: 'block' }}>
                            {searched.length} dotaç{searched.length === 1 ? 'ão' : 'ões'} encontrada{searched.length === 1 ? '' : 's'}
                            {' '}em {activeClasses.length} classe{activeClasses.length === 1 ? '' : 's'}
                        </Typography>
                    )}

                    <Paper variant="outlined"
                        sx={{ overflow: 'hidden', borderRadius: 2 }}>
                        <TableContainer sx={{
                            /* AppBar≈64 + breadcrumbs≈28 + header compact≈56 + kpiCards≈88 + gaps≈24 */
                            maxHeight: {
                                xs: 'none',
                                sm: 'calc(100vh - 260px)',
                                lg: 'calc(100vh - 244px)',
                            },
                            overflowY: { xs: 'visible', sm: 'auto' },
                            overflowX: 'auto',
                        }}>
                            <Table size="small" sx={{ width: '100%' }}>
                                <TableHead sx={{
                                    position: 'sticky', top: 0,
                                    zIndex: 2, bgcolor: 'grey.50',
                                    borderBottom: `2px solid`,
                                    borderColor: 'divider',
                                }}>
                                    <TableRow>
                                        {HEAD_COLS.map(({ label, align, sx }) => (
                                            <TableCell key={label}
                                                align={align}
                                                sx={{ ...thSx, ...sx }}>
                                                {label}
                                            </TableCell>
                                        ))}
                                        <TableCell sx={{ ...thSx, width: 72 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {activeClasses.map((classe) => (
                                        <ClasseSection
                                            key={classe}
                                            classe={classe}
                                            registos={porClasse[classe]}
                                            totalGlobal={totalGlobal}
                                            open={isOpen(classe)}
                                            onToggle={() => toggleClasse(classe)}
                                            onEdit={(r) => openModal(r)}
                                            onDelete={(r) => setDeleteTarget(r)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            <DeleteDialog
                target={deleteTarget}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeleteTarget(null)}
                loading={deleteMutation.isPending}
            />
        </Box>
    );
};
