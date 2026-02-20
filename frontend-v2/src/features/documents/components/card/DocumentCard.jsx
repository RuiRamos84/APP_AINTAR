import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
  Divider
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Description as DocIcon,
  NotificationsActive as NotificationIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';

/**
 * Card Component for Grid View - Responsive Design
 */
const DocumentCard = ({ document, onViewDetails, metaData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const rawStatusColor = getStatusColor(document.what);
  const statusColor = rawStatusColor === 'default' ? 'info' : rawStatusColor;
  const statusLabel = getStatusLabel(document.what, metaData);
  const paletteColor = theme.palette[statusColor]?.main || theme.palette.info.main;

  const entityName = document.ts_entity_name || document.ts_entity
    ? `${document.ts_entity_name || `Entidade #${document.ts_entity}`}`
    : null;

  const hasUrgency = document.urgency && document.urgency !== '0';

  return (
    <Card
      onClick={() => onViewDetails(document)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        borderLeft: `4px solid ${paletteColor}`,
        borderRadius: { xs: 2, sm: 3 },
        overflow: 'visible',
        bgcolor: 'background.paper',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-3px)' },
          boxShadow: `0 8px 25px ${alpha(paletteColor, 0.15)}, 0 4px 10px ${alpha(theme.palette.common.black, 0.08)}`,
          borderColor: alpha(paletteColor, 0.4),
          borderLeftColor: paletteColor,
          '& .card-view-btn': {
            opacity: 1,
            transform: 'translateX(0)',
          },
          '& .card-regnumber': {
            color: paletteColor,
          },
        },
      }}
    >
      {/* Notification Badge */}
      {document.notification === 1 && (
        <Tooltip title="Nova notificação" arrow>
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: { xs: 22, sm: 26 },
                height: { xs: 22, sm: 26 },
                borderRadius: '50%',
                border: `2px solid ${theme.palette.error.main}`,
                animation: 'notifRing 2s ease-out infinite',
                '@keyframes notifRing': {
                  '0%': { transform: 'scale(1)', opacity: 0.6 },
                  '100%': { transform: 'scale(2.2)', opacity: 0 },
                },
              }}
            />
            <Box
              sx={{
                bgcolor: 'error.main',
                color: '#fff',
                borderRadius: '50%',
                width: { xs: 22, sm: 26 },
                height: { xs: 22, sm: 26 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 3px 10px ${alpha(theme.palette.error.main, 0.45)}`,
                border: `2px solid ${theme.palette.background.paper}`,
                animation: 'notifBounce 3s ease-in-out infinite',
                '@keyframes notifBounce': {
                  '0%, 85%, 100%': { transform: 'scale(1)' },
                  '90%': { transform: 'scale(1.2)' },
                  '95%': { transform: 'scale(0.95)' },
                },
              }}
            >
              <NotificationIcon sx={{ fontSize: { xs: 11, sm: 13 } }} />
            </Box>
          </Box>
        </Tooltip>
      )}

      <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 }, pb: { xs: 1, sm: 1.5 }, '&:last-child': { pb: { xs: 1, sm: 1.5 } } }}>
        {/* Header: Reg Number + Status + Urgency */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 0.5 }}>
          <Typography
            className="card-regnumber"
            variant={isMobile ? 'body2' : 'subtitle1'}
            fontWeight="700"
            color="text.primary"
            noWrap
            sx={{
              lineHeight: 1.3,
              transition: 'color 0.2s ease',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              minWidth: 0,
            }}
          >
            {document.regnumber}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              label={statusLabel}
              color={statusColor}
              size="small"
              sx={{
                fontWeight: 600,
                height: { xs: 20, sm: 22 },
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                borderRadius: '6px',
                '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
              }}
            />
            {hasUrgency && (
              <Chip
                label={document.urgency === '2' ? 'Muito Urgente' : 'Urgente'}
                color={document.urgency === '2' ? 'error' : 'warning'}
                size="small"
                sx={{
                  fontWeight: 600,
                  height: { xs: 20, sm: 22 },
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  borderRadius: '6px',
                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                }}
              />
            )}
          </Box>
        </Box>

        {/* Date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <TimeIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.68rem', sm: '0.72rem' } }}>
            {formatDate(document.submission)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5, opacity: 0.6 }} />

        {/* Entity Info */}
        {entityName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Avatar
              sx={{
                width: { xs: 24, sm: 28 },
                height: { xs: 24, sm: 28 },
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
              }}
            >
              <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
            </Avatar>
            <Tooltip title={entityName} arrow enterDelay={500}>
              <Typography variant="body2" fontWeight="500" noWrap sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, flex: 1, minWidth: 0 }}>
                {entityName}
              </Typography>
            </Tooltip>
          </Box>
        )}

        {/* Address */}
        {document.address && (
          <Tooltip title={`${document.address}${document.postal ? ` · ${document.postal}` : ''}`} arrow enterDelay={500}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1 }}>
              <LocationIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.disabled', mt: 0.1, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, lineHeight: 1.4, minWidth: 0 }}>
                {document.address}
                {document.postal && (
                  <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                    · {document.postal}
                  </Typography>
                )}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </CardContent>

      {/* Footer */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: { xs: 0.75, sm: 1 },
          mt: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Chip
          icon={<DocIcon sx={{ fontSize: '0.85rem !important' }} />}
          label={document.tt_type || 'Geral'}
          size="small"
          variant="outlined"
          sx={{
            height: { xs: 22, sm: 24 },
            fontSize: { xs: '0.65rem', sm: '0.7rem' },
            borderColor: alpha(theme.palette.divider, 0.3),
            '& .MuiChip-label': { px: 0.75 },
            maxWidth: '60%',
            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        />

        <Tooltip title="Ver detalhes" arrow>
          <IconButton
            className="card-view-btn"
            size="small"
            onClick={(e) => { e.stopPropagation(); onViewDetails(document); }}
            sx={{
              opacity: { xs: 0.7, sm: 0.5 },
              transition: 'all 0.2s ease',
              transform: { xs: 'none', sm: 'translateX(4px)' },
              color: paletteColor,
              '&:hover': {
                bgcolor: alpha(paletteColor, 0.08),
              },
            }}
          >
            <ViewIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
};

export default DocumentCard;
