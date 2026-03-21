/**
 * BulkActionToolbar - Barra de ações em massa para tarefas selecionadas
 *
 * Aparece animada quando existem tarefas selecionadas em modo Lista.
 * Oculta em mobile.
 *
 * @component
 */

import {
  Paper,
  Stack,
  Typography,
  Button,
  Divider,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Archive as ArchiveIcon,
  Replay as ReplayIcon,
  Flag as FlagIcon,
  SwapHoriz as SwapHorizIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const BulkActionToolbar = ({
  selectedCount,
  onClose,
  onBulkClose,
  onBulkReopen,
  onBulkPriority,
  onBulkStatus,
  loading = false,
  activeTab = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile || selectedCount === 0) return null;

  const isClosed = activeTab === 'closed';

  return (
    <Paper
      elevation={2}
      sx={{
        px: 2,
        py: 1,
        mb: 1,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.06),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        {/* Contador */}
        <Typography variant="body2" fontWeight={600} color="primary" sx={{ mr: 1 }}>
          {selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}
        </Typography>

        <Divider orientation="vertical" flexItem />

        {/* Ações consoante a tab ativa */}
        {!isClosed && (
          <>
            <Tooltip title="Encerrar tarefas selecionadas">
              <span>
                <Button
                  size="small"
                  color="warning"
                  startIcon={<ArchiveIcon />}
                  onClick={onBulkClose}
                  disabled={loading}
                >
                  Encerrar
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Alterar prioridade das tarefas selecionadas">
              <span>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<FlagIcon />}
                  onClick={onBulkPriority}
                  disabled={loading}
                >
                  Prioridade
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Alterar estado das tarefas selecionadas">
              <span>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<SwapHorizIcon />}
                  onClick={onBulkStatus}
                  disabled={loading}
                >
                  Estado
                </Button>
              </span>
            </Tooltip>
          </>
        )}

        {isClosed && (
          <Tooltip title="Reabrir tarefas selecionadas">
            <span>
              <Button
                size="small"
                color="info"
                startIcon={<ReplayIcon />}
                onClick={onBulkReopen}
                disabled={loading}
              >
                Reabrir
              </Button>
            </span>
          </Tooltip>
        )}

        {/* Limpar seleção */}
        <Divider orientation="vertical" flexItem />
        <Tooltip title="Limpar seleção">
          <IconButton size="small" onClick={onClose} disabled={loading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

BulkActionToolbar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onBulkClose: PropTypes.func.isRequired,
  onBulkReopen: PropTypes.func.isRequired,
  onBulkPriority: PropTypes.func.isRequired,
  onBulkStatus: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  activeTab: PropTypes.string,
};

export default BulkActionToolbar;
