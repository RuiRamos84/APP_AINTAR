import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableBody, TableRow, TableCell,
  Typography, Chip, Box, Divider,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
};

const getTypeColor = (type) => {
  if (!type) return 'default';
  const t = type.toLowerCase();
  if (t.includes('pneu')) return 'warning';
  if (t.includes('revisão') || t.includes('revisao') || t.includes('inspeção')) return 'info';
  if (t.includes('acidente') || t.includes('colisão')) return 'error';
  if (t.includes('óleo') || t.includes('oleo') || t.includes('filtro')) return 'success';
  return 'default';
};

const MaintenanceHistoryModal = ({ open, onClose, licence, maintenances = [] }) => {
  const history = maintenances
    .filter(m => m.licence === licence)
    .sort((a, b) => {
      const da = parseDate(a.data), db = parseDate(b.data);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    });

  const vehicleInfo = history.length > 0
    ? [history[0].brand, history[0].model].filter(Boolean).join(' ')
    : '';

  const totalCost = history.reduce((sum, m) => {
    const p = parseFloat(m.price);
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {/* Esquerda: ícone + título + viatura */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
              bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BuildIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" lineHeight={1.2}>Histórico de Manutenções</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                <Chip
                  icon={<CarIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label={licence}
                  size="small" color="primary" variant="outlined"
                  sx={{ fontWeight: 700, letterSpacing: 1.2 }}
                />
                {vehicleInfo && (
                  <Typography variant="caption" color="text.secondary" noWrap>{vehicleInfo}</Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Direita: total de despesas */}
          {totalCost > 0 && (
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Total despesas
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main" lineHeight={1.2}>
                {formatCurrency(totalCost)}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {history.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <BuildIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Sem registos de manutenção para este veículo.
            </Typography>
          </Box>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Custo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row, idx) => {
                const d = parseDate(row.data);
                const cost = formatCurrency(row.price);
                return (
                  <TableRow key={row.pk ?? idx} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {d ? d.toLocaleDateString('pt-PT') : '—'}
                    </TableCell>
                    <TableCell>
                      {row.tt_maintenancetype
                        ? <Chip label={row.tt_maintenancetype} size="small" color={getTypeColor(row.tt_maintenancetype)} />
                        : <Typography variant="body2" color="text.disabled">—</Typography>
                      }
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {cost
                        ? <Typography variant="body2" fontWeight={600}>{cost}</Typography>
                        : <Typography variant="body2" color="text.disabled">—</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row.memo || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <Divider />
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, ml: 1 }}>
          {history.length} {history.length === 1 ? 'intervenção' : 'intervenções'}
        </Typography>
        <Button onClick={onClose} variant="outlined" size="small">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaintenanceHistoryModal;
