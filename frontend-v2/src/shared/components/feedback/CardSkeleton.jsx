/**
 * CardSkeleton Component
 * Skeleton loader para cards genéricos
 * Usado em grids de cards, dashboards, etc.
 *
 * Props:
 * - variant: tipo de card ('media' | 'text' | 'stats') (default: 'media')
 * - count: número de cards (default: 1)
 */

import { Box, Paper, Skeleton, Grid } from '@mui/material';

const MediaCardSkeleton = () => (
  <Paper sx={{ p: 2 }}>
    {/* Image */}
    <Skeleton variant="rectangular" width="100%" height={140} sx={{ mb: 2, borderRadius: 1 }} />
    {/* Title */}
    <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
    {/* Description */}
    <Skeleton variant="text" width="100%" height={16} />
    <Skeleton variant="text" width="90%" height={16} sx={{ mb: 2 }} />
    {/* Action */}
    <Skeleton variant="rounded" width={100} height={36} />
  </Paper>
);

const TextCardSkeleton = () => (
  <Paper sx={{ p: 2 }}>
    {/* Header */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
    </Box>
    {/* Content */}
    <Skeleton variant="text" width="100%" height={16} />
    <Skeleton variant="text" width="95%" height={16} />
    <Skeleton variant="text" width="80%" height={16} />
  </Paper>
);

const StatsCardSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    {/* Icon */}
    <Skeleton variant="circular" width={48} height={48} sx={{ mb: 2 }} />
    {/* Label */}
    <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
    {/* Value */}
    <Skeleton variant="text" width="40%" height={36} />
  </Paper>
);

export const CardSkeleton = ({ variant = 'media', count = 1 }) => {
  const renderCard = () => {
    switch (variant) {
      case 'text':
        return <TextCardSkeleton />;
      case 'stats':
        return <StatsCardSkeleton />;
      case 'media':
      default:
        return <MediaCardSkeleton />;
    }
  };

  if (count === 1) {
    return renderCard();
  }

  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          {renderCard()}
        </Grid>
      ))}
    </Grid>
  );
};

export default CardSkeleton;
