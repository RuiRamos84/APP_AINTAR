/**
 * FormSkeleton Component
 * Skeleton loader para formulários
 * Usado em páginas de edição/criação
 *
 * Props:
 * - fields: número de campos a mostrar (default: 6)
 * - showAvatar: mostrar skeleton de avatar (default: false)
 * - showActions: mostrar botões de ação (default: true)
 */

import { Box, Paper, Skeleton, Grid } from '@mui/material';

export const FormSkeleton = ({
  fields = 6,
  showAvatar = false,
  showActions = true,
}) => {
  return (
    <Box>
      {/* Avatar Section (opcional) */}
      {showAvatar && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Skeleton
            variant="circular"
            width={120}
            height={120}
            sx={{ margin: '0 auto', mb: 2 }}
          />
          <Skeleton variant="text" width="40%" height={32} sx={{ margin: '0 auto', mb: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="rounded" width={80} height={24} />
          </Box>
          {showActions && (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Skeleton variant="rounded" width={100} height={36} />
              <Skeleton variant="rounded" width={140} height={36} />
              <Skeleton variant="rounded" width={100} height={36} />
            </Box>
          )}
        </Paper>
      )}

      {/* Form Fields */}
      <Paper sx={{ p: 3 }}>
        {/* Title */}
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={1} sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {Array.from({ length: fields }).map((_, index) => (
            <Grid size={{ xs: 12, sm: index % 3 === 0 ? 12 : 6 }} key={index}>
              {/* Label */}
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
              {/* Input Field */}
              <Skeleton variant="rounded" width="100%" height={56} />
            </Grid>
          ))}
        </Grid>

        {/* Action Buttons (se não tiver avatar section) */}
        {showActions && !showAvatar && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Skeleton variant="rounded" width={100} height={36} />
            <Skeleton variant="rounded" width={120} height={36} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FormSkeleton;
