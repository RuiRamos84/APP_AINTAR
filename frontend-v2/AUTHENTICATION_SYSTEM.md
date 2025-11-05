# Sistema de Autenticação - Frontend V2

## Arquitetura

O sistema de autenticação foi implementado seguindo a mesma arquitetura da versão antiga, com uma estrutura multi-camadas robusta e escalável.

### Componentes Principais

#### 1. **AuthManager** (`src/services/auth/AuthManager.js`)
- Orquestrador principal do sistema de autenticação
- Coordena AuthState, TokenManager e SessionManager
- Configura interceptores da API
- Singleton exportado como `authManager`

**Métodos principais:**
- `login(username, password)` - Autenticar utilizador
- `logout()` - Terminar sessão
- `sendHeartbeat()` - Manter sessão ativa
- `toggleDarkMode()` - Alternar tema
- `subscribe(listener)` - Subscrever mudanças de estado

#### 2. **AuthState** (`src/services/auth/AuthState.js`)
- Container de estado reativo (Observer Pattern)
- Notifica subscribers de mudanças
- Gere timers de sessão

**Estado:**
```javascript
{
  user: null,              // Utilizador atual
  isLoading: true,         // Estado de carregamento
  isRefreshing: false,     // Refresh de token em progresso
  isLoggingOut: false,     // Logout em progresso
  lastActivity: Date.now(),// Última atividade
  timers: {
    inactivity: null,      // Timeout de 60 min
    warning: null,         // Warning aos 55 min
    refresh: null,         // Refresh a cada 50 min
    heartbeat: null        // Heartbeat a cada 10 min
  }
}
```

#### 3. **TokenManager** (`src/services/auth/TokenManager.js`)
- Gestão de tokens JWT
- Validação de expiração (tokens expiram após 1 minuto)
- Refresh automático de tokens

**Métodos:**
- `isTokenValid(token)` - Verifica validade
- `refreshToken(currentTime)` - Actualiza token
- `getAccessToken()` - Obtém token actual

#### 4. **SessionManager** (`src/services/auth/SessionManager.js`)
- Gestão de sessão e inatividade
- Detecção de atividade do utilizador
- Timers automáticos

**Configuração:**
- Timeout de inatividade: 60 minutos
- Warning: 55 minutos (5 min antes)
- Refresh de token: 50 minutos
- Heartbeat: 10 minutos

**Eventos monitorizados:**
- `mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`, `click`
- Mudanças de visibilidade do tab

#### 5. **AlertManager** (`src/services/auth/AlertManager.js`)
- Gestão de alertas de sessão
- Warning de inatividade
- Notificação de expiração

#### 6. **PermissionService** (`src/services/permissionService.js`)
- Verificação de permissões por ID numérico
- Super admin detection (profil === '0')
- Singleton para uso global

**Métodos:**
- `hasPermission(permissionId)` - Verifica permissão específica
- `hasAnyPermission(permissions[])` - Verifica qualquer permissão
- `hasAllPermissions(permissions[])` - Verifica todas permissões
- `isAdmin()` - Verifica se é super admin

---

## React Context Layer

### AuthContext (`src/core/contexts/AuthContext.jsx`)
- Wrapper React para AuthManager
- Distribui estado para componentes
- Hook: `useAuth()`

**Valores disponíveis:**
```javascript
const {
  user,                    // Utilizador actual
  isLoading,              // Estado de carregamento
  isLoggingOut,           // Logout em progresso
  loginUser,              // Função de login
  logoutUser,             // Função de logout
  refreshToken,           // Refresh manual
  toggleDarkMode,         // Alternar tema
  toggleVacationStatus    // Alternar férias
} = useAuth();
```

### PermissionContext (`src/core/contexts/PermissionContext.jsx`)
- Wrapper React para PermissionService
- Hook: `usePermissionContext()`

**Valores disponíveis:**
```javascript
const {
  initialized,               // Permissões inicializadas
  hasPermission,            // Verificar permissão
  hasAnyPermission,         // Verificar qualquer
  hasAllPermissions,        // Verificar todas
  checkBatchPermissions,    // Verificação em lote
  getUserPermissions,       // Obter todas permissões
  isAdmin,                  // Verificar admin
  getUserProfile            // Obter perfil
} = usePermissionContext();
```

---

## API & Endpoints

### Endpoints Backend

#### Login
```
POST /auth/login
Body: { username, password }
Response: {
  user_id,
  user_name,
  access_token,
  refresh_token,
  profil,
  interfaces: [],  // Array de permission IDs
  dark_mode,
  vacation
}
```

#### Logout
```
POST /auth/logout
Headers: Authorization: Bearer {access_token}
```

#### Refresh Token
```
POST /auth/refresh
Headers: Authorization: Bearer {refresh_token}
Body: { current_time: timestamp }
Response: {
  access_token,
  refresh_token
}
```

#### Heartbeat
```
POST /auth/heartbeat
Headers: Authorization: Bearer {access_token}
```

### Interceptores API

O **AuthManager** configura automaticamente interceptores no cliente Axios:

**Request Interceptor:**
- Adiciona token `Authorization: Bearer {token}`
- Atualiza timestamp de atividade
- Bloqueia requests durante logout

**Response Interceptor:**
- Detecta 401 Unauthorized
- Tenta refresh automático do token
- Retry da request original com novo token
- Logout automático se refresh falhar

---

## Sistema de Permissões

### Configuração (`src/core/config/permissionConfig.js`)

As permissões são identificadas por IDs numéricos:

```javascript
export const PERMISSION_IDS = {
  // Administration (10-110)
  ADMIN_DASHBOARD: 10,
  ADMIN_USERS: 20,

  // Tasks (200-320)
  TASKS_VIEW: 200,
  TASKS_CREATE: 210,

  // Documents (500-560)
  DOCS_VIEW_ALL: 500,
  DOCS_CREATE: 560,

  // Entities (800-820)
  ENTITIES_VIEW: 800,
  ENTITIES_CREATE: 810,
};
```

### Uso em Componentes

```javascript
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { PERMISSION_IDS } from '@/core/config/permissionConfig';

function MyComponent() {
  const { hasPermission } = usePermissionContext();

  return (
    <div>
      {hasPermission(PERMISSION_IDS.ADMIN_USERS) && (
        <UserManagement />
      )}
    </div>
  );
}
```

### Rotas Protegidas

```javascript
import { ProtectedRoute } from '@/features/auth';
import { PERMISSION_IDS } from '@/core/config/permissionConfig';

<Route
  path="/admin/users"
  element={
    <ProtectedRoute requiredPermission={PERMISSION_IDS.ADMIN_USERS}>
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

---

## Fluxo de Autenticação

### 1. Login
```
User submete credenciais
  ↓
AuthManager.login(username, password)
  ↓
POST /auth/login
  ↓
Receber user + tokens
  ↓
Guardar em localStorage
  ↓
Atualizar AuthState
  ↓
Notificar subscribers (AuthContext)
  ↓
SessionManager.start()
  ↓
Iniciar timers (refresh, heartbeat, inactivity)
  ↓
PermissionService.setUser(user)
  ↓
Redirect para /dashboard
```

### 2. Token Refresh (Automático)
```
Cada 50 minutos OU Em 401 response
  ↓
TokenManager.refreshToken()
  ↓
POST /auth/refresh (com refresh_token)
  ↓
Receber novo access_token
  ↓
Atualizar localStorage
  ↓
Atualizar AuthState
  ↓
Retry request original (se 401)
```

### 3. Session Warning (55 min)
```
Utilizador inativo por 55 min
  ↓
SessionManager dispara warning timer
  ↓
AlertManager.showSessionWarning()
  ↓
Mostrar popup com countdown
  ↓
User escolhe:
  - Continuar → Refresh token + Reset timers
  - Logout → AuthManager.logout()
```

### 4. Logout
```
User clica logout OU Session expira OU Refresh falha
  ↓
AuthManager.logout()
  ↓
SessionManager.stop() - Para timers
  ↓
POST /auth/logout (best effort)
  ↓
Limpar localStorage
  ↓
Limpar AuthState
  ↓
PermissionService.clearUser()
  ↓
Redirect para /login
```

---

## Estrutura de Ficheiros

```
frontend-v2/src/
├── services/
│   ├── auth/
│   │   ├── AuthManager.js         ⭐ Orquestrador principal
│   │   ├── AuthState.js           📊 Container de estado
│   │   ├── TokenManager.js        🔑 Gestão de tokens
│   │   ├── SessionManager.js      ⏱️ Gestão de sessão
│   │   └── AlertManager.js        🔔 Alertas
│   ├── api/
│   │   └── client.js              🌐 Axios instance
│   └── permissionService.js       🔒 Verificação de permissões
│
├── core/
│   ├── contexts/
│   │   ├── AuthContext.jsx        🔗 Context de autenticação
│   │   └── PermissionContext.jsx  🔗 Context de permissões
│   ├── providers/
│   │   └── AppProviders.jsx       📦 Provider central
│   └── config/
│       └── permissionConfig.js    ⚙️ IDs de permissões
│
└── features/
    └── auth/
        ├── hooks/
        │   ├── useAuth.js         (DEPRECATED - usar useAuth de AuthContext)
        │   ├── useLogin.js        ✅ Hook de login com validação
        │   └── useRegister.js     ✅ Hook de registo
        ├── components/
        │   ├── ProtectedRoute.jsx ✅ Protecção de rotas
        │   └── PublicRoute.jsx    ✅ Rotas públicas
        └── pages/
            ├── LoginPage.jsx      ✅ Página de login
            └── RegisterPage.jsx   ✅ Página de registo
```

---

## Diferenças vs Versão Antiga

### ✅ Mantido
- Arquitetura multi-camadas (AuthManager, TokenManager, SessionManager)
- Sistema de permissões por ID numérico
- Timers de sessão (60min inactivity, 55min warning, 50min refresh, 10min heartbeat)
- Token expiration de 1 minuto
- Interceptores de API
- Observer pattern para AuthState

### 🔄 Modernizado
- **Zustand removido** - Agora usa AuthManager com Context API
- **Material-UI v7** (em vez de v5)
- **React Router v7** (em vez de v6)
- **Hooks modernos** - useAuth, usePermissionContext
- **TypeScript-ready** - Estrutura preparada para migração

### 🆕 Adicionado
- Barrel exports para imports limpos
- Design tokens (colors, spacing, typography)
- Mobile-first responsive design
- TanStack Query para server state
- Hook de validação com Zod

---

## Próximos Passos

### Para Testar
1. **Configurar Backend** - Endpoints `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/heartbeat`
2. **Configurar API_URL** - Atualizar `src/core/config/api.config.js`
3. **Adicionar SweetAlert2** (opcional) - Para alerts de sessão: `npm install sweetalert2`
4. **Testar fluxo completo**:
   - Login com username/password
   - Navegação em rotas protegidas
   - Token refresh automático
   - Session warning aos 55 min
   - Logout

### Para Produção
- [ ] Adicionar testes unitários (Jest)
- [ ] Adicionar testes E2E (Playwright/Cypress)
- [ ] Configurar variáveis de ambiente
- [ ] Implementar logging estruturado
- [ ] Adicionar Sentry para error tracking
- [ ] Implementar feature flags
- [ ] Adicionar analytics

---

## Troubleshooting

### Token refresh não funciona
- Verificar se backend retorna `access_token` e `refresh_token`
- Verificar se token JWT tem campo `created_at` no payload
- Verificar interceptores da API

### Sessão expira imediatamente
- Verificar se `localStorage` está acessível
- Verificar se `lastActivityTime` está a ser atualizado
- Ver console para erros do SessionManager

### Permissões não funcionam
- Verificar se `user.interfaces` é um array de números
- Verificar se `user.profil` está definido
- Ver console para warnings do PermissionService

### Alerts não aparecem
- Instalar `sweetalert2`: `npm install sweetalert2`
- Importar no HTML: `<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>`
- Verificar AlertManager fallback para `window.confirm/alert`

---

## Contactos e Suporte

Para questões sobre o sistema de autenticação:
1. Consultar este documento
2. Ver código comentado nos ficheiros
3. Consultar a documentação da versão antiga para comparação

**Autores:**
- Sistema original: Baseado em frontend/
- Migração v2: Claude Code + Rui Ramos
- Data: 2024-11-05
