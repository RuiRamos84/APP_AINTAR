# AINTAR Frontend v2 (Em Desenvolvimento)

Nova versao da interface web React para o sistema AINTAR, usando Vite e arquitetura modular.

## Tecnologias

- **Framework:** React 18
- **Build Tool:** Vite (mais rapido que CRA)
- **UI Library:** Material-UI (MUI)
- **Estado:** Zustand + Context API
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Validacao:** Zod

## Diferencas vs Frontend v1

| Aspecto | v1 (frontend/) | v2 (frontend-v2/) |
|---------|----------------|-------------------|
| Build | Create React App | Vite |
| Estado | Redux | Zustand |
| Arquitetura | Paginas monoliticas | Modular por features |
| Performance | Lento em dev | Rapido (HMR) |
| Validacao | Manual | Zod schemas |

## Estrutura

```
frontend-v2/
├── src/
│   ├── core/             # Nucleo da aplicacao
│   │   ├── config/       # Configuracoes (rotas, modulos, permissoes)
│   │   ├── contexts/     # Contexts globais (Auth, Metadata, Socket)
│   │   ├── hooks/        # Hooks globais
│   │   ├── providers/    # Providers da aplicacao
│   │   └── utils/        # Utilitarios core
│   ├── features/         # Modulos por funcionalidade
│   │   ├── auth/         # Autenticacao
│   │   ├── admin/        # Administracao
│   │   ├── dashboard/    # Dashboards
│   │   ├── tasks/        # Gestao de tarefas
│   │   ├── entities/     # Gestao de entidades
│   │   ├── operations/   # Operacoes
│   │   └── payments/     # Pagamentos
│   ├── services/         # Servicos partilhados
│   │   ├── api/          # Cliente API + interceptors
│   │   ├── auth/         # AuthManager, TokenManager
│   │   └── websocket/    # Conexoes WebSocket
│   ├── shared/           # Componentes partilhados
│   │   ├── components/   # UI components reutilizaveis
│   │   └── ...
│   ├── App.jsx           # Componente raiz
│   └── main.jsx          # Entry point
├── public/               # Assets estaticos
└── vite.config.js        # Configuracao Vite
```

## Desenvolvimento

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Abre em `http://localhost:5173`

## Build de Producao

```bash
# Criar build otimizado
npm run build

# Preview local do build
npm run preview
```

## Configuracao

### Variaveis de Ambiente

Criar ficheiro `.env`:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

**Nota:** No Vite, as variaveis devem comecar com `VITE_` para serem expostas ao cliente.

## Sistema de Permissoes

O sistema usa IDs numericos para permissoes:

```javascript
// core/config/permissionMap.js
export const PERMISSION_IDS = {
  ADMIN_USERS: 1,
  ADMIN_PAYMENTS: 2,
  // ...
};
```

## Modulos (Features)

Cada feature segue a estrutura:

```
features/[nome]/
├── components/     # Componentes especificos
├── hooks/          # Hooks especificos
├── pages/          # Paginas do modulo
├── services/       # Servicos do modulo
└── schemas/        # Schemas Zod (validacao)
```

## Estado da Migracao

| Modulo | Estado | Notas |
|--------|--------|-------|
| Auth | Completo | Login, logout, tokens |
| Dashboard | Completo | - |
| Tasks | Em progresso | Kanban board |
| Entities | Parcial | - |
| Operations | Parcial | - |
| Payments | Parcial | - |

## Notas

- Esta versao esta **em desenvolvimento**
- Nao usar em producao ate migracao completa
- Versao de producao atual: `frontend/`
