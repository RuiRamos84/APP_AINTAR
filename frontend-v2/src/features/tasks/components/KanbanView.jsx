/**
 * KanbanView - Vista Kanban de Tarefas
 *
 * Componente reutilizável para mostrar tarefas em formato Kanban
 * com drag & drop entre colunas.
 *
 * @component
 */

import { useCallback, useMemo } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
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
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTouch = 'ontouchstart' in window;

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

  return (
    <DndProvider backend={dndBackend}>
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1, sm: 1.5, md: 2 },
          width: '100%',
          overflowX: { xs: 'auto', md: 'hidden' },
          overflowY: 'hidden',
          pb: { xs: 1, sm: 2 },
          px: { xs: 0.5, sm: 0 },
          minHeight: {
            xs: 'calc(100vh - 380px)',
            sm: 'calc(100vh - 420px)',
            md: 'calc(100vh - 450px)',
          },
          // Scroll horizontal suave (apenas em mobile/tablet)
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
        {KANBAN_COLUMNS.map((column) => (
          <TaskColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
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
};

export default KanbanView;
