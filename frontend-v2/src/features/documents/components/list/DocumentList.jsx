import React, { useMemo } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import {
  Visibility as ViewIcon,
  NotificationsActive as NotificationIcon,
} from '@mui/icons-material';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';

/**
 * DataGrid List View for Documents - Responsive columns
 */
const DocumentList = ({ documents, loading, onViewDetails, metaData }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const columns = useMemo(() => {
    const cols = [];

    // Notification - always visible, icon-only
    cols.push({
      field: 'notification',
      headerName: '',
      width: 40,
      minWidth: 40,
      maxWidth: 40,
      sortable: false,
      disableColumnMenu: true,
      disableReorder: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) =>
        params.value === 1 ? (
          <Tooltip title="Nova notificação">
            <Box sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
            }}>
              <Box
                sx={{
                  position: 'absolute',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'error.main',
                  animation: 'listNotifRing 2s ease-out infinite',
                  '@keyframes listNotifRing': {
                    '0%': { transform: 'scale(1)', opacity: 0.6 },
                    '100%': { transform: 'scale(2)', opacity: 0 },
                  },
                }}
              />
              <NotificationIcon
                color="error"
                sx={{
                  fontSize: 18,
                  animation: 'listNotifBounce 3s ease-in-out infinite',
                  '@keyframes listNotifBounce': {
                    '0%, 85%, 100%': { transform: 'scale(1)' },
                    '90%': { transform: 'scale(1.25)' },
                    '95%': { transform: 'scale(0.95)' },
                  },
                }}
              />
            </Box>
          </Tooltip>
        ) : null,
    });

    // Reg Number - always visible
    cols.push({
      field: 'regnumber',
      headerName: 'N Registo',
      flex: 1,
      minWidth: isXs ? 120 : 150,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600" color="primary" noWrap>
          {params.value}
        </Typography>
      )
    });

    // Estado + Urgency - always visible
    cols.push({
      field: 'what',
      headerName: 'Estado',
      flex: isXs ? 1 : undefined,
      width: isXs ? undefined : 220,
      minWidth: isXs ? 100 : 150,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => {
        const color = getStatusColor(params.value);
        const label = getStatusLabel(params.value, metaData);
        const urgency = params.row.urgency;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={label}
              color={color}
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
            {urgency && urgency !== '0' && (
              <Chip
                label={urgency === '2' ? 'Muito Urgente' : 'Urgente'}
                color={urgency === '2' ? 'error' : 'warning'}
                size="small"
                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
              />
            )}
          </Box>
        );
      }
    });

    // Data Submissao - hidden on xs
    if (!isXs) {
      cols.push({
        field: 'submission',
        headerName: 'Data',
        flex: 1,
        minWidth: 130,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => (
          <Typography variant="body2" color="text.secondary" noWrap>
            {formatDate(params.value)}
          </Typography>
        )
      });
    }

    // Entidade - hidden on xs and sm
    if (!isXs && !isSm) {
      cols.push({
        field: 'ts_entity',
        headerName: 'Entidade',
        flex: 1.2,
        minWidth: 140,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => (
          <Tooltip title={params.value || ''} arrow enterDelay={600}>
            <Typography variant="body2" noWrap>
              {params.value || '-'}
            </Typography>
          </Tooltip>
        )
      });
    }

    // Morada - hidden on xs, sm, md
    if (!isXs && !isSm && !isMd) {
      cols.push({
        field: 'address',
        headerName: 'Morada',
        flex: 1.5,
        minWidth: 180,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => (
          <Tooltip title={params.value || ''} arrow enterDelay={600}>
            <Typography variant="body2" noWrap>
              {params.value || '-'}
            </Typography>
          </Tooltip>
        )
      });
    }

    // Actions - always visible
    cols.push({
      field: 'actions',
      headerName: '',
      width: 50,
      minWidth: 50,
      sortable: false,
      disableColumnMenu: true,
      disableReorder: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Tooltip title="Ver Detalhes">
          <IconButton
            size="small"
            onClick={() => onViewDetails(params.row)}
            color="primary"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    });

    return cols;
  }, [isXs, isSm, isMd, metaData, onViewDetails]);

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={documents || []}
        columns={columns}
        getRowId={(row) => row.pk}
        loading={loading}
        density="comfortable"
        disableRowSelectionOnClick
        disableColumnMenu
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            display: 'flex',
            alignItems: 'center',
            py: 1,
          },
          '& .MuiDataGrid-columnHeader': {
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
              fontSize: '0.85rem',
            },
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.5)}`,
          },
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          },
          backgroundColor: 'background.paper',
          borderRadius: 3,
          boxShadow: theme.shadows[1],
        }}
        onRowClick={(params) => onViewDetails(params.row)}
      />
    </Box>
  );
};

export default DocumentList;
