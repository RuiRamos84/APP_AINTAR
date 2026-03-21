import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip, List, ListItem, ListItemText,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useNavigate } from 'react-router-dom';

export const AvalPendingModal = ({ open, data, onDismiss }) => {
  const navigate = useNavigate();

  const handleEvaluate = () => {
    onDismiss();
    navigate('/aval');
  };

  if (!data) return null;

  return (
    <Dialog open={open} onClose={onDismiss} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RateReviewIcon color="warning" />
          Avaliações Pendentes
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Tens{' '}
          <Typography component="span" fontWeight={700} color="warning.main">
            {data.total_pending} {data.total_pending === 1 ? 'avaliação' : 'avaliações'}
          </Typography>
          {' '}por preencher nas seguintes campanhas:
        </Typography>

        <List dense disablePadding>
          {data.periods.map((p) => (
            <ListItem key={p.pk} disableGutters>
              <ListItemText
                primary={p.descr || `Campanha ${p.year}`}
                secondary={`${p.remaining} por avaliar`}
              />
              <Chip
                label={p.remaining}
                color="warning"
                size="small"
                variant="outlined"
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onDismiss} color="inherit" size="small">
          Mais tarde
        </Button>
        <Button onClick={handleEvaluate} variant="contained" color="warning">
          Avaliar agora
        </Button>
      </DialogActions>
    </Dialog>
  );
};
