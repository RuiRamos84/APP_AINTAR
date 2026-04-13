import { useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TableSortLabel, Paper, IconButton, Tooltip, Chip,
  Typography, Skeleton, Collapse, CircularProgress, Button, Grid,
  useTheme, alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
  Payment as PaymentIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { formatDate } from '../../documents/utils/documentUtils';

// ─── Formatador numérico ──────────────────────────────────────────────────────

const fmtNum = (v) =>
  v > 0
    ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    : null;

// ─── Colunas ─────────────────────────────────────────────────────────────────

const COLS = [
  { id: '_expand',          label: '',                 sortable: false, width: 40  },
  { id: 'regnumber',        label: 'Nº Pedido',        sortable: true              },
  { id: 'entity',           label: 'Entidade',         sortable: true              },
  { id: 'nut4',             label: 'Localidade',       sortable: true              },
  { id: 'comprimentoTotal', label: 'Comprimento (m)',  sortable: true, align: 'right' },
  { id: 'areaTotal',        label: 'Área (m²)',        sortable: true, align: 'right' },
  { id: 'submission',       label: 'Data',             sortable: true              },
  { id: '_acoes',           label: 'Ações',            sortable: false, align: 'center' },
];

// ─── Comparador ──────────────────────────────────────────────────────────────

function descendingComparator(a, b, orderBy) {
  const av = a[orderBy] ?? '';
  const bv = b[orderBy] ?? '';
  if (bv < av) return -1;
  if (bv > av) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) =>  descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// ─── Linha expandida ─────────────────────────────────────────────────────────

function ExpandedRow({ pav, colSpan }) {
  const theme = useTheme();

  const tiposPav = [
    { label: 'Betuminoso', comp: pav.comprimentoBet, area: pav.areaBet,  color: '#2E7D32' },
    { label: 'Paralelos',  comp: pav.comprimentoGra, area: pav.areaGra,  color: '#1976D2' },
    { label: 'Pavê',       comp: pav.comprimentoPav, area: pav.areaPav,  color: '#7B1FA2' },
  ];

  const moradaLine1 = [pav.address, pav.door, pav.floor].filter(Boolean).join(', ');
  const moradaLine2 = [pav.postal, pav.nut4, pav.nut3].filter(Boolean).join(' · ');

  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: 0 }}>
        <Collapse in timeout="auto" unmountOnExit>
          <Box sx={{
            py: 2, px: 3,
            bgcolor: alpha(theme.palette.background.default, 0.6),
            borderTop: `1px solid ${theme.palette.divider}`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}>
            <Grid container spacing={2}>

              {/* Morada */}
              <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                  Morada
                </Typography>
                {moradaLine1 ? (
                  <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{moradaLine1}</Typography>
                ) : null}
                {moradaLine2 ? (
                  <Typography variant="caption" color="text.secondary">{moradaLine2}</Typography>
                ) : null}
                {!moradaLine1 && !moradaLine2 && (
                  <Typography variant="body2" color="text.disabled">—</Typography>
                )}
                {pav.nut2 && (
                  <Typography variant="caption" color="text.disabled" display="block">
                    Concelho: {pav.nut2}
                  </Typography>
                )}
              </Grid>

              {/* Contacto */}
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                  Contacto
                </Typography>
                <Typography variant="body2">{pav.phone || '—'}</Typography>
              </Grid>

              {/* Pavimentação por tipo */}
              <Grid size={{ xs: 12, sm: 12, md: 5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                  Pavimentação
                </Typography>
                <Box sx={{
                  p: 0.75,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                  borderRadius: 1,
                }}>
                  <Grid container spacing={0.75}>
                    {tiposPav.map(({ label, comp, area, color }) => {
                      const hasData = comp > 0 || area > 0;
                      return (
                        <Grid size={{ xs: 4 }} key={label}>
                          <Box sx={{
                            p: 0.75, borderRadius: 1, textAlign: 'center',
                            bgcolor: hasData ? alpha(color, 0.08) : alpha(theme.palette.grey[300], 0.3),
                            border: hasData
                              ? `2px solid ${alpha(color, 0.3)}`
                              : `1px solid ${alpha(theme.palette.grey[400], 0.2)}`,
                            opacity: hasData ? 1 : 0.55,
                            transition: 'all 0.2s',
                          }}>
                            <Typography variant="caption" sx={{
                              fontWeight: 700, display: 'block', fontSize: '0.72rem',
                              color: hasData ? color : 'text.secondary', mb: 0.5,
                            }}>
                              {label}
                            </Typography>
                            {hasData ? (
                              <Box>
                                {comp > 0 && (
                                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color }}>
                                    {fmtNum(comp)} m <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>linear</Typography>
                                  </Typography>
                                )}
                                {area > 0 && (
                                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color }}>
                                    {fmtNum(area)} m² <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>área</Typography>
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                                Sem dados
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </Grid>

              {/* Observações */}
              {pav.memo && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                    Observações
                  </Typography>
                  <Typography variant="body2" sx={{
                    p: 1, borderRadius: 0.5, fontStyle: 'italic', fontSize: '0.85rem',
                    bgcolor: alpha(theme.palette.info.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {pav.memo}
                  </Typography>
                </Grid>
              )}

            </Grid>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

// ─── PavimentosList ───────────────────────────────────────────────────────────

export default function PavimentosList({
  pavimentos,
  loading,
  status,
  canExecute,
  canPay,
  actionLoading,
  onAction,
  onViewDocument,
}) {
  const [order,        setOrder]        = useState('asc');
  const [orderBy,      setOrderBy]      = useState('regnumber');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleSort = (col) => {
    const isAsc = orderBy === col && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const toggleRow = (pk) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(pk) ? next.delete(pk) : next.add(pk);
      return next;
    });
  };

  const sorted = [...pavimentos].sort(getComparator(order, orderBy));

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}
      </Box>
    );
  }

  if (!pavimentos.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <Typography variant="body2">Nenhuma pavimentação encontrada.</Typography>
      </Box>
    );
  }

  // Coluna Ações só aparece se o utilizador pode realizar a acção desse tab
  const showActions = (status === 'pending' && canExecute) ||
                      (status === 'executed' && canPay);

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {COLS.map((col) => {
              if (col.id === '_acoes' && !showActions) return null;
              return (
                <TableCell
                  key={col.id}
                  align={col.align}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap', width: col.width }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          {sorted.map((pav) => {
            const isExpanded   = expandedRows.has(pav.pk);
            const isActing     = actionLoading === pav.pk;
            const colSpanCount = showActions ? COLS.length : COLS.length - 1;

            return [
              <TableRow key={pav.pk} hover>
                {/* Expandir */}
                <TableCell padding="checkbox">
                  <IconButton size="small" onClick={() => toggleRow(pav.pk)}>
                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                </TableCell>

                {/* Nº Pedido — chip clicável para abrir modal */}
                <TableCell>
                  <Tooltip title="Ver detalhes do pedido" arrow>
                    <Chip
                      label={pav.regnumber ?? '—'}
                      size="small"
                      variant="outlined"
                      color="primary"
                      icon={<OpenInNewIcon sx={{ fontSize: '12px !important' }} />}
                      onClick={onViewDocument ? (e) => { e.stopPropagation(); onViewDocument(pav.regnumber, pav); } : undefined}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        cursor: onViewDocument ? 'pointer' : 'default',
                        '&:hover': onViewDocument ? { bgcolor: 'primary.50' } : {},
                      }}
                    />
                  </Tooltip>
                </TableCell>

                {/* Entidade */}
                <TableCell onClick={() => toggleRow(pav.pk)} sx={{ cursor: 'pointer', maxWidth: 160 }}>
                  <Typography variant="body2" noWrap>{pav.entity ?? '—'}</Typography>
                </TableCell>

                {/* Localidade */}
                <TableCell onClick={() => toggleRow(pav.pk)} sx={{ cursor: 'pointer' }}>
                  <Typography variant="body2">{pav.nut4 ?? '—'}</Typography>
                </TableCell>

                {/* Comprimento */}
                <TableCell align="right" onClick={() => toggleRow(pav.pk)} sx={{ cursor: 'pointer' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {fmtNum(pav.comprimentoTotal) ?? '—'}
                  </Typography>
                </TableCell>

                {/* Área */}
                <TableCell align="right" onClick={() => toggleRow(pav.pk)} sx={{ cursor: 'pointer' }}>
                  <Typography variant="body2">
                    {fmtNum(pav.areaTotal) ?? '—'}
                  </Typography>
                </TableCell>

                {/* Data */}
                <TableCell onClick={() => toggleRow(pav.pk)} sx={{ cursor: 'pointer', color: 'text.secondary', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {formatDate(pav.submission)}
                </TableCell>

                {/* Ações */}
                {showActions && (
                  <TableCell align="center">
                    {isActing ? (
                      <CircularProgress size={20} />
                    ) : (
                      <>
                        {status === 'pending' && canExecute && (
                          <Tooltip title="Executar">
                            <Button
                              size="small" variant="contained" color="primary"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => onAction(pav.pk, 'execute', pav)}
                              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                              Executar
                            </Button>
                          </Tooltip>
                        )}
                        {status === 'executed' && canPay && (
                          <Tooltip title="Marcar como Paga">
                            <Button
                              size="small" variant="contained" color="success"
                              startIcon={<PaymentIcon />}
                              onClick={() => onAction(pav.pk, 'pay', pav)}
                              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                              Marcar como Paga
                            </Button>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>,

              isExpanded && (
                <ExpandedRow
                  key={`${pav.pk}-expanded`}
                  pav={pav}
                  colSpan={colSpanCount}
                />
              ),
            ];
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
