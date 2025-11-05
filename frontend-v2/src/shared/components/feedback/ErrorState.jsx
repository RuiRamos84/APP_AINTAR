/**
 * ErrorState Component
 * Estados de erro para diferentes contextos
 */

import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import PropTypes from 'prop-types';

/**
 * Error State genérico
 */
export function ErrorState({
  title = 'Algo correu mal',
  message = 'Não foi possível carregar os dados. Por favor, tente novamente.',
  icon: CustomIcon = ErrorOutlineIcon,
  onRetry,
  showRetry = true,
  retryLabel = 'Tentar Novamente',
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
    >
      <CustomIcon
        sx={{
          fontSize: { xs: 56, sm: 64 },
          color: 'error.main',
          mb: 2,
        }}
      />

      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mb: 3,
          maxWidth: 500,
          fontSize: { xs: '0.875rem', sm: '1rem' },
        }}
      >
        {message}
      </Typography>

      {showRetry && onRetry && (
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          size="large"
        >
          {retryLabel}
        </Button>
      )}
    </Box>
  );
}

/**
 * Error Inline (para usar dentro de componentes)
 */
export function InlineError({ message, onRetry }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        backgroundColor: 'error.lighter',
        borderRadius: 2,
        border: (theme) => `1px solid ${theme.palette.error.light}`,
      }}
    >
      <ErrorOutlineIcon color="error" />

      <Typography
        variant="body2"
        color="error.dark"
        sx={{ flex: 1 }}
      >
        {message}
      </Typography>

      {onRetry && (
        <Button
          size="small"
          onClick={onRetry}
          sx={{ flexShrink: 0 }}
        >
          Tentar novamente
        </Button>
      )}
    </Box>
  );
}

// PropTypes
ErrorState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  icon: PropTypes.elementType,
  onRetry: PropTypes.func,
  showRetry: PropTypes.bool,
  retryLabel: PropTypes.string,
};

InlineError.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};
