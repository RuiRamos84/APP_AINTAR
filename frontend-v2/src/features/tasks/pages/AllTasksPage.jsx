/**
 * AllTasksPage - Todas as Tarefas (Admin)
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Button,
  Stack,
  Chip,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as TaskIcon,
  Flag as FlagIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DataTable, useDataTable } from '@/shared/components/data';
import { ModulePage } from '@/shared/components/layout';
import { CreateTaskModal, TaskModal, QuickFilters } from '../components';
import { useTasks } from '../hooks/useTasks';
import { format } from 'date-fns';

const getPriorityColor = (p) =>
  ({ urgente: 'error', alta: 'warning', media: 'info', baixa: 'success' }[p] || 'default');
const getStatusColor = (s) =>
  ({ pending: 'warning', in_progress: 'info', completed: 'success', cancelled: 'default' }[s] ||
    'default');
const getStatusLabel = (s) =>
  ({
    pending: 'Por Fazer',
    in_progress: 'Em Progresso',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  }[s] || s);

export const AllTasksPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    page,
    rowsPerPage,
    orderBy,
    order,
    handlePageChange,
    handleRowsPerPageChange,
    handleSort,
  } = useDataTable({ defaultOrderBy: 'when_start', defaultOrder: 'desc' });

  const { tasks, loading, error, totalCount, filters, fetchTasks, setFilters, refresh } = useTasks({
    autoFetch: true,
  });

  const columns = useMemo(
    () => [
      {
        id: 'title',
        label: 'Tarefa',
        minWidth: 200,
        sortable: true,
        render: (v, r) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {v}
            </Typography>
            {r.description && (
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
                {r.description}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'priority',
        label: 'Prioridade',
        minWidth: 100,
        sortable: true,
        align: 'center',
        render: (v) => <Chip label={v} color={getPriorityColor(v)} size="small" />,
      },
      {
        id: 'status',
        label: 'Estado',
        minWidth: 120,
        sortable: true,
        align: 'center',
        render: (v) => <Chip label={getStatusLabel(v)} color={getStatusColor(v)} size="small" />,
      },
      {
        id: 'owner_name',
        label: 'Proprietário',
        minWidth: 150,
        render: (v) => v || '-',
      },
      {
        id: 'client_name',
        label: 'Cliente',
        minWidth: 150,
        render: (v) => v || '-',
      },
      {
        id: 'when_start',
        label: 'Criada em',
        minWidth: 100,
        sortable: true,
        render: (v) =>
          v ? (
            <Typography variant="body2">{format(new Date(v), 'dd/MM/yyyy')}</Typography>
          ) : (
            '-'
          ),
      },
    ],
    []
  );

  const handleFiltersChange = useCallback(
    (f) => {
      setFilters(f);
      fetchTasks();
    },
    [setFilters, fetchTasks]
  );

  // Mobile card renderer
  const mobileCardRenderer = useCallback(
    (task) => (
      <Card
        key={task.pk || task.id}
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
        onClick={() => {
          setSelectedTask(task);
          setTaskModalOpen(true);
        }}
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
              sx={{ fontSize: '0.75rem', color: 'text.secondary', flexWrap: 'wrap' }}
            >
              {task.owner_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>
                    {task.owner_name.charAt(0)}
                  </Avatar>
                  <Typography variant="caption">{task.owner_name}</Typography>
                </Box>
              )}
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
    [theme]
  );

  return (
    <ModulePage
      title="Todas as Tarefas"
      subtitle="Vista completa"
      icon={TaskIcon}
      breadcrumbs={[
        { label: 'Início', path: '/' },
        { label: 'Tarefas', path: '/tasks' },
        { label: 'Todas' },
      ]}
    >
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={2}
          mb={3}
        >
          <Typography variant="h5" fontWeight={700}>
            {totalCount} Tarefa{totalCount !== 1 ? 's' : ''}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setShowFilters(!showFilters)}>
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
                    Sem tarefas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Não foram encontradas tarefas.
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
            emptyMessage="Sem tarefas"
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            paginationMode="client"
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
            onRowClick={(t) => {
              setSelectedTask(t);
              setTaskModalOpen(true);
            }}
            striped
            hover
            stickyHeader
            maxHeight="calc(100vh - 350px)"
          />
        )}

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

export default AllTasksPage;
