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
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  getStatusColor,
  getStatusLabel,
  formatDate,
  getBusinessDaysSince,
  formatBusinessDays,
  getDocumentDeadline,
} from '../../utils/documentUtils';

/**
 * DataGrid List View for Documents - Responsive columns
 * Columns (responsive):
 *   notif | regnumber+type | estado+urgency | entidade | morada | associado | prazo | actions
 */
const DocumentList = ({ documents, loading, onViewDetails, metaData, showDeadline = false }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.between('lg', 'xl'));

  const columns = useMemo(() => {
    const cols = [];

    // Notification
    cols.push({
      field: 'notification',
      headerName: '',
      width: 40, minWidth: 40, maxWidth: 40,
      sortable: false, disableColumnMenu: true, disableReorder: true,
      headerAlign: 'center', align: 'center',
      renderCell: (params) =>
        params.value === 1 ? (
          <Tooltip title="Nova notificação">
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
              <Box sx={{
                position: 'absolute', width: 22, height: 22, borderRadius: '50%',
                border: '2px solid', borderColor: 'error.main',
                animation: 'listNotifRing 2s ease-out infinite',
                '@keyframes listNotifRing': { '0%': { transform: 'scale(1)', opacity: 0.6 }, '100%': { transform: 'scale(2)', opacity: 0 } },
              }} />
              <NotificationIcon color="error" sx={{
                fontSize: 18,
                animation: 'listNotifBounce 3s ease-in-out infinite',
                '@keyframes listNotifBounce': { '0%, 85%, 100%': { transform: 'scale(1)' }, '90%': { transform: 'scale(1.25)' }, '95%': { transform: 'scale(0.95)' } },
              }} />
            </Box>
          </Tooltip>
        ) : null,
    });

    // Regnumber + Tipo (two lines)
    cols.push({
      field: 'regnumber',
      headerName: 'Pedido',
      flex: 1,
      minWidth: isXs ? 120 : 160,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight="700" color="primary" noWrap>
            {params.value}
          </Typography>
          {!isXs && (
            <Typography variant="caption" color="text.disabled" noWrap display="block">
              {params.row.tt_type || '—'}
            </Typography>
          )}
        </Box>
      ),
    });

    // Estado + Urgência
    cols.push({
      field: 'what',
      headerName: 'Estado',
      width: isXs ? undefined : 200,
      flex: isXs ? 1 : undefined,
      minWidth: isXs ? 100 : 140,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => {
        const rawColor = getStatusColor(params.value);
        const color = rawColor === 'default' ? 'info' : rawColor;
        const label = getStatusLabel(params.value, metaData);
        const urgency = params.row.urgency;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={label} color={color} size="small" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
            {urgency && urgency !== '0' && (
              <Chip
                label={urgency === '2' ? 'Muito Urgente' : 'Urgente'}
                color={urgency === '2' ? 'error' : 'warning'}
                size="small"
                sx={{ fontWeight: 600, fontSize: '0.72rem' }}
              />
            )}
          </Box>
        );
      },
    });

    // Entidade + data (two lines) — hidden on xs
    if (!isXs) {
      cols.push({
        field: 'ts_entity_name',
        headerName: 'Entidade',
        flex: 1.2,
        minWidth: 150,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => {
          const name = params.value || params.row.ts_entity || '-';
          const date = formatDate(params.row.submission);
          return (
            <Box sx={{ minWidth: 0 }}>
              <Tooltip title={name} arrow enterDelay={600}>
                <Typography variant="body2" fontWeight="500" noWrap>{name}</Typography>
              </Tooltip>
              <Typography variant="caption" color="text.disabled" noWrap display="block">{date}</Typography>
            </Box>
          );
        },
      });
    }

    // Morada (two lines) — hidden on xs, sm
    if (!isXs && !isSm) {
      cols.push({
        field: 'address',
        headerName: 'Morada',
        flex: 1.5,
        minWidth: 180,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => {
          const row = params.row;
          const line1 = [row.address, row.door, row.floor].filter(Boolean).join(' ');
          const line2 = [row.postal, row.nut4].filter(Boolean).join(' ');
          const tooltip = [line1, line2].filter(Boolean).join('\n');
          if (!line1 && !line2) return <Typography variant="body2" color="text.disabled">-</Typography>;
          return (
            <Tooltip title={tooltip} arrow enterDelay={600}>
              <Box sx={{ minWidth: 0 }}>
                {line1 && <Typography variant="body2" noWrap>{line1}</Typography>}
                {line2 && <Typography variant="caption" color="text.disabled" noWrap display="block">{line2}</Typography>}
              </Box>
            </Tooltip>
          );
        },
      });
    }

    // Associado — hidden on xs, sm, md
    if (!isXs && !isSm && !isMd) {
      cols.push({
        field: 'ts_associate',
        headerName: 'Associado',
        flex: 1,
        minWidth: 140,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => {
          const val = params.value || '-';
          return (
            <Tooltip title={val} arrow enterDelay={600}>
              <Typography variant="body2" color="text.secondary" noWrap>{val}</Typography>
            </Tooltip>
          );
        },
      });
    }

    // Prazo — hidden on xs, sm, md; only when showDeadline is active
    if (showDeadline && !isXs && !isSm && !isMd) {
      cols.push({
        field: 'prazo',
        headerName: 'Prazo',
        flex: 1.3,
        minWidth: 160,
        sortable: false,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => {
          const row = params.row;
          const isClosed = Number(row.what) <= 0;
          if (isClosed) return null;

          const dl = getDocumentDeadline(row);
          const { days: elapsed } = getBusinessDaysSince(row.exec_data || row.submission);
          const remaining = dl - elapsed;
          const overdue = remaining < 0;
          const alertLimit = Math.max(Math.floor(dl * 0.25), 2);
          const warning = !overdue && remaining <= alertLimit;
          const timerColor = overdue ? 'error' : warning ? 'warning' : 'success';

          return (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 0.75, py: 0.4, borderRadius: 1,
              bgcolor: alpha(theme.palette[timerColor].main, 0.08),
              border: `1px solid ${alpha(theme.palette[timerColor].main, 0.2)}`,
            }}>
              <TimeIcon sx={{ fontSize: 12, color: `${timerColor}.main`, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.7rem', fontWeight: 600, color: `${timerColor}.dark` }}>
                {overdue
                  ? `Ultrapassou há ${formatBusinessDays(Math.abs(remaining))}`
                  : `Faltam ${formatBusinessDays(remaining)} (${dl} du)`
                }
              </Typography>
            </Box>
          );
        },
      });
    }

    // Actions
    cols.push({
      field: 'actions',
      headerName: '',
      width: 50, minWidth: 50,
      sortable: false, disableColumnMenu: true, disableReorder: true,
      headerAlign: 'center', align: 'center',
      renderCell: (params) => (
        <Tooltip title="Ver Detalhes">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onViewDetails(params.row); }} color="primary">
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    });

    return cols;
  }, [isXs, isSm, isMd, isLg, metaData, onViewDetails, theme]);

  // Row class for deadline highlighting
  const getRowClassName = (params) => {
    if (!showDeadline) return '';
    const row = params.row;
    const isClosed = Number(row.what) <= 0;
    if (isClosed) return '';
    const dl = getDocumentDeadline(row);
    const { days: elapsed } = getBusinessDaysSince(row.exec_data || row.submission);
    const remaining = dl - elapsed;
    if (remaining < 0) return 'row-overdue';
    const alertLimit = Math.max(Math.floor(dl * 0.25), 2);
    if (remaining <= alertLimit) return 'row-warning';
    return '';
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={documents || []}
        columns={columns}
        getRowId={(row) => row.pk}
        loading={loading}
        rowHeight={52}
        disableRowSelectionOnClick
        disableColumnMenu
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        getRowClassName={getRowClassName}
        onRowClick={(params) => onViewDetails(params.row)}
        sx={{
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
          },
          '& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.82rem',
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.5)}`,
          },
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
          },
          // Overdue row highlight
          '& .row-overdue': {
            bgcolor: alpha(theme.palette.error.main, 0.04),
            borderLeft: `3px solid ${theme.palette.error.main}`,
            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
          },
          // Warning row highlight
          '& .row-warning': {
            bgcolor: alpha(theme.palette.warning.main, 0.04),
            borderLeft: `3px solid ${theme.palette.warning.main}`,
            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08) },
          },
          backgroundColor: 'background.paper',
          borderRadius: 3,
          boxShadow: theme.shadows[1],
        }}
      />
    </Box>
  );
};

export default DocumentList;
