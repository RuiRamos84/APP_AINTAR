import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';

/**
 * Reusable Stat Card for Documents Dashboard
 */
const StatCard = ({
  title,
  value,
  icon,
  color = 'primary.main',
  onClick,
  loading = false,
  notificationCount,
  active = false,
}) => {
  const theme = useTheme();

  // Resolve color token to actual hex (e.g. 'primary.main' → theme color)
  const resolvedColor = color.includes('.')
    ? color.split('.').reduce((obj, key) => obj?.[key], theme.palette) ?? color
    : color;

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        borderRadius: 3,
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        opacity: loading ? 0.7 : 1,
        border: active
          ? `2px solid ${resolvedColor}`
          : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: active ? `0 0 0 3px ${alpha(resolvedColor, 0.15)}` : theme.shadows[1],
        bgcolor: active ? alpha(resolvedColor, 0.04) : 'background.paper',
        '&:hover': onClick
          ? {
              transform: active ? 'none' : 'translateY(-3px)',
              boxShadow: active
                ? `0 0 0 3px ${alpha(resolvedColor, 0.2)}`
                : theme.shadows[5],
            }
          : {},
      }}
    >
      {/* Background circle decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          borderRadius: '50%',
          width: 70,
          height: 70,
          opacity: 0.1,
          bgcolor: color,
        }}
      />

      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Box display="flex" alignItems="center" height={45}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Typography variant="h4" fontWeight="bold">
                {value}
              </Typography>
            )}
          </Box>

          <Badge
            badgeContent={notificationCount || 0}
            color="error"
            invisible={!notificationCount}
            max={99}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                bgcolor: color,
                color: '#fff',
                borderRadius: '50%',
                width: 48,
                height: 48,
              }}
            >
              {icon}
            </Box>
          </Badge>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
