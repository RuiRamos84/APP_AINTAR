import React from 'react';
import { Card, CardContent, Typography, Box, IconButton, Tooltip, Divider, alpha, useTheme } from '@mui/material';
import { 
  ChevronRight as ViewIcon, 
  CalendarToday as DateIcon,
  Description as TypeIcon,
  Tag as IdIcon,
  NotificationsActive as NotificationIcon
} from '@mui/icons-material';
import { formatDate } from '@/features/documents/utils/documentUtils';
import EstadoPedidoChip from './EstadoPedidoChip';

/**
 * PedidoCard
 * Card visual para a lista de pedidos no Portal do Cliente.
 */
const PedidoCard = ({ pedido, onClick, metadata }) => {
  const theme = useTheme();
  const hasNotification = Number(pedido.notification) > 0;

  return (
    <Card
      onClick={() => onClick(pedido)}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.08),
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.08)}`,
          borderColor: alpha(theme.palette.primary.main, 0.2),
        }
      }}
    >
      {/* Indicador de Notificação */}
      {hasNotification && (
        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            bgcolor: 'error.main',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
            zIndex: 2,
          }}
        >
          <NotificationIcon sx={{ fontSize: 12 }} />
        </Box>
      )}

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Cabeçalho: ID e Data */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IdIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {pedido.regnumber}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              {formatDate(pedido.submission)}
            </Typography>
          </Box>
        </Box>

        {/* Título/Tipo */}
        <Typography variant="body1" fontWeight={600} sx={{ mb: 1, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TypeIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.8 }} />
          {pedido.tt_type || 'Pedido Geral'}
        </Typography>

        <Divider sx={{ my: 1.5, opacity: 0.6 }} />

        {/* Rodapé: Estado e Botão de Ver */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <EstadoPedidoChip statusId={pedido.what} metadata={metadata} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
            <Typography variant="button" sx={{ fontSize: '0.7rem', fontWeight: 700, mr: 0.5, opacity: 0.8 }}>
              Ver Detalhes
            </Typography>
            <ViewIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PedidoCard;
