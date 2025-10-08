# 📚 GUIA DE MÓDULOS DE OPERAÇÃO

## 🎯 Visão Geral

O sistema possui **DOIS módulos de operação** com funcionalidades complementares, disponíveis simultaneamente:

1. **Módulo NOVO** - Sistema Mobile-First de Execução de Tarefas
2. **Módulo LEGACY** - Sistema de Visualização por Tipos/Categorias

---

## 🆕 MÓDULO NOVO - Execução de Tarefas Mobile-First

### 📍 Localização
- **Pasta**: `frontend/src/pages/Operation/`
- **Rotas**:
  - `/operation` - Minhas Tarefas (Operador)
  - `/operation/control` - Controlo de Equipa (Supervisor)
  - `/operation/analysis` - Análises
  - `/operation/metadata` - Gestão de Voltas

### 🎨 Características Principais

#### Arquitectura Mobile-First
```javascript
// Renderização adaptativa baseada em dispositivo e permissões
- MOBILE → OperatorMobileView (fullscreen, touch-optimized)
- TABLET/DESKTOP + Supervisor → SupervisorDesktopView
- TABLET/DESKTOP + Operator → OperatorDesktopView
```

#### Sistema de Permissões Granular
| Permissão | ID  | Descrição | Vista |
|-----------|-----|-----------|-------|
| `operation.access` | 310 | Acesso básico | Todas |
| `operation.execute` | 311 | Executar tarefas | OperatorView |
| `operation.supervise` | 312 | Supervisionar equipa | SupervisorView |
| `operation.manage` | 313 | Gerir metadados/voltas | Metadata |
| `operation.analysis` | 314 | Ver análises | Analysis |

#### Componentes Principais

**Operator Views:**
- `OperatorMobileView.js` - Vista mobile com swipe cards
- `OperatorDesktopView.js` - Vista desktop simplificada para operadores
- `MobileTaskCard.js` - Card de tarefa touch-optimized
- `MobileTodayTasks.js` - Lista de tarefas do dia
- `MobileCompletionFlow.js` - Fluxo de conclusão de tarefas

**Supervisor Views:**
- `SupervisorDesktopView.js` - Dashboard completo de supervisão
- `SupervisorDashboard.js` - Métricas e KPIs
- `OperatorMonitoring.js` - Monitorização de operadores
- `OperationTaskManager.js` - Gestão de tarefas da equipa
- `AnalyticsPanel.js` - Painéis de análise

**Shared Components:**
- `UnifiedResponsiveView.js` - Vista unificada responsiva
- `TaskCompletionDialog.js` - Modal de conclusão de tarefas
- `ProgressiveTaskFormV2.js` - Formulário progressivo

#### Hooks Especializados

```javascript
// Detecção de role e permissões
useUserRole(user)
// Retorna: { userRole, isSupervisor, isOperator, canSupervise, canExecute }

// Dados unificados
useOperationsUnifiedV2({ autoLoad, includeMetas, includeUserTasks, includeAnalytics })

// Detecção de dispositivo
useDeviceDetection()

// Operações otimistas
useOptimisticOperations()
```

#### Stores (Zustand)

```javascript
// Store principal
operationsStore.js
- tasks: [] // Tarefas
- filters: {} // Filtros ativos
- sorting: {} // Ordenação
- grouping: {} // Agrupamento

// Store adaptativo
adaptiveStore.js
- deviceType: 'mobile' | 'tablet' | 'desktop'
- viewMode: 'operator' | 'supervisor'
- preferences: {} // Preferências do utilizador
```

### 📱 Funcionalidades

#### Para Operadores (311)
- ✅ Lista de tarefas atribuídas
- ✅ Filtros por estado/prioridade
- ✅ Swipe cards (mobile)
- ✅ Conclusão rápida de tarefas
- ✅ Upload de evidências
- ✅ Modo offline

#### Para Supervisores (312)
- ✅ Dashboard de equipa
- ✅ Atribuição de tarefas
- ✅ Monitorização em tempo real
- ✅ Métricas de performance
- ✅ Gestão de prioridades

#### Para Gestores (313)
- ✅ Gestão de voltas/tipos de operação
- ✅ Configuração de metadados
- ✅ Análises avançadas (314)

---

## 🏛️ MÓDULO LEGACY - Visualização por Tipos

### 📍 Localização
- **Pasta**: `frontend/src/pages/Operação/`
- **Rota**: `/operation-legacy`
- **Submenu**: "Visualização por Tipos"

### 🎨 Características Principais

#### Sistema de Views/Categorias
```javascript
// Visualização organizada por tipo de operação
Views disponíveis:
- vbr_document_fossa01/02/03/04/05 (por município)
- vbr_document_ramais01 (com cálculo de dias restantes)
- vbr_document_caixas01
- vbr_document_desobstrucao01
- vbr_document_pavimentacao01
- vbr_document_rede01
```

#### Filtros Avançados
```javascript
// Filtro por Associate (Colaborador)
selectedAssociate: "all" | "Nome do Colaborador"

// Mapeamento de município para vista Fossa
municipalityFossaMap: {
  "Município de Carregal do Sal": "vbr_document_fossa02",
  "Município de Santa Comba Dão": "vbr_document_fossa03",
  "Município de Tábua": "vbr_document_fossa04",
  "Município de Tondela": "vbr_document_fossa05"
}
```

#### Componentes Principais

**Desktop:**
- `Operations.js` - Componente principal
- `AssociateFilter.js` - Filtro de colaboradores
- `ViewCards.js` - Cards de seleção de views
- `OperationsTable.js` - Tabela com ordenação
- `TableDetails.js` - Detalhes expandíveis

**Tablet:**
- `TabletOperations.js` - Vista otimizada para tablet
- Navegação por gestos
- Layout compacto

**Modals:**
- `CompletionModal.js` - Conclusão de operações
- `ParametersModal.js` - Edição de parâmetros
- `SimpleParametersEditor.js` - Editor simplificado

#### Hooks Especializados

```javascript
// Carregamento de dados
useOperationsData()
// Retorna: { operationsData, loading, error, metaData, associates }

// Filtragem dinâmica
useOperationsFiltering(operationsData)
// Retorna: {
//   selectedAssociate, selectedView,
//   isFossaView, isRamaisView,
//   filteredData, sortedViews,
//   handleViewChange, handleAssociateChange
// }

// Gestão de tabela
useOperationsTable(filteredData, selectedView)
// Retorna: {
//   orderBy, order, expandedRows, sortedData,
//   handleRequestSort, toggleRowExpand, getAddressString
// }
```

#### Serviços

```javascript
// Exportação
exportService.js
- exportToExcel(filteredData, selectedView)
  // Exporta dados da view selecionada para Excel

// Conclusão
completionService.js
- completeOperation(operationId, params)

// Sincronização
syncService.js
- syncOfflineData()
```

### 📊 Funcionalidades

#### Visualização
- ✅ Cards agrupados por tipo de operação
- ✅ Contadores em tempo real
- ✅ Cores indicativas de estado
- ✅ Ordenação multi-coluna
- ✅ Linhas expandíveis com detalhes

#### Filtros
- ✅ Por colaborador/associate
- ✅ Por município (Fossas)
- ✅ Por tipo de operação
- ✅ Lógica de filtro automática baseada em tipo

#### Ramais - Funcionalidades Especiais
```javascript
// Cálculo automático de dias restantes
restdays = limitdate - execution
// Com código de cores:
- <= 0 dias → Vermelho (error.main)
- <= 15 dias → Laranja (warning.main)
- <= 30 dias → Amarelo (warning.light)
- > 30 dias → Verde (success.main)
```

#### Exportação
- ✅ Excel por view
- ✅ Dados filtrados aplicados
- ✅ Formatação automática de colunas
- ✅ Nome de ficheiro com timestamp

---

## 🔄 Comparação Lado a Lado

| Característica | Módulo NOVO | Módulo LEGACY |
|----------------|-------------|---------------|
| **Foco Principal** | Execução individual de tarefas | Visualização agregada por tipo |
| **Público-Alvo** | Operadores/Supervisores | Gestores/Coordenadores |
| **Interface** | Mobile-First, Swipe Cards | Desktop-First, Tabelas |
| **Filtros** | Por estado/prioridade/atribuição | Por colaborador/tipo/município |
| **Permissões** | Granulares (311/312/313/314) | Genérica (310) |
| **Exportação** | Em desenvolvimento | Excel completo por view |
| **Modo Offline** | ✅ Completo | ⚠️ Limitado |
| **Responsividade** | 📱 Mobile → 💻 Desktop | 💻 Desktop → 📱 Tablet |
| **Analytics** | Dashboard integrado | Visualização de métricas |
| **Gestão de Equipa** | Supervisão em tempo real | Visualização agregada |

---

## 🚀 Guia de Uso

### Quando usar o MÓDULO NOVO?

**Use `/operation` quando:**
- 👨‍💼 Você é um **operador** executando tarefas do dia
- 📱 Está em **dispositivo mobile** no terreno
- 🎯 Precisa de **foco em tarefas individuais**
- 👥 É **supervisor** monitorando a equipa
- 📊 Precisa de **analytics em tempo real**
- ⚡ Quer **ações rápidas** (swipe para concluir)

**Exemplos de casos de uso:**
```
✅ "Preciso ver minhas tarefas de hoje"
   → /operation (OperatorView)

✅ "Vou concluir uma tarefa no terreno"
   → /operation (Mobile com swipe)

✅ "Preciso monitorar a equipa"
   → /operation/control (SupervisorView)

✅ "Quero ver KPIs e métricas"
   → /operation/control (Dashboard)
```

### Quando usar o MÓDULO LEGACY?

**Use `/operation-legacy` quando:**
- 📊 Precisa de **visão geral por tipo** de operação
- 🏘️ Quer filtrar por **município** (Fossas)
- 👷 Precisa ver trabalhos de **colaborador específico**
- 📅 Quer ver **prazos de ramais** com código de cores
- 📥 Precisa **exportar dados para Excel**
- 💻 Está em **desktop fazendo análise**

**Exemplos de casos de uso:**
```
✅ "Quantas fossas temos em Tábua?"
   → /operation-legacy + Filter "Município de Tábua"

✅ "Quais ramais vão expirar nos próximos 15 dias?"
   → /operation-legacy + View "Ramais" (ordenar por restdays)

✅ "Ver todas as desobstruções do João"
   → /operation-legacy + Associate "João Silva"

✅ "Exportar pavimentações para Excel"
   → /operation-legacy + View "Pavimentações" + Export
```

---

## 🔧 Configuração Técnica

### Rotas Configuradas

**AppRoutes.js (linhas 115-146):**
```javascript
// NOVO - Operador
<Route path="/operation" element={
  <PrivateRoute requiredPermission={311}>
    <OperatorView />
  </PrivateRoute>
} />

// NOVO - Supervisor
<Route path="/operation/control" element={
  <PrivateRoute requiredPermission={312}>
    <SupervisorView />
  </PrivateRoute>
} />

// NOVO - Análises
<Route path="/operation/analysis" element={
  <PrivateRoute requiredPermission={314}>
    <Analysis />
  </PrivateRoute>
} />

// NOVO - Gestão de Voltas
<Route path="/operation/metadata" element={
  <PrivateRoute requiredPermission={313}>
    <OperationMetadata />
  </PrivateRoute>
} />

// LEGACY - Visualização por Tipos
<Route path="/operation-legacy" element={
  <PrivateRoute requiredPermission={310}>
    <OldOperations />
  </PrivateRoute>
} />
```

### Menu Lateral (Sidebar)

**routeConfig.js (linhas 169-207):**
```javascript
'/operation': {
  id: 'operations',
  text: 'Operação',
  icon: WorkIcon,
  permissions: { required: 310 },
  showInSidebar: true,
  submenu: {
    '/operation': {
      id: 'operations_main',
      text: 'Minhas Tarefas',
      icon: AssignmentIcon,
      permissions: { required: 311 }
    },
    '/operation/control': {
      id: 'operations_control',
      text: 'Controlo de Equipa',
      icon: PeopleIcon,
      permissions: { required: 312 }
    },
    '/operation/analysis': {
      id: 'operations_analysis',
      text: 'Análises',
      icon: ScienceIcon,
      permissions: { required: 310 }
    },
    '/operation/metadata': {
      id: 'operation_metadata',
      text: 'Gestão de Voltas',
      icon: SettingsIcon,
      permissions: { required: 313 }
    },
    '/operation-legacy': {
      id: 'operations_legacy',
      text: 'Visualização por Tipos',
      icon: ViewModuleIcon,
      permissions: { required: 310 }
    }
  }
}
```

### Imports no AppRoutes.js

**Linha 53:**
```javascript
const OldOperations = lazy(() => import("../../pages/Operação/Operations"));
```

---

## 🧪 Testes

### Teste de Acesso ao Módulo NOVO

```javascript
// 1. Operador (311)
Navegue para: /operation
Esperado: Ver lista de tarefas atribuídas
Mobile: Ver swipe cards

// 2. Supervisor (312)
Navegue para: /operation/control
Esperado: Ver dashboard de equipa

// 3. Gestor (313)
Navegue para: /operation/metadata
Esperado: Ver gestão de voltas
```

### Teste de Acesso ao Módulo LEGACY

```javascript
// 1. Qualquer utilizador com permissão 310
Navegue para: /operation-legacy
Esperado: Ver cards de views

// 2. Selecionar View
Click em "Fossas" ou "Ramais"
Esperado: Ver tabela de dados

// 3. Filtrar por Associate
Selecionar colaborador no dropdown
Esperado: Dados filtrados

// 4. Exportar
Click em "Exportar Excel"
Esperado: Download de ficheiro .xlsx
```

---

## 📋 Checklist de Implementação

### ✅ Concluído

- [x] Análise de estrutura de pastas
- [x] Identificação de funcionalidades únicas
- [x] Configuração de rotas em `AppRoutes.js`
- [x] Adição ao menu em `routeConfig.js`
- [x] Import do componente legacy
- [x] Permissões configuradas
- [x] Documentação criada

### 🔄 Próximos Passos (Opcional)

- [ ] Adicionar ícones distintivos no menu
- [ ] Criar tooltip explicativo em cada opção
- [ ] Migrar funcionalidade de export para módulo novo
- [ ] Criar bridge de dados entre módulos
- [ ] Implementar preferências de módulo por utilizador
- [ ] Analytics de uso de cada módulo

---

## 🐛 Troubleshooting

### Problema: "Não vejo a opção no menu"

**Solução:**
```javascript
// Verificar permissão do utilizador
console.log(user.permissions); // Deve incluir 310

// Verificar routeConfig
import { ROUTE_CONFIG } from './config/routeConfig';
console.log(ROUTE_CONFIG['/operation']);
```

### Problema: "Erro ao carregar o módulo legacy"

**Solução:**
```javascript
// Verificar import
// AppRoutes.js linha 53
const OldOperations = lazy(() => import("../../pages/Operação/Operations"));

// Verificar path do ficheiro
// Deve existir: frontend/src/pages/Operação/Operations.js
```

### Problema: "Hooks não encontrados"

**Solução:**
```javascript
// Módulo LEGACY usa hooks de:
import { useOperationsData, useOperationsFiltering, useOperationsTable }
  from "../../hooks/useOperations";

// Verificar se existe:
// frontend/src/hooks/useOperations.js
```

### Problema: "Dados não carregam"

**Solução:**
```javascript
// Ambos os módulos usam o mesmo serviço
import { fetchOperationsData } from "../services/operationsService";

// Verificar endpoint no backend
// GET /api/operations/data
```

---

## 📞 Suporte

Para questões técnicas:
1. Consulte este guia
2. Verifique logs do browser (F12 → Console)
3. Verifique permissões do utilizador
4. Contacte o administrador do sistema

---

**Última atualização:** 2025-10-08
**Versão do documento:** 1.0
**Autor:** Sistema de Documentação Automática
