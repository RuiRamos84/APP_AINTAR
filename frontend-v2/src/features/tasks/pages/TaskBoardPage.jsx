/**
 * TaskBoardPage - Quadro Kanban de Tarefas
 *
 * Vista principal do Kanban com drag & drop
 *
 * Características:
 * - Drag & drop entre colunas
 * - Filtros rápidos
 * - Estatísticas em tempo real
 * - Responsivo (scroll horizontal em mobile)
 * - Auto-refresh via WebSocket
 * - Animações suaves
 *
 * @page /tasks/board
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Fab,
  useMediaQuery,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  ViewKanban as KanbanIcon,
  TableRows as TableIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { motion, AnimatePresence } from 'framer-motion';
import notification from '@/core/services/notification';

// Components
import TaskColumn from '../components/TaskColumn';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskModal from '../components/TaskModal';
import QuickFilters from '../components/QuickFilters';
import { ModulePage } from '@/shared/components/layout';
import { Loading } from '@/shared/components/feedback';

// Hooks
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '@/core/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Utils
import { validateStatusTransition } from '../schemas/taskSchemas';

/**
 * Configuração das colunas do Kanban
 * Nota: Tarefas canceladas não aparecem no Kanban (podem ser vistas em "Todas as Tarefas")
 */
const KANBAN_COLUMNS = [
  { id: 'pending', label: 'Por Fazer' },
  { id: 'in_progress', label: 'Em Progresso' },
  { id: 'completed', label: 'Concluídas' },
];

/**
 * TaskBoardPage Component
 */
export const TaskBoardPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px
  const isTablet = useMediaQuery(theme.breakpoints.down('md')); // <960px
  const isTouch = 'ontouchstart' in window;

  // Estado local
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // Hook de tarefas
  const {
    tasks,
    loading,
    error,
    filters,
    fetchTasks,
    updateStatus,
    getTasksByStatus,
    getTaskStats,
    setFilters,
    refresh,
  } = useTasks({
    autoFetch: true,
    fetchOnMount: true,
  });

  // Agrupar tarefas por status
  const tasksByStatus = getTasksByStatus();

  // Estatísticas
  const stats = getTaskStats();

  // Detectar backend (HTML5 ou Touch)
  const dndBackend = isTouch ? TouchBackend : HTML5Backend;

  // Handle drag & drop
  const handleDrop = useCallback(
    async (item, targetColumnId) => {
      const task = item.task;
      const sourceColumnId = item.columnId;

      console.log('Drop:', { task, sourceColumnId, targetColumnId });

      // Não fazer nada se soltar na mesma coluna
      if (sourceColumnId === targetColumnId) {
        return;
      }

      // Validar transição de status
      try {
        validateStatusTransition(sourceColumnId, targetColumnId);
      } catch (err) {
        notification.error(err.message);
        return;
      }

      // Atualizar status
      try {
        await updateStatus(task.pk || task.id, targetColumnId);
        notification.success(`Tarefa movida para "${KANBAN_COLUMNS.find(c => c.id === targetColumnId)?.label}"`);
      } catch (err) {
        notification.error('Erro ao mover tarefa');
        console.error(err);
      }
    },
    [updateStatus]
  );

  // Handle task click
  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  }, []);

  // Handle criar tarefa
  const handleCreateTask = () => {
    setCreateModalOpen(true);
  };

  // Handle task criada
  const handleTaskCreated = () => {
    setCreateModalOpen(false);
    refresh();
  };

  // Handle task atualizada
  const handleTaskUpdated = () => {
    setTaskModalOpen(false);
    setSelectedTask(null);
    refresh();
  };

  // Handle filtros
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // Refresh automático (polling opcional)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refresh();
      }
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [loading, refresh]);

  return (
    <DndProvider backend={dndBackend}>
      <ModulePage
        title="Quadro de Tarefas"
        subtitle="Gerir tarefas em modo Kanban"
        icon={KanbanIcon}
        breadcrumbs={[
          { label: 'Início', path: '/' },
          { label: 'Tarefas', path: '/tasks' },
          { label: 'Quadro Kanban' },
        ]}
      >
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 2, sm: 3 },
            px: { xs: 1, sm: 2, md: 3 }
          }}
        >
          {/* Cabeçalho com ações */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            mb={{ xs: 2, sm: 3 }}
          >
            {/* Estatísticas Compactas */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Stack
                    direction="row"
                    spacing={{ xs: 1, sm: 2 }}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 0.5, sm: 1 },
                    }}
                  >
                    {/* Total */}
                    <Chip
                      label={stats.total}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}
                    />

                    {/* Em Progresso */}
                    {stats.in_progress > 0 && (
                      <Chip
                        label={stats.in_progress}
                        color="info"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      />
                    )}

                    {/* Concluídas */}
                    {stats.completed > 0 && (
                      <Chip
                        label={stats.completed}
                        color="success"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      />
                    )}

                    {/* Prioritárias */}
                    {stats.high_priority > 0 && (
                      <Chip
                        label={`🔴 ${stats.high_priority}`}
                        color="error"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      />
                    )}
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ações */}
            <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }}>
              {!isMobile && (
                <Tooltip title="Estatísticas">
                  <IconButton
                    onClick={() => setShowStats(!showStats)}
                    color={showStats ? 'primary' : 'default'}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    <StatsIcon />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Filtros">
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Atualizar">
                <IconButton
                  onClick={refresh}
                  disabled={loading}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTask}
                size={isMobile ? 'small' : 'medium'}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                Nova Tarefa
              </Button>
            </Stack>
          </Stack>

          {/* Filtros */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Box mb={{ xs: 2, sm: 3 }}>
                  <QuickFilters filters={filters} onChange={handleFiltersChange} />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          {loading && tasks.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, sm: 8 } }}>
              <Loading message="A carregar tarefas..." />
            </Box>
          ) : (
            /* Kanban Board */
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, sm: 1.5, md: 2 },
                overflowX: 'auto',
                overflowY: 'hidden',
                pb: { xs: 1, sm: 2 },
                px: { xs: 0.5, sm: 0 },
                minHeight: {
                  xs: 'calc(100vh - 280px)', // Mobile: mais espaço para o Kanban
                  sm: 'calc(100vh - 350px)',
                  md: 'calc(100vh - 400px)',
                },
                // Scroll horizontal suave
                scrollSnapType: 'x proximity',
                WebkitOverflowScrolling: 'touch',

                // Scrollbar styling
                '&::-webkit-scrollbar': {
                  height: { xs: 6, sm: 8 },
                },
                '&::-webkit-scrollbar-track': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: 4,
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                  borderRadius: 4,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.3),
                  },
                },
              }}
            >
              {KANBAN_COLUMNS.map((column) => (
                <TaskColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByStatus[column.id] || []}
                  onTaskClick={handleTaskClick}
                  onDrop={handleDrop}
                  loading={loading}
                  compact={isMobile}
                />
              ))}
            </Box>
          )}

          {/* FAB para mobile */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="adicionar tarefa"
              onClick={handleCreateTask}
              sx={{
                position: 'fixed',
                bottom: { xs: 80, sm: 24 }, // Evita cobrir navbar mobile
                right: 16,
                zIndex: 1000,
                minWidth: 56,
                minHeight: 56, // Touch target adequado
              }}
            >
              <AddIcon />
            </Fab>
          )}

          {/* Modals */}
          <CreateTaskModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onSuccess={handleTaskCreated}
          />

          <TaskModal
            open={taskModalOpen}
            task={selectedTask}
            onClose={() => {
              setTaskModalOpen(false);
              setSelectedTask(null);
            }}
            onSuccess={handleTaskUpdated}
          />
        </Container>
      </ModulePage>
    </DndProvider>
  );
};

export default TaskBoardPage;
