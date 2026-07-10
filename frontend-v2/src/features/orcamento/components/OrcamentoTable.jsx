import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Chip, IconButton, Tooltip,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, LinearProgress, Collapse,
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
} from '@mui/icons-material';
import { fluidClamp } from '@/styles/tokens';
import { toast } from 'sonner';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { useOrcamentoDetalhe, useDeleteRegisto } from '../hooks/useOrcamentoQueries';
import { useSearch } from '@/shared/hooks';
import { YearNavigator } from '../pages/OrcamentoPage';
import { SncapPopover } from './SncapPopover';

const MODULE_COLOR = '#059669';

const CLASSE_COLORS = [
    '#059669', '#0891b2', '#7c3aed', '#d97706',
    '#dc2626', '#0d9488', '#c026d3', '#65a30d',
];

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

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

/* ─── ClasseCard ─────────────────────────────────────────────── */
const ClasseCard = ({ label, value, total, count, accent }) => {
    const theme = useTheme();
    const ratio = pct(value, total);
    return (
        <Paper elevation={0} variant="outlined" sx={{
            p: { xs: 1.5, sm: 2 },
            borderLeft: `4px solid ${accent}`,
            borderRadius: 2,
            flex: '1 1 0',
            minWidth: { xs: '100%', sm: 140 },
            transition: 'box-shadow .2s',
            '&:hover': { boxShadow: theme.shadows[3] },
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}
                textTransform="uppercase" letterSpacing={0.6} noWrap display="block">
                {label}
            </Typography>
            <Typography variant="h6" fontWeight={700} mt={0.25}
                sx={{ fontSize: fluidClamp(16, 19.2, 360, 600) }}>
                {fmt(value)}
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block" mb={0.75}>
                {count} dotaç{count === 1 ? 'ão' : 'ões'} ·{' '}
                <Box component="span" fontWeight={800} color="text.primary">{ratio}%</Box>
            </Typography>
            <LinearProgress variant="determinate" value={ratio} sx={{
                height: 5, borderRadius: 3,
                bgcolor: alpha(accent, 0.12),
                '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 3 },
            }} />
        </Paper>
    );
};

/* ─── SummaryDashboard ──────────────────────────────────────── */
const SummaryDashboard = ({ porClasse }) => {
    const classes    = Object.keys(porClasse);
    const totalGeral = classes.reduce((s, cl) =>
        s + porClasse[cl].reduce((ss, r) => ss + (parseFloat(r.valor) || 0), 0), 0);

    if (totalGeral === 0 || classes.length === 0) return null;

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
            <Paper elevation={0} variant="outlined" sx={{
                p: { xs: 1.5, sm: 2 },
                borderLeft: `4px solid ${MODULE_COLOR}`,
                borderRadius: 2,
                flex: '1 1 0',
                minWidth: { xs: '100%', sm: 140 },
                transition: 'box-shadow .2s',
            }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                    textTransform="uppercase" letterSpacing={0.6} display="block">
                    Total Geral
                </Typography>
                <Typography variant="h6" fontWeight={700} mt={0.25}
                    sx={{ fontSize: fluidClamp(16, 19.2, 360, 600) }}>
                    {fmt(totalGeral)}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                    {classes.length} classe{classes.length !== 1 ? 's' : ''}
                </Typography>
            </Paper>
            {classes.map((cl, i) => {
                const regs   = porClasse[cl];
                const total  = regs.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
                const accent = CLASSE_COLORS[i % CLASSE_COLORS.length];
                return (
                    <ClasseCard key={cl} label={cl} value={total}
                        total={totalGeral} count={regs.length} accent={accent} />
                );
            })}
        </Box>
    );
};

/* ─── ClasseSection ─────────────────────────────────────────── */
const ClasseSection = ({ classe, registos, open, onToggle, onEdit, onDelete, onSncapClick, cols }) => {
    const total = registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

    const renderCell = (col, r) => {
        switch (col.id) {
            case 'subclasse':
                return (
                    <TableCell key="subclasse" sx={{ pl: { xs: 2, sm: 3.5 }, overflow: 'hidden' }}>
                        <Typography fontSize="0.9rem" fontWeight={500} noWrap>{r.subclasse}</Typography>
                    </TableCell>
                );
            case 'name':
                return (
                    <TableCell key="name" sx={{ overflow: 'hidden' }}>
                        <Tooltip title={r.name || ''} disableHoverListener={!r.name} arrow placement="top">
                            <Typography fontSize="0.85rem" color="text.secondary" noWrap>
                                {r.name || '—'}
                            </Typography>
                        </Tooltip>
                    </TableCell>
                );
            case 'sncap':
                return (
                    <TableCell key="sncap">
                        <Typography
                            fontSize="0.82rem" fontFamily="monospace" noWrap
                            onClick={r.sncap ? (e) => onSncapClick(e.currentTarget, r.sncap) : undefined}
                            sx={{
                                color: r.sncap ? MODULE_COLOR : 'text.disabled',
                                cursor: r.sncap ? 'pointer' : 'default',
                                textDecoration: r.sncap ? 'underline dotted' : 'none',
                            }}
                        >
                            {r.sncap || '—'}
                        </Typography>
                    </TableCell>
                );
            case 'memo':
                return (
                    <TableCell key="memo" sx={{ overflow: 'hidden' }}>
                        <Tooltip title={r.memo || ''} disableHoverListener={!r.memo} arrow placement="top">
                            <Typography fontSize="0.82rem" color="text.secondary" noWrap>
                                {r.memo || '—'}
                            </Typography>
                        </Tooltip>
                    </TableCell>
                );
            case 'valor':
                return (
                    <TableCell key="valor" align="right">
                        <Typography fontSize="0.9rem" fontWeight={600}>{fmt(r.valor)}</Typography>
                    </TableCell>
                );
            case 'actions':
                return (
                    <TableCell key="actions" align="center" sx={{ py: 0, whiteSpace: 'nowrap' }}>
                        <Stack direction="row" justifyContent="center" spacing={0}>
                            <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => onEdit(r)}>
                                    <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => onDelete(r)}>
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </TableCell>
                );
            default: return null;
        }
    };

    return (
        <>
            <TableRow
                onClick={onToggle}
                sx={{
                    cursor: 'pointer',
                    bgcolor: alpha('#059669', 0.08),
                    '&:hover': { bgcolor: alpha('#059669', 0.13) },
                    '& td': { borderBottom: open ? 'none' : undefined },
                    transition: 'background-color .15s',
                }}
            >
                <TableCell colSpan={cols.length - 2} sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle2" fontWeight={700} color="#059669">
                            {classe}
                        </Typography>
                        <Chip label={registos.length} size="small"
                            sx={{ height: 18, fontSize: '0.68rem', bgcolor: alpha('#059669', 0.15), color: '#059669', fontWeight: 700 }} />
                    </Stack>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                        <Typography variant="subtitle2" fontWeight={700} color="#059669">
                            {fmt(total)}
                        </Typography>
                        {open
                            ? <ExpandLessIcon sx={{ fontSize: 18, color: '#059669' }} />
                            : <ExpandMoreIcon sx={{ fontSize: 18, color: '#059669' }} />
                        }
                    </Stack>
                </TableCell>
                <TableCell />
            </TableRow>

            <TableRow sx={{ p: 0 }}>
                <TableCell colSpan={cols.length} sx={{ p: 0, border: 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>{cols.map(c => (
                                <col key={c.id} style={c.width ? { width: c.width } : undefined} />
                            ))}</colgroup>
                            <TableBody>
                                {registos.map((r, i) => (
                                    <TableRow key={r.pk ?? i} hover sx={{
                                        '&:last-child td': { borderBottom: `2px solid ${alpha('#059669', 0.2)}` },
                                        bgcolor: i % 2 === 0 ? 'background.paper' : alpha('#059669', 0.02),
                                    }}>
                                        {cols.map(col => renderCell(col, r))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Collapse>
                </TableCell>
            </TableRow>
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

/* ─── Definição de colunas (dinâmicas por breakpoint) ────────── */
// minBp: null=sempre visível  'md'=md+  'lg'=lg+
const ALL_COLS = [
    { id: 'subclasse', label: 'Subclasse',  align: 'left',   width: null, minBp: null },
    { id: 'name',      label: 'Referência', align: 'left',   width: 160,  minBp: 'md' },
    { id: 'sncap',     label: 'SNC-AP',     align: 'left',   width: 100,  minBp: 'md' },
    { id: 'memo',      label: 'Observações',align: 'left',   width: 200,  minBp: 'lg' },
    { id: 'valor',     label: 'Dotação',    align: 'right',  width: 140,  minBp: null },
    { id: 'actions',   label: '',           align: 'center', width: 80,   minBp: null },
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
export const OrcamentoTable = ({ searchTerm = '', tipoFilter = 'todos', canEdit = false }) => {
    const { anoSelecionado, openModal } = useOrcamentoStore();
    const { data: registos = [], isLoading, error } =
        useOrcamentoDetalhe(anoSelecionado);
    const deleteMutation = useDeleteRegisto(anoSelecionado);

    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isLg     = useMediaQuery(theme.breakpoints.up('lg'));

    const [expanded,     setExpanded]     = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [sncapAnchor,  setSncapAnchor]  = useState({ el: null, code: null });

    const byTipo = useMemo(() =>
        tipoFilter === 'todos' ? registos : registos.filter(r => r.tipo === tipoFilter),
    [registos, tipoFilter]);

    const searched = useSearch(byTipo, searchTerm);

    // Agrupamento por classe
    const porClasse = useMemo(() => {
        const map = {};
        let total = 0;
        searched.forEach(r => {
            if (!map[r.classe]) map[r.classe] = [];
            map[r.classe].push(r);
            total += parseFloat(r.valor) || 0;
        });
        return map;
    }, [searched]);

    const activeClasses = useMemo(() => Object.keys(porClasse), [porClasse]);
    const isSearching   = searchTerm.trim().length > 0 || tipoFilter !== 'todos';

    // accordion: começa fechado; abre com clique ou quando há pesquisa ativa
    const isOpen       = (classe) => isSearching || !!expanded[classe];
    const toggleClasse = (classe) => setExpanded(prev => ({ ...prev, [classe]: !prev[classe] }));

    const visibleCols = useMemo(() => ALL_COLS.filter(col => {
        if (col.id === 'actions') return canEdit;
        if (!col.minBp)           return true;
        if (col.minBp === 'md')   return !isMobile;
        if (col.minBp === 'lg')   return isLg;
        return true;
    }), [isMobile, isLg, canEdit]);

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
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
            <CircularProgress sx={{ color: '#059669' }} />
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ mt: 1 }}>
            Erro ao carregar dotações.
        </Alert>
    );

    return (
        <Box>
            {/* KPIs por classe — reagem ao filtro activo */}
            <SummaryDashboard porClasse={porClasse} />

            {/* Tabela */}
            {activeClasses.length === 0 ? (
                <Box sx={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    py: 8, gap: 1.5, color: 'text.disabled',
                }}>
                    <OrcamentoIcon sx={{ fontSize: 48, opacity: 0.25 }} />
                    <Typography variant="body1" fontWeight={500}
                        textAlign="center">
                        {isSearching
                            ? 'Nenhum resultado encontrado'
                            : `Sem dotações registadas${anoSelecionado ? ` para ${anoSelecionado}` : ''}`
                        }
                    </Typography>
                    {isSearching && (
                        <Typography variant="caption" textAlign="center">
                            Tenta ajustar os filtros ou o termo de pesquisa.
                        </Typography>
                    )}
                    {/* Em mobile, mostra o navegador de ano para confirmar o ano activo */}
                    {isMobile && !isSearching && (
                        <Box mt={1}>
                            <YearNavigator compact />
                        </Box>
                    )}
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                    <TableContainer sx={{
                        height: { xs: 'auto', sm: 'calc(100vh - 280px)' },
                        overflowY: { xs: 'visible', sm: 'auto' },
                        overflowX: 'auto',
                    }}>
                        <Table size="small" sx={{ minWidth: { xs: 360, md: 'auto' }, tableLayout: 'fixed' }}>
                            <colgroup>{visibleCols.map(c => (
                                <col key={c.id} style={c.width ? { width: c.width } : undefined} />
                            ))}</colgroup>
                            <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'grey.50' }}>
                                <TableRow>
                                    {visibleCols.map(c => (
                                        <TableCell key={c.id} align={c.align} sx={thSx}>
                                            {c.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {activeClasses.map((classe) => (
                                    <ClasseSection
                                        key={classe}
                                        classe={classe}
                                        registos={porClasse[classe]}
                                        open={isOpen(classe)}
                                        onToggle={() => toggleClasse(classe)}
                                        onEdit={(r) => openModal(r)}
                                        onDelete={(r) => setDeleteTarget(r)}
                                        onSncapClick={(el, code) => setSncapAnchor({ el, code })}
                                        cols={visibleCols}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <DeleteDialog
                target={deleteTarget}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeleteTarget(null)}
                loading={deleteMutation.isPending}
            />

            <SncapPopover
                anchorEl={sncapAnchor.el}
                sncapCode={sncapAnchor.code}
                onClose={() => setSncapAnchor({ el: null, code: null })}
            />
        </Box>
    );
};
