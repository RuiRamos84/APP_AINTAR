import { useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TableSortLabel, Paper, IconButton, Tooltip, Chip,
  Typography, Skeleton, Collapse, CircularProgress, Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';

// ─── Formatadores ─────────────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const dateStr = d.includes('T') ? d : d.replace(' ', 'T');
    return new Date(dateStr).toLocaleDateString('pt-PT');
  } catch {
    return d;
  }
};

const fmtNum = (v) =>
  v > 0
    ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    : '—';

// ─── Colunas ──────────────────────────────────────────────────────────────────

const COLS = [
  { id: '_expand',        label: '',              sortable: false, width: 40   },
  { id: 'regnumber',      label: 'Nº Pedido',     sortable: true               },
  { id: 'entity',         label: 'Entidade',      sortable: true               },
  { id: 'nut4',           label: 'Localidade',    sortable: true               },
  { id: 'comprimentoTotal', label: 'Comprimento (m)', sortable: true, align: 'right' },
  { id: 'areaTotal',      label: 'Área (m²)',     sortable: true,  align: 'right' },
  { id: 'submission',     label: 'Data',          sortable: true               },
  { id: '_acoes',         label: 'Ações',         sortable: false, align: 'center' },
];

// ─── Comparador de ordenação ─────────────────────────────────────────────────

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

// ─── Linha expandida ──────────────────────────────────────────────────────────

function ExpandedRow({ pav, colSpan }) {
  const tiposPav = [
    { key: 'Bet',  label: 'Betuminoso', comp: pav.comprimentoBet, area: pav.areaBet  },
    { key: 'Gra',  label: 'Paralelos',  comp: pav.comprimentoGra, area: pav.areaGra  },
    { key: 'Pav',  label: 'Pavê',       comp: pav.comprimentoPav, area: pav.areaPav  },
  ].filter(({ comp, area }) => comp > 0 || area > 0);

  const morada = [pav.address, pav.door, pav.floor, pav.postal]
    .filter(Boolean)
    .join(', ');

  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: 0, bgcolor: 'action.hover' }}>
        <Collapse in timeout="auto" unmountOnExit>
          <Box sx={{ py: 1.5, px: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {/* Morada */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Morada
              </Typography>
              <Typography variant="body2">{morada || '—'}</Typography>
              {pav.phone && (
                <Typography variant="body2" color="text.secondary">
                  Tel: {pav.phone}
                </Typography>
              )}
            </Box>

            {/* Localização */}
            {(pav.nut3 || pav.nut2) && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  Localização
                </Typography>
                {pav.nut3 && <Typography variant="body2">Freguesia: {pav.nut3}</Typography>}
                {pav.nut2 && <Typography variant="body2">Concelho: {pav.nut2}</Typography>}
              </Box>
            )}

            {/* Detalhes por tipo de pavimento */}
            {tiposPav.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  Detalhes do Pavimento
                </Typography>
                {tiposPav.map(({ key, label, comp, area }) => (
                  <Typography key={key} variant="body2">
                    {label}: {fmtNum(comp)} m &nbsp;/&nbsp; {fmtNum(area)} m²
                  </Typography>
                ))}
              </Box>
            )}

            {/* Memo */}
            {pav.memo && (
              <Box sx={{ flexBasis: '100%' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  Observações
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {pav.memo}
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

// ─── PavimentosList ───────────────────────────────────────────────────────────

/**
 * Tabela de pavimentações com ordenação, linhas expansíveis e ações.
 *
 * @param {{
 *   pavimentos:    Array,
 *   loading:       boolean,
 *   status:        'pending'|'executed'|'completed',
 *   canManage:     boolean,
 *   actionLoading: number|null,
 *   onAction:      (pk: number, acao: string, pav: object) => void
 * }} props
 */
export default function PavimentosList({
  pavimentos,
  loading,
  status,
  canManage,
  actionLoading,
  onAction,
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

  // Skeleton
  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  // Empty state
  if (!pavimentos.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <Typography variant="body2">Nenhuma pavimentação encontrada.</Typography>
      </Box>
    );
  }

  const showActions = status !== 'completed';

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
            const isExpanded    = expandedRows.has(pav.pk);
            const isActing      = actionLoading === pav.pk;
            const colSpanCount  = showActions ? COLS.length : COLS.length - 1;

            return [
              <TableRow key={pav.pk} hover sx={{ cursor: 'pointer' }}>
                {/* Expandir */}
                <TableCell padding="checkbox">
                  <IconButton size="small" onClick={() => toggleRow(pav.pk)}>
                    {isExpanded ? (
                      <ExpandLessIcon fontSize="small" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" />
                    )}
                  </IconButton>
                </TableCell>

                {/* Nº Pedido */}
                <TableCell onClick={() => toggleRow(pav.pk)}>
                  <Chip
                    label={pav.regnumber ?? '—'}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                </TableCell>

                {/* Entidade */}
                <TableCell onClick={() => toggleRow(pav.pk)} sx={{ maxWidth: 160 }}>
                  <Typography variant="body2" noWrap>{pav.entity ?? '—'}</Typography>
                </TableCell>

                {/* Localidade */}
                <TableCell onClick={() => toggleRow(pav.pk)}>
                  <Typography variant="body2">{pav.nut4 ?? '—'}</Typography>
                </TableCell>

                {/* Comprimento */}
                <TableCell align="right" onClick={() => toggleRow(pav.pk)}>
                  <Typography variant="body2" fontWeight={500}>
                    {fmtNum(pav.comprimentoTotal)}
                  </Typography>
                </TableCell>

                {/* Área */}
                <TableCell align="right" onClick={() => toggleRow(pav.pk)}>
                  <Typography variant="body2">
                    {fmtNum(pav.areaTotal)}
                  </Typography>
                </TableCell>

                {/* Data */}
                <TableCell onClick={() => toggleRow(pav.pk)} sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  {formatDate(pav.submission)}
                </TableCell>

                {/* Ações */}
                {showActions && (
                  <TableCell align="center">
                    {canManage && (
                      isActing ? (
                        <CircularProgress size={20} />
                      ) : (
                        <>
                          {status === 'pending' && (
                            <Tooltip title="Executar">
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => onAction(pav.pk, 'execute', pav)}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                              >
                                Executar
                              </Button>
                            </Tooltip>
                          )}
                          {status === 'executed' && (
                            <Tooltip title="Marcar como Paga">
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<PaymentIcon />}
                                onClick={() => onAction(pav.pk, 'pay', pav)}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                              >
                                Marcar como Paga
                              </Button>
                            </Tooltip>
                          )}
                        </>
                      )
                    )}
                  </TableCell>
                )}
              </TableRow>,

              // Linha expandida
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
