import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableBody, TableRow, TableCell,
  Typography, Chip, Avatar, Box, Divider,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

const AssignmentHistoryModal = ({ open, onClose, licence, assignments = [] }) => {
  const history = assignments
    .filter(a => a.licence === licence)
    .sort((a, b) => {
      const da = parseDate(a.data), db = parseDate(b.data);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    });

  const vehicleInfo = history.length > 0
    ? [history[0].brand, history[0].model].filter(Boolean).join(' ')
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HistoryIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" lineHeight={1.2}>Histórico de Atribuições</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
              <Chip
                icon={<CarIcon sx={{ fontSize: '0.9rem !important' }} />}
                label={licence}
                size="small" color="primary" variant="outlined"
                sx={{ fontWeight: 700, letterSpacing: 1.2 }}
              />
              {vehicleInfo && (
                <Typography variant="caption" color="text.secondary">{vehicleInfo}</Typography>
              )}
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {history.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Sem registos de atribuição para este veículo.
            </Typography>
          </Box>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Condutor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row, idx) => {
                const d = parseDate(row.data);
                return (
                  <TableRow key={row.pk ?? idx} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {d ? d.toLocaleDateString('pt-PT') : '—'}
                    </TableCell>
                    <TableCell>
                      {row.ts_client ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: '0.65rem', bgcolor: 'secondary.main' }}>
                            {getInitials(row.ts_client)}
                          </Avatar>
                          <Typography variant="body2">{row.ts_client}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
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
          {history.length} {history.length === 1 ? 'registo' : 'registos'}
        </Typography>
        <Button onClick={onClose} variant="outlined" size="small">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignmentHistoryModal;
