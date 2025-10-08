# CONTINUAÇÃO DO RELATÓRIO - PARTE 2
## (Adicionar ao RELATORIO_DESENVOLVIMENTO_COMPLETO.md)

---

```

**Código Backend** (`backend/app/services/auth_service.py`):

```python
def login_user(username, password):
    try:
        # 1. Validar credenciais via stored procedure
        session_id, profil = fs_login(username, password)

        # 2. Buscar informações do utilizador
        with db_session_manager(session_id) as session:
            user_info_query = text("SELECT * FROM vsl_client$self")
            user_info_result = session.execute(user_info_query).fetchone()

            # 3. Buscar interfaces/permissões
            interfaces_query = text("""
                SELECT COALESCE(interface, ARRAY[]::integer[]) as interfaces
                FROM ts_client
                WHERE pk = :user_id
            """)
            interfaces_result = session.execute(
                interfaces_query, {'user_id': user_info_result.pk}
            ).fetchone()

            # 4. Montar dados do utilizador
            user_data = {
                'user_id': user_info_result.pk,
                'user_name': user_info_result.client_name,
                'profil': profil,
                'session_id': session_id,
                'interfaces': interfaces_result.interfaces or [],
                'dark_mode': user_info_result.darkmode,
                'vacation': user_info_result.vacation,
                'entity': user_info_result.ts_entity,
            }

        # 5. Atualizar última atividade
        update_last_activity(user_data['user_id'])

        # 6. Criar tokens JWT
        access_token, refresh_token = create_tokens(user_data)
        user_data['access_token'] = access_token
        user_data['refresh_token'] = refresh_token

        return user_data
    except Exception as e:
        current_app.logger.error(f'Erro durante login: {str(e)}')
        raise
```

**Código Frontend** (`frontend/src/services/authService.js`):

```javascript
export const login = async (username, password) => {
  try {
    const response = await api.post("/auth/login", { username, password });

    if (response.status === 200 && response.data) {
      // Armazenar dados do utilizador
      localStorage.setItem("user", JSON.stringify(response.data));
      return response.data;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error("Credenciais incorretas");
    }
    throw new Error("Erro ao fazer login");
  }
};
```

#### **6.2.2 Estrutura dos Tokens JWT**

**Access Token** (expiração: 15 minutos):
```json
{
  "identity": "session_abc123",
  "token_type": "access",
  "session_id": "session_abc123",
  "user_id": 42,
  "user_name": "João Silva",
  "profil": "manager",
  "entity": 10,
  "interfaces": [10, 20, 310, 311, 500],
  "created_at": 1730000000,
  "last_activity": 1730000000,
  "exp": 1730000900,
  "iat": 1730000000
}
```

**Refresh Token** (expiração: 30 dias):
```json
{
  "identity": "session_abc123",
  "token_type": "refresh",
  "session_id": "session_abc123",
  "user_id": 42,
  "profil": "manager",
  "interfaces": [10, 20, 310, 311, 500],
  "refresh_count": 0,
  "created_at": 1730000000,
  "exp": 1732592000,
  "iat": 1730000000
}
```

#### **6.2.3 Refresh de Tokens**

Quando o access token expira (15 min), o sistema automaticamente renova:

```
┌─────────┐                    ┌─────────┐
│ Client  │                    │  Flask  │
└────┬────┘                    └────┬────┘
     │                              │
     │ API call with expired token  │
     ├─────────────────────────────>│
     │                              │
     │ 401 Unauthorized             │
     │<─────────────────────────────┤
     │                              │
     │ POST /auth/refresh           │
     │ {current_time}               │
     │ Header: Bearer refresh_token │
     ├─────────────────────────────>│
     │                              │
     │ Validate refresh token       │
     │ Check inactivity             │
     │ Decode user data             │
     │ Create new tokens            │
     │                              │
     │ {new_access_token,           │
     │  new_refresh_token}          │
     │<─────────────────────────────┤
     │                              │
     │ Update localStorage          │
     │ Retry original request       │
     │                              │
```

**Código Backend**:

```python
def refresh_access_token(refresh_token, client_time, server_time):
    # 1. Decodificar refresh token
    decoded_token = jwt_decode_token(refresh_token)

    # 2. Validar tipo de token
    if decoded_token.get('token_type') != 'refresh':
        raise InvalidTokenError("Token inválido")

    # 3. Extrair dados do utilizador
    user_data = {
        'user_id': decoded_token.get('user_id'),
        'user_name': decoded_token.get('user_name'),
        'session_id': decoded_token.get('session_id'),
        'profil': decoded_token.get('profil'),
        'entity': decoded_token.get('entity'),
        'interfaces': decoded_token.get('interfaces', []),
    }

    # 4. Verificar idade do token
    token_created_at = datetime.fromtimestamp(
        decoded_token.get('created_at'), timezone.utc
    )
    token_age = server_time - token_created_at

    if token_age > current_app.config['REFRESH_TOKEN_EXPIRES']:
        raise TokenExpiredError("Refresh token expirado")

    # 5. Verificar inatividade
    last_activity = datetime.fromtimestamp(
        decoded_token.get('last_activity'), timezone.utc
    )
    if (server_time - last_activity) > timedelta(hours=2):
        raise TokenExpiredError("Sessão expirada por inatividade")

    # 6. Criar novos tokens
    refresh_count = decoded_token.get('refresh_count', 0) + 1
    new_access_token, new_refresh_token = create_tokens(
        user_data, refresh_count
    )

    # 7. Atualizar última atividade
    update_last_activity(user_data['user_id'])

    return {
        "user_id": user_data['user_id'],
        "profil": user_data['profil'],
        "interfaces": user_data['interfaces'],
        "access_token": new_access_token,
        "refresh_token": new_refresh_token
    }
```

**Interceptor Axios** (Frontend):

```javascript
// Interceptor para requests - adicionar token
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.access_token) {
    config.headers.Authorization = `Bearer ${user.access_token}`;
  }
  return config;
});

// Interceptor para responses - refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se 401 e não foi retry ainda
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Tentar refresh
        const newUser = await refreshToken(Date.now());

        if (newUser) {
          // Atualizar header e repetir request
          originalRequest.headers.Authorization =
            `Bearer ${newUser.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh falhou - logout
        await logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

#### **6.2.4 Logout**

```python
def logout_user(user_identity):
    try:
        if user_identity:
            # 1. Limpar cache de atividade
            cache.delete(f"last_activity_{user_identity}")

            # 2. Chamar procedimento de logout
            fs_logout(user_identity)

        # 3. Limpar sessão Flask
        if hasattr(g, 'current_user'):
            delattr(g, 'current_user')

        return True
    except Exception as e:
        current_app.logger.error(f"Erro ao fazer logout: {str(e)}")
        raise
```

### 6.3 Controlo de Inatividade

O sistema implementa **controlo automático de inatividade** para garantir segurança:

#### **Configurações de Timeout**

```python
# config.py
ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRES = timedelta(days=30)
INACTIVITY_TIMEOUT = timedelta(minutes=30)
WARNING_TIMEOUT = timedelta(minutes=15)
```

#### **Heartbeat System**

```javascript
// Frontend - Heartbeat a cada 5 minutos
useEffect(() => {
  const heartbeatInterval = setInterval(() => {
    if (isAuthenticated) {
      api.post('/auth/heartbeat');
    }
  }, 5 * 60 * 1000); // 5 minutos

  return () => clearInterval(heartbeatInterval);
}, [isAuthenticated]);
```

```python
# Backend
@bp.route('/heartbeat', methods=['POST'])
@jwt_required()
@limiter.limit("360 per hour")
def heartbeat():
    current_user = get_jwt_identity()
    update_last_activity(current_user)
    return jsonify({"message": "Heartbeat recebido"}), 200

def update_last_activity(current_user):
    cache.set(
        f"last_activity_{current_user}",
        datetime.now(timezone.utc)
    )
    current_app.logger.info(
        f"Última atividade atualizada para {current_user}"
    )
```

### 6.4 Rate Limiting

Proteção contra ataques de força bruta:

```python
# Limites por endpoint
@bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute", key_func=get_remote_address)
def login():
    # ...

@bp.route('/refresh', methods=['POST'])
@limiter.limit("5 per minute", key_func=get_remote_address)
def refresh():
    # ...

# Configuração global
limiter = Limiter(
    key_func=limiter_key_func,
    default_limits=["500 per day", "100 per hour"]
)
```

### 6.5 Blacklist de Tokens

Tokens podem ser revogados (logout forçado):

```python
# Blacklist em memória (produção usa Redis)
blacklist = set()

@jwt.token_in_blocklist_loader
def check_if_token_in_blacklist(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return jti in blacklist

def add_token_to_blacklist(jti):
    blacklist.add(jti)
    current_app.logger.info(f"Token {jti} adicionado à blacklist")
```

### 6.6 Segurança Adicional

#### **Password Hashing**

```python
# Passwords são hashed com bcrypt via stored procedures PostgreSQL
# O sistema nunca armazena passwords em texto plano
```

#### **HTTPS Only**

```python
# Produção - Force HTTPS
if current_app.config['ENV'] == 'production':
    @app.before_request
    def before_request():
        if not request.is_secure:
            url = request.url.replace('http://', 'https://', 1)
            return redirect(url, code=301)
```

#### **CORS Configurado**

```python
CORS(app,
     resources={r"/*": {"origins": "*"}},
     supports_credentials=True)
```

---

## 7. SISTEMA DE PERMISSÕES

### 7.1 Arquitetura de Permissões

O sistema implementa um **modelo de permissões baseado em IDs numéricos** armazenados num array no PostgreSQL.

#### **Estrutura de Dados**

```sql
-- Tabela de utilizadores
CREATE TABLE ts_client (
    pk SERIAL PRIMARY KEY,
    client_name VARCHAR(255),
    interface INTEGER[],  -- Array de IDs de permissões
    profil VARCHAR(50)    -- Role: operator, supervisor, manager, admin
);

-- Exemplo de dados
INSERT INTO ts_client (pk, client_name, interface, profil) VALUES
(1, 'Admin User', ARRAY[10, 20, 30, 500, 510, 520], 'admin'),
(2, 'Operator', ARRAY[311, 520], 'operator'),
(3, 'Supervisor', ARRAY[311, 312, 500, 510], 'supervisor');
```

### 7.2 Mapeamento de Permissões

| ID  | Código | Módulo | Descrição |
|-----|--------|--------|-----------|
| **10** | admin.dashboard | Admin | Dashboard administrativo |
| **20** | admin.users | Admin | Gestão de utilizadores |
| **30** | admin.payments | Payments | Validar pagamentos |
| **50** | admin.docs.manage | Admin | Gestão de documentos |
| **60** | admin.docs.reopen | Admin | Reabertura de pedidos |
| **200** | tasks.all | Tasks | Ver todas as tarefas |
| **210** | epi.manage | EPIs | Gestão de EPIs |
| **220** | letters.manage | Letters | Gestão de ofícios |
| **300** | internal.access | Internal | Área interna |
| **310** | operation.access | Operations | Acesso básico operações |
| **311** | operation.execute | Operations | Executar tarefas |
| **312** | operation.supervise | Operations | Supervisionar equipa |
| **313** | operation.manage | Operations | Gerir metadados |
| **314** | operation.analysis | Operations | Ver análises |
| **400** | dashboard.view | Dashboard | Ver dashboard |
| **500** | docs.view.all | Documents | Ver todos documentos |
| **510** | docs.view.owner | Documents | Ver criados por mim |
| **520** | docs.view.assigned | Documents | Ver atribuídos a mim |
| **540** | docs.modern | Documents | Documentos modernos |
| **560** | docs.create | Documents | Criar documentos |
| **600** | pav.view | Pavimentations | Ver pavimentações |
| **800** | entities.view | Entities | Ver entidades |
| **810** | entities.create | Entities | Criar entidades |
| **820** | entities.edit | Entities | Editar entidades |

### 7.3 Verificação de Permissões

#### **Backend - Decorator**

```python
# utils/decorators.py
from functools import wraps
from flask_jwt_extended import get_jwt
from flask import jsonify

def requires_permission(permission_id):
    """
    Decorator para verificar se o utilizador tem uma permissão específica.

    Args:
        permission_id (int): ID numérico da permissão necessária

    Usage:
        @requires_permission(500)  # docs.view.all
        def get_all_documents():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            jwt_data = get_jwt()
            user_interfaces = jwt_data.get('interfaces', [])

            if permission_id not in user_interfaces:
                return jsonify({
                    "error": "Acesso negado",
                    "required_permission": permission_id
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Uso em rotas
@bp.route('/documents', methods=['GET'])
@jwt_required()
@requires_permission(500)  # docs.view.all
def get_all_documents():
    # Apenas utilizadores com permissão 500 podem acessar
    ...

@bp.route('/documents/create', methods=['POST'])
@jwt_required()
@requires_permission(560)  # docs.create
def create_document():
    # Apenas utilizadores com permissão 560 podem criar
    ...
```

#### **Frontend - Hook**

```javascript
// hooks/useAuth.js
export const useAuth = () => {
  const context = useContext(AuthContext);

  const hasPermission = (permissionId) => {
    return context.permissions.includes(permissionId);
  };

  const hasAnyPermission = (...permissionIds) => {
    return permissionIds.some(id =>
      context.permissions.includes(id)
    );
  };

  const hasAllPermissions = (...permissionIds) => {
    return permissionIds.every(id =>
      context.permissions.includes(id)
    );
  };

  return {
    ...context,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};

// Uso em componentes
function DocumentList() {
  const { hasPermission } = useAuth();

  return (
    <div>
      {hasPermission(560) && (
        <Button onClick={createDocument}>
          Criar Documento
        </Button>
      )}

      {hasPermission(500) ? (
        <AllDocumentsList />
      ) : hasPermission(520) ? (
        <AssignedDocumentsList />
      ) : (
        <NoPermissionMessage />
      )}
    </div>
  );
}
```

#### **Frontend - PrivateRoute**

```javascript
// components/routing/PrivateRoute.js
const PrivateRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, hasPermission, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <CircularProgress />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};

// Uso em rotas
<Route path="/documents" element={
  <PrivateRoute requiredPermission={500}>
    <DocumentList />
  </PrivateRoute>
} />
```

### 7.4 Configuração de Rotas com Permissões

```javascript
// config/routeConfig.js
export const ROUTE_CONFIG = {
  '/documents': {
    id: 'pedidos',
    text: 'Pedidos',
    icon: AssignmentIcon,
    showInSidebar: true,
    submenu: {
      '/document_self': {
        id: 'para_tratamento',
        text: 'Para tratamento',
        icon: AssignmentIndIcon,
        permissions: { required: 520 }, // ← Permissão necessária
        isBadged: true
      },
      '/document_owner': {
        id: 'criados_por_mim',
        text: 'Criados por mim',
        icon: PersonIcon,
        permissions: { required: 510 }
      },
      '/documents': {
        id: 'todos_pedidos',
        text: 'Todos os Pedidos',
        icon: ListAltIcon,
        permissions: { required: 500 }
      }
    }
  }
};
```

### 7.5 Sidebar Dinâmica

```javascript
// components/common/Sidebar/Sidebar.jsx
const Sidebar = () => {
  const { hasPermission } = useAuth();

  const visibleRoutes = useMemo(() => {
    return Object.entries(ROUTE_CONFIG).filter(([path, config]) => {
      // Verificar se mostra no sidebar
      if (!config.showInSidebar) return false;

      // Verificar permissão
      if (config.permissions?.required) {
        return hasPermission(config.permissions.required);
      }

      // Se não tem permissão definida, mostrar
      return true;
    });
  }, [hasPermission]);

  return (
    <Drawer>
      {visibleRoutes.map(([path, config]) => (
        <MenuItem key={path} to={path}>
          <config.icon />
          {config.text}

          {/* Submenu */}
          {config.submenu && (
            <SubMenu>
              {Object.entries(config.submenu).map(([subPath, subConfig]) => {
                // Verificar permissão do submenu
                if (subConfig.permissions?.required &&
                    !hasPermission(subConfig.permissions.required)) {
                  return null;
                }

                return (
                  <SubMenuItem key={subPath} to={subPath}>
                    <subConfig.icon />
                    {subConfig.text}
                  </SubMenuItem>
                );
              })}
            </SubMenu>
          )}
        </MenuItem>
      ))}
    </Drawer>
  );
};
```

### 7.6 Profiles (Roles)

Além das permissões numéricas, o sistema usa **profiles** para agrupar funcionalidades:

| Profile | Descrição | Permissões Típicas |
|---------|-----------|-------------------|
| **admin** | Administrador do sistema | 10, 20, 30, 50, 60, 500+ |
| **manager** | Gestor operacional | 313, 314, 500, 510 |
| **supervisor** | Supervisor de equipa | 312, 500, 510 |
| **operator** | Operador de campo | 311, 520 |
| **user** | Utilizador básico | 400, 510, 520 |

**Uso do Profile**:

```javascript
const { user } = useAuth();

// Verificar profile
if (user.profil === 'admin') {
  // Funcionalidades administrativas
}

// Ou usar hook especializado
const { isAdmin, isManager, isSupervisor, isOperator } = useUserRole();

if (isSupervisor) {
  return <SupervisorDashboard />;
}
```

### 7.7 Matriz de Permissões

#### **Documentos**

| Ação | Permissão | Admin | Manager | Supervisor | Operator |
|------|-----------|-------|---------|------------|----------|
| Ver todos | 500 | ✅ | ✅ | ✅ | ❌ |
| Ver criados por mim | 510 | ✅ | ✅ | ✅ | ✅ |
| Ver atribuídos a mim | 520 | ✅ | ✅ | ✅ | ✅ |
| Criar documento | 560 | ✅ | ✅ | ✅ | ❌ |
| Gestão avançada | 50 | ✅ | ❌ | ❌ | ❌ |

#### **Operações**

| Ação | Permissão | Admin | Manager | Supervisor | Operator |
|------|-----------|-------|---------|------------|----------|
| Executar tarefas | 311 | ✅ | ✅ | ✅ | ✅ |
| Supervisionar equipa | 312 | ✅ | ✅ | ✅ | ❌ |
| Gerir metadados | 313 | ✅ | ✅ | ❌ | ❌ |
| Ver análises | 314 | ✅ | ✅ | ❌ | ❌ |

### 7.8 Auditoria de Acessos

```python
# Middleware para logging de acessos
@app.before_request
def log_access():
    if request.method != 'OPTIONS':
        jwt_data = get_jwt()
        current_app.logger.info(
            f"Access: {request.method} {request.path} "
            f"by user {jwt_data.get('user_id')} "
            f"with permissions {jwt_data.get('interfaces')}"
        )
```

---

*Continuação em progresso...*

**Próximas seções:**
- Backend completo (API, Serviços, Modelos, WebSocket)
- Módulos funcionais detalhados
- Deployment e infraestrutura
