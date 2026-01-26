/**
 * MyTasksPage - Minhas Tarefas
 *
 * Lista de tarefas atribuídas ao utilizador atual
 * Vista em tabela com todas as funcionalidades do DataTable
 *
 * @page /tasks/my
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Button,
  Stack,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Typography,
  Avatar,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CompleteIcon,
  FileDownload as ExportIcon,
  Assignment as TaskIcon,
  Flag as FlagIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

// Components
import { DataTable, useDataTable } from '@/shared/components/data';
import { ModulePage } from '@/shared/components/layout';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskModal from '../components/TaskModal';
import QuickFilters from '../components/QuickFilters';

// Hooks
import { useTasks } from '../hooks/useTasks';

// Utils
import { TASK_PRIORITY, TASK_STATUS } from '../schemas/taskSchemas';

/**
 * Obter cor da prioridade
 */
const getPriorityColor = (priority) => {
  const colors = {
    urgente: 'error',
    alta: 'warning',
    media: 'info',
    baixa: 'success',
  };
  return colors[priority] || 'default';
};

/**
 * Obter cor do status
 */
const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'default',
  };
  return colors[status] || 'default';
};

/**
 * Obter label do status
 */
const getStatusLabel = (status) => {
  const labels = {
    pending: 'Por Fazer',
    in_progress: 'Em Progresso',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
};

/**
 * MyTasksPage Component
 */
export const MyTasksPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Estado local
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Hook DataTable
  const {
    page,
    rowsPerPage,
    orderBy,
    order,
    selected,
    handlePageChange,
    handleRowsPerPageChange,
    handleSort,
    handleSelectionChange,
    clearSelection,
  } = useDataTable({
    defaultOrderBy: 'when_start',
    defaultOrder: 'desc',
  });

  // Hook Tarefas
  const {
    tasks,
    loading,
    error,
    totalCount,
    filters,
    fetchMyTasks,
    updateTask,
    closeTask,
    setFilters,
    refresh,
  } = useTasks({
    autoFetch: false,
    fetchOnMount: false,
  });

  // Carregar minhas tarefas ao montar
  useState(() => {
    fetchMyTasks();
  }, []);

  // Definição das colunas
  const columns = useMemo(
    () => [
      {
        id: 'title',
        label: 'Tarefa',
        minWidth: 200,
        sortable: true,
        render: (value, row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {value}
            </Typography>
            {row.description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {row.description}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'priority',
        label: 'Prioridade',
        minWidth: 120,
        sortable: true,
        align: 'center',
        render: (value) => (
          <Chip
            label={value}
            color={getPriorityColor(value)}
            size="small"
            icon={<FlagIcon />}
          />
        ),
      },
      {
        id: 'status',
        label: 'Estado',
        minWidth: 130,
        sortable: true,
        align: 'center',
        render: (value) => (
          <Chip
            label={getStatusLabel(value)}
            color={getStatusColor(value)}
            size="small"
          />
        ),
      },
      {
        id: 'when_start',
        label: 'Criada em',
        minWidth: 120,
        sortable: true,
        render: (value) => {
          if (!value) return '-';
          const date = new Date(value);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {format(date, 'dd/MM/yyyy', { locale: pt })}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'client_name',
        label: 'Cliente',
        minWidth: 150,
        render: (value) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
              {value?.charAt(0) || '?'}
            </Avatar>
            <Typography variant="body2">{value || 'Desconhecido'}</Typography>
          </Box>
        ),
      },
    ],
    []
  );

  // Handle view task
  const handleViewTask = useCallback((task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  }, []);

  // Handle filtros
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      fetchMyTasks();
    },
    [setFilters, fetchMyTasks]
  );

  // Mobile card renderer
  const mobileCardRenderer = useCallback(
    (task) => (
      <Card
        sx={{
          mb: 2,
          cursor: 'pointer',
          '&:hover': {
            boxShadow: theme.shadows[4],
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          transition: 'all 0.2s ease',
        }}
        onClick={() => handleViewTask(task)}
      >
        <CardContent>
          <Stack spacing={1.5}>
            {/* Título e descrição */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {task.title}
              </Typography>
              {task.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mt: 0.5,
                  }}
                >
                  {task.description}
                </Typography>
              )}
            </Box>

            {/* Chips de status e prioridade */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={task.priority}
                color={getPriorityColor(task.priority)}
                size="small"
                icon={<FlagIcon />}
              />
              <Chip
                label={getStatusLabel(task.status)}
                color={getStatusColor(task.status)}
                size="small"
              />
            </Stack>

            {/* Metadados */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
            >
              {task.client_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>
                    {task.client_name.charAt(0)}
                  </Avatar>
                  <Typography variant="caption">{task.client_name}</Typography>
                </Box>
              )}
              {task.when_start && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption">
                    {format(new Date(task.when_start), 'dd/MM/yyyy')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    ),
    [theme, handleViewTask]
  );

  return (
    <ModulePage
      title="Minhas Tarefas"
      subtitle="Tarefas atribuídas a mim"
      icon={TaskIcon}
      breadcrumbs={[
        { label: 'Início', path: '/' },
        { label: 'Tarefas', path: '/tasks' },
        { label: 'Minhas Tarefas' },
      ]}
    >
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Ações principais */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          mb={3}
        >
          <Typography variant="h5" fontWeight={700}>
            {totalCount} Tarefa{totalCount !== 1 ? 's' : ''}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
            >
              Nova Tarefa
            </Button>
          </Stack>
        </Stack>

        {/* Filtros */}
        {showFilters && (
          <Box mb={3}>
            <QuickFilters filters={filters} onChange={handleFiltersChange} />
          </Box>
        )}

        {/* Tabela ou Cards Mobile */}
        {isMobile ? (
          // Vista Mobile - Cards
          <Box>
            {loading && tasks.length === 0 ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        A carregar...
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Sem tarefas atribuídas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ainda não tem tarefas atribuídas a si.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => mobileCardRenderer(task))
            )}
          </Box>
        ) : (
          // Vista Desktop - Tabela
          <DataTable
            columns={columns}
            data={tasks}
            loading={loading}
            error={error}
            emptyMessage="Sem tarefas atribuídas"
            emptyDescription="Ainda não tem tarefas atribuídas a si."
            // Paginação
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            paginationMode="client"
            // Ordenação
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
            // Ações
            onRowClick={handleViewTask}
            // Estilo
            striped
            hover
            stickyHeader
            maxHeight="calc(100vh - 350px)"
          />
        )}

        {/* Modals */}
        <CreateTaskModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            refresh();
          }}
        />

        <TaskModal
          open={taskModalOpen}
          task={selectedTask}
          onClose={() => {
            setTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onSuccess={() => {
            setTaskModalOpen(false);
            setSelectedTask(null);
            refresh();
          }}
        />
      </Container>
    </ModulePage>
  );
};

export default MyTasksPage;
