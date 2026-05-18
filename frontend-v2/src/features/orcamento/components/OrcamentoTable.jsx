import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Chip, IconButton, Tooltip,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Collapse, CircularProgress,
    Alert, Stack, Button, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, InputAdornment,
    alpha, useTheme, useMediaQuery,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Payments as TotalIcon,
    WarningAmber as WarnIcon,
    AccountBalance as OrcamentoIcon,
    SearchRounded as SearchIcon,
} from '@mui/icons-material';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { useSearch } from '@/shared/hooks';
import { YearNavigator } from '../pages/OrcamentoPage';
import { SncapPopover } from './SncapPopover';

const MODULE_COLOR = '#059669';

const CLASSE_COLORS = [
    '#059669', '#0891b2', '#7c3aed', '#d97706',
    '#dc2626', '#0d9488', '#c026d3', '#65a30d',
];

/* ─── helpers ──────────────────────────────────────────────── */
const fmt = (v) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

/* ─── ClasseKpiCard ─────────────────────────────────────────── */
const ClasseKpiCard = ({ nome, total, grandTotal, count, color }) => {
    const theme = useTheme();
    const ratio = pct(total, grandTotal);
    return (
        <Paper elevation={0} variant="outlined" sx={{
            p: 1.75,
            borderLeft: `4px solid ${color}`,
            borderRadius: 2,
            transition: 'box-shadow .2s',
            '&:hover': { boxShadow: theme.shadows[3] },
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}
                textTransform="uppercase" letterSpacing={0.5} noWrap display="block">
                {nome}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} mt={0.25} mb={0.75}>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                    {fmt(total)}
                </Typography>
                <Chip
                    label={`${ratio}%`}
                    size="small"
                    sx={{
                        height: 20, fontSize: '0.7rem', fontWeight: 700,
                        bgcolor: alpha(color, 0.12), color,
                    }}
                />
            </Stack>
            <LinearProgress
                variant="determinate"
                value={ratio}
                sx={{
                    height: 5, borderRadius: 3, mb: 0.5,
                    bgcolor: alpha(color, 0.12),
                    '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                }}
            />
            <Typography variant="caption" color="text.disabled">
                {count} dotaç{count === 1 ? 'ão' : 'ões'}
            </Typography>
        </Paper>
    );
};

/* ─── TotalCard ─────────────────────────────────────────────── */
const TotalCard = ({ total, count }) => {
    const theme = useTheme();
    return (
        <Paper elevation={0} variant="outlined" sx={{
            p: 1.75,
            borderLeft: `4px solid ${MODULE_COLOR}`,
            borderRadius: 2,
            transition: 'box-shadow .2s',
            '&:hover': { boxShadow: theme.shadows[3] },
        }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}
                        textTransform="uppercase" letterSpacing={0.5}>
                        Total Dotado
                    </Typography>
                    <Typography variant="h6" fontWeight={700} mt={0.25}
                        sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                        {fmt(total)}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        {count} dotaç{count === 1 ? 'ão' : 'ões'}
                    </Typography>
                </Box>
                <Box sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    bgcolor: alpha(MODULE_COLOR, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <TotalIcon sx={{ color: MODULE_COLOR, fontSize: 18 }} />
                </Box>
            </Stack>
        </Paper>
    );
};

/* ─── SummaryDashboard ──────────────────────────────────────── */
const SummaryDashboard = ({ porClasse, grandTotal, classeColors }) => {
    if (Object.keys(porClasse).length === 0) return null;
    const totalCount = Object.values(porClasse).flat().length;
    return (
        <Box mb={2.5} sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 1.5,
        }}>
            <TotalCard total={grandTotal} count={totalCount} />
            {Object.keys(porClasse).map((classe) => {
                const items = porClasse[classe];
                const classeTotal = items.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
                return (
                    <ClasseKpiCard
                        key={classe}
                        nome={classe}
                        total={classeTotal}
                        grandTotal={grandTotal}
                        count={items.length}
                        color={classeColors[classe]}
                    />
                );
            })}
        </Box>
    );
};

/* ─── ClasseSection ─────────────────────────────────────────── */
// 6 colunas: Subclasse | SNC-AP | Nome | Descrição | Valor | Ações
const COL_SPAN_HEADER = 4;
const COL_SPAN_TOTAL  = 6;

const ClasseSection = ({ classe, registos, open, onToggle, onEdit, onDelete, onSncapClick }) => {
    return (
        <>
            <TableRow
                onClick={onToggle}
                sx={{
                    cursor: 'pointer',
                    bgcolor: alpha(MODULE_COLOR, 0.08),
                    '&:hover': { bgcolor: alpha(MODULE_COLOR, 0.13) },
                    '& td': { borderBottom: open ? 'none' : undefined },
                    transition: 'background-color .15s',
                }}
            >
                <TableCell colSpan={COL_SPAN_TOTAL} sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" fontWeight={700} color={MODULE_COLOR}>
                                {classe}
                            </Typography>
                            <Chip
                                label={registos.length}
                                size="small"
                                sx={{ height: 18, fontSize: '0.68rem', bgcolor: alpha(MODULE_COLOR, 0.15), color: MODULE_COLOR, fontWeight: 700 }}
                            />
                        </Stack>
                        {open
                            ? <ExpandLessIcon sx={{ fontSize: 18, color: MODULE_COLOR }} />
                            : <ExpandMoreIcon sx={{ fontSize: 18, color: MODULE_COLOR }} />
                        }
                    </Stack>
                </TableCell>
            </TableRow>

            <TableRow sx={{ p: 0 }}>
                <TableCell colSpan={COL_SPAN_TOTAL} sx={{ p: 0, border: 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                <col />
                                <col style={{ width: 90 }} />
                                <col style={{ width: 160 }} />
                                <col style={{ width: 180 }} />
                                <col style={{ width: 130 }} />
                                <col style={{ width: 80 }} />
                            </colgroup>
                            <TableBody>
                                {registos.map((r, i) => (
                                    <TableRow
                                        key={r.pk ?? i}
                                        hover
                                        sx={{
                                            '&:last-child td': { borderBottom: `2px solid ${alpha(MODULE_COLOR, 0.2)}` },
                                            bgcolor: i % 2 === 0 ? 'background.paper' : alpha(MODULE_COLOR, 0.02),
                                        }}
                                    >
                                        <TableCell sx={{ pl: { xs: 2, sm: 3.5 } }}>
                                            <Typography variant="body2" noWrap>
                                                {r.subclasse}
                                            </Typography>
                                        </TableCell>
                                        <TableCell
                                            onClick={r.sncap
                                                ? (e) => { e.stopPropagation(); onSncapClick(e.currentTarget, r.sncap); }
                                                : undefined}
                                        >
                                            <Typography
                                                variant="caption"
                                                fontFamily="monospace"
                                                noWrap
                                                sx={r.sncap ? {
                                                    color: MODULE_COLOR,
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    textDecoration: 'underline',
                                                    textDecorationStyle: 'dotted',
                                                    textUnderlineOffset: 3,
                                                    '&:hover': { textDecorationStyle: 'solid' },
                                                } : { color: 'text.disabled' }}
                                            >
                                                {r.sncap || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                            <Typography variant="caption" color="text.secondary" noWrap title={r.name || ''}>
                                                {r.name || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                            <Typography variant="caption" color="text.secondary" noWrap title={r.memo || ''}>
                                                {r.memo || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>{fmt(r.valor)}</Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ p: 0.5 }}>
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
                            </TableBody>
                        </Table>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

/* ─── DeleteDialog ──────────────────────────────────────────── */
const DeleteDialog = ({ target, onConfirm, onClose }) => (
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
            <Button onClick={onClose} color="inherit">Cancelar</Button>
            <Button variant="contained" color="error" onClick={onConfirm}>Eliminar</Button>
        </DialogActions>
    </Dialog>
);

/* ─── OrcamentoTable ────────────────────────────────────────── */
export const OrcamentoTable = () => {
    const { registos, loading, error, openModal, deleteRegisto, anoSelecionado } = useOrcamentoStore();
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [expanded,     setExpanded]     = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [searchTerm,   setSearchTerm]   = useState('');
    const [sncapAnchor,  setSncapAnchor]  = useState({ el: null, code: null });

    const searched = useSearch(registos, searchTerm);

    const { porClasse, grandTotal } = useMemo(() => {
        const map = {};
        let total = 0;
        searched.forEach(r => {
            const key = r.classe || '(Sem classe)';
            if (!map[key]) map[key] = [];
            map[key].push(r);
            total += parseFloat(r.valor) || 0;
        });
        return { porClasse: map, grandTotal: total };
    }, [searched]);

    const activeClasses = useMemo(() => Object.keys(porClasse), [porClasse]);
    const isSearching   = searchTerm.trim().length > 0;

    const classeColors = useMemo(() => {
        const map = {};
        activeClasses.forEach((c, i) => { map[c] = CLASSE_COLORS[i % CLASSE_COLORS.length]; });
        return map;
    }, [activeClasses]);

    const isOpen       = (classe) => isSearching || Boolean(expanded[classe]);
    const toggleClasse = (classe) => setExpanded(prev => ({ ...prev, [classe]: !prev[classe] }));

    const handleDeleteConfirm = async () => {
        await deleteRegisto(deleteTarget.pk);
        setDeleteTarget(null);
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
            <CircularProgress sx={{ color: MODULE_COLOR }} />
        </Box>
    );

    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Box>
            <SummaryDashboard porClasse={porClasse} grandTotal={grandTotal} classeColors={classeColors} />

            {/* Toolbar */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                mb={2}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
                    {isMobile && (
                        <Box sx={{ flexShrink: 0 }}>
                            <YearNavigator compact />
                        </Box>
                    )}
                    <TextField
                        size="small"
                        placeholder="Pesquisar subclasse, SNC-AP, designação..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flex: 1, maxWidth: { sm: 400 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Stack>
            </Stack>

            {/* Tabela */}
            {activeClasses.length === 0 ? (
                <Box sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', py: 8, gap: 1.5, color: 'text.disabled',
                }}>
                    <OrcamentoIcon sx={{ fontSize: 48, opacity: 0.25 }} />
                    <Typography variant="body1" fontWeight={500} textAlign="center">
                        {isSearching
                            ? 'Nenhum resultado encontrado'
                            : `Sem dotações registadas${anoSelecionado ? ` para ${anoSelecionado}` : ''}`
                        }
                    </Typography>
                    {isSearching && (
                        <Typography variant="caption" textAlign="center">
                            Tenta ajustar o termo de pesquisa.
                        </Typography>
                    )}
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                    <TableContainer sx={{
                        maxHeight: { xs: 'none', md: 'calc(100vh - 340px)' },
                        overflowY: { xs: 'visible', md: 'auto' },
                        overflowX: 'auto',
                    }}>
                        <Table size="small" sx={{ minWidth: { xs: 360, md: 'auto' }, tableLayout: 'fixed' }}>
                            <colgroup>
                                <col />
                                <col style={{ width: 90 }} />
                                <col style={{ width: 160 }} />
                                <col style={{ width: 180 }} />
                                <col style={{ width: 130 }} />
                                <col style={{ width: 80 }} />
                            </colgroup>
                            <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Subclasse
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                                        SNC-AP
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, display: { xs: 'none', md: 'table-cell' } }}>
                                        Nome
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, display: { xs: 'none', md: 'table-cell' } }}>
                                        Descrição
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Dotação
                                    </TableCell>
                                    <TableCell align="center" />
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
            />

            <SncapPopover
                anchorEl={sncapAnchor.el}
                sncapCode={sncapAnchor.code}
                onClose={() => setSncapAnchor({ el: null, code: null })}
            />
        </Box>
    );
};
