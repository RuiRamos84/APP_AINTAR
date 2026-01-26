/**
 * ListView - Vista em Lista de Tarefas
 *
 * Componente reutilizável para mostrar tarefas em formato de tabela/lista
 * com paginação, ordenação e responsividade.
 *
 * @component
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Stack,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
  useMediaQuery,
  alpha,
  Avatar,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { format, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import PropTypes from 'prop-types';

// ============================================
// CONSTANTES
// ============================================

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'warning' },
  in_progress: { label: 'Em Progresso', color: 'info' },
  completed: { label: 'Concluída', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'default' },
};

const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'success', icon: '🟢' },
  media: { label: 'Média', color: 'info', icon: '🔵' },
  alta: { label: 'Alta', color: 'warning', icon: '🟠' },
  urgente: { label: 'Urgente', color: 'error', icon: '🔴' },
};

const TABLE_COLUMNS = [
  { id: 'title', label: 'Tarefa', sortable: true, minWidth: 200 },
  { id: 'priority', label: 'Prioridade', sortable: true, minWidth: 100 },
  { id: 'status', label: 'Estado', sortable: true, minWidth: 120 },
  { id: 'owner_name', label: 'Atribuído a', sortable: true, minWidth: 150 },
  { id: 'when_start', label: 'Data', sortable: true, minWidth: 120 },
  { id: 'actions', label: '', sortable: false, minWidth: 60 },
];

// ============================================
// HELPERS
// ============================================

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return '-';
    return format(date, 'dd MMM yyyy', { locale: pt });
  } catch {
    return '-';
  }
};

// ============================================
// COMPONENTE MOBILE CARD
// ============================================

const TaskMobileCard = ({ task, onTaskClick }) => {
  const theme = useTheme();
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: 'primary.main',
        },
      }}
    >
      <CardActionArea onClick={() => onTaskClick(task)}>
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {/* Header: Título + Prioridade */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {task.title || task.name}
              </Typography>
              <Chip
                label={priorityConfig.icon}
                size="small"
                sx={{ ml: 1, minWidth: 32 }}
              />
            </Stack>

            {/* Info Row */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {/* Status */}
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size="small"
                variant="outlined"
              />

              {/* Owner */}
              {task.owner_name && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {task.owner_name}
                  </Typography>
                </Stack>
              )}

              {/* Data */}
              {task.when_start && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(task.when_start)}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const ListView = ({
  tasks = [],
  onTaskClick,
  canEdit,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Estado local
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('when_start');
  const [order, setOrder] = useState('desc');

  // Ordenar tarefas
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle null/undefined
      if (aValue == null) return order === 'asc' ? 1 : -1;
      if (bValue == null) return order === 'asc' ? -1 : 1;

      // String comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, orderBy, order]);

  // Paginação
  const paginatedTasks = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedTasks.slice(start, start + rowsPerPage);
  }, [sortedTasks, page, rowsPerPage]);

  // Handlers
  const handleSort = useCallback((columnId) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  }, [orderBy, order]);

  const handleChangePage = useCallback((_, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Mobile: Lista de Cards
  if (isMobile) {
    return (
      <Box>
        {paginatedTasks.map((task) => (
          <TaskMobileCard
            key={task.pk || task.id}
            task={task}
            onTaskClick={onTaskClick}
          />
        ))}

        {/* Paginação Mobile */}
        <TablePagination
          component="div"
          count={tasks.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage=""
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count}`
          }
          sx={{
            '& .MuiTablePagination-toolbar': {
              justifyContent: 'center',
              flexWrap: 'wrap',
            },
          }}
        />
      </Box>
    );
  }

  // Desktop: Tabela
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        overflow: 'hidden',
      }}
    >
      <TableContainer>
        <Table stickyHeader size="medium">
          <TableHead>
            <TableRow>
              {TABLE_COLUMNS.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    minWidth: column.minWidth,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    fontWeight: 600,
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedTasks.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;

              return (
                <TableRow
                  key={task.pk || task.id}
                  hover
                  onClick={() => onTaskClick(task)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                    },
                  }}
                >
                  {/* Título */}
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title || task.name}
                    </Typography>
                    {task.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Prioridade */}
                  <TableCell>
                    <Chip
                      label={priorityConfig.label}
                      color={priorityConfig.color}
                      size="small"
                      icon={<FlagIcon />}
                    />
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Chip
                      label={statusConfig.label}
                      color={statusConfig.color}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>

                  {/* Atribuído a */}
                  <TableCell>
                    {task.owner_name ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            fontSize: '0.75rem',
                            bgcolor: 'primary.main',
                          }}
                        >
                          {task.owner_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2">
                          {task.owner_name}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>

                  {/* Data */}
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(task.when_start)}
                    </Typography>
                  </TableCell>

                  {/* Ações */}
                  <TableCell>
                    <Tooltip title="Ver detalhes">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task);
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Empty state */}
            {paginatedTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={TABLE_COLUMNS.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma tarefa encontrada
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      <TablePagination
        component="div"
        count={tasks.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />
    </Paper>
  );
};

ListView.propTypes = {
  tasks: PropTypes.array,
  onTaskClick: PropTypes.func.isRequired,
  canEdit: PropTypes.func,
  loading: PropTypes.bool,
};

export default ListView;
