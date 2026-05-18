import React, { useMemo, useState } from 'react';
import {
    Box, Typography, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, LinearProgress,
    Collapse, Stack, Chip,
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

/* ── colgroup partilhado ─────────────────────────────────────── */
const COLS = (
    <colgroup>
        <col style={{ width: 110 }} />
        <col />
        <col style={{ width: 140 }} />
        <col style={{ width: 110 }} />
    </colgroup>
);

const thSx = {
    fontWeight: 700, fontSize: '0.72rem',
    textTransform: 'uppercase', color: 'text.secondary',
    letterSpacing: 0.5, py: 1,
};

/* ── L3Section — agrupa L3 + filhos L4 ──────────────────────── */
const L3Section = ({ node, totalGeral, open, onToggle }) => {
    const t3    = parseFloat(node.total) || 0;
    const hasL4 = node.children.length > 0;

    return (
        <>
            <TableRow
                onClick={hasL4 ? onToggle : undefined}
                sx={{
                    cursor: hasL4 ? 'pointer' : 'default',
                    bgcolor: alpha(MODULE_COLOR, 0.015),
                    '&:hover': hasL4 ? { bgcolor: alpha(MODULE_COLOR, 0.04) } : {},
                    '& td': { borderBottom: open ? 'none' : undefined },
                }}
            >
                <TableCell sx={{ pl: 6.5, py: 0.6 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        {hasL4 && (
                            <Box component="span" sx={{ color: 'text.disabled', lineHeight: 1 }}>
                                {open
                                    ? <ExpandLessIcon sx={{ fontSize: 12 }} />
                                    : <ExpandMoreIcon sx={{ fontSize: 12 }} />
                                }
                            </Box>
                        )}
                        <Typography variant="caption" fontFamily="monospace" color="text.disabled">
                            {node.codigo}
                        </Typography>
                    </Stack>
                </TableCell>
                <TableCell sx={{ overflow: 'hidden', py: 0.6 }}>
                    <Typography variant="caption" color="text.secondary" noWrap title={node.label ?? ''}>
                        {node.label ?? '—'}
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

            {hasL4 && (
                <TableRow sx={{ p: 0 }}>
                    <TableCell colSpan={4} sx={{ p: 0, border: 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                {COLS}
                                <TableBody>
                                    {node.children.map((l4) => {
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
                                                <TableCell sx={{ overflow: 'hidden', py: 0.5 }}>
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
                                </TableBody>
                            </Table>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

/* ── L2Section — agrupa L2 + filhos L3 ──────────────────────── */
const L2Section = ({ node, totalGeral, open, onToggle, openL3, onToggleL3 }) => {
    const total   = parseFloat(node.total) || 0;
    const hasL3   = node.children.length > 0;

    return (
        <>
            <TableRow
                onClick={hasL3 ? onToggle : undefined}
                sx={{
                    cursor: hasL3 ? 'pointer' : 'default',
                    bgcolor: 'transparent',
                    '&:hover': hasL3 ? { bgcolor: alpha(MODULE_COLOR, 0.04) } : {},
                    '& td': { borderBottom: open ? 'none' : undefined },
                }}
            >
                <TableCell sx={{ pl: 4, py: 0.75 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                        {hasL3 && (
                            <Box component="span" sx={{ color: 'text.disabled', lineHeight: 1 }}>
                                {open
                                    ? <ExpandLessIcon sx={{ fontSize: 14 }} />
                                    : <ExpandMoreIcon sx={{ fontSize: 14 }} />
                                }
                            </Box>
                        )}
                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {node.codigo}
                        </Typography>
                    </Stack>
                </TableCell>
                <TableCell sx={{ overflow: 'hidden', py: 0.75 }}>
                    <Typography variant="body2" fontSize="0.81rem" noWrap title={node.label ?? ''}>
                        {node.label ?? '—'}
                    </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                    <Typography variant="body2" fontSize="0.81rem">{fmt(total)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75, pr: 2 }}>
                    <Typography variant="caption" color="text.disabled">
                        {pct(total, totalGeral)}%
                    </Typography>
                </TableCell>
            </TableRow>

            {hasL3 && (
                <TableRow sx={{ p: 0 }}>
                    <TableCell colSpan={4} sx={{ p: 0, border: 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                {COLS}
                                <TableBody>
                                    {node.children.map((l3) => (
                                        <L3Section
                                            key={l3.codigo}
                                            node={l3}
                                            totalGeral={totalGeral}
                                            open={!!openL3[l3.codigo]}
                                            onToggle={() => onToggleL3(l3.codigo)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

/* ── L1Section — agrupa L1 + filhos L2 ──────────────────────── */
const L1Section = ({ node, totalGeral, open, onToggle, openL2, onToggleL2, openL3, onToggleL3 }) => {
    const total = parseFloat(node.total) || 0;
    const ratio = totalGeral > 0 ? (total / totalGeral) * 100 : 0;

    return (
        <>
            <TableRow
                onClick={onToggle}
                sx={{
                    cursor: 'pointer',
                    bgcolor: alpha(MODULE_COLOR, 0.07),
                    '&:hover': { bgcolor: alpha(MODULE_COLOR, 0.12) },
                    '& td': { borderBottom: open ? 'none' : undefined },
                    transition: 'background-color .15s',
                }}
            >
                <TableCell sx={{ pl: 1.5, py: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" fontFamily="monospace"
                            fontWeight={700} color={MODULE_COLOR}>
                            {node.codigo}
                        </Typography>
                        <Chip label={node.children.length} size="small" sx={{
                            height: 16, fontSize: '0.64rem',
                            bgcolor: alpha(MODULE_COLOR, 0.15),
                            color: MODULE_COLOR, fontWeight: 700,
                        }} />
                    </Stack>
                </TableCell>
                <TableCell sx={{ overflow: 'hidden', py: 1.25 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap title={node.label ?? ''}>
                        {node.label ?? '—'}
                    </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                        <Typography variant="subtitle2" fontWeight={700} color={MODULE_COLOR}>
                            {fmt(total)}
                        </Typography>
                        {open
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

            <TableRow sx={{ p: 0 }}>
                <TableCell colSpan={4} sx={{ p: 0, border: 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                            {COLS}
                            <TableBody>
                                {node.children.map((l2) => (
                                    <L2Section
                                        key={l2.codigo}
                                        node={l2}
                                        totalGeral={totalGeral}
                                        open={!!openL2[l2.codigo]}
                                        onToggle={() => onToggleL2(l2.codigo)}
                                        openL3={openL3}
                                        onToggleL3={onToggleL3}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

/* ── SncapPanel ──────────────────────────────────────────────── */
export const SncapPanel = ({ ano }) => {
    const { data = [], isLoading, error } = useSncapSummary(ano);

    const [openL1, setOpenL1] = useState({});
    const [openL2, setOpenL2] = useState({});
    const [openL3, setOpenL3] = useState({});

    const toggleL1 = (codigo) => setOpenL1(p => ({ ...p, [codigo]: !p[codigo] }));
    const toggleL2 = (codigo) => setOpenL2(p => ({ ...p, [codigo]: !p[codigo] }));
    const toggleL3 = (codigo) => setOpenL3(p => ({ ...p, [codigo]: !p[codigo] }));

    const tree = useMemo(() => {
        const l1s = data.filter(r => r.level === 1);
        return l1s.map(l1 => {
            const l2s = data.filter(
                r => r.level === 2 && r.codigo.startsWith(l1.codigo + '.')
            );
            return {
                ...l1,
                children: l2s.map(l2 => {
                    const l3s = data.filter(
                        r => r.level === 3 && r.codigo.startsWith(l2.codigo + '.')
                    );
                    return {
                        ...l2,
                        children: l3s.map(l3 => ({
                            ...l3,
                            children: data.filter(
                                r => r.level === 4 && r.codigo.startsWith(l3.codigo + '.')
                            ),
                        })),
                    };
                }),
            };
        });
    }, [data]);

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
            <Typography variant="body2">Sem dados para o ano selecionado.</Typography>
        </Box>
    );

    return (
        <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <TableContainer sx={{ height: { xs: 'auto', sm: 'calc(100vh - 280px)' }, overflow: 'auto' }}>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    {COLS}
                    <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={thSx}>Código</TableCell>
                            <TableCell sx={thSx}>Designação</TableCell>
                            <TableCell align="right" sx={thSx}>Total</TableCell>
                            <TableCell align="right" sx={{ ...thSx, pr: 2 }}>% Orçamento</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tree.map((node) => (
                            <L1Section
                                key={node.codigo}
                                node={node}
                                totalGeral={totalGeral}
                                open={!!openL1[node.codigo]}
                                onToggle={() => toggleL1(node.codigo)}
                                openL2={openL2}
                                onToggleL2={toggleL2}
                                openL3={openL3}
                                onToggleL3={toggleL3}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};
