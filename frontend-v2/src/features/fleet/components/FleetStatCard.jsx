import React from 'react';
import { Box, Card, CardContent, Typography, Skeleton, Tooltip, useTheme, alpha } from '@mui/material';

/**
 * Card de KPI para o dashboard de Frota (Visão Geral) — mesmo padrão visual
 * usado em Documentos/Avaliações/Pavimentos, adaptado localmente (cada
 * feature tem a sua própria versão, não há um StatCard partilhado ainda).
 */
const FleetStatCard = ({ title, value, icon, color = 'primary.main', onClick, loading = false }) => {
  const theme = useTheme();

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
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': onClick ? { transform: 'translateY(-3px)', boxShadow: theme.shadows[5] } : {},
      }}
    >
      <Box sx={{
        position: 'absolute', top: -10, right: -10, borderRadius: '50%',
        width: 70, height: 70, opacity: 0.1, bgcolor: resolvedColor,
      }} />

      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box sx={{ minWidth: 0 }}>
            <Tooltip title={title} enterDelay={400}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom noWrap>
                {title}
              </Typography>
            </Tooltip>
            {loading ? (
              <Skeleton variant="text" width={48} height={40} />
            ) : (
              <Typography variant="h4" fontWeight="bold">
                {value}
              </Typography>
            )}
          </Box>

          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: resolvedColor, color: '#fff', borderRadius: '50%',
            width: 48, height: 48, flexShrink: 0,
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FleetStatCard;
