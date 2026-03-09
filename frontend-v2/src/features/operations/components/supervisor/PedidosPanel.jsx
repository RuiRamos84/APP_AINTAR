import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Stack, Chip, Accordion, AccordionSummary, AccordionDetails,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, CircularProgress, Alert, Tooltip,
    alpha, useTheme,
} from '@mui/material';
import { SortableHeadCell, SearchBar } from '@/shared/components/data';
import { useSortable } from '@/shared/hooks/useSortable';
import {
    ExpandMore as ExpandMoreIcon,
    FolderOpen as FolderIcon,
    Person as PersonIcon,
    PersonOff as UnassignedIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import DocumentDetailsModal from '@/features/documents/components/details/DocumentDetailsModal';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Converte pk do operador para nome legível.
 *  who == null/undefined → não atribuído
 *  who === 0             → entidade externa (pk=0 nos metadados)
 *  who > 0               → operador interno
 */
const resolveOperatorName = (who, metaData) => {
    if (who == null) return null;
    const users = metaData?.who || [];
    const found = users.find(u => u.pk === who);
    return found ? found.name : (who === 0 ? 'Externo' : `Operador ${who}`);
};

/** Chip colorido consoante os dias restantes */
const RestdaysChip = ({ restdays }) => {
    if (restdays == null) return <Typography variant="caption" color="text.secondary">—</Typography>;
    const days = Number(restdays);
    const color = days < 0 ? 'error' : days < 7 ? 'warning' : 'success';
    const label = days < 0 ? `${Math.abs(days)}d em atraso` : `${days}d restantes`;
    return <Chip label={label} size="small" color={color} variant="outlined" />;
};

/** Formatar data para pt-PT */
const fmtDate = (val) => {
    if (!val) return '—';
    try {
        return new Intl.DateTimeFormat('pt-PT').format(new Date(val));
    } catch {
        return val;
    }
};

// ──────────────────────────────────────────────
// Tabela de pedidos por categoria (com sort)
// ──────────────────────────────────────────────
const PedidosTable = ({ rows, metaData, onRowClick }) => {
    const theme = useTheme();
    const { sorted, sortKey, sortDir, requestSort } = useSortable(rows, 'restdays');

    if (!rows.length) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                Sem pedidos nesta categoria.
            </Typography>
        );
    }

    const headProps = { sortKey, sortDir, onSort: requestSort, sx: { fontWeight: 600 } };

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <SortableHeadCell label="Nº" field="regnumber" {...headProps} />
                        <SortableHeadCell label="Tipo" field="tipo" {...headProps} />
                        <SortableHeadCell label="Localização" field="nut4" {...headProps} />
                        <SortableHeadCell label="Entidade" field="ts_entity" {...headProps} />
                        <TableCell sx={{ fontWeight: 600 }}>Atribuído</TableCell>
                        <SortableHeadCell label="Submissão" field="submission" {...headProps} />
                        <SortableHeadCell label="Prazo" field="limitdate" {...headProps} />
                        <SortableHeadCell label="Estado" field="restdays" {...headProps} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sorted.map((row) => {
                        const operatorName = resolveOperatorName(row.who, metaData);
                        const location = [row.address, row.nut4, row.nut3]
                            .filter(Boolean)
                            .join(', ');

                        return (
                            <TableRow
                                key={row.pk}
                                hover
                                onClick={() => onRowClick(row)}
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                    ...(row.urgency ? { borderLeft: `3px solid ${theme.palette.error.main}` } : {}),
                                }}
                            >
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600} noWrap>
                                        {row.regnumber || `#${row.pk}`}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" noWrap>{row.tipo || '—'}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title={location || '—'}>
                                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                                            {location || '—'}
                                        </Typography>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {row.ts_entity || '—'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {operatorName != null ? (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <PersonIcon fontSize="small" color={row.who === 0 ? 'action' : 'primary'} />
                                            <Typography variant="body2" noWrap color={row.who === 0 ? 'text.secondary' : 'text.primary'}>
                                                {operatorName}
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <UnassignedIcon fontSize="small" color="disabled" />
                                            <Typography variant="caption" color="text.secondary">Por atribuir</Typography>
                                        </Stack>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                        {fmtDate(row.submission)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                        {fmtDate(row.limitdate)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <RestdaysChip restdays={row.restdays} />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
const PedidosPanel = ({ pedidos, metaData, isLoading, error }) => {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);

    // Construir lista de categorias com pedidos filtrados
    const categories = useMemo(() => {
        if (!pedidos || typeof pedidos !== 'object') return [];

        return Object.entries(pedidos)
            .map(([viewKey, group]) => {
                const rows = (group?.data || []).filter((row) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                        String(row.regnumber || '').toLowerCase().includes(q) ||
                        String(row.tipo || '').toLowerCase().includes(q) ||
                        String(row.address || '').toLowerCase().includes(q) ||
                        String(row.nut4 || '').toLowerCase().includes(q) ||
                        String(row.ts_entity || '').toLowerCase().includes(q)
                    );
                });
                return {
                    key: viewKey,
                    name: group?.name || viewKey,
                    total: group?.total || 0,
                    rows,
                    unassigned: rows.filter(r => r.who == null).length,
                    overdue: rows.filter(r => r.restdays != null && Number(r.restdays) < 0).length,
                };
            })
            .filter(c => c.rows.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    }, [pedidos, search]);

    // Totais globais
    const totals = useMemo(() => {
        const allRows = categories.flatMap(c => c.rows);
        return {
            total: allRows.length,
            unassigned: allRows.filter(r => r.who == null).length,
            overdue: allRows.filter(r => r.restdays != null && Number(r.restdays) < 0).length,
            urgent: allRows.filter(r => r.urgency).length,
        };
    }, [categories]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">Erro ao carregar pedidos: {error.message}</Alert>;
    }

    return (
        <Box>
            {/* ── Resumo ── */}
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 120 }}>
                    <Typography variant="h5" fontWeight={700} color="primary.main">{totals.total}</Typography>
                    <Typography variant="caption" color="text.secondary">Total de pedidos</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 120 }}>
                    <Typography variant="h5" fontWeight={700} color="text.secondary">{totals.unassigned}</Typography>
                    <Typography variant="caption" color="text.secondary">Por atribuir</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 120 }}>
                    <Typography variant="h5" fontWeight={700} color="error.main">{totals.overdue}</Typography>
                    <Typography variant="caption" color="text.secondary">Em atraso</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 120 }}>
                    <Typography variant="h5" fontWeight={700} color="warning.main">{totals.urgent}</Typography>
                    <Typography variant="caption" color="text.secondary">Urgentes</Typography>
                </Paper>
            </Stack>

            {/* ── Pesquisa ── */}
            <Box sx={{ mb: 2 }}>
                <SearchBar searchTerm={search} onSearch={setSearch} />
            </Box>

            {/* ── Acordeões por categoria ── */}
            {categories.length === 0 ? (
                <Alert severity="info">
                    {search ? 'Nenhum pedido corresponde à pesquisa.' : 'Sem pedidos disponíveis.'}
                </Alert>
            ) : (
                categories.map((cat) => (
                    <Accordion
                        key={cat.key}
                        expanded={expanded === cat.key}
                        onChange={(_, isExpanded) => setExpanded(isExpanded ? cat.key : null)}
                        disableGutters
                        sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ minHeight: 52, bgcolor: alpha(theme.palette.primary.main, 0.03) }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', pr: 1 }}>
                                <FolderIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                                    {cat.name}
                                </Typography>
                                <Chip label={`${cat.rows.length}`} size="small" color="primary" />
                                {cat.unassigned > 0 && (
                                    <Chip
                                        icon={<UnassignedIcon />}
                                        label={cat.unassigned}
                                        size="small"
                                        color="default"
                                        variant="outlined"
                                        title="Por atribuir"
                                    />
                                )}
                                {cat.overdue > 0 && (
                                    <Chip
                                        icon={<WarningIcon />}
                                        label={cat.overdue}
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        title="Em atraso"
                                    />
                                )}
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                            <PedidosTable rows={cat.rows} metaData={metaData} onRowClick={setSelectedDoc} />
                        </AccordionDetails>
                    </Accordion>
                ))
            )}

            {/* ── Modal de detalhe do pedido ── */}
            {selectedDoc && (
                <DocumentDetailsModal
                    open={!!selectedDoc}
                    onClose={() => setSelectedDoc(null)}
                    documentData={selectedDoc}
                    isOwner={false}
                    isCreator={false}
                />
            )}
        </Box>
    );
};

export default PedidosPanel;
