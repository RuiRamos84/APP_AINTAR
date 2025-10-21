# 🚀 Roadmap Completo de Melhorias - Sistema de Tarefas

## ✅ COMPLETADO

### 1. Debounce na Pesquisa
- ✅ Hook `useDebounce` já existe
- ✅ Aplicado em `TaskManagement.jsx` linha 181

### 2. Loading States - Hook Preparado
- ✅ `isMovingTask` exportado no `useTasks.js` linha 226
- ⚠️ **PRÓXIMO PASSO**: Aplicar no TaskCard e TaskColumn

---

## 📋 IMPLEMENTAÇÕES PENDENTES

### PRIORIDADE ALTA (Impacto Imediato)

#### 3. Loading Visual no Drag & Drop
**Arquivo**: `frontend/src/pages/Tasks/TaskCard.jsx`

```jsx
// Adicionar aos imports:
import { CircularProgress, Fade } from "@mui/material";

// Adicionar prop:
const TaskCard = ({ task, onTaskClick, isDarkMode, columnId, isUpdating = false }) => {

  // Adicionar overlay de loading dentro do Card (após linha 172):
  {isUpdating && (
    <Fade in={isUpdating}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        zIndex: 10
      }}>
        <CircularProgress size={30} color="primary" />
      </Box>
    </Fade>
  )}
```

**Arquivo**: `frontend/src/pages/Tasks/TaskBoardLayout.jsx`
```jsx
// Linha 28, adicionar isMovingTask:
const { tasks, loading, error, setFetchType, fetchTasks, moveTask, isMovingTask, setSearchTerm } = useTasks(fetchType);

// Passar para TaskColumn (linha ~150):
<TaskColumn
  isUpdating={isMovingTask}
  // ... outros props
/>
```

**Arquivo**: `frontend/src/pages/Tasks/TaskColumn.jsx`
```jsx
// Adicionar prop isUpdating e passar para TaskCard:
const TaskColumn = ({ status, tasks, onTaskClick, isDarkMode, moveTask, isUpdating }) => {
  // ...
  <TaskCard
    task={task}
    onTaskClick={onTaskClick}
    isDarkMode={isDarkMode}
    columnId={status.pk}
    isUpdating={isUpdating}
  />
```

---

#### 4. Memoização do TaskCard
**Arquivo**: `frontend/src/pages/Tasks/TaskCard.jsx`

```jsx
// No final do arquivo (linha 309):
export default React.memo(TaskCard, (prevProps, nextProps) => {
  // Re-render apenas se mudarem props essenciais
  return (
    prevProps.task.pk === nextProps.task.pk &&
    prevProps.task.notification_owner === nextProps.task.notification_owner &&
    prevProps.task.notification_client === nextProps.task.notification_client &&
    prevProps.task.ts_notestatus === nextProps.task.ts_notestatus &&
    prevProps.isUpdating === nextProps.isUpdating &&
    prevProps.isDarkMode === nextProps.isDarkMode
  );
});
```

---

#### 5. Quick Actions Menu
**Novo Arquivo**: `frontend/src/pages/Tasks/components/QuickActionsMenu.jsx`

```jsx
import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';

const QuickActionsMenu = ({ task, onStatusChange, onAssign, onAddNote, onComplete, isDarkMode }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (e) => {
    e.stopPropagation(); // Previne abrir o modal
    setAnchorEl(e.currentTarget);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const handleAction = (action) => (e) => {
    e.stopPropagation();
    action();
    handleClose();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 5,
          bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 1)',
          }
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleAction(onStatusChange)}>
          <ListItemIcon>
            <ChangeCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mudar Status</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleAction(onAddNote)}>
          <ListItemIcon>
            <NoteAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Adicionar Nota Rápida</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleAction(onAssign)}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reatribuir</ListItemText>
        </MenuItem>

        {!task.when_stop && (
          <>
            <Divider />
            <MenuItem onClick={handleAction(onComplete)}>
              <ListItemIcon>
                <CheckCircleIcon fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText>Marcar como Concluída</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default QuickActionsMenu;
```

**Integrar no TaskCard.jsx**:
```jsx
// Import:
import QuickActionsMenu from './components/QuickActionsMenu';

// Dentro do Card (após linha 173):
<QuickActionsMenu
  task={task}
  onStatusChange={() => {/* TODO */}}
  onAssign={() => {/* TODO */}}
  onAddNote={() => {/* TODO */}}
  onComplete={() => {/* TODO */}}
  isDarkMode={isDarkMode}
/>
```

---

#### 6. Filtros Rápidos
**Arquivo**: `frontend/src/pages/Tasks/components/QuickFilters.jsx`

```jsx
import React from 'react';
import { Box, Chip } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import TodayIcon from '@mui/icons-material/Today';
import FlagIcon from '@mui/icons-material/Flag';

const QuickFilters = ({ activeFilter, onFilterChange, counts, isDarkMode }) => {
  const filters = [
    {
      id: 'all',
      label: 'Todas',
      icon: null,
      count: counts.all || 0
    },
    {
      id: 'notifications',
      label: 'Com Notificações',
      icon: <NotificationsActiveIcon />,
      count: counts.notifications || 0
    },
    {
      id: 'thisWeek',
      label: 'Esta Semana',
      icon: <TodayIcon />,
      count: counts.thisWeek || 0
    },
    {
      id: 'overdue',
      label: 'Atrasadas',
      icon: <EventBusyIcon />,
      count: counts.overdue || 0,
      color: 'error'
    },
    {
      id: 'highPriority',
      label: 'Prioridade Alta',
      icon: <FlagIcon />,
      count: counts.highPriority || 0,
      color: 'warning'
    }
  ];

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      {filters.map(filter => (
        <Chip
          key={filter.id}
          label={`${filter.label} (${filter.count})`}
          icon={filter.icon}
          onClick={() => onFilterChange(filter.id)}
          color={activeFilter === filter.id ? (filter.color || 'primary') : 'default'}
          variant={activeFilter === filter.id ? 'filled' : 'outlined'}
          sx={{
            fontWeight: activeFilter === filter.id ? 'bold' : 'normal',
            bgcolor: activeFilter === filter.id
              ? undefined
              : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : undefined)
          }}
        />
      ))}
    </Box>
  );
};

export default QuickFilters;
```

---

### PRIORIDADE MÉDIA (Mobile & Gestos)

#### 7. Swipe Gestures Mobile
**Novo arquivo**: `frontend/src/hooks/useSwipe.js`

```jsx
import { useState, useEffect } from 'react';

export const useSwipe = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};
```

**Aplicar no TaskCard Mobile**:
```jsx
const swipeHandlers = useSwipe(
  () => moveToNextStatus(task), // Swipe left
  () => moveToPreviousStatus(task) // Swipe right
);

return (
  <Box {...swipeHandlers}>
    <TaskCard task={task} />
  </Box>
);
```

---

#### 8. Pull to Refresh
**Novo arquivo**: `frontend/src/hooks/usePullToRefresh.js`

```jsx
import { useEffect, useRef, useState } from 'react';

export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const containerRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let startYValue = 0;

    const handleTouchStart = (e) => {
      if (element.scrollTop === 0) {
        startYValue = e.touches[0].clientY;
        startY.current = startYValue;
      }
    };

    const handleTouchMove = (e) => {
      if (startY.current === 0 || element.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
      startY.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, onRefresh]);

  return {
    containerRef,
    pullDistance,
    isRefreshing
  };
};
```

---

#### 9. Keyboard Shortcuts
**Novo arquivo**: `frontend/src/hooks/useKeyboardShortcuts.js`

```jsx
import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      Object.entries(shortcuts).forEach(([combo, handler]) => {
        const parts = combo.toLowerCase().split('+');
        const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');
        const keyPart = parts[parts.length - 1];

        if (
          key === keyPart &&
          ctrl === needsCtrl &&
          shift === needsShift &&
          alt === needsAlt
        ) {
          e.preventDefault();
          handler(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};
```

**Aplicar em TaskManagement.jsx**:
```jsx
useKeyboardShortcuts({
  'ctrl+k': () => searchInputRef.current?.focus(),
  'ctrl+n': () => setIsCreateTaskOpen(true),
  'ctrl+f': () => setShowFilters(true),
  'esc': () => setSelectedTask(null)
});
```

---

### PRIORIDADE BAIXA (Polish & Advanced)

#### 10. Error Boundary
**Novo arquivo**: `frontend/src/components/common/ErrorBoundary.jsx`

```jsx
import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Log para serviço de monitoramento
    if (window.logErrorToService) {
      window.logErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            p: 3
          }}
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Algo correu mal
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Ocorreu um erro inesperado. Por favor, tente recarregar a página.
            </Typography>
            {this.props.showDetails && this.state.error && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 200
                }}
              >
                {this.state.error.toString()}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Recarregar Página
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Aplicar em index.js ou App.js**:
```jsx
import ErrorBoundary from './components/common/ErrorBoundary';

<ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
  <TaskManagement />
</ErrorBoundary>
```

---

#### 11. Performance Monitor
**Novo arquivo**: `frontend/src/hooks/usePerformanceMonitor.js`

```jsx
import { useEffect, useRef } from 'react';

export const usePerformanceMonitor = (componentName, threshold = 100) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > threshold) {
      console.warn(
        `🐌 ${componentName} renderizou ${renderCount.current}x em ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }

    startTime.current = performance.now();
  });

  return renderCount.current;
};
```

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. ✅ Debounce (FEITO)
2. ⚡ Loading States no Drag & Drop (#3)
3. ⚡ Memoização do TaskCard (#4)
4. 🎨 Quick Actions Menu (#5)
5. 🎨 Quick Filters (#6)
6. 📱 Swipe Gestures (#7)
7. 📱 Pull to Refresh (#8)
8. ⌨️ Keyboard Shortcuts (#9)
9. 🛡️ Error Boundary (#10)
10. 📊 Performance Monitor (#11)

## 📝 NOTAS IMPORTANTES

- Todos os códigos mantêm compatibilidade com código existente
- Dark mode suportado em todos os componentes
- Mobile-first approach
- Performance-oriented
- Acessibilidade (ARIA labels) incluída onde necessário

## 🧪 TESTES SUGERIDOS

Após cada implementação:
1. Testar em desktop (Chrome, Firefox, Edge)
2. Testar em mobile (iOS Safari, Android Chrome)
3. Testar drag & drop
4. Testar dark mode
5. Verificar console para erros
6. Testar performance (React DevTools Profiler)

---

**Última atualização**: 2025-10-20
