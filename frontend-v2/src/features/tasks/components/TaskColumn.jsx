/**
 * TaskColumn - Coluna do Kanban Board
 *
 * Características:
 * - Drop zone para drag & drop
 * - Contador de tarefas
 * - Cabeçalho com cor por status
 * - Scroll virtualizável
 * - Responsivo
 *
 * @example
 * <TaskColumn
 *   column={column}
 *   tasks={tasks}
 *   onTaskClick={handleTaskClick}
 *   onDrop={handleDrop}
 * />
 */

import { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Badge,
  useTheme,
  alpha,
  Stack,
  Divider,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrop } from 'react-dnd';
import TaskCard from './TaskCard';
import { EmptyState } from '@/shared/components/feedback';
import PropTypes from 'prop-types';

// Tipos de itens para drag & drop
const ItemTypes = {
  TASK: 'task',
};

/**
 * Configurações de colunas por status
 */
const COLUMN_CONFIGS = {
  pending: {
    id: 'pending',
    label: 'Por Fazer',
    color: '#ff9800', // orange
    icon: '📋',
    emptyMessage: 'Nenhuma tarefa pendente',
  },
  in_progress: {
    id: 'in_progress',
    label: 'Em Progresso',
    color: '#2196f3', // blue
    icon: '⚙️',
    emptyMessage: 'Nenhuma tarefa em progresso',
  },
  completed: {
    id: 'completed',
    label: 'Concluídas',
    color: '#4caf50', // green
    icon: '✅',
    emptyMessage: 'Nenhuma tarefa concluída',
  },
  cancelled: {
    id: 'cancelled',
    label: 'Canceladas',
    color: '#9e9e9e', // grey
    icon: '❌',
    emptyMessage: 'Nenhuma tarefa cancelada',
  },
};

/**
 * Componente TaskColumn
 */
export const TaskColumn = ({
  column,
  tasks = [],
  onTaskClick,
  onDrop,
  onMenuAction,
  loading = false,
  compact = false,
  maxHeight = 'calc(100vh - 300px)',
}) => {
  const theme = useTheme();

  // Config da coluna
  const config = COLUMN_CONFIGS[column.id] || {
    id: column.id,
    label: column.label,
    color: theme.palette.primary.main,
    icon: '📌',
    emptyMessage: 'Nenhuma tarefa',
  };

  // Configurar drop zone
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      drop: (item) => {
        if (item.columnId !== column.id) {
          onDrop?.(item, column.id);
        }
      },
      canDrop: (item) => {
        // Não pode soltar na mesma coluna
        if (item.columnId === column.id) return false;

        // Adicionar lógica de validação de transição de status aqui se necessário
        return true;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [column.id, onDrop]
  );

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      high_priority: tasks.filter((t) => t.priority === 'alta' || t.priority === 'urgente')
        .length,
    };
  }, [tasks]);

  // Estilo do drop zone
  const dropZoneStyle = {
    bgcolor: isOver && canDrop ? alpha(config.color, 0.1) : 'transparent',
    borderColor: isOver && canDrop ? config.color : 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 2,
    transition: 'all 0.3s ease',
  };

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: { xs: 'calc(100vw - 48px)', sm: 280, md: 0 },
        maxWidth: { xs: 'calc(100vw - 32px)', sm: 350, md: 'none' },
        flex: { xs: '0 0 auto', sm: '0 0 auto', md: 1 },
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Cabeçalho da coluna */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          background: `linear-gradient(135deg, ${config.color} 0%, ${alpha(config.color, 0.7)} 100%)`,
          color: '#fff',
          boxShadow: theme.shadows[2],
        }}
      >
        <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
          {/* Ícone - esconder em mobile muito pequeno */}
          <Typography fontSize={{ xs: '1.25rem', sm: '1.5rem' }} sx={{ display: { xs: 'none', sm: 'block' } }}>
            {config.icon}
          </Typography>

          {/* Título */}
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              flex: 1,
              fontSize: { xs: '0.875rem', sm: '1.25rem' },
              lineHeight: 1.2,
            }}
          >
            {config.label}
          </Typography>

          {/* Badge com contador */}
          <Badge
            badgeContent={stats.total}
            color="error"
            max={999}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#fff',
                color: config.color,
                fontWeight: 700,
                fontSize: { xs: '0.625rem', sm: '0.75rem' },
                minWidth: { xs: 16, sm: 20 },
                height: { xs: 16, sm: 20 },
              },
            }}
          >
            <Box
              sx={{
                bgcolor: alpha('#fff', 0.2),
                borderRadius: '50%',
                width: { xs: 24, sm: 32 },
                height: { xs: 24, sm: 32 },
              }}
            />
          </Badge>
        </Stack>

        {/* Estatísticas - mostrar apenas em desktop */}
        {stats.high_priority > 0 && !compact && (
          <Stack direction="row" spacing={2} sx={{ fontSize: '0.75rem', mt: 1 }}>
            <Box>
              🔴 <strong>{stats.high_priority}</strong> prioritária(s)
            </Box>
          </Stack>
        )}
      </Box>

      <Divider />

      {/* Lista de tarefas */}
      <Box
        ref={drop}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: { xs: 1, sm: 1.5 },
          maxHeight: maxHeight,
          ...dropZoneStyle,
          '&::-webkit-scrollbar': {
            width: { xs: 4, sm: 8 },
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
        <AnimatePresence mode="popLayout">
          {loading && tasks.length === 0 ? (
            // Loading skeleton
            <Stack spacing={1.5}>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Box
                    sx={{
                      height: 120,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                    }}
                  />
                </motion.div>
              ))}
            </Stack>
          ) : tasks.length === 0 ? (
            // Empty state
            <Box sx={{ py: 4 }}>
              <EmptyState
                title={config.emptyMessage}
                description={
                  isOver && canDrop
                    ? 'Solte a tarefa aqui'
                    : 'Arraste tarefas para esta coluna'
                }
                icon={(props) => <Box component="span" {...props} sx={{ ...props.sx, fontSize: '4rem !important', lineHeight: 1 }}>{config.icon}</Box>}
              />
            </Box>
          ) : (
            // Tarefas
            <Stack spacing={{ xs: 1, sm: 1.5 }}>
              {tasks.map((task, index) => (
                <motion.div
                  key={task.pk || task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: 0.3,
                    delay: compact ? 0 : index * 0.05, // Sem delay em mobile para melhor performance
                  }}
                >
                  <TaskCard
                    task={task}
                    onTaskClick={onTaskClick}
                    onMenuAction={onMenuAction}
                    draggable
                    columnId={column.id}
                    compact={compact}
                  />
                </motion.div>
              ))}
            </Stack>
          )}
        </AnimatePresence>

        {/* Indicador de drop zone */}
        <AnimatePresence>
          {isOver && canDrop && tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Box
                sx={{
                  mt: 1.5,
                  p: 2,
                  border: `2px dashed ${config.color}`,
                  borderRadius: 2,
                  bgcolor: alpha(config.color, 0.05),
                  textAlign: 'center',
                  color: config.color,
                  fontWeight: 600,
                }}
              >
                Solte aqui para mover
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Paper>
  );
};

TaskColumn.propTypes = {
  column: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
  }).isRequired,
  tasks: PropTypes.array,
  onTaskClick: PropTypes.func,
  onDrop: PropTypes.func,
  onMenuAction: PropTypes.func,
  loading: PropTypes.bool,
  compact: PropTypes.bool,
  maxHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default TaskColumn;
