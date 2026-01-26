/**
 * TasksPage - Página Unificada de Gestão de Tarefas
 *
 * Estrutura:
 * - Header com toggle Vista (Kanban/Lista)
 * - Tabs: Todas (admin) | Minhas Tarefas | Criadas por Mim
 * - Filtros rápidos
 * - Conteúdo dinâmico (KanbanView ou ListView)
 *
 * Permissões:
 * - Tab "Todas": Apenas perfil 0 (admin)
 * - Tarefas atribuídas: Pode modificar estado (drag & drop ou modal)
 * - Tarefas criadas: Pode editar, cancelar, ver progresso
 *
 * @page /tasks
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Tabs,
  Tab,
  Badge,
  Paper,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Tune as TuneIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import KanbanView from '../components/KanbanView';
import ListView from '../components/ListView';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskModal from '../components/TaskModal';
import QuickFilters from '../components/QuickFilters';
import ExportButton from '../components/ExportButton';
import AdvancedFilters from '../components/AdvancedFilters';
import { ModulePage } from '@/shared/components/layout';
import { Loading } from '@/shared/components/feedback';

// Hooks & Context
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '@/core/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

// ============================================
// CONSTANTES
// ============================================

const VIEW_MODES = {
  KANBAN: 'kanban',
  LIST: 'list',
};

const TAB_TYPES = {
  ALL: 'all',           // Todas as tarefas (admin)
  ASSIGNED: 'assigned', // Tarefas atribuídas ao utilizador
  CREATED: 'created',   // Tarefas criadas pelo utilizador
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const TasksPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Verificar se é admin (perfil 0)
  // Nota: profil vem como string do backend
  const isAdmin = user?.profil === '0' || user?.profil === 0 || user?.profile === 0;

  // Estado local
  const [viewMode, setViewMode] = useState(VIEW_MODES.KANBAN);
  const [activeTab, setActiveTab] = useState(TAB_TYPES.ASSIGNED); // Default para tarefas atribuídas
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Hook de tarefas
  const {
    tasks,
    loading,
    error,
    filters,
    fetchTasks,
    setFilters,
    refresh,
    getTaskStats,
    updateStatus,
  } = useTasks({
    autoFetch: true,
    fetchOnMount: true,
  });

  // Listener para eventos de refresh (quando notificação é marcada como lida)
  useEffect(() => {
    const handleTaskRefresh = () => {
      refresh();
    };

    window.addEventListener('task-refresh', handleTaskRefresh);
    return () => window.removeEventListener('task-refresh', handleTaskRefresh);
  }, [refresh]);

  // Abrir modal se taskId estiver na URL (vindo de notificação)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => String(t.pk) === taskId || String(t.id) === taskId);
      if (task) {
        setSelectedTask(task);
        setTaskModalOpen(true);
        // Limpar o parâmetro da URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tasks, setSearchParams]);

  // ID do utilizador atual (backend usa user_id)
  const userId = user?.user_id || user?.pk || user?.id;

  // Filtrar tarefas baseado na tab ativa
  const filteredTasks = useMemo(() => {
    if (!tasks || !userId) return [];

    switch (activeTab) {
      case TAB_TYPES.ALL:
        // Admin vê todas
        return tasks;

      case TAB_TYPES.ASSIGNED:
        // Tarefas atribuídas ao utilizador (ts_client = utilizador)
        // O CLIENT é quem executa a tarefa
        return tasks.filter((task) => {
          const taskClient = task.client || task.ts_client;
          return taskClient === userId;
        });

      case TAB_TYPES.CREATED:
        // Tarefas criadas pelo utilizador (owner = utilizador)
        // O OWNER é quem criou a tarefa
        return tasks.filter((task) => {
          const taskOwner = task.owner || task.ts_owner;
          return taskOwner === userId;
        });

      default:
        return tasks;
    }
  }, [tasks, activeTab, userId]);

  // Estatísticas por tab
  const tabStats = useMemo(() => {
    if (!tasks || !userId) return { all: 0, assigned: 0, created: 0 };

    return {
      all: tasks.length,
      // ASSIGNED = tarefas onde sou o CLIENT (atribuídas a mim)
      assigned: tasks.filter((t) => (t.client || t.ts_client) === userId).length,
      // CREATED = tarefas onde sou o OWNER (criadas por mim)
      created: tasks.filter((t) => (t.owner || t.ts_owner) === userId).length,
    };
  }, [tasks, userId]);

  // Handlers
  const handleTabChange = useCallback((_, newTab) => {
    setActiveTab(newTab);
  }, []);

  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  }, []);

  const handleCreateTask = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleTaskCreated = useCallback(() => {
    setCreateModalOpen(false);
    refresh();
  }, [refresh]);

  const handleTaskUpdated = useCallback(() => {
    setTaskModalOpen(false);
    setSelectedTask(null);
    refresh();
  }, [refresh]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  // Verificar permissões de edição
  const canEditTask = useCallback(
    (task) => {
      if (!userId) return false;
      const taskOwner = task.owner || task.ts_owner;
      // Pode editar se for admin ou se a tarefa está atribuída a ele
      return isAdmin || taskOwner === userId;
    },
    [userId, isAdmin]
  );

  // Verificar permissões de drag & drop
  // Apenas o CLIENT (ts_client) pode arrastar para mudar status
  // O OWNER não pode arrastar (mas pode fechar/reabrir)
  const canDragTask = useCallback(
    (task) => {
      if (!userId) return false;
      // Tarefa fechada não pode ser arrastada
      if (task.when_stop) return false;
      // Apenas o CLIENT pode arrastar
      const taskClient = task.client || task.ts_client;
      return taskClient === userId;
    },
    [userId]
  );

  // Handler para ações do menu de contexto
  const handleMenuAction = useCallback(
    async (action, task, data) => {
      const taskId = task.pk || task.id;

      switch (action) {
        case 'complete':
          await updateStatus(taskId, 'completed');
          refresh();
          break;
        case 'reopen':
          await updateStatus(taskId, 'in_progress');
          refresh();
          break;
        case 'delete':
          // TODO: Implementar delete
          console.log('Delete task:', taskId);
          break;
        case 'priority':
          // TODO: Implementar change priority
          console.log('Change priority:', taskId, data);
          break;
        case 'move':
          await updateStatus(taskId, data);
          refresh();
          break;
        default:
          break;
      }
    },
    [updateStatus, refresh]
  );

  return (
    <ModulePage
      breadcrumbs={[
        { label: 'Início', path: '/' },
        { label: 'Tarefas' },
      ]}
    >
      <Container
        maxWidth="xl"
        sx={{
          pt: { xs: 0.5, sm: 1 },
          pb: { xs: 1, sm: 2 },
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        {/* Header: Título + Ações */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: { xs: 2, sm: 3 },
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            {/* Título e Subtítulo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TaskIcon sx={{ fontSize: 28, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
                  Gestão de Tarefas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gerir e acompanhar tarefas
                </Typography>
              </Box>
            </Box>

            {/* Controlos */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {/* Toggle Vista */}
              <Tooltip title="Vista Kanban">
                <IconButton
                  onClick={() => setViewMode(VIEW_MODES.KANBAN)}
                  color={viewMode === VIEW_MODES.KANBAN ? 'primary' : 'default'}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <KanbanIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Vista Lista">
                <IconButton
                  onClick={() => setViewMode(VIEW_MODES.LIST)}
                  color={viewMode === VIEW_MODES.LIST ? 'primary' : 'default'}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <ListIcon />
                </IconButton>
              </Tooltip>

              {/* Filtros Rápidos */}
              <Tooltip title="Filtros Rápidos">
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>

              {/* Filtros Avançados */}
              {!isMobile && (
                <Tooltip title="Filtros Avançados">
                  <IconButton onClick={() => setShowAdvancedFilters(true)} size="medium">
                    <TuneIcon />
                  </IconButton>
                </Tooltip>
              )}

              {/* Exportar */}
              <ExportButton
                tasks={filteredTasks}
                size={isMobile ? 'small' : 'medium'}
                disabled={filteredTasks.length === 0}
              />

              {/* Atualizar */}
              <Tooltip title="Atualizar">
                <span>
                  <IconButton
                    onClick={() => refresh()}
                    disabled={loading}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Nova Tarefa */}
              <Button
                variant="contained"
                startIcon={!isMobile && <AddIcon />}
                onClick={handleCreateTask}
                size={isMobile ? 'small' : 'medium'}
                sx={{ ml: 1 }}
              >
                {isMobile ? <AddIcon /> : 'Nova Tarefa'}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Tabs: Todas | Minhas Tarefas | Criadas por Mim */}
        <Paper
          elevation={0}
          sx={{
            mb: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              '& .MuiTab-root': {
                minHeight: { xs: 48, sm: 56 },
                textTransform: 'none',
                fontWeight: 500,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
              },
            }}
          >
            {/* Tab Todas - Apenas Admin */}
            {isAdmin && (
              <Tab
                value={TAB_TYPES.ALL}
                icon={
                  <Badge badgeContent={tabStats.all} color="primary" max={99}>
                    <AdminIcon fontSize="small" />
                  </Badge>
                }
                iconPosition="start"
                label={isMobile ? '' : 'Todas'}
              />
            )}

            {/* Tab Minhas Tarefas */}
            <Tab
              value={TAB_TYPES.ASSIGNED}
              icon={
                <Badge badgeContent={tabStats.assigned} color="info" max={99}>
                  <PersonIcon fontSize="small" />
                </Badge>
              }
              iconPosition="start"
              label={isMobile ? '' : 'Minhas Tarefas'}
            />

            {/* Tab Criadas por Mim */}
            <Tab
              value={TAB_TYPES.CREATED}
              icon={
                <Badge badgeContent={tabStats.created} color="secondary" max={99}>
                  <EditIcon fontSize="small" />
                </Badge>
              }
              iconPosition="start"
              label={isMobile ? '' : 'Criadas por Mim'}
            />
          </Tabs>

          {/* Info da Tab Ativa */}
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {activeTab === TAB_TYPES.ALL && 'Visualização de todas as tarefas do sistema (apenas administradores)'}
              {activeTab === TAB_TYPES.ASSIGNED && 'Tarefas atribuídas a si - pode alterar estado e adicionar notas'}
              {activeTab === TAB_TYPES.CREATED && 'Tarefas que criou - pode acompanhar o progresso'}
            </Typography>
          </Box>
        </Paper>

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

        {/* Loading */}
        {loading && filteredTasks.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <Loading message="A carregar tarefas..." />
          </Box>
        ) : filteredTasks.length === 0 ? (
          /* Empty State */
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              border: `1px dashed ${alpha(theme.palette.divider, 0.3)}`,
            }}
          >
            <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Sem tarefas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {activeTab === TAB_TYPES.ALL && 'Não existem tarefas no sistema.'}
              {activeTab === TAB_TYPES.ASSIGNED && 'Não tem tarefas atribuídas de momento.'}
              {activeTab === TAB_TYPES.CREATED && 'Ainda não criou nenhuma tarefa.'}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateTask}
            >
              Criar Tarefa
            </Button>
          </Paper>
        ) : (
          /* Conteúdo: Kanban ou Lista */
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === VIEW_MODES.KANBAN ? (
                <KanbanView
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onStatusChange={updateStatus}
                  onMenuAction={handleMenuAction}
                  canDrag={canDragTask}
                  loading={loading}
                />
              ) : (
                <ListView
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  canEdit={canEditTask}
                  loading={loading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* FAB para mobile */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="criar tarefa"
            onClick={handleCreateTask}
            sx={{
              position: 'fixed',
              bottom: { xs: 80, sm: 24 },
              right: 16,
              zIndex: 1000,
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
          canEdit={selectedTask ? canEditTask(selectedTask) : false}
        />

        {/* Advanced Filters Drawer */}
        <AdvancedFilters
          open={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onFilterChange={handleFiltersChange}
          filters={filters}
        />
      </Container>
    </ModulePage>
  );
};

export default TasksPage;
