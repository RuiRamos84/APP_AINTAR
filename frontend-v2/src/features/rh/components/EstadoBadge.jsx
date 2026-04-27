import { Chip } from '@mui/material';

const COR_MAP = {
  warning: 'warning',
  info:    'info',
  success: 'success',
  error:   'error',
};

const EstadoBadge = ({ descr, cor, size = 'small' }) => (
  <Chip
    label={descr || '—'}
    size={size}
    color={COR_MAP[cor] || 'default'}
    variant="filled"
    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
  />
);

export default EstadoBadge;
