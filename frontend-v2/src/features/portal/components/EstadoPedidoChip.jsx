import React from 'react';
import { Chip } from '@mui/material';
import { getStatusColor, getStatusLabel } from '@/features/documents/utils/documentUtils';

/**
 * EstadoPedidoChip
 * Componente para mostrar o estado do pedido com a cor correta no Portal.
 */
const EstadoPedidoChip = ({ statusId, metadata, size = 'small' }) => {
  const label = getStatusLabel(statusId, metadata);
  const color = getStatusColor(statusId);
  
  // Mapeamento extra para cores que o Chip do MUI não suporta diretamente (como 'grey')
  const muiColor = ['primary', 'secondary', 'error', 'info', 'success', 'warning'].includes(color) 
    ? color 
    : 'default';

  return (
    <Chip
      label={label}
      color={muiColor}
      size={size}
      sx={{ 
        fontWeight: 600, 
        borderRadius: '6px',
        fontSize: size === 'small' ? '0.68rem' : '0.8rem'
      }}
    />
  );
};

export default EstadoPedidoChip;
