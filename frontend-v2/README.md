# AINTAR Frontend v2

Nova versao da interface web React para o sistema AINTAR, usando Vite e arquitetura modular. Migracao das rotas privadas concluida; coexiste com `frontend/` (producao).

## Tecnologias

- **Framework:** React 19
- **Build Tool:** Vite 7 (mais rapido que CRA)
- **UI Library:** Material-UI (MUI) 7
- **Estado:** React Query (dados de servidor) + Zustand (UI state) + Context API
- **Routing:** React Router 7
- **HTTP Client:** Axios
- **Formularios/Validacao:** React Hook Form + Zod

## Diferencas vs Frontend v1

| Aspecto | v1 (frontend/) | v2 (frontend-v2/) |
|---------|----------------|-------------------|
| Build | Create React App | Vite |
| Estado servidor | Context API + React Query | React Query (exclusivo) |
| Estado UI | Zustand + Context API | Zustand (exclusivo) |
| Arquitetura | Paginas monoliticas | Modular por features (FSD) |
| Performance | Lento em dev | Rapido (HMR) |
| Validacao | Manual | React Hook Form + Zod |

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
│   │   ├── administracao/# Sistema (users, config, logs)
│   │   ├── administrativo/# Interno (tarefas, EPI, frota)
│   │   ├── dashboards/   # Dashboards
│   │   ├── gestao/       # Gestao (ETARs/EE)
│   │   ├── operacao/     # Operacao
│   │   └── pagamentos/   # Pagamentos
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

RBAC granular baseado em strings (nao em IDs numericos). Os checks usam o valor exato definido na tabela `ts_interface`:

```javascript
// exemplo de uso em rota/componente
permissions: { required: 'docs.view' }
```

Convencao `.view`/`.edit` por modulo (ou acoes especificas como `payments.mbway`). Nao existem permissoes "guarda-chuva" (`global.access`, `admin.dashboard`) — foram removidas permanentemente e nao devem ser reintroduzidas.

## Deteção de Modo de Manutenção

`core/contexts/SocketContext.jsx` corre um poll dedicado (8s, independente do
estado do socket — ver nota sobre ping_timeout no Deploy/README.md) que faz
`window.location.reload()` sem refresh manual do utilizador. **Nunca** navegar
para o URL literal `/maintenance.html` — esse location no nginx está marcado
`internal`, só resolve para o ficheiro real via o `error_page 503` automático;
um `window.location.href` directo cai no catch-all da SPA (`index.html`) em vez
disso. `services/auth/AuthManager.js` (interceptor Axios) e a desconexao do
socket adicionam deteção mais rapida quando calha, mas nao sao garantidas por
si so. Detalhe completo em `Deploy/README.md` ("Pagina de Manutencao").

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

Migracao completa — todas as rotas privadas implementadas, sem stubs "Coming Soon". Modulos: Operacao, Gestao (ETARs), Pagamentos, Dashboards, Sistema (admin), Interno (tarefas/EPI/frota), Portal do Cliente.

## Notas

- Ambas as versoes coexistem: `frontend/` (producao, CRA) e `frontend-v2/` (Vite, em rollout gradual)
- Dual context: o mesmo build serve backoffice (`app.aintar.pt`) e portal (`clientes.aintar.pt`), detectado via hostname em `src/core/config/appContext.js`
