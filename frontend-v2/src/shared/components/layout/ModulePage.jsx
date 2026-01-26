/**
 * ModulePage Component
 * Template reutilizável para páginas de módulos
 */

import { Box, Typography, Paper, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export const ModulePage = ({
  title,
  subtitle,
  breadcrumbs = [],
  icon: Icon,
  color,
  children,
}) => {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2 }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={index} color="text.primary">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={index}
                component="button"
                variant="body2"
                onClick={() => navigate(crumb.path)}
                sx={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          pb: 2,
          borderBottom: `3px solid ${color || 'primary.main'}`,
        }}
      >
        {Icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}15`,
            }}
          >
            <Icon sx={{ fontSize: 28, color: color || 'primary.main' }} />
          </Box>
        )}
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box>{children}</Box>
    </Box>
  );
};

export default ModulePage;
