/**
 * Loading Component
 * Estados de carregamento para diferentes contextos
 */

import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Loading genérico
 */
export function Loading({
  message = 'A carregar...',
  fullScreen = false,
  size = 40,
}) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}

/**
 * Loading inline (para usar dentro de componentes)
 */
export function InlineLoading({ message = 'A carregar...', size = 24 }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
      }}
    >
      <CircularProgress size={size} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton({ lines = 3 }) {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
      <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />

      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width="80%" sx={{ mt: 1 }} />
      ))}
    </Box>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: 2,
            mb: 1,
            p: 1.5,
          }}
        >
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              variant="rectangular"
              height={48}
              sx={{ flex: 1, borderRadius: 1 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

/**
 * List Skeleton
 */
export function ListSkeleton({ items = 5 }) {
  return (
    <Box>
      {Array.from({ length: items }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            mb: 1,
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// PropTypes
Loading.propTypes = {
  message: PropTypes.string,
  fullScreen: PropTypes.bool,
  size: PropTypes.number,
};

InlineLoading.propTypes = {
  message: PropTypes.string,
  size: PropTypes.number,
};

CardSkeleton.propTypes = {
  lines: PropTypes.number,
};

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
};

ListSkeleton.propTypes = {
  items: PropTypes.number,
};
