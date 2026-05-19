import React, { useMemo, useState } from 'react';
import {
    Box, Typography, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, LinearProgress,
    Stack, Chip,
    alpha,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useSncapSummary } from '../hooks/useOrcamentoQueries';

const MODULE_COLOR = '#059669';

const fmt = (v) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const pct = (part, total) =>
    total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

const thSx = {
    fontWeight: 700, fontSize: '0.72rem',
    textTransform: 'uppercase', color: 'text.secondary',
    letterSpacing: 0.5, py: 1,
};

/* ── Única tabela plana — colunas sempre alinhadas ───────────── */
export const SncapPanel = ({ ano, searchTerm = '' }) => {
    const { data = [], isLoading, error } = useSncapSummary(ano);

    const [openL1, setOpenL1] = useState({});
    const [openL2, setOpenL2] = useState({});
    const [openL3, setOpenL3] = useState({});

    const toggleL1 = (c) => setOpenL1(p => ({ ...p, [c]: !p[c] }));
    const toggleL2 = (c) => setOpenL2(p => ({ ...p, [c]: !p[c] }));
    const toggleL3 = (c) => setOpenL3(p => ({ ...p, [c]: !p[c] }));

    /* ── filtra e inclui ancestrais ─────────────────────────── */
    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return data;
        const keep = new Set();
        data.forEach(r => {
            if (r.codigo?.toLowerCase().includes(term) || r.label?.toLowerCase().includes(term)) {
                keep.add(r.codigo);
                const parts = r.codigo.split('.');
                for (let i = 1; i < parts.length; i++)
                    keep.add(parts.slice(0, i).join('.'));
            }
        });
        return data.filter(r => keep.has(r.codigo));
    }, [data, searchTerm]);

    const isSearching = searchTerm.trim().length > 0;
    const isOpenL1 = (c) => isSearching || !!openL1[c];
    const isOpenL2 = (c) => isSearching || !!openL2[c];
    const isOpenL3 = (c) => isSearching || !!openL3[c];

    /* ── árvore ─────────────────────────────────────────────── */
    const tree = useMemo(() => {
        const l1s = filtered.filter(r => r.level === 1);
        return l1s.map(l1 => ({
            ...l1,
            children: filtered
                .filter(r => r.level === 2 && r.codigo.startsWith(l1.codigo + '.'))
                .map(l2 => ({
                    ...l2,
                    children: filtered
                        .filter(r => r.level === 3 && r.codigo.startsWith(l2.codigo + '.'))
                        .map(l3 => ({
                            ...l3,
                            children: filtered.filter(
                                r => r.level === 4 && r.codigo.startsWith(l3.codigo + '.')
                            ),
                        })),
                })),
        }));
    }, [filtered]);

    const totalGeral = useMemo(
        () => tree.reduce((s, n) => s + (parseFloat(n.total) || 0), 0),
        [tree]
    );

    if (isLoading) return (
        <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress sx={{ color: MODULE_COLOR }} />
        </Box>
    );
    if (error) return (
        <Alert severity="error" sx={{ mt: 1 }}>Erro ao carregar análise SNC-AP.</Alert>
    );
    if (!tree.length) return (
        <Box py={6} textAlign="center" color="text.disabled">
            <Typography variant="body2">
                {isSearching ? 'Nenhum resultado encontrado.' : 'Sem dados para o ano selecionado.'}
            </Typography>
        </Box>
    );

    return (
        <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <TableContainer sx={{ height: { xs: 'auto', sm: 'calc(100vh - 280px)' }, overflow: 'auto' }}>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: 160 }} />
                        <col />
                        <col style={{ width: 150 }} />
                        <col style={{ width: 120 }} />
                    </colgroup>
                    <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={thSx}>Código</TableCell>
                            <TableCell sx={thSx}>Designação</TableCell>
                            <TableCell align="right" sx={thSx}>Total</TableCell>
                            <TableCell align="right" sx={{ ...thSx, pr: 2 }}>% Orçamento</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tree.map((l1) => {
                            const t1    = parseFloat(l1.total) || 0;
                            const ratio = totalGeral > 0 ? (t1 / totalGeral) * 100 : 0;
                            const l1Open = isOpenL1(l1.codigo);

                            return (
                                <React.Fragment key={l1.codigo}>
                                    {/* ── Nível 1 ── */}
                                    <TableRow
                                        onClick={() => toggleL1(l1.codigo)}
                                        sx={{
                                            cursor: 'pointer',
                                            bgcolor: alpha(MODULE_COLOR, 0.07),
                                            '&:hover': { bgcolor: alpha(MODULE_COLOR, 0.12) },
                                            transition: 'background-color .15s',
                                        }}
                                    >
                                        <TableCell sx={{ pl: 1.5, py: 1.25 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="caption" fontFamily="monospace"
                                                    fontWeight={700} color={MODULE_COLOR}>
                                                    {l1.codigo}
                                                </Typography>
                                                <Chip label={l1.children.length} size="small" sx={{
                                                    height: 16, fontSize: '0.64rem',
                                                    bgcolor: alpha(MODULE_COLOR, 0.15),
                                                    color: MODULE_COLOR, fontWeight: 700,
                                                }} />
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.25, overflow: 'hidden' }}>
                                            <Typography variant="subtitle2" fontWeight={700} noWrap title={l1.label ?? ''}>
                                                {l1.label ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1.25 }}>
                                            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                                                <Typography variant="subtitle2" fontWeight={700} color={MODULE_COLOR}>
                                                    {fmt(t1)}
                                                </Typography>
                                                {l1Open
                                                    ? <ExpandLessIcon sx={{ fontSize: 16, color: MODULE_COLOR }} />
                                                    : <ExpandMoreIcon sx={{ fontSize: 16, color: MODULE_COLOR }} />
                                                }
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.25, pr: 2 }}>
                                            <LinearProgress variant="determinate" value={Math.min(ratio, 100)} sx={{
                                                height: 5, borderRadius: 3, mb: 0.4,
                                                bgcolor: alpha(MODULE_COLOR, 0.12),
                                                '& .MuiLinearProgress-bar': { bgcolor: MODULE_COLOR, borderRadius: 3 },
                                            }} />
                                            <Typography variant="caption" color="text.secondary" display="block" textAlign="right">
                                                {ratio.toFixed(1)}%
                                            </Typography>
                                        </TableCell>
                                    </TableRow>

                                    {l1Open && l1.children.map((l2) => {
                                        const t2     = parseFloat(l2.total) || 0;
                                        const l2Open = isOpenL2(l2.codigo);

                                        return (
                                            <React.Fragment key={l2.codigo}>
                                                {/* ── Nível 2 ── */}
                                                <TableRow
                                                    onClick={() => toggleL2(l2.codigo)}
                                                    sx={{
                                                        cursor: l2.children.length ? 'pointer' : 'default',
                                                        '&:hover': l2.children.length ? { bgcolor: alpha(MODULE_COLOR, 0.04) } : {},
                                                    }}
                                                >
                                                    <TableCell sx={{ pl: 4, py: 0.75 }}>
                                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                                            {l2.children.length > 0 && (
                                                                <Box component="span" sx={{ color: 'text.disabled', lineHeight: 1 }}>
                                                                    {l2Open
                                                                        ? <ExpandLessIcon sx={{ fontSize: 14 }} />
                                                                        : <ExpandMoreIcon sx={{ fontSize: 14 }} />
                                                                    }
                                                                </Box>
                                                            )}
                                                            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                                                {l2.codigo}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 0.75, overflow: 'hidden' }}>
                                                        <Typography variant="body2" fontSize="0.81rem" noWrap title={l2.label ?? ''}>
                                                            {l2.label ?? '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ py: 0.75 }}>
                                                        <Typography variant="body2" fontSize="0.81rem">{fmt(t2)}</Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ py: 0.75, pr: 2 }}>
                                                        <Typography variant="caption" color="text.disabled">
                                                            {pct(t2, totalGeral)}%
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>

                                                {l2Open && l2.children.map((l3) => {
                                                    const t3     = parseFloat(l3.total) || 0;
                                                    const l3Open = isOpenL3(l3.codigo);

                                                    return (
                                                        <React.Fragment key={l3.codigo}>
                                                            {/* ── Nível 3 ── */}
                                                            <TableRow
                                                                onClick={() => toggleL3(l3.codigo)}
                                                                sx={{
                                                                    cursor: l3.children.length ? 'pointer' : 'default',
                                                                    bgcolor: alpha(MODULE_COLOR, 0.015),
                                                                    '&:hover': l3.children.length ? { bgcolor: alpha(MODULE_COLOR, 0.04) } : {},
                                                                }}
                                                            >
                                                                <TableCell sx={{ pl: 6.5, py: 0.6 }}>
                                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                        {l3.children.length > 0 && (
                                                                            <Box component="span" sx={{ color: 'text.disabled', lineHeight: 1 }}>
                                                                                {l3Open
                                                                                    ? <ExpandLessIcon sx={{ fontSize: 12 }} />
                                                                                    : <ExpandMoreIcon sx={{ fontSize: 12 }} />
                                                                                }
                                                                            </Box>
                                                                        )}
                                                                        <Typography variant="caption" fontFamily="monospace" color="text.disabled">
                                                                            {l3.codigo}
                                                                        </Typography>
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell sx={{ py: 0.6, overflow: 'hidden' }}>
                                                                    <Typography variant="caption" color="text.secondary" noWrap title={l3.label ?? ''}>
                                                                        {l3.label ?? '—'}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 0.6 }}>
                                                                    <Typography variant="caption">{fmt(t3)}</Typography>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 0.6, pr: 2 }}>
                                                                    <Typography variant="caption" color="text.disabled">
                                                                        {pct(t3, totalGeral)}%
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>

                                                            {/* ── Nível 4 ── */}
                                                            {l3Open && l3.children.map((l4) => {
                                                                const t4 = parseFloat(l4.total) || 0;
                                                                return (
                                                                    <TableRow key={l4.codigo} sx={{
                                                                        bgcolor: alpha(MODULE_COLOR, 0.008),
                                                                    }}>
                                                                        <TableCell sx={{ pl: 9, py: 0.5 }}>
                                                                            <Typography variant="caption"
                                                                                fontFamily="monospace"
                                                                                color="text.disabled"
                                                                                fontSize="0.68rem">
                                                                                {l4.codigo}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell sx={{ py: 0.5, overflow: 'hidden' }}>
                                                                            <Typography variant="caption"
                                                                                color="text.disabled" noWrap
                                                                                title={l4.label ?? ''}
                                                                                fontSize="0.68rem">
                                                                                {l4.label ?? '—'}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ py: 0.5 }}>
                                                                            <Typography variant="caption" fontSize="0.68rem">
                                                                                {fmt(t4)}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ py: 0.5, pr: 2 }}>
                                                                            <Typography variant="caption" color="text.disabled" fontSize="0.68rem">
                                                                                {pct(t4, totalGeral)}%
                                                                            </Typography>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};
