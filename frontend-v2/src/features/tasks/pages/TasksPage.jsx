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
  Archive as ArchiveIcon,
  GroupWork as GroupIcon,
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
  ALL: 'all', // Todas as tarefas (admin)
  ASSIGNED: 'assigned', // Tarefas atribuídas ao utilizador
  CREATED: 'created', // Tarefas criadas pelo utilizador
  CLOSED: 'closed', // Tarefas encerradas (arquivadas)
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
  const [groupBy, setGroupBy] = useState('status'); // 'status' | 'client' - agrupamento (só admin)

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
  // IMPORTANTE: Tarefas encerradas (when_stop != null) só aparecem na tab "Encerradas"
  const filteredTasks = useMemo(() => {
    if (!tasks || !userId) return [];

    switch (activeTab) {
      case TAB_TYPES.ALL:
        // Admin vê todas as tarefas ATIVAS (não encerradas)
        return tasks.filter((task) => !task.when_stop);

      case TAB_TYPES.ASSIGNED:
        // Tarefas ATIVAS atribuídas ao utilizador (ts_client = utilizador)
        // O CLIENT é quem executa a tarefa
        return tasks.filter((task) => {
          const taskClient = task.client || task.ts_client;
          return taskClient === userId && !task.when_stop;
        });

      case TAB_TYPES.CREATED:
        // Tarefas ATIVAS criadas pelo utilizador (owner = utilizador)
        // O OWNER é quem criou a tarefa
        return tasks.filter((task) => {
          const taskOwner = task.owner || task.ts_owner;
          return taskOwner === userId && !task.when_stop;
        });

      case TAB_TYPES.CLOSED:
        // Tarefas ENCERRADAS (when_stop preenchido)
        // Mostra todas as encerradas onde o utilizador é owner OU client
        return tasks.filter((task) => {
          if (!task.when_stop) return false;
          const taskOwner = task.owner || task.ts_owner;
          const taskClient = task.client || task.ts_client;
          return isAdmin || taskOwner === userId || taskClient === userId;
        });

      default:
        return tasks.filter((task) => !task.when_stop);
    }
  }, [tasks, activeTab, userId, isAdmin]);

  // Estatísticas por tab
  // Contagens separadas para tarefas ativas vs encerradas
  const tabStats = useMemo(() => {
    if (!tasks || !userId) return { all: 0, assigned: 0, created: 0, closed: 0 };

    // Separar tarefas ativas e encerradas
    const activeTasks = tasks.filter((t) => !t.when_stop);
    const closedTasks = tasks.filter((t) => !!t.when_stop);

    return {
      // ALL = tarefas ativas (admin)
      all: activeTasks.length,
      // ASSIGNED = tarefas ATIVAS onde sou o CLIENT (atribuídas a mim)
      assigned: activeTasks.filter((t) => (t.client || t.ts_client) === userId).length,
      // CREATED = tarefas ATIVAS onde sou o OWNER (criadas por mim)
      created: activeTasks.filter((t) => (t.owner || t.ts_owner) === userId).length,
      // CLOSED = tarefas encerradas onde sou owner OU client
      closed: closedTasks.filter((t) => {
        const taskOwner = t.owner || t.ts_owner;
        const taskClient = t.client || t.ts_client;
        return isAdmin || taskOwner === userId || taskClient === userId;
      }).length,
    };
  }, [tasks, userId, isAdmin]);

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

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

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
    <ModulePage breadcrumbs={[{ label: 'Início', path: '/' }, { label: 'Tarefas' }]}>
      <Container
        maxWidth="xl"
        sx={{
          pt: { xs: 0.5, sm: 1 },
          pb: { xs: 1, sm: 2 },
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        {/* Header Unificado: Título + Tabs + Ações na mesma linha */}
        <Paper
          elevation={0}
          sx={{
            mb: { xs: 2, sm: 3 },
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          {/* Linha 1: Título + Tabs + Controlos */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              p: { xs: 1, sm: 1.5 },
              flexWrap: { xs: 'wrap', md: 'nowrap' },
            }}
          >
            {/* Título (esquerda) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexShrink: 0,
              }}
            >
              <TaskIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: 'primary.main' }} />
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, whiteSpace: 'nowrap' }}
              >
                Gestão de Tarefas
              </Typography>
            </Box>

            {/* Tabs (centro, flexível) */}
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flex: 1,
                minWidth: 0,
                '& .MuiTabs-flexContainer': {
                  justifyContent: { xs: 'flex-start', md: 'center' },
                },
                '& .MuiTab-root': {
                  minHeight: { xs: 40, sm: 44 },
                  minWidth: 'auto',
                  px: { xs: 1, sm: 1.5 },
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                },
              }}
            >
              {/* Tab Todas - Apenas Admin */}
              {isAdmin && (
                <Tab
                  value={TAB_TYPES.ALL}
                  icon={
                    <Badge badgeContent={tabStats.all} color="primary" max={99}>
                      <AdminIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    </Badge>
                  }
                  iconPosition="start"
                  label={isTablet ? '' : 'Todas'}
                />
              )}

              {/* Tab Minhas Tarefas */}
              <Tab
                value={TAB_TYPES.ASSIGNED}
                icon={
                  <Badge badgeContent={tabStats.assigned} color="info" max={99}>
                    <PersonIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                  </Badge>
                }
                iconPosition="start"
                label={isTablet ? '' : 'Minhas'}
              />

              {/* Tab Criadas por Mim */}
              <Tab
                value={TAB_TYPES.CREATED}
                icon={
                  <Badge badgeContent={tabStats.created} color="secondary" max={99}>
                    <EditIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                  </Badge>
                }
                iconPosition="start"
                label={isTablet ? '' : 'Criadas'}
              />

              {/* Tab Encerradas */}
              <Tab
                value={TAB_TYPES.CLOSED}
                icon={
                  <Badge badgeContent={tabStats.closed} color="default" max={99}>
                    <ArchiveIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                  </Badge>
                }
                iconPosition="start"
                label={isTablet ? '' : 'Encerradas'}
              />
            </Tabs>

            {/* Controlos (direita) */}
            <Stack direction="row" alignItems="center" spacing={0.25} flexShrink={0}>
              {/* Toggle Vista */}
              <Tooltip title="Vista Kanban">
                <IconButton
                  onClick={() => setViewMode(VIEW_MODES.KANBAN)}
                  color={viewMode === VIEW_MODES.KANBAN ? 'primary' : 'default'}
                  size="small"
                >
                  <KanbanIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Vista Lista">
                <IconButton
                  onClick={() => setViewMode(VIEW_MODES.LIST)}
                  color={viewMode === VIEW_MODES.LIST ? 'primary' : 'default'}
                  size="small"
                >
                  <ListIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Agrupar por Cliente (só admin, só na vista Kanban) */}
              {isAdmin && viewMode === VIEW_MODES.KANBAN && (
                <Tooltip
                  title={groupBy === 'client' ? 'Agrupar por Status' : 'Agrupar por Cliente'}
                >
                  <IconButton
                    onClick={() => setGroupBy(groupBy === 'client' ? 'status' : 'client')}
                    color={groupBy === 'client' ? 'secondary' : 'default'}
                    size="small"
                  >
                    <GroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {/* Filtros Rápidos */}
              <Tooltip title="Filtros Rápidos">
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                  size="small"
                >
                  <FilterIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Filtros Avançados */}
              {!isMobile && (
                <Tooltip title="Filtros Avançados">
                  <IconButton onClick={() => setShowAdvancedFilters(true)} size="small">
                    <TuneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {/* Exportar */}
              <ExportButton
                tasks={filteredTasks}
                size="small"
                disabled={filteredTasks.length === 0}
              />

              {/* Atualizar */}
              <Tooltip title="Atualizar">
                <span>
                  <IconButton onClick={() => refresh()} disabled={loading} size="small">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Nova Tarefa */}
              <Button
                variant="contained"
                startIcon={!isMobile && <AddIcon />}
                onClick={handleCreateTask}
                size="small"
                sx={{ ml: 0.5 }}
              >
                {isMobile ? <AddIcon /> : 'Nova'}
              </Button>
            </Stack>
          </Box>

          {/* Linha 2: Subtítulo + Info da Tab Ativa */}
          <Box
            sx={{
              px: 2,
              py: 0.5,
              bgcolor: alpha(theme.palette.info.main, 0.04),
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
              Gerir e acompanhar tarefas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              •
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeTab === TAB_TYPES.ALL && 'Todas as tarefas ativas do sistema'}
              {activeTab === TAB_TYPES.ASSIGNED && 'Tarefas atribuídas a si'}
              {activeTab === TAB_TYPES.CREATED && 'Tarefas que criou'}
              {activeTab === TAB_TYPES.CLOSED && 'Histórico de tarefas encerradas'}
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
                <QuickFilters filters={filters} onChange={handleFiltersChange} isAdmin={isAdmin} />
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
              {activeTab === TAB_TYPES.ALL && 'Não existem tarefas ativas no sistema.'}
              {activeTab === TAB_TYPES.ASSIGNED && 'Não tem tarefas ativas atribuídas de momento.'}
              {activeTab === TAB_TYPES.CREATED && 'Não tem tarefas ativas criadas por si.'}
              {activeTab === TAB_TYPES.CLOSED && 'Não existem tarefas encerradas.'}
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateTask}>
              Criar Tarefa
            </Button>
          </Paper>
        ) : (
          /* Conteúdo: Kanban ou Lista */
          /* Nota: Tab "Encerradas" mostra sempre ListView (não faz sentido Kanban) */
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${activeTab}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === VIEW_MODES.KANBAN && activeTab !== TAB_TYPES.CLOSED ? (
                <KanbanView
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onStatusChange={updateStatus}
                  onMenuAction={handleMenuAction}
                  canDrag={canDragTask}
                  loading={loading}
                  groupBy={groupBy}
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
