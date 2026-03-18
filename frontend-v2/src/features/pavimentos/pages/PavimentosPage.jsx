/**
 * PavimentosPage
 * Gestão de pavimentações em 3 estados: Pendentes → Executadas → Concluídas
 */

import { useState, useMemo } from 'react';
import {
  Box, Tab, Tabs, Typography, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Skeleton, Alert, Tooltip, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Stack, Card, CardContent,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PaymentIcon from '@mui/icons-material/Payment';
import RefreshIcon from '@mui/icons-material/Refresh';
import StraightenIcon from '@mui/icons-material/Straighten';
import { usePavimentos } from '../hooks/usePavimentos';

// ─── Config das tabs ──────────────────────────────────────────────────────────

const TABS = [
  { status: 'pending',   label: 'Pendentes',  icon: HourglassEmptyIcon, color: 'warning', actionLabel: 'Executar', actionIcon: PlayArrowIcon },
  { status: 'executed',  label: 'Executadas', icon: BuildIcon,           color: 'info',    actionLabel: 'Pagar',    actionIcon: PaymentIcon },
  { status: 'completed', label: 'Concluídas', icon: CheckCircleIcon,     color: 'success', actionLabel: null,       actionIcon: null },
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const StatCard = ({ label, value, unit, color }) => (
  <Card variant="outlined" sx={{ borderRadius: 2 }}>
    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} color={`${color}.main`}>
        {value} <Typography component="span" variant="caption" color="text.secondary">{unit}</Typography>
      </Typography>
    </CardContent>
  </Card>
);

const fmt = (v) => (v > 0 ? v.toFixed(2) : '—');

// ─── Página principal ─────────────────────────────────────────────────────────

const PavimentosPage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [confirmItem, setConfirmItem] = useState(null); // item a confirmar
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const currentTab = TABS[tabIndex];
  const { items, isLoading, isFetching, isError, refetch, advance, isAdvancing } = usePavimentos(currentTab.status);

  // Filtro de pesquisa
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      ['regnumber', 'ts_entity', 'nut4', 'nut3', 'nut2', 'address', 'phone'].some(
        (f) => r[f]?.toString().toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  // Estatísticas do conjunto filtrado
  const stats = useMemo(() => ({
    count: filtered.length,
    comprimento: filtered.reduce((s, r) => s + (r.comprimento_total || 0), 0),
    area: filtered.reduce((s, r) => s + (r.area_total || 0), 0),
  }), [filtered]);

  const handleAction = () => {
    if (!confirmItem) return;
    advance(confirmItem.pk);
    setConfirmItem(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Pavimentações</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão do ciclo de vida das pavimentações de ramais
          </Typography>
        </Box>
        <Tooltip title="Atualizar dados">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refetch}
            disabled={isFetching}
          >
            Atualizar
          </Button>
        </Tooltip>
      </Box>

      {/* Tabs de estado */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2.5 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => { setTabIndex(v); setSearch(''); setPage(0); }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <Tab
                key={tab.status}
                icon={<Icon fontSize="small" />}
                iconPosition="start"
                label={tab.label}
                sx={{ textTransform: 'none', fontWeight: tabIndex === i ? 700 : 400, minHeight: 52 }}
              />
            );
          })}
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Estatísticas + pesquisa */}
          <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <StatCard label="Total" value={stats.count} unit="registos" color={currentTab.color} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Comprimento total" value={fmt(stats.comprimento)} unit="m" color={currentTab.color} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Área total" value={fmt(stats.area)} unit="m²" color={currentTab.color} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>

          {/* Tabela */}
          {isError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Erro ao carregar pavimentações. Tente atualizar a página.
            </Alert>
          ) : (
            <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Nº Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Entidade</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Localidade</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: 'none', lg: 'table-cell' } }}>Morada</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      <Tooltip title="Comprimento total (m)"><StraightenIcon fontSize="small" /></Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }} align="right">Área (m²)</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Submissão</TableCell>
                    {currentTab.actionLabel && <TableCell sx={{ fontWeight: 700 }} align="center">Ação</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">
                          {search ? 'Nenhum resultado para a pesquisa.' : `Sem pavimentações ${currentTab.label.toLowerCase()}.`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                      <TableRow key={row.pk} hover>
                        <TableCell>
                          <Chip
                            label={row.regnumber}
                            size="small"
                            color={currentTab.color}
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 140 }}>
                          <Typography variant="body2" noWrap>{row.ts_entity || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2">{row.nut4 || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, maxWidth: 180 }}>
                          <Typography variant="body2" noWrap>
                            {[row.address, row.door].filter(Boolean).join(', ') || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {row.comprimento_total > 0 ? row.comprimento_total.toFixed(1) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography variant="body2">
                            {row.area_total > 0 ? row.area_total.toFixed(1) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                            {row.submission?.split(' às ')[0] || '—'}
                          </Typography>
                        </TableCell>
                        {currentTab.actionLabel && (
                          <TableCell align="center">
                            <Tooltip title={currentTab.actionLabel}>
                              <Button
                                size="small"
                                variant="contained"
                                color={currentTab.color}
                                onClick={() => setConfirmItem(row)}
                                disabled={isAdvancing}
                                sx={{ textTransform: 'none', minWidth: 90 }}
                              >
                                {currentTab.actionLabel}
                              </Button>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {/* Paginação - visível sempre que há dados, mesmo durante re-fetches */}
          {!isError && filtered.length > 0 && (
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              sx={{ borderTop: '1px solid', borderColor: 'divider', mt: -0.5 }}
            />
          )}
        </Box>
      </Paper>

      {/* Dialog de confirmação */}
      <Dialog
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle fontWeight={700}>
          Confirmar: {currentTab.actionLabel}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirma que pretende marcar a pavimentação{' '}
            <strong>{confirmItem?.regnumber}</strong> como{' '}
            <strong>{currentTab.status === 'pending' ? 'executada' : 'concluída e paga'}</strong>?
          </DialogContentText>
          {confirmItem && (
            <Stack mt={2} spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {[confirmItem.address, confirmItem.door].filter(Boolean).join(', ')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {confirmItem.nut4} · {confirmItem.ts_entity}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmItem(null)} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={currentTab.color}
            disabled={isAdvancing}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {isAdvancing ? 'A processar...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PavimentosPage;
