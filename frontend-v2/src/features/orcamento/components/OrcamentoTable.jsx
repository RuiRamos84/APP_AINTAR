import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Chip, IconButton, Tooltip,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Collapse, CircularProgress,
    Alert, Stack, Button, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions,
    alpha, useTheme, useMediaQuery, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    TrendingUp as Corrente,
    AccountTree as Capital,
    Payments as TotalIcon,
    WarningAmber as WarnIcon,
    AccountBalance as OrcamentoIcon,
} from '@mui/icons-material';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { YearNavigator } from '../pages/OrcamentoPage';

/* ─── helpers ──────────────────────────────────────────────── */
const fmt = (v) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const fmtDate = (d) => {
    if (!d) return '—';
    try {
        const dt    = new Date(d);
        const local = new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
        return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }).format(local);
    } catch { return '—'; }
};

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

/* ─── KpiCard ───────────────────────────────────────────────── */
const KpiCard = ({ label, value, total, icon: Icon, accent, count }) => {
    const theme = useTheme();
    const ratio = pct(value, total);

    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                p: { xs: 1.75, sm: 2.5 },
                borderLeft: `4px solid ${accent}`,
                borderRadius: 2,
                flex: 1,
                minWidth: 0,
                transition: 'box-shadow .2s',
                '&:hover': { boxShadow: theme.shadows[3] },
            }}
        >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}
                        textTransform="uppercase" letterSpacing={0.6}>
                        {label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} mt={0.25}
                        sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                        {fmt(value)}
                    </Typography>
                    {count !== undefined && (
                        <Typography variant="caption" color="text.disabled">
                            {count} dotaç{count === 1 ? 'ão' : 'ões'}
                        </Typography>
                    )}
                </Box>
                <Box sx={{
                    width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, borderRadius: '50%',
                    bgcolor: alpha(accent, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Icon sx={{ color: accent, fontSize: { xs: 16, sm: 20 } }} />
                </Box>
            </Stack>
            {total !== null && (
                <>
                    <LinearProgress
                        variant="determinate"
                        value={ratio}
                        sx={{
                            height: 6, borderRadius: 3, mb: 0.75,
                            bgcolor: alpha(accent, 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 3 },
                        }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {ratio}% do total
                    </Typography>
                </>
            )}
        </Paper>
    );
};

/* ─── TotalCard ─────────────────────────────────────────────── */
const TotalCard = ({ total, corrente, capital, accent }) => {
    const theme       = useTheme();
    const correntePct = pct(corrente, total);

    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                p: { xs: 1.75, sm: 2.5 },
                borderLeft: `4px solid ${accent}`,
                borderRadius: 2,
                flex: 1,
                minWidth: 0,
                transition: 'box-shadow .2s',
                '&:hover': { boxShadow: theme.shadows[3] },
            }}
        >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}
                        textTransform="uppercase" letterSpacing={0.6}>
                        Total Geral
                    </Typography>
                    <Typography variant="h5" fontWeight={700} mt={0.25}
                        sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                        {fmt(total)}
                    </Typography>
                </Box>
                <Box sx={{
                    width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, borderRadius: '50%',
                    bgcolor: alpha(accent, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <TotalIcon sx={{ color: accent, fontSize: { xs: 16, sm: 20 } }} />
                </Box>
            </Stack>
            <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', mb: 0.75, bgcolor: alpha('#0891b2', 0.12) }}>
                {correntePct > 0 && (
                    <Box sx={{ width: `${correntePct}%`, bgcolor: '#0891b2', transition: 'width .4s ease' }} />
                )}
                {(100 - correntePct) > 0 && (
                    <Box sx={{ flex: 1, bgcolor: '#d97706' }} />
                )}
            </Box>
            <Stack direction="row" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0891b2', flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">Corrente {correntePct}%</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d97706', flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">Capital {100 - correntePct}%</Typography>
                </Stack>
            </Stack>
        </Paper>
    );
};

/* ─── SummaryDashboard ──────────────────────────────────────── */
const SummaryDashboard = ({ registos }) => {
    const totalGeral    = registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    const corrente      = registos.filter(r => r.tipo === 'Corrente');
    const capital       = registos.filter(r => r.tipo === 'Capital');
    const totalCorrente = corrente.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    const totalCapital  = capital.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

    if (totalGeral === 0) return null;

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
            <TotalCard total={totalGeral} corrente={totalCorrente} capital={totalCapital} accent="#059669" />
            <KpiCard label="Despesas Correntes" value={totalCorrente} total={totalGeral}
                accent="#0891b2" icon={Corrente} count={corrente.length} />
            <KpiCard label="Despesas Capital" value={totalCapital} total={totalGeral}
                accent="#d97706" icon={Capital} count={capital.length} />
        </Stack>
    );
};

/* ─── ClasseSection ─────────────────────────────────────────── */
const TIPO_COLOR = { Corrente: { color: 'info' }, Capital: { color: 'warning' } };

const ClasseSection = ({ classe, registos, open, onToggle, onEdit, onDelete, isMobile }) => {
    const total = registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    // Colunas visíveis: mobile=4, desktop=7
    const colSpanHeader = isMobile ? 3 : 6;
    const colSpanTotal  = isMobile ? 4 : 7;

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
                <TableCell colSpan={colSpanHeader} sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle2" fontWeight={700} color="#059669">
                            {classe}
                        </Typography>
                        <Chip
                            label={registos.length}
                            size="small"
                            sx={{ height: 18, fontSize: '0.68rem', bgcolor: alpha('#059669', 0.15), color: '#059669', fontWeight: 700 }}
                        />
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
            </TableRow>

            <TableRow sx={{ p: 0 }}>
                <TableCell colSpan={colSpanTotal} sx={{ p: 0, border: 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Table size="small" sx={{ tableLayout: 'fixed' }}>
                            <TableBody>
                                {registos.map((r, i) => (
                                    <TableRow
                                        key={r.pk ?? i}
                                        hover
                                        sx={{
                                            '&:last-child td': { borderBottom: `2px solid ${alpha('#059669', 0.2)}` },
                                            bgcolor: i % 2 === 0 ? 'background.paper' : alpha('#059669', 0.02),
                                        }}
                                    >
                                        <TableCell sx={{ pl: { xs: 2, sm: 3.5 } }}>
                                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                {r.subclasse}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ width: { xs: 80, sm: 110 } }}>
                                            {r.tipo && (
                                                <Chip label={r.tipo} size="small"
                                                    color={TIPO_COLOR[r.tipo]?.color || 'default'} />
                                            )}
                                        </TableCell>
                                        {/* SNC-AP — oculto em mobile */}
                                        <TableCell sx={{ width: 80, display: { xs: 'none', md: 'table-cell' } }}>
                                            <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                                                {r.sncap || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ width: { xs: 110, sm: 130 } }}>
                                            <Typography variant="body2" fontWeight={600}>{fmt(r.valor)}</Typography>
                                        </TableCell>
                                        {/* Datas — ocultas em mobile */}
                                        <TableCell align="right" sx={{ width: 130, display: { xs: 'none', md: 'table-cell' } }}>
                                            <Typography variant="caption" color="text.secondary">{fmtDate(r.data_inicio)}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ width: 130, display: { xs: 'none', md: 'table-cell' } }}>
                                            <Typography variant="caption" color="text.secondary">{fmtDate(r.data_fim)}</Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ width: { xs: 72, sm: 90 } }}>
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

    const [collapsed,    setCollapsed]    = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [searchTerm,   setSearchTerm]   = useState('');
    const [tipoFilter,   setTipoFilter]   = useState('todos');

    const byTipo = useMemo(() =>
        tipoFilter === 'todos' ? registos : registos.filter(r => r.tipo === tipoFilter),
    [registos, tipoFilter]);

    const searched = useSearch(byTipo, searchTerm);

    const { porClasse, grandTotal } = useMemo(() => {
        const map = {};
        searched.forEach(r => {
            if (!map[r.classe]) map[r.classe] = [];
            map[r.classe].push(r);
            total += parseFloat(r.valor) || 0;
        });
        return map;
    }, [searched]);

    const activeClasses = useMemo(() => Object.keys(porClasse), [porClasse]);
    const isSearching   = searchTerm.trim().length > 0 || tipoFilter !== 'todos';

    const isOpen       = (classe) => isSearching || !collapsed[classe];
    const toggleClasse = (classe) => setCollapsed(prev => ({ ...prev, [classe]: !prev[classe] }));

    const handleDeleteConfirm = async () => {
        await deleteRegisto(deleteTarget.pk);
        setDeleteTarget(null);
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
            <CircularProgress sx={{ color: '#059669' }} />
        </Box>
    );

    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Box>
            {/* KPIs — reagem ao filtro activo */}
            <SummaryDashboard registos={searched} />

            {/* Toolbar */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                mb={2}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
                    {/* Em mobile o YearNavigator fica aqui, não no header */}
                    {isMobile && (
                        <Box sx={{ flexShrink: 0 }}>
                            <YearNavigator compact />
                        </Box>
                    )}
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Pesquisar subclasse, SNC-AP..."
                        sx={{ flex: 1, maxWidth: { sm: 360 } }}
                    />
                </Stack>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={tipoFilter}
                    onChange={(_, v) => v && setTipoFilter(v)}
                    sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                >
                    <ToggleButton value="todos">Todos</ToggleButton>
                    <ToggleButton value="Corrente">Corrente</ToggleButton>
                    <ToggleButton value="Capital">Capital</ToggleButton>
                </ToggleButtonGroup>
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
                            Tenta ajustar os filtros ou o termo de pesquisa.
                        </Typography>
                    )}
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                    <TableContainer sx={{
                        maxHeight: { xs: 'none', md: 'calc(100vh - 400px)' },
                        overflowY: { xs: 'visible', md: 'auto' },
                        overflowX: 'auto',
                    }}>
                        <Table size="small" sx={{ minWidth: { xs: 360, md: 'auto' }, tableLayout: 'auto' }}>
                            <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Subclasse
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, width: { xs: 80, sm: 110 } }}>
                                        Tipo
                                    </TableCell>
                                    {/* SNC-AP — oculto em mobile */}
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, width: 80, display: { xs: 'none', md: 'table-cell' } }}>
                                        SNC-AP
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, width: { xs: 110, sm: 130 } }}>
                                        Dotação
                                    </TableCell>
                                    {/* Datas — ocultas em mobile */}
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, width: 130, display: { xs: 'none', md: 'table-cell' } }}>
                                        Início
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, width: 130, display: { xs: 'none', md: 'table-cell' } }}>
                                        Fim
                                    </TableCell>
                                    <TableCell align="center" sx={{ width: { xs: 72, sm: 90 } }} />
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
                                        isMobile={isMobile}
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
        </Box>
    );
};
