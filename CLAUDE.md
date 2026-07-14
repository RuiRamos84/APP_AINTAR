# AINTAR APP - Project Guide

## Development Principles (ALWAYS FOLLOW)
- **Best practices first:** Every implementation must follow industry best practices
- **Usability:** Intuitive interfaces, clear labels, logical workflows, accessible to all users
- **Responsiveness:** All UI must adapt to desktop, tablet and mobile (MUI Grid breakpoints: xs, sm, md, lg)
- **Simplicity:** Minimal complexity, clean code, no over-engineering. Less is more
- **Functionality:** Features must work correctly and completely before moving on
- **UX/UI:** Consistent visual design, proper spacing, feedback on actions (loading states, toasts, tooltips), logical form layouts
- **Responses:** Be practical, objective and assertive. Focus on solutions, not theory
- **Reusability:** Always prefer generic/shared components over duplicated code
- **Consistency:** Follow existing patterns - check similar modules before implementing new features
- **Language:** All user-facing text in Portuguese (pt-PT)
- **Security:** Always validate inputs (backend: Pydantic, frontend: form validation). Never trust client data. Prevent SQL injection, XSS, CSRF
- **Error handling:** Errors are as important as success. Every async operation must handle loading, success AND error states. Backend returns consistent JSON with `@api_error_handler`. Frontend shows toast + inline feedback. Never swallow errors silently.
- **State architecture:** React Query owns ALL server/remote state. Zustand owns ONLY client UI state (modals, selections, filters). Never duplicate: don't fetch in Zustand what React Query already manages.
- **Git:** Conventional commits in Portuguese (feat, fix, refactor, docs). Branch naming: `feature/`, `fix/`, `refactor/`
- **Documentação sempre sincronizada:** Qualquer alteração de arquitetura, nova/alterada rota ou serviço, mudança de stack/dependências, ou correção de bug não-óbvia DEVE ser refletida na mesma sessão em: (1) o `README.md` do módulo afetado (`backend/`, `frontend/`, `frontend-v2/`); (2) este `CLAUDE.md`, se for um padrão transversal ao projeto; (3) a nota correspondente no Obsidian Vault (`02 - Módulos`, `10 - API Reference`, `07 - Bugs & Soluções` ou `08 - Backlog & Roadmap`, conforme aplicável). O Vault vive fora do repositório (OneDrive) — o git não o consegue vigiar, por isso esta atualização depende de leitura ativa desta regra, não de automação. Um hook `Stop` local (`.claude/hooks/doc_sync_check.py`) lembra quando código em `routes/`, `services/` ou `features/` muda sem nenhum `.md` acompanhar — mas cobre só os ficheiros do repositório, nunca o Vault.
- **Aprendizagem contínua:** quando uma sessão valida um padrão novo, corrige uma assunção documentada, ou descobre um facto de infraestrutura/domínio, capitalizar via `/aprender` — o conhecimento vai para o lugar canónico certo (CLAUDE.md, skill, Vault ou memória), nunca se perde no fim da sessão.

### Comentários no Código (política transversal)
Comentários **essenciais, não em demasia**. Em pt-PT, como o código existente. Regras:
- **Comentar o PORQUÊ, nunca o quê:** decisões não-óbvias, constraints externos, workarounds com razão de existir, regras de negócio que o código não consegue exprimir sozinho. Exemplo real do projeto: o comentário em `vehicle_reservation.sql` a explicar porque se usa `pg_advisory_xact_lock` em vez de `EXCLUDE USING gist`
- **Proibido:** comentário que repete a linha seguinte (`# incrementa contador`), comentários de narração de PR ("alterado para corrigir X"), código morto comentado, TODO sem dono/contexto
- **Docstrings:** obrigatórias em services e funções públicas do backend (1-3 linhas: o que faz + o que devolve); dispensáveis em funções privadas óbvias
- **Densidade:** seguir a do ficheiro em que se está a mexer — um ficheiro limpo não ganha 10 comentários novos, um ficheiro denso não fica mudo
- **Teste do comentário:** se apagar o comentário e o próximo leitor não perde nada → apagar. Se perde uma decisão/razão → fica

### Abstração com Juízo (dinâmico e simples ao mesmo tempo)
A reutilização é obrigatória, o over-engineering é proibido — a fronteira é esta:
- **Abstrair quando há 2+ usos reais** (não hipotéticos). O 1.º uso escreve-se concreto; ao 2.º extrai-se o genérico (componente partilhado, hook, função util, view SQL)
- **Preferir composição e configuração a herança e duplicação:** componentes genéricos parametrizáveis (`GenericTable`, `ModulePage`, `useSearch`, `useRecords`) são o padrão da casa — verificar SEMPRE se já existe um antes de criar
- **Config-driven onde a variação é dados, não lógica:** rotas em `routeConfig.js`, módulos em `moduleConfig.js`, permissões em `ts_interface` — variação nova entra por configuração, não por `if` espalhados
- **YAGNI como travão:** não construir a abstração "para o futuro" — generalizar cedo demais cria APIs erradas que custam mais a desfazer do que a duplicação custava
- **Otimização de recursos por defeito:** paginação em listas grandes, `staleTime` adequado no React Query, cache Redis em lookups estáticos, `lazy()` por rota, índices nas colunas de filtro — não é otimização prematura, é o custo mínimo de fazer bem à primeira

## Overview
Water utility management application (AINTAR) with Flask backend + React frontend.
Domain: app.aintar.pt | Production server: Windows Server 2019

## Architecture

### Backend (`backend/`)
- **Framework:** Flask 3.1.0 + SQLAlchemy 2.0 + PostgreSQL
- **Auth:** JWT (access + refresh tokens) via Flask-JWT-Extended
- **Server:** eventlet + Flask-SocketIO (production: `run_waitress.py`)
- **Patterns:** Service Layer (`app/services/`) + Repository (`app/repositories/`) + Blueprints (`app/routes/`)
- **Cache/Rate Limit:** Redis (Flask-Caching + Flask-Limiter)
- **Real-time:** Socket.IO for WebSockets
- **Logging:** Rotating file handler (10MB, 5 backups)

### Frontend (`frontend/`) - Production
- **Framework:** React 19 + Material-UI 7 (MUI) + Zustand
- **Build:** Create React App 5
- **HTTP:** Axios with JWT interceptors (`services/api.js`)
- **State:** Zustand stores + Context API + React Query (TanStack)
- **Routing:** React Router 7

### Frontend-v2 (`frontend-v2/`) - Next Generation (in development)
- **Build:** Vite 7 (faster dev/build)
- **Forms:** React Hook Form + Zod validation
- **Structure:** Feature-based modular architecture (`features/`, `core/`, `shared/`)
- **Dual context:** Same build serves backoffice (`app.aintar.pt`) and portal (`clientes.aintar.pt`)
  - Detected via `src/core/config/appContext.js` (hostname → `IS_PORTAL` / `IS_BACKOFFICE`)
  - Dev override: `VITE_APP_CONTEXT=portal npm run dev`

### Website Público (`website/`)
- **Framework:** React 19 + Tailwind CSS v4 + Framer Motion + Lucide React
- **Build:** Vite 8, sem MUI, sem Axios — CSS utility-first, `fetch` nativo
- **Routing:** React Router 7 com `AnimatePresence mode="sync"` (fade entre páginas)
- **API:** `website/src/services/cmsApi.js` → endpoints `/api/v1/website/*` (sem autenticação)
- **SEO:** `SeoHead.jsx` (react-helmet-async) em todas as páginas
- **RGPD:** `CookieBanner.jsx` — consentimento em `localStorage['cookie_consent']`
- **Env:** `VITE_API_URL` (backend), `VITE_PORTAL_URL` (link para clientes.aintar.pt)
- **Dev:** `cd website && npm run dev` (porta 5173)

### Portal do Cliente (`clientes.aintar.pt`)
- **Perfil:** `ts_profile.pk = 3` ("Perfil Cliente")
- **Permissões:** `portal.access`, `portal.invoices.view`, `portal.payments.pay`, `portal.profile.edit`
- **SQL inicial:** `backend/sql/portal_cliente_fase0.sql` (executar na BD antes do primeiro acesso)
- **Layouts:** `PortalLayout` (navbar glass + footer wave) + `PortalAuthLayout` (split screen)
- **Rotas:** `PortalRoutes.jsx` — `/pedidos`, `/pedidos/:id`, `/novo-pedido`, `/faturas`, `/perfil`
- **Endpoints abertos a portal.access:** `GET /document_owner`, `POST /create_document`,
  `GET /document/<id>`, `GET /get_document_step/<pk>`, `GET /get_document_anex/<pk>`,
  `GET /document/<id>/params`, `GET /files/<regnumber>/<filename>`
- **Faturas:** `GET /payments/me` (JWT only, filtra por `entity_pk` do JWT)

### Search Pattern (frontend-v2) — Standard Obrigatório
- **Hook:** `useSearch` em `@/shared/hooks` — SEMPRE usar para pesquisa client-side
- **Nunca** fazer `.filter()` manual com campos hardcoded. O hook pesquisa dinamicamente em todos os campos primitivos do objeto, sem necessitar de enumeração.
- **Uso básico** (pesquisa em todos os campos automaticamente):
  ```js
  import { useSearch } from '@/shared/hooks';
  const results = useSearch(data, searchTerm);
  ```
- **Com resolução de label** (quando um campo é ID numérico com label legível):
  ```js
  const results = useSearch(data, searchTerm, {
    extraText: (item) => getLabelForId(item.fieldId, metaData),
  });
  ```
- **Com filtros estruturados** (dropdowns, datas — separados da pesquisa de texto):
  ```js
  // 1. Filtros estruturados em useMemo
  const filtered = useMemo(() => applyStructuralFilters(data, filters), [data, filters]);
  // 2. Pesquisa de texto via hook (inclui useDeferredValue)
  const results = useSearch(filtered, searchTerm);
  ```
- **Adicionar novo módulo com lista:** wiring mínimo obrigatório:
  1. `SearchBar` de `@/shared/components/data` para o input
  2. `useSearch` de `@/shared/hooks` para o filtro — nunca `.filter()` inline
  3. Registar rota em `routeConfig.js` + módulo em `moduleConfig.js`

### Tipografia Fluida — clamp() (frontend-v2) — Standard Obrigatório
- **Helper:** `fluidClamp(minPx, maxPx, minVw?, maxVw?)` em `@/styles/tokens` — gera `clamp(minRem, calc(rem + vw), maxRem)`. Usa `rem` no termo de crescimento (não `vw` puro) para continuar a respeitar o zoom de texto do browser.
- **Nunca** usar um objeto de breakpoints (`{ xs: '1.2rem', sm: '1.4rem', md: '1.75rem' }`) para `fontSize` de headings/títulos — isso produz saltos abruptos ao cruzar o breakpoint. Usar `fluidClamp(...)` para escala contínua.
- **Já aplicado em:**
  - Tema global (`styles/theme/index.js`): `h1`–`h6` usam `fluidFontSize.h1..h6` (tokens em `styles/tokens/typography.js`, fluidos entre 360px e 1280px de viewport)
  - `ModulePage` — título da página (fluido 360px→960px)
  - `EmptyState` / `ErrorState` — título e mensagem (fluido 360px→600px)
  - HomePage, UnauthorizedPage/ForbiddenPage, DocumentDetailsModal/DocumentCard, OrcamentoTable, TaskBoardPage/TasksPage/TaskColumn, UserDetailPage — todos os `fontSize: { xs, sm, md }` de texto convertidos
  - Gráficos Recharts (`features/dashboards/components/charts/`) — ver abaixo
- **Texto de corpo (`body1`/`body2`/`caption`) mantém-se fixo** — não escalar, por legibilidade.
- **Altura fluida de gráficos Recharts:** o prop `height` do `ResponsiveContainer` **não aceita** uma string `clamp()` diretamente — internamente faz `Number(height)` quando não é percentagem, o que resulta em `NaN`. Solução aplicada: `fluidChartHeight(maxPx)` em `features/dashboards/components/charts/chartUtils.js` (usa `fluidClamp` com `minRatio=0.65`) é aplicado a uma `Box` wrapper (`sx={{ height: fluidChartHeight(height) }}`), e o `ResponsiveContainer` interno recebe `height="100%"`. Já implementado em `AppBarChart`, `AppAreaChart`, `AppLineChart`, `AppPieChart` e no `Skeleton` de loading do `ChartCard` — os call-sites (`ChartCard`, `DashboardLanding`, `DashboardCategoryPage`, `DashboardOverviewPage`) não precisaram de alterações, continuam a passar `height` como número normal.

## Key Patterns

### Backend
- Routes: `@bp.route()` + `@require_permission('string.value')` + `@api_error_handler`
- DB reads use views (`vbl_*`), writes go through `vbf_*` views / `fbf_*`/`fbo_*` functions — never `INSERT`/`UPDATE`/`DELETE` directly on `tb_*`
- Some `vbl_*` views (e.g. `vbl_document`, `vbl_entity`) are permission-scoped to the calling session (`fs_entity()`, `vsl_perms`) and return empty/NULL outside a real app session — for admin/generic joins that just need a reference value, join the base `tb_*` table directly instead
- Financial/audit ledger tables (e.g. `tb_caixa`) deliberately have no `fbf_*` DELETE path — correct with a reversing entry, never delete
- PK generation: `fs_nextcode()` database function
- Session: `db_session_manager(current_user)`
- Error messages in Portuguese
- API prefix: `/api/v1/`

### Permissions / Granular RBAC (Strictly Enforced)
- **String-Based Only**: All permission checks (`require_permission` in Backend, `permissions: { required: '...' }` in Frontend) MUST use the exact granular string values from the `ts_interface` database table (e.g., `docs.view`, `entities.edit`).
- **No Legacy Constants**: DO NOT use legacy numeric ID constants like `PERMISSIONS.DOCS_VIEW` or `530`. The `permissionMap.js` mapping is obsolete.
- **Granular Actions**: Permissions must follow the `.view` and `.edit` convention per module context (or specific actions like `payments.mbway`). "Umbrella" or generic grouping permissions (e.g., `global.access` or `admin.dashboard`) were permanently removed and must never be reintroduced.

### State Architecture — React Query vs Zustand (Strictly Enforced)

**React Query** → dados do servidor (tudo o que vem da API):
- Usar `useQuery` para leituras, `useMutation` para escritas
- Definir `staleTime` adequado: lookups raramente mudam (5 min), dados operacionais (2 min)
- Após mutação usar `qc.invalidateQueries({ queryKey: KEY })` para refrescar — nunca re-fetch manual
- React Query deduplica requests: múltiplos componentes com o mesmo hook = 1 chamada HTTP
- Query keys centralizadas em `MODULE_KEYS` por feature (ex: `ORCAMENTO_KEYS`)

**Zustand** → estado de UI do cliente (nunca dados do servidor):
- `modalOpen`, `editTarget`, `anoSelecionado`, filtros ativos, painéis abertos
- Mutações no store apenas chamam a API — nunca fazem fetch adicional após a escrita
- ❌ NUNCA guardar `registos`, `anos`, `subclasses` ou qualquer lista da API no Zustand

**Anti-pattern a evitar:**
```js
// ❌ ERRADO — duplica com React Query, gera N chamadas HTTP
setAno: (ano) => {
    set({ anoSelecionado: ano });
    get().fetchDetalhe(ano);   // duplica useOrcamentoDetalhe()
    get().fetchSubclasses();   // duplica useOrcamentoSubclasses()
}

// ✅ CORRETO — store só gere UI state, RQ refetch automático
setAno: (ano) => set({ anoSelecionado: ano }),
```

### Error Handling — Regra Obrigatória

Erros têm a mesma importância que os casos de sucesso. Toda a operação assíncrona deve tratar os três estados: **loading → success → error**.

**Backend:**
- Todas as rotas usam `@api_error_handler` — nunca deixar exceções sem tratar
- Erros retornam JSON consistente: `{ "error": "mensagem em pt-PT" }` com HTTP status adequado
- Validação com Pydantic devolve 422; erros de negócio 400/409; não encontrado 404
- Nunca expor stack traces ou detalhes internos ao cliente

**Frontend — obrigações por operação:**
- **Loading:** mostrar `CircularProgress` ou `disabled` no botão durante chamadas
- **Erro de rede/API:** `toast.error(err?.response?.data?.error || err.message || 'Erro inesperado.')`
- **Erro de formulário:** feedback inline (MUI `helperText`, `error` prop) — não só toast
- **Estado vazio:** componente de empty state explícito, nunca tabela vazia sem mensagem
- **Erro de página:** `Alert severity="error"` visível, não apenas consola

**Padrão obrigatório em mutações:**
```js
// ✅ Padrão correto — loading + success + error sempre presentes
const handleSubmit = async () => {
    setLoading(true);
    try {
        await doAction();
        toast.success('Operação concluída.');
        onClose();
    } catch (err) {
        toast.error(err?.response?.data?.error || err.message || 'Erro ao guardar.');
    } finally {
        setLoading(false);  // sempre, mesmo em erro
    }
};
```

**Estados de UI obrigatórios em listas/tabelas:**
```jsx
if (isLoading) return <CircularProgress />;
if (error)     return <Alert severity="error">Erro ao carregar dados.</Alert>;
if (!data.length) return <EmptyState mensagem="Sem registos." />;
return <Table ... />;
```

### Frontend (current production)
- **Components:** PascalCase filenames matching component names
- **Services:** `services/` folder, camelCase + "Service" suffix
- **Hooks:** `use` prefix, camelCase
- **Internal module** (`pages/Internal/`):
  - Generic components: `GenericTable.js`, `RecordForm.js`
  - Feature tables: `InventoryTable.js`, etc.
  - Views wrap tables: `InventoryView.js`, etc.
  - Custom hook: `useRecords.js` for CRUD operations
  - Context: `InternalContext.js` for area/entity state
  - Formatters: `recordsFormatter.js` (formatDate, formatCurrency, etc.)
- **API calls:** Always through service files, never directly in components
- **State:** Toast notifications for user feedback (react-toastify)

### Naming Conventions
- Backend: snake_case (Python), PascalCase for classes
- Frontend: PascalCase for components/files, camelCase for functions/hooks
- Database: pk (primary key), ts_ (timestamp prefix), tt_ (type prefix)
- Services in English, UI labels in Portuguese

## Deployment
- **Reverse Proxy:** Nginx (SSL/HTTPS via Let's Encrypt)
- **Backend:** eventlet on port 5000 (proxied by Nginx)
- **Frontend:** Static build served by Nginx
- **Scripts:** `Deploy/` folder (PowerShell)
- **Server path:** `D:/APP/NewAPP/`

## Integrations
- **SIBS Payments:** MBWAY, Multibanco (webhook at app.aintar.pt)
- **Email:** Office365 SMTP (Flask-Mail)
- **Real-time:** Socket.IO (notifications, chat)

## Development Commands
```bash
# Backend
cd backend && python run.py

# Frontend
cd frontend && npm start        # Dev server :3000
cd frontend && npm run build    # Production build

# Frontend-v2
cd frontend-v2 && npm run dev   # Vite dev server

# Website
cd website && npm run dev       # Vite dev server :5173
cd website && npm run build     # Production build
```

## Important Notes
- Never commit `.env` files or log files (`*.log`, `*.log.*`)
- The `.claude/` folder is local development tooling (gitignored)
- Two frontends exist: `frontend/` (production CRA) and `frontend-v2/` (Vite, in development)
- All changes should follow existing patterns - check similar modules before implementing new features
- Portuguese language for all user-facing text

---

## Knowledge Base — Obsidian Vault

> **Manter atualizado:** sempre que uma alteração de código mudar o comportamento descrito numa destas notas (novo endpoint, módulo novo, bug conhecido resolvido, decisão de arquitetura), edita a nota correspondente no mesmo momento em que editas o código. Não deixar para "depois" — o Vault fica obsoleto rapidamente se a atualização for adiada.

### Arquitectura
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Visão Geral.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Backend Flask.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Frontend v2 Vite.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Autenticação & Permissões.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Base de Dados.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Componentes Partilhados.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Guia para Novos Módulos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Sistema de Notificações.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Fluxo de Trabalho Git.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\01 - Arquitectura\Guia do Desenvolvedor.md

### Módulos
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Administração.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Dashboards.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Documentos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Frota.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Gestão (ETARs).md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Interno.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Operação.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Pagamentos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Portal Cliente.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Recursos Humanos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\02 - Módulos\Website Público.md

### Integrações
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\03 - Integrações\Email Office365.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\03 - Integrações\SIBS Pagamentos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\03 - Integrações\Socket.IO.md

### Backlog & Roadmap
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\08 - Backlog & Roadmap\Roadmap.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\08 - Backlog & Roadmap\Endpoints em Falta.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\08 - Backlog & Roadmap\Melhorias Pendentes.md

### Bugs & Soluções Conhecidas
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\Padrões de Erro.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\Segredo SIBS Exposto no Histórico Git.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\AnimatePresence Race Condition.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\Double Unwrap API Response.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\MUI Grid v7 Syntax.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\PermissionContext Race Condition.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\07 - Bugs & Soluções\Session Pool Checkout BD.md

### API Reference
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Auth.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Dashboards & Admin.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Documentos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Frota.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Gestão ETARs.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Interno.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Operação.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Pagamentos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Portal Cliente.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Recursos Humanos.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\10 - API Reference\Telemetria.md

### Socket.IO
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\11 - Socket.IO\Socket.IO — Referência Completa.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\11 - Socket.IO\Hooks Universais.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\11 - Socket.IO\Componentes Universais.md

### Infraestrutura IT
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\12 - Infraestrutura IT\FileServer.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\12 - Infraestrutura IT\Active Directory.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\12 - Infraestrutura IT\Departamentos e Funcionários.md
@C:\Users\rui.ramos\OneDrive - AINTAR\Documentos\Obsidian Vault\12 - Infraestrutura IT\Guia de Administração.md

---

## Slash Commands Disponíveis

Usa sempre o comando mais adequado à tarefa. Todos estão em `.claude/commands/`.

### Desenvolvimento
| Comando | Quando usar |
|---------|-------------|
| `/feature` | Criar uma feature nova completa (backend + frontend em simultâneo) |
| `/route` | Adicionar apenas uma rota Flask + service layer |
| `/component` | Criar apenas um componente React (frontend-v2) |
| `/migration` | Criar script SQL de migração (`backend/sql/`, padrão tb_/vbl_/vbf_/fbf_) |
| `/test` | Gerar testes pytest (backend) ou vitest (frontend) |

### Qualidade & Revisão
| Comando | Quando usar |
|---------|-------------|
| `/review-aintar` | Code review com padrões específicos AINTAR (complementa o `/code-review` built-in) |
| `/simplify` | Rever código alterado para remover duplicação e melhorar qualidade |
| `/perf` | Auditar performance (N+1, re-renders, bundle, queries sem índice) |
| `/security-review` | Antes de qualquer PR com auth, pagamentos ou dados sensíveis |
| `/debug` | Diagnosticar um bug de forma sistemática (root cause analysis) |

### Design
| Comando | Quando usar |
|---------|-------------|
| `/design` | Desenhar um ecrã: layout, UX, estados, componentes MUI, código |

### Workflow Git & Deploy
| Comando | Quando usar |
|---------|-------------|
| `/commit` | Criar commit conventional em pt-PT |
| `/hotfix` | Emergência em produção — processo completo de triagem e fix |
| `/deploy` | Preparar e executar deploy para produção |
| `/changelog` | Gerar CHANGELOG.md semântico entre versões |

### Documentação
| Comando | Quando usar |
|---------|-------------|
| `/openapi` | Gerar spec OpenAPI 3.0 a partir de rotas Flask |
| `/standards` | Consultar os princípios de desenvolvimento AINTAR |
| `/procedimento` | Gerar procedimento formal (ISO 27001-like) no Vault `14 - Procedimentos/` — RACI, riscos/controlos, evidências |
| `/aprender` | Capitalizar conhecimento novo no lugar canónico certo (CLAUDE.md, skill, Vault ou memória) — com verificação de contradições |

### Segurança & Conformidade
| Comando | Quando usar |
|---------|-------------|
| `/rgpd` | Privacy-by-design de features, pedidos de titulares (acesso/apagamento), violação de dados (72h CNPD), registo art. 30.º |
| `/incident` | Incidente de segurança (≠ bug): conter, preservar evidência, rodar segredos, relatório. Se envolver dados pessoais, corre em paralelo com `/rgpd violacao` |
| `/audit-perms` | Auditoria RBAC: endpoints desprotegidos + permissões fantasma/órfãs vs `ts_interface` (script read-only em `.claude/scripts/audit_perms.py`; cadência mensal) |
| `/infra` | Runbook do parque: serviços Windows Server, backups (BD + ficheiros), certificados Let's Encrypt, patching mensal, saúde dos sistemas, AD/FileServer |

> Documentação RGPD e de segurança vive no Vault em `13 - RGPD & Segurança/` (registo art. 30.º, registo de violações, pedidos de titulares, auditorias RBAC) e os procedimentos formais em `14 - Procedimentos/` (índice PR-NNN) — não são @-importados para não carregar contexto legal/processual em todas as sessões.
