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
  alpha 
} from '@mui/material';
import {
  AccessTime as AvailableIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  MoreVert as MoreIcon,
  Description as DocIcon,
  NotificationsActive as NotificationIcon,
} from '@mui/icons-material';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';

/**
 * Card Component for Grid View
 */
const DocumentCard = ({ document, onViewDetails }) => {
  const theme = useTheme();
  
  const rawStatusColor = getStatusColor(document.what);
  // Ensure statusColor maps to a valid MUI palette key (fallback to 'info' if 'default')
  const statusColor = rawStatusColor === 'default' ? 'info' : rawStatusColor;
  const statusLabel = getStatusLabel(document.what);

  return (
    <Card 
      onClick={() => onViewDetails(document)}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        borderRadius: 3,
        overflow: 'visible', // For badges if needed
        bgcolor: 'background.paper',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
          borderColor: theme.palette[statusColor].main
        }
      }}
    >
      {/* Notification Badge */}
      {document.notification === 1 && (
        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: -6,
            zIndex: 1,
            bgcolor: 'error.main',
            color: '#fff',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 2,
          }}
        >
          <NotificationIcon sx={{ fontSize: 14 }} />
        </Box>
      )}

      {/* Top Border for Status */}
      <Box
        sx={{
          height: 6,
          width: '100%',
          bgcolor: `${statusColor}.main`,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12
        }}
      />

      <CardContent sx={{ flexGrow: 1, p: 2.5, pb: 1 }}>
        {/* Header: Reg Number & Date */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
             <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ lineHeight: 1.2 }}>
               {document.regnumber}
             </Typography>
             <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
               <AvailableIcon fontSize="inherit" />
               {formatDate(document.submission)}
             </Typography>
          </Box>
          
          <Chip 
            label={statusLabel} 
            color={statusColor} 
            size="small" 
            sx={{ fontWeight: 600, height: 24 }}
          />
        </Box>

        {/* Entity Info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" fontWeight="500" gutterBottom>
            Entidade
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                fontSize: '0.875rem'
              }}
            >
              <PersonIcon fontSize="small" />
            </Avatar>
            <Typography variant="body2" fontWeight="500" noWrap>
              {
                /* Assuming entity name is populated or using ID as fallback */
                document.ts_entity_name || `Entidade #${document.ts_entity}`
              }
            </Typography>
          </Box>
        </Box>

        {/* Address */}
        {document.address && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <LocationIcon color="action" fontSize="small" sx={{ mt: 0.2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              {document.address}
              {document.postal && <Typography component="span" variant="caption" display="block">{document.postal}</Typography>}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Footer Actions */}
      <Box 
        sx={{ 
          p: 2, 
          pt: 1,
          mt: 'auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`
        }}
      >
        <Chip 
            icon={<DocIcon sx={{ fontSize: '1rem !important' }} />} 
            label={document.tt_type || 'Geral'} 
            size="small" 
            variant="outlined" 
        />
        
        <Tooltip title="Mais opções">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); /* Menu handler */ }}>
            <MoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
};

export default DocumentCard;
