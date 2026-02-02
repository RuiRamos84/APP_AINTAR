import React from 'react';
import { 
  Box, 
  Chip, 
  IconButton, 
  Tooltip, 
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  NotificationsActive as NotificationIcon,
} from '@mui/icons-material';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';

/**
 * DataGrid List View for Documents
 */
const DocumentList = ({ documents, loading, onViewDetails }) => {
  const theme = useTheme();

  const columns = [
    {
      field: 'notification',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params) =>
        params.value === 1 ? (
          <Tooltip title="Nova notificação">
            <NotificationIcon color="error" sx={{ fontSize: 18 }} />
          </Tooltip>
        ) : null,
    },
    {
      field: 'regnumber',
      headerName: 'Nº Registo',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600" color="primary">
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'what', 
      headerName: 'Estado', 
      width: 180,
      renderCell: (params) => {
        const color = getStatusColor(params.value);
        const label = getStatusLabel(params.value); // In real app, pass metadata
        return (
          <Chip 
            label={label} 
            color={color} 
            size="small" 
            variant="soft" // If supported by theme, otherwise 'filled' or 'outlined'
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      }
    },
    { 
      field: 'submission', 
      headerName: 'Data Submissão', 
      width: 200,
      renderCell: (params) => {
        // console.log('Submission Date:', params.value);
        return (
          <Typography variant="body2" color="text.secondary">
            {formatDate(params.value)}
          </Typography>
        );
      }
    },
    { 
      field: 'ts_entity', // This assumes backend sends entity ID. Usually we need hydration.
      headerName: 'Entidade', 
      width: 250,
      // In a real scenario, we might need to map ID to name if backend doesn't send the name
    },
    { 
      field: 'address', 
      headerName: 'Morada', 
      flex: 1, 
      minWidth: 200 
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Ver Detalhes">
            <IconButton 
              size="small" 
              onClick={() => onViewDetails(params.row)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={documents || []}
        columns={columns}
        getRowId={(row) => row.pk}
        loading={loading}
        density="comfortable"
        disableRowSelectionOnClick
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.5)}`
          },
          backgroundColor: 'background.paper',
          borderRadius: 3,
          boxShadow: theme.shadows[1]
        }}
      />
    </Box>
  );
};

export default DocumentList;
