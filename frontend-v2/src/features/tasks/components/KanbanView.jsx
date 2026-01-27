/**
 * KanbanView - Vista Kanban de Tarefas
 *
 * Componente reutilizável para mostrar tarefas em formato Kanban
 * com drag & drop entre colunas.
 *
 * @component
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Person as PersonIcon } from '@mui/icons-material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

// Components
import TaskColumn from './TaskColumn';

// Utils
import { validateStatusTransition } from '../schemas/taskSchemas';

// ============================================
// CONSTANTES
// ============================================

const KANBAN_COLUMNS = [
  { id: 'pending', label: 'Por Fazer', color: 'warning' },
  { id: 'in_progress', label: 'Em Progresso', color: 'info' },
  { id: 'completed', label: 'Concluídas', color: 'success' },
];

// ============================================
// COMPONENTE
// ============================================

const KanbanView = ({
  tasks = [],
  onTaskClick,
  onStatusChange,
  onMenuAction,
  canDrag,
  loading = false,
  groupBy = 'status', // 'status' | 'client'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTouch = 'ontouchstart' in window;

  // Estado para acordeão expandido (quando groupBy === 'client')
  const [expandedClient, setExpandedClient] = useState(null);

  // Agrupar tarefas por status
  const tasksByStatus = useMemo(() => {
    const grouped = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    tasks.forEach((task) => {
      const status = task.status || 'pending';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Agrupar tarefas por cliente (extrair clientes únicos das tarefas)
  const { clientColumns, tasksByClient } = useMemo(() => {
    if (groupBy !== 'client') return { clientColumns: [], tasksByClient: {} };

    // Extrair clientes únicos das tarefas
    const clientsMap = new Map();
    tasks.forEach((task) => {
      const clientId = task.client || task.ts_client;
      const clientName = task.client_name || task.ts_client_name || `Cliente ${clientId}`;
      if (clientId && !clientsMap.has(clientId)) {
        clientsMap.set(clientId, { id: clientId, label: clientName, color: 'primary' });
      }
    });

    // Converter para array de colunas
    const columns = Array.from(clientsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    // Agrupar tarefas por cliente
    const grouped = {};
    columns.forEach((col) => {
      grouped[col.id] = [];
    });
    tasks.forEach((task) => {
      const clientId = task.client || task.ts_client;
      if (clientId && grouped[clientId]) {
        grouped[clientId].push(task);
      }
    });

    return { clientColumns: columns, tasksByClient: grouped };
  }, [tasks, groupBy]);

  // Função para agrupar tarefas por status (para mini-Kanban dentro do acordeão)
  const groupTasksByStatus = useCallback((clientTasks) => {
    const grouped = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    clientTasks.forEach((task) => {
      const status = task.status || 'pending';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });
    return grouped;
  }, []);

  // Contar tarefas por prioridade para mostrar no header do acordeão
  const countPriorityTasks = useCallback((clientTasks) => {
    let urgent = 0;
    let high = 0;
    clientTasks.forEach((task) => {
      if (task.priority === 'urgente') urgent++;
      else if (task.priority === 'alta') high++;
    });
    return { urgent, high };
  }, []);

  // Detectar backend DnD
  const dndBackend = isTouch ? TouchBackend : HTML5Backend;

  // Handle drop (drag & drop)
  const handleDrop = useCallback(
    async (item, targetColumnId) => {
      const task = item.task;
      const sourceColumnId = item.columnId;

      // Não fazer nada se soltar na mesma coluna
      if (sourceColumnId === targetColumnId) {
        return;
      }

      // Verificar se pode arrastar esta tarefa
      if (canDrag && !canDrag(task)) {
        toast.error('Não tem permissão para mover esta tarefa');
        return;
      }

      // Validar transição de status
      try {
        validateStatusTransition(sourceColumnId, targetColumnId);
      } catch (err) {
        toast.error(err.message);
        return;
      }

      // Atualizar status
      try {
        await onStatusChange(task.pk || task.id, targetColumnId);
        // Toast já é mostrado no hook useTasks
      } catch (err) {
        // Toast de erro já é mostrado no hook useTasks
        console.error(err);
      }
    },
    [onStatusChange, canDrag]
  );

  // Determinar colunas e tarefas baseado no modo de agrupamento
  const columns = groupBy === 'client' ? clientColumns : KANBAN_COLUMNS;
  const tasksGrouped = groupBy === 'client' ? tasksByClient : tasksByStatus;

  // Se agrupamento por cliente e não há clientes, mostrar mensagem
  if (groupBy === 'client' && clientColumns.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
          color: 'text.secondary',
        }}
      >
        <Typography variant="body1">
          Não há tarefas com clientes atribuídos para agrupar.
        </Typography>
      </Box>
    );
  }

  // ============================================
  // RENDER: Vista por Cliente (Acordeões + Mini-Kanban)
  // ============================================
  if (groupBy === 'client') {
    return (
      <DndProvider backend={dndBackend}>
        <Box sx={{ width: '100%' }}>
          {/* Header */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 500,
              }}
            >
              Agrupado por Cliente ({clientColumns.length} clientes)
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {/* Acordeões por Cliente */}
          {clientColumns.map((client) => {
            const clientTasks = tasksByClient[client.id] || [];
            const tasksByStatusForClient = groupTasksByStatus(clientTasks);
            const priorities = countPriorityTasks(clientTasks);
            const isExpanded = expandedClient === client.id;

            return (
              <Accordion
                key={client.id}
                expanded={isExpanded}
                onChange={(_, expanded) => setExpandedClient(expanded ? client.id : null)}
                sx={{
                  mb: 1,
                  borderRadius: '8px !important',
                  '&:before': { display: 'none' },
                  boxShadow: isExpanded
                    ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`
                    : 'none',
                  border: `1px solid ${alpha(theme.palette.divider, isExpanded ? 0.2 : 0.1)}`,
                  overflow: 'hidden',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ width: '100%', pr: 2 }}
                  >
                    <PersonIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                      {client.label}
                    </Typography>

                    {/* Badges de contagem */}
                    <Stack direction="row" spacing={0.5}>
                      {priorities.urgent > 0 && (
                        <Chip
                          label={`${priorities.urgent} urgente${priorities.urgent > 1 ? 's' : ''}`}
                          size="small"
                          color="error"
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                      )}
                      {priorities.high > 0 && (
                        <Chip
                          label={`${priorities.high} alta${priorities.high > 1 ? 's' : ''}`}
                          size="small"
                          color="warning"
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                      )}
                      <Chip
                        label={`${clientTasks.length} tarefa${clientTasks.length !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    </Stack>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 0 }}>
                  {/* Mini-Kanban dentro do acordeão */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: { xs: 1, sm: 1.5 },
                      p: { xs: 1, sm: 2 },
                      overflowX: 'auto',
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                    }}
                  >
                    {KANBAN_COLUMNS.map((column) => (
                      <TaskColumn
                        key={`${client.id}-${column.id}`}
                        column={column}
                        tasks={tasksByStatusForClient[column.id] || []}
                        onTaskClick={onTaskClick}
                        onDrop={handleDrop}
                        onMenuAction={onMenuAction}
                        loading={loading}
                        compact={isMobile}
                        canDrag={canDrag}
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </DndProvider>
    );
  }

  // ============================================
  // RENDER: Vista Normal (Kanban por Status)
  // ============================================
  return (
    <DndProvider backend={dndBackend}>
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1, sm: 1.5, md: 2 },
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          pb: { xs: 1, sm: 2 },
          px: { xs: 0.5, sm: 0 },
          minHeight: {
            xs: 'calc(100vh - 380px)',
            sm: 'calc(100vh - 420px)',
            md: 'calc(100vh - 450px)',
          },
          // Scroll horizontal suave
          scrollSnapType: { xs: 'x proximity', md: 'none' },
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
        {columns.map((column) => (
          <TaskColumn
            key={column.id}
            column={column}
            tasks={tasksGrouped[column.id] || []}
            onTaskClick={onTaskClick}
            onDrop={handleDrop}
            onMenuAction={onMenuAction}
            loading={loading}
            compact={isMobile}
            canDrag={canDrag}
          />
        ))}
      </Box>
    </DndProvider>
  );
};

KanbanView.propTypes = {
  tasks: PropTypes.array,
  onTaskClick: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onMenuAction: PropTypes.func,
  canDrag: PropTypes.func,
  loading: PropTypes.bool,
  groupBy: PropTypes.oneOf(['status', 'client']),
};

export default KanbanView;
