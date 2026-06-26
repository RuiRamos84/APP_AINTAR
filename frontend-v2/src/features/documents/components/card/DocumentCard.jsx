import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
  Divider
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  NotificationsActive as NotificationIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Business as AssociateIcon,
} from '@mui/icons-material';
import { getStatusColor, getStatusLabel, formatDate, getBusinessDaysSince, formatBusinessDays, getDocumentDeadline } from '../../utils/documentUtils';
import { useSocket } from '@/core/contexts/SocketContext';

/**
 * Card Component for Grid View
 * Layout:
 *   regnumber                   [status] [urgency?]
 *   type                              data
 *   ─────────────────────────────────────
 *   entity
 *   address line 1
 *   address line 2
 *   associate
 *   ─────────────────────────────────────
 *   [deadline indicator]          [view btn]
 */
const DocumentCard = ({ document, onViewDetails, metaData, showDeadline = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { unreadDocumentIds } = useSocket();
  const hasUnreadNotification = unreadDocumentIds.has(document.pk);

  const rawStatusColor = getStatusColor(document.what);
  const statusColor = rawStatusColor === 'default' ? 'info' : rawStatusColor;
  const statusLabel = getStatusLabel(document.what, metaData);
  const paletteColor = theme.palette[statusColor]?.main || theme.palette.info.main;

  const entityName = document.ts_entity_name || document.ts_entity || null;
  const hasUrgency = document.urgency && document.urgency !== '0';

  // Address lines
  const addrLine1 = [document.address, document.door, document.floor].filter(Boolean).join(' ');
  const addrLine2 = [document.postal, document.nut4].filter(Boolean).join(' ');
  const hasAddress = addrLine1 || addrLine2;

  // Deadline logic
  const isClosed = Number(document.what) <= 0;
  const deadline = getDocumentDeadline(document);
  const { days: diasDecorridos } = getBusinessDaysSince(document.exec_data || document.submission);
  const diasRestantes = deadline - diasDecorridos;
  const isOverdue = diasRestantes < 0;
  const limiteAlerta = Math.max(Math.floor(deadline * 0.25), 2);
  const isWarning = !isOverdue && diasRestantes <= limiteAlerta;
  const shouldShowTimer = showDeadline && !isClosed;
  const shouldHighlight = shouldShowTimer && (isWarning || isOverdue);

  const highlightColor = isOverdue ? theme.palette.error.main : theme.palette.warning.main;
  const timerColor = isOverdue ? 'error' : isWarning ? 'warning' : 'success';

  return (
    <Card
      onClick={() => onViewDetails(document)}
      sx={{
        '@keyframes cardGlow': {
          '0%, 100%': { boxShadow: `0 0 8px ${alpha(theme.palette.error.main, 0.25)}` },
          '50%': { boxShadow: `0 0 18px ${alpha(theme.palette.error.main, 0.5)}` },
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        border: shouldHighlight
          ? `1px solid ${alpha(highlightColor, 0.4)}`
          : `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        borderLeft: `4px solid ${shouldHighlight ? highlightColor : paletteColor}`,
        borderRadius: { xs: 2, sm: 3 },
        overflow: 'visible',
        bgcolor: shouldHighlight ? alpha(highlightColor, 0.04) : 'background.paper',
        animation: isOverdue && shouldShowTimer ? 'cardGlow 2.5s ease-in-out infinite' : 'none',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-3px)' },
          boxShadow: `0 8px 25px ${alpha(shouldHighlight ? highlightColor : paletteColor, 0.15)}, 0 4px 10px ${alpha(theme.palette.common.black, 0.08)}`,
          borderColor: alpha(shouldHighlight ? highlightColor : paletteColor, 0.4),
          borderLeftColor: shouldHighlight ? highlightColor : paletteColor,
          '& .card-view-btn': { opacity: 1, transform: 'translateX(0)' },
          '& .card-regnumber': { color: paletteColor },
        },
      }}
    >
      {/* Notification Badge — deriva do feed central (fase B da unificação),
          por-utilizador (who do passo atual + criador), não mais global ao documento */}
      {hasUnreadNotification && (
        <Tooltip title="Nova notificação" arrow>
          <Box sx={{ position: 'absolute', top: -8, right: -8, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{
              position: 'absolute',
              width: { xs: 22, sm: 26 }, height: { xs: 22, sm: 26 },
              borderRadius: '50%',
              border: `2px solid ${theme.palette.error.main}`,
              animation: 'notifRing 2s ease-out infinite',
              '@keyframes notifRing': {
                '0%': { transform: 'scale(1)', opacity: 0.6 },
                '100%': { transform: 'scale(2.2)', opacity: 0 },
              },
            }} />
            <Box sx={{
              bgcolor: 'error.main', color: '#fff', borderRadius: '50%',
              width: { xs: 22, sm: 26 }, height: { xs: 22, sm: 26 },
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 3px 10px ${alpha(theme.palette.error.main, 0.45)}`,
              border: `2px solid ${theme.palette.background.paper}`,
              animation: 'notifBounce 3s ease-in-out infinite',
              '@keyframes notifBounce': {
                '0%, 85%, 100%': { transform: 'scale(1)' },
                '90%': { transform: 'scale(1.2)' },
                '95%': { transform: 'scale(0.95)' },
              },
            }}>
              <NotificationIcon sx={{ fontSize: { xs: 11, sm: 13 } }} />
            </Box>
          </Box>
        </Tooltip>
      )}

      <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 }, pb: 1, '&:last-child': { pb: 1 }, display: 'flex', flexDirection: 'column' }}>

        {/* Row 1: regnumber + status + urgency */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
          <Typography
            className="card-regnumber"
            fontWeight="700"
            noWrap
            sx={{
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              lineHeight: 1.3,
              transition: 'color 0.2s ease',
              color: 'text.primary',
              minWidth: 0,
            }}
          >
            {document.regnumber}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              label={statusLabel}
              color={statusColor}
              size="small"
              sx={{ fontWeight: 600, height: { xs: 20, sm: 22 }, fontSize: { xs: '0.62rem', sm: '0.68rem' }, borderRadius: '6px', '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } } }}
            />
            {hasUrgency && (
              <Chip
                label={document.urgency === '2' ? 'Muito Urgente' : 'Urgente'}
                color={document.urgency === '2' ? 'error' : 'warning'}
                size="small"
                sx={{ fontWeight: 600, height: { xs: 20, sm: 22 }, fontSize: { xs: '0.62rem', sm: '0.68rem' }, borderRadius: '6px', '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } } }}
              />
            )}
          </Box>
        </Box>

        {/* Row 2: type + date */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1.5, gap: 0.5 }}>
          <Typography
            noWrap
            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, color: 'text.secondary', minWidth: 0, flex: 1 }}
          >
            {document.tt_type || '—'}
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: { xs: '0.68rem', sm: '0.72rem' }, color: 'text.disabled', flexShrink: 0 }}
          >
            {formatDate(document.submission)}
          </Typography>
        </Box>

        <Divider sx={{ opacity: 0.5, mb: 1.5 }} />

        {/* Entity */}
        {entityName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <PersonIcon sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.disabled', flexShrink: 0 }} />
            <Tooltip title={entityName} arrow enterDelay={500}>
              <Typography noWrap sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, fontWeight: 500, minWidth: 0 }}>
                {entityName}
              </Typography>
            </Tooltip>
          </Box>
        )}

        {/* Address — two lines */}
        {hasAddress && (() => {
          const tooltip = [addrLine1, addrLine2].filter(Boolean).join('\n');
          return (
            <Tooltip title={tooltip} arrow enterDelay={500}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.75 }}>
                <LocationIcon sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.disabled', mt: 0.15, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  {addrLine1 && (
                    <Typography noWrap sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: 'text.secondary', lineHeight: 1.4 }}>
                      {addrLine1}
                    </Typography>
                  )}
                  {addrLine2 && (
                    <Typography noWrap sx={{ fontSize: { xs: '0.68rem', sm: '0.72rem' }, color: 'text.disabled', lineHeight: 1.3 }}>
                      {addrLine2}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Tooltip>
          );
        })()}

        {/* Associate */}
        {document.ts_associate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <AssociateIcon sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.disabled', flexShrink: 0 }} />
            <Tooltip title={document.ts_associate} arrow enterDelay={500}>
              <Typography noWrap sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: 'text.secondary', minWidth: 0 }}>
                {document.ts_associate}
              </Typography>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ opacity: 0.5, mt: 1.5, mb: 1 }} />

        {/* Footer: deadline indicator + view button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {shouldShowTimer ? (
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                px: 0.75,
                py: 0.5,
                borderRadius: 1,
                bgcolor: alpha(theme.palette[timerColor].main, 0.08),
                border: `1px solid ${alpha(theme.palette[timerColor].main, 0.2)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <TimeIcon sx={{ fontSize: 12, color: `${timerColor}.main`, flexShrink: 0 }} />
              <Typography
                noWrap
                sx={{
                  fontSize: { xs: '0.62rem', sm: '0.65rem' },
                  fontWeight: 600,
                  color: `${timerColor}.dark`,
                  minWidth: 0,
                }}
              >
                {isOverdue
                  ? `Ultrapassou há ${formatBusinessDays(Math.abs(diasRestantes))}`
                  : `Faltam ${formatBusinessDays(diasRestantes)} (${deadline} du)`
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}

          <Tooltip title="Ver detalhes" arrow>
            <IconButton
              className="card-view-btn"
              size="small"
              onClick={(e) => { e.stopPropagation(); onViewDetails(document); }}
              sx={{
                flexShrink: 0,
                opacity: { xs: 0.7, sm: 0.5 },
                transition: 'all 0.2s ease',
                transform: { xs: 'none', sm: 'translateX(4px)' },
                color: paletteColor,
                '&:hover': { bgcolor: alpha(paletteColor, 0.08) },
              }}
            >
              <ViewIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
            </IconButton>
          </Tooltip>
        </Box>

      </CardContent>
    </Card>
  );
};

export default DocumentCard;
