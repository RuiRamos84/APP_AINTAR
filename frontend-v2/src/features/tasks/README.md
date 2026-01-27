# Módulo de Tarefas (Tasks)

> Documentação completa do módulo de gestão de tarefas da aplicação AINTAR.

## Índice

- [Visão Geral](#visão-geral)
- [Estrutura de Ficheiros](#estrutura-de-ficheiros)
- [Arquitetura](#arquitetura)
- [Componentes](#componentes)
- [Hooks e Services](#hooks-e-services)
- [State Management (Zustand)](#state-management-zustand)
- [Sistema de Permissões](#sistema-de-permissões)
- [Notificações em Tempo Real](#notificações-em-tempo-real)
- [Funcionalidades](#funcionalidades)
- [API Endpoints](#api-endpoints)
- [Fluxos de Dados](#fluxos-de-dados)

---

## Visão Geral

O módulo de Tarefas permite a gestão completa de tarefas entre utilizadores admin e clientes, incluindo:

- Criação, edição e encerramento de tarefas
- Sistema de notas/comentários bidirecionais
- Notificações em tempo real via WebSockets
- Visualização em Kanban ou Lista
- Agrupamento por status ou por cliente
- Drag & drop para alteração de status
- Filtros avançados

### Conceitos Importantes

| Termo | Descrição |
|-------|-----------|
| **Owner** | Utilizador que criou/é responsável pela tarefa (admin) |
| **Client** | Utilizador a quem a tarefa está atribuída |
| **Completed** | Status `completed` - executor marcou como concluída |
| **Closed/Encerrada** | Campo `when_stop` preenchido - owner arquivou definitivamente |

---

## Estrutura de Ficheiros

```
src/features/tasks/
├── components/
│   ├── AdvancedFilters.jsx      # Drawer de filtros avançados
│   ├── CreateTaskModal.jsx      # Modal de criação de tarefa
│   ├── ExportButton.jsx         # Botão de exportação
│   ├── KanbanView.jsx           # Vista Kanban com drag & drop
│   ├── ListView.jsx             # Vista em lista/tabela
│   ├── QuickFilters.jsx         # Filtros rápidos inline
│   ├── TaskCard.jsx             # Card individual de tarefa
│   ├── TaskColumn.jsx           # Coluna do Kanban
│   ├── TaskDetailsTab.jsx       # Tab de detalhes no modal
│   ├── TaskHistoryTab.jsx       # Tab de histórico/notas
│   └── TaskModal.jsx            # Modal de visualização/edição
├── hooks/
│   └── useTasks.js              # Hook principal de tarefas
├── pages/
│   └── TasksPage.jsx            # Página principal
├── schemas/
│   └── taskSchemas.js           # Validações e schemas
├── services/
│   └── taskService.js           # Serviço de API
├── store/
│   └── taskStore.js             # Zustand store
└── README.md                    # Esta documentação
```

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         TasksPage                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ QuickFilters│  │   Tabs      │  │ View Toggle (Kanban/List)│  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    KanbanView / ListView                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │  │
│  │  │TaskColumn│  │TaskColumn│  │TaskColumn│   (Por Status)  │  │
│  │  │┌────────┐│  │┌────────┐│  │┌────────┐│                 │  │
│  │  ││TaskCard││  ││TaskCard││  ││TaskCard││                 │  │
│  │  │└────────┘│  │└────────┘│  │└────────┘│                 │  │
│  │  └──────────┘  └──────────┘  └──────────┘                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      TaskModal                             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                 │  │
│  │  │ TaskDetailsTab  │  │ TaskHistoryTab  │                 │  │
│  │  └─────────────────┘  └─────────────────┘                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────────┐
    │ useTasks │◄──────►│taskStore │◄──────►│ taskService  │
    │  (hook)  │        │ (Zustand)│        │    (API)     │
    └──────────┘        └──────────┘        └──────────────┘
          │
          ▼
    ┌──────────────┐
    │SocketContext │  (WebSocket para notificações real-time)
    └──────────────┘
```

---

## Componentes

### TasksPage.jsx
Página principal do módulo.

**Props:** Nenhuma (usa hooks internos)

**Features:**
- Tabs: Todas (admin) | Minhas Tarefas | Criadas por Mim | Encerradas
- Toggle de vista: Kanban / Lista
- Toggle de agrupamento: Por Status / Por Cliente (admin only)
- Listener para evento `task-refresh` (atualização em tempo real)

**Estado local:**
```javascript
const [viewMode, setViewMode] = useState('kanban');
const [activeTab, setActiveTab] = useState('assigned');
const [groupBy, setGroupBy] = useState('status'); // 'status' | 'client'
const [createModalOpen, setCreateModalOpen] = useState(false);
const [taskModalOpen, setTaskModalOpen] = useState(false);
const [selectedTask, setSelectedTask] = useState(null);
```

---

### KanbanView.jsx
Vista Kanban com drag & drop.

**Props:**
| Prop | Tipo | Descrição |
|------|------|-----------|
| `tasks` | Array | Lista de tarefas |
| `onTaskClick` | Function | Callback ao clicar numa tarefa |
| `onStatusChange` | Function | Callback ao mudar status (drag & drop) |
| `onMenuAction` | Function | Callback para ações do menu |
| `canDrag` | Function | Função que determina se pode arrastar |
| `loading` | Boolean | Estado de loading |
| `groupBy` | String | 'status' \| 'client' |

**Modos de visualização:**
1. **Por Status** - 3 colunas: Por Fazer, Em Progresso, Concluídas
2. **Por Cliente** - Acordeões expansíveis com mini-Kanban interno

---

### TaskModal.jsx
Modal de visualização/edição de tarefa.

**Props:**
| Prop | Tipo | Descrição |
|------|------|-----------|
| `open` | Boolean | Controla visibilidade |
| `task` | Object | Objeto da tarefa |
| `onClose` | Function | Callback ao fechar |
| `onSuccess` | Function | Callback após ação bem-sucedida |

**Features:**
- Tabs: Detalhes | Histórico
- Chips: Prioridade, Status, Encerrada
- Badge de notificação não lida
- Botões: Editar, Encerrar, Reabrir
- Dialog de confirmação customizado (ConfirmDialog)

---

### TaskDetailsTab.jsx
Tab de detalhes dentro do modal.

**Props:**
| Prop | Tipo | Descrição |
|------|------|-----------|
| `task` | Object | Objeto da tarefa |
| `canEdit` | Boolean | Permissão de edição |
| `onUpdate` | Function | Callback após atualização |

**Campos editáveis:**
- Título
- Prioridade
- Status
- Descrição

---

### TaskHistoryTab.jsx
Tab de histórico/notas dentro do modal.

**Props:**
| Prop | Tipo | Descrição |
|------|------|-----------|
| `task` | Object | Objeto da tarefa |
| `canAddNote` | Boolean | Permissão para adicionar notas |
| `onNoteAdded` | Function | Callback após adicionar nota |

**Features:**
- Timeline de notas com data/hora
- Distinção visual: Admin (roxo) vs Cliente (azul)
- Destaque para notas não lidas (vermelho)
- Scroll automático para nota não lida
- Input para nova nota (se não encerrada)

---

### QuickFilters.jsx
Filtros rápidos inline.

**Props:**
| Prop | Tipo | Descrição |
|------|------|-----------|
| `filters` | Object | Estado atual dos filtros |
| `onChange` | Function | Callback ao mudar filtro |
| `onReset` | Function | Callback ao limpar filtros |
| `isAdmin` | Boolean | Mostra filtro de cliente se admin |

**Filtros disponíveis:**
- Pesquisa (texto)
- Status
- Prioridade
- Atribuído a (todos/mim)
- Cliente (admin only)

---

## Hooks e Services

### useTasks.js

Hook principal para gestão de tarefas.

```javascript
const {
  // Estado
  tasks,
  loading,
  error,
  filters,

  // CRUD
  fetchTasks,
  createTask,
  updateTask,

  // Status
  updateStatus,
  closeTask,
  reopenTask,

  // Notes
  addNote,
  fetchHistory,

  // Notifications
  markNotificationAsRead,

  // Actions
  setFilters,
  refresh,
  invalidateCache,

  // Selectors
  getFilteredTasks,
  getTaskStats,
} = useTasks({ autoFetch: true, fetchOnMount: true });
```

**Opções:**
| Opção | Default | Descrição |
|-------|---------|-----------|
| `autoFetch` | true | Buscar automaticamente |
| `fetchOnMount` | true | Buscar ao montar |
| `onSuccess` | null | Callback de sucesso |
| `onError` | null | Callback de erro |

---

### taskService.js

Serviço de comunicação com a API.

```javascript
// Métodos disponíveis
taskService.getTasks(params)
taskService.getMyTasks(params)
taskService.createTask(data)
taskService.updateTask(id, data)
taskService.updateTaskStatus(id, statusId)
taskService.closeTask(id, note)
taskService.reopenTask(id, reason)
taskService.addTaskNote(id, note)
taskService.getTaskHistory(id)
taskService.markTaskAsRead(id)
```

---

## State Management (Zustand)

### taskStore.js

```javascript
const useTaskStore = create(
  immer((set, get) => ({
    // Estado
    tasks: [],
    currentTask: null,
    loading: false,
    error: null,

    // Paginação
    page: 0,
    rowsPerPage: 25,
    totalCount: 0,

    // Ordenação
    orderBy: 'when_start',
    order: 'desc',

    // Filtros
    filters: {
      status: 'all',
      priority: 'all',
      assignedTo: 'all',
      search: '',
      client: 'all',
    },

    // Agrupamento (admin only)
    groupBy: 'status', // 'status' | 'client'

    // Seleção
    selectedTasks: [],
    viewMode: 'kanban',

    // Cache
    lastFetch: null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutos

    // Actions
    setTasks: (tasks, total) => set(...),
    addTask: (task) => set(...),
    updateTask: (id, updates) => set(...),
    removeTask: (id) => set(...),
    setFilters: (filters) => set(...),
    setGroupBy: (groupBy) => set(...),
    invalidateCache: () => set(...),

    // Selectors
    getFilteredTasks: () => {...},
    getTaskStats: () => {...},
    getTasksByStatus: () => {...},
  }))
);
```

---

## Sistema de Permissões

### Regras de Permissão

```javascript
const permissions = {
  // Pode editar se é owner/admin E tarefa não está encerrada
  canEdit: (isOwner || isAdmin) && !isClosed,

  // Pode encerrar se é owner/admin E tarefa não está encerrada
  canClose: (isOwner || isAdmin) && !isClosed,

  // Pode reabrir se é owner/admin E tarefa está encerrada
  canReopen: (isOwner || isAdmin) && isClosed,

  // Pode adicionar notas se é owner/client E tarefa não está encerrada
  canAddNote: (isOwner || isClient) && !isClosed,
};
```

### Drag & Drop

```javascript
// Só pode arrastar se:
// 1. É a tarefa atribuída ao utilizador, OU
// 2. É admin
const canDrag = (task) => {
  return task.ts_client === user.user_id || isAdmin;
};
```

### Transições de Status Válidas

```javascript
// Definidas em taskSchemas.js
const VALID_TRANSITIONS = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['pending', 'completed', 'cancelled'],
  completed: ['in_progress'],
  cancelled: ['pending'],
};
```

---

## Notificações em Tempo Real

### Arquitetura WebSocket

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Backend   │◄──────────────────►│  Frontend   │
│ Flask-SocketIO                   │ Socket.IO   │
└─────────────┘                    └─────────────┘
      │                                   │
      │ emit('task_notification')         │
      │──────────────────────────────────►│
      │                                   │
      │                            SocketContext
      │                                   │
      │                            handleTaskNotification()
      │                                   │
      │                            dispatch('task-refresh')
      │                                   │
      │                            TasksPage useEffect
      │                                   │
      │                            refresh() → fetchTasks()
```

### Eventos WebSocket

| Evento | Direção | Descrição |
|--------|---------|-----------|
| `task_notification` | Server → Client | Nova nota/atualização |
| `task_update` | Server → Client | Status alterado |
| `mark_task_notification_read` | Client → Server | Marcar como lida |

### Fluxo de Notificação

1. **User A adiciona nota:**
   ```
   TaskHistoryTab.handleAddNote()
   → useTasks.addNote()
   → taskService.addTaskNote()
   → Backend guarda nota
   → Backend emite 'task_notification' para User B
   → invalidateCache()
   → dispatch('task-refresh')
   ```

2. **User B recebe notificação:**
   ```
   SocketContext.handleTaskNotification()
   → Adiciona ao NotificationCenter
   → dispatch('task-refresh')
   → TasksPage.refresh()
   → Cards atualizam com badge
   ```

---

## Funcionalidades

### Visualização

- [x] Vista Kanban com 3 colunas (Por Fazer, Em Progresso, Concluídas)
- [x] Vista Lista com ordenação
- [x] Agrupamento por Cliente (acordeões com mini-Kanban)
- [x] Responsive (mobile/tablet/desktop)
- [x] Drag & drop para mudar status

### Filtros

- [x] Pesquisa por texto
- [x] Filtro por status
- [x] Filtro por prioridade
- [x] Filtro por atribuição (todos/minhas)
- [x] Filtro por cliente (admin only)
- [x] Chips de filtros ativos
- [x] Botão limpar filtros

### Tarefas

- [x] Criar nova tarefa
- [x] Editar tarefa (título, descrição, prioridade, status)
- [x] Encerrar tarefa (arquivar)
- [x] Reabrir tarefa encerrada
- [x] Adicionar notas/comentários
- [x] Timeline de histórico

### Notificações

- [x] Badge de notificação nos cards
- [x] Badge no tab Histórico
- [x] Destaque visual de notas não lidas
- [x] Som de notificação
- [x] Atualização em tempo real via WebSocket
- [x] Marcar como lida ao abrir modal

### UX

- [x] Dialogs de confirmação customizados
- [x] Toast notifications (Sonner)
- [x] Loading states
- [x] Empty states
- [x] Scroll automático para notas não lidas

---

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/tasks` | Listar tarefas |
| GET | `/api/tasks/my` | Minhas tarefas |
| POST | `/api/tasks` | Criar tarefa |
| PUT | `/api/tasks/:id` | Atualizar tarefa |
| PUT | `/api/tasks/:id/status` | Atualizar status |
| POST | `/api/tasks/:id/close` | Encerrar tarefa |
| POST | `/api/tasks/:id/reopen` | Reabrir tarefa |
| POST | `/api/tasks/:id/notes` | Adicionar nota |
| GET | `/api/tasks/:id/history` | Histórico de notas |
| POST | `/api/tasks/:id/read` | Marcar como lida |

---

## Fluxos de Dados

### Criar Tarefa

```
CreateTaskModal
  → useTasks.createTask(data)
    → taskService.createTask(data)
      → POST /api/tasks
    → addTask(newTask)
    → invalidateCache()
    → toast.success()
  → onSuccess()
    → setCreateModalOpen(false)
    → refresh()
```

### Adicionar Nota

```
TaskHistoryTab
  → useTasks.addNote(taskId, note)
    → taskService.addTaskNote(taskId, note)
      → POST /api/tasks/:id/notes
      → Backend emite WebSocket 'task_notification'
    → invalidateCache()
    → dispatch('task-refresh')
  → Recarrega histórico local
  → Toast success
  → Modal permanece aberto
```

### Receber Notificação (outro utilizador)

```
WebSocket 'task_notification'
  → SocketContext.handleTaskNotification()
    → Adiciona ao array notifications
    → dispatch('task-refresh')
  → TasksPage useEffect
    → refresh()
      → fetchTasks(true)
    → Cards re-renderizam com badges
```

---

## Componentes Partilhados Utilizados

| Componente | Localização | Uso |
|------------|-------------|-----|
| `ModulePage` | `shared/components/layout` | Layout da página |
| `ConfirmDialog` | `shared/components/feedback` | Dialogs de confirmação |
| `Loading` | `shared/components/feedback` | Spinner de loading |

---

## Dependências Externas

| Pacote | Versão | Uso |
|--------|--------|-----|
| `@mui/material` | ^5.x | UI Components |
| `@mui/lab` | ^5.x | Timeline |
| `react-dnd` | ^16.x | Drag & drop |
| `react-dnd-html5-backend` | ^16.x | Backend HTML5 |
| `react-dnd-touch-backend` | ^16.x | Backend Touch |
| `zustand` | ^4.x | State management |
| `immer` | ^10.x | Immutable updates |
| `sonner` | ^1.x | Toast notifications |
| `socket.io-client` | ^4.x | WebSocket |
| `date-fns` | ^3.x | Formatação de datas |
| `framer-motion` | ^11.x | Animações |

---

## Histórico de Alterações Recentes

### Janeiro 2026

- **ConfirmDialog**: Substituído `window.confirm()` por dialog MUI customizado
- **Real-time Updates**: Corrigido fluxo de notificações WebSocket
  - `addNote` agora dispara evento `task-refresh`
  - `SocketContext` dispara `task-refresh` ao receber notificação
  - Modal não fecha ao adicionar nota
- **Agrupamento por Cliente**: Implementado acordeões com mini-Kanban
- **Filtro de Cliente**: Adicionado dropdown para admin filtrar por cliente
- **Layout Compacto**: Header unificado com título, tabs e botões na mesma linha

---

## Notas para Desenvolvimento

1. **Cache**: O cache tem timeout de 5 minutos. Usar `invalidateCache()` após operações de escrita.

2. **Eventos**: Usar `window.dispatchEvent(new CustomEvent('task-refresh'))` para forçar atualização da lista.

3. **Permissões**: Sempre verificar `permissions` antes de mostrar botões de ação.

4. **WebSocket**: A conexão é gerida pelo `SocketContext`. Não criar conexões adicionais.

5. **Toast**: Usar `toast` do Sonner para feedback. O hook `useTasks` já mostra toasts para erros.

---

*Última atualização: Janeiro 2026*
