/**
 * ListSkeleton Component
 * Skeleton loader para listas
 * Usado em sidebars, menus, listas de items, etc.
 *
 * Props:
 * - items: número de items (default: 5)
 * - variant: tipo de lista ('simple' | 'avatar' | 'detailed') (default: 'simple')
 */

import { Box, Paper, Skeleton, List, ListItem } from '@mui/material';

const SimpleListItem = () => (
  <ListItem sx={{ gap: 2 }}>
    <Skeleton variant="rectangular" width={24} height={24} />
    <Skeleton variant="text" width="60%" height={20} />
  </ListItem>
);

const AvatarListItem = () => (
  <ListItem sx={{ gap: 2 }}>
    <Skeleton variant="circular" width={40} height={40} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width="70%" height={20} />
      <Skeleton variant="text" width="50%" height={16} />
    </Box>
    <Skeleton variant="circular" width={24} height={24} />
  </ListItem>
);

const DetailedListItem = () => (
  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1, py: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <Skeleton variant="circular" width={48} height={48} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={22} />
        <Skeleton variant="text" width="40%" height={18} />
      </Box>
      <Skeleton variant="rounded" width={80} height={24} />
    </Box>
    <Skeleton variant="text" width="90%" height={16} />
    <Skeleton variant="text" width="75%" height={16} />
  </ListItem>
);

export const ListSkeleton = ({ items = 5, variant = 'simple' }) => {
  const renderItem = () => {
    switch (variant) {
      case 'avatar':
        return <AvatarListItem />;
      case 'detailed':
        return <DetailedListItem />;
      case 'simple':
      default:
        return <SimpleListItem />;
    }
  };

  return (
    <Paper>
      <List>
        {Array.from({ length: items }).map((_, index) => (
          <Box key={index}>
            {renderItem()}
            {index < items - 1 && <Skeleton variant="rectangular" width="100%" height={1} />}
          </Box>
        ))}
      </List>
    </Paper>
  );
};

export default ListSkeleton;
