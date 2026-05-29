# DYNAMO — Blueprint de Implementação

> Motor de aplicação config-driven: define uma entidade num ficheiro, ganha CRUD completo com relações, pesquisa, paginação, formulários validados e guard de permissões — automaticamente.

---

## 1. Visão & Princípios

| Princípio | Descrição |
|---|---|
| **Config é a verdade** | Tudo — rotas, tabelas, formulários, permissões — deriva do config. Nunca há lógica hardcoded nos componentes do engine. |
| **1 ficheiro por entidade** | Cada entidade vive no seu próprio ficheiro. `app.config.js` apenas os agrega. |
| **Relações de 1ª classe** | Relações `1:1`, `1:N` são declaradas no config e o engine gera automaticamente os endpoints e as tabs de detalhe. |
| **Escape hatch explícito** | Quando o gerado não chega, `custom:` aponta para um componente que substitui completamente o gerado. Sem hacks. |
| **Resposta uniforme** | O backend devolve sempre `{ data, total, page, per_page }` — sem surpresas no frontend. |
| **Permissões por string** | Strings de `ts_interface` (ex: `etar.view`, `letters.edit`). Nunca IDs numéricos. |

---

## 2. Stack Tecnológico

### Backend
| Tech | Versão | Motivo |
|---|---|---|
| Python | 3.12+ | Tipagem moderna, async nativo |
| FastAPI | 0.115+ | Auto-docs OpenAPI, async, Pydantic v2 |
| SQLAlchemy Core | 2.0+ | Queries dinâmicas seguras sem ORM duplicado |
| asyncpg | 0.29+ | Driver PostgreSQL async de alta performance |
| python-jose | 3.3+ | Verificação JWT (mesmo secret do Flask) |
| pydantic-settings | 2.0+ | Config de ambiente tipada |

### Frontend
| Tech | Versão | Motivo |
|---|---|---|
| React | 19 | Concurrent features, Server Components ready |
| Vite | 7 | Build sub-segundo, HMR instantâneo |
| Tailwind CSS | 4 | Utility-first, zero runtime CSS |
| TanStack Table | 8 | Headless — colunas 100% geradas por config |
| TanStack Query | 5 | Cache de server state, invalidação automática |
| React Hook Form | 7 | Performance, integração Zod |
| Zod | 3 | Schema derivado dos `fields` do config |
| Zustand | 5 | UI state (modais, filtros, selecções) |
| Lucide React | latest | Ícones por nome de string no config |
| Radix UI | latest | Primitivos acessíveis (Select, Dialog, Tabs) |
| Sonner | 1 | Toasts |
| date-fns | 3 | Formatação de datas |

---

## 3. Estrutura de Pastas

```
dynamo/
├── BLUEPRINT.md              ← este ficheiro
│
├── backend/
│   ├── main.py               ← FastAPI app, CORS, startup
│   ├── config.py             ← Settings (DB URL, JWT secret)
│   ├── database.py           ← SQLAlchemy async engine + sessão
│   ├── auth.py               ← Verificação JWT (compatível com Flask)
│   ├── engine/
│   │   ├── loader.py         ← Carrega e valida configs de entidade
│   │   ├── query_builder.py  ← Constrói SQL dinâmico (seguro, bound params)
│   │   ├── router_factory.py ← Gera APIRouter FastAPI por entidade
│   │   └── schema_factory.py ← Gera schemas Pydantic por entidade
│   ├── entities/
│   │   ├── instalacao.py
│   │   ├── equipamento.py
│   │   └── offices.py
│   ├── app_config.py         ← Config mestre (agrega entidades + módulos)
│   └── requirements.txt
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles/
        │   └── globals.css
        ├── config/
        │   ├── app.config.js         ← Config mestre frontend
        │   └── entities/
        │       ├── instalacao.js
        │       ├── equipamento.js
        │       └── offices.js
        ├── engine/                   ← O motor — nunca editar por feature
        │   ├── index.js
        │   ├── DynamicRouter.jsx     ← Gera routes do config
        │   ├── DynamicPage.jsx       ← Lista: tabela + pesquisa + paginação
        │   ├── DynamicTable.jsx      ← TanStack Table por config
        │   ├── DynamicForm.jsx       ← RHF + Zod por config
        │   ├── DynamicDetail.jsx     ← Detalhe: form + tabs de relações
        │   ├── FieldRenderer.jsx     ← Renderiza campo por type
        │   ├── RelationTab.jsx       ← Tab hasMany como sub-tabela
        │   └── zodSchemaBuilder.js   ← Deriva schema Zod dos fields
        ├── core/
        │   ├── api/
        │   │   ├── client.js         ← Axios + interceptors JWT
        │   │   └── dynamo.api.js     ← CRUD genérico
        │   ├── auth/
        │   │   ├── AuthContext.jsx
        │   │   └── useAuth.js
        │   ├── meta/
        │   │   ├── MetaContext.jsx   ← Cache global de lookups
        │   │   └── useMeta.js
        │   ├── store/
        │   │   └── uiStore.js        ← Zustand: modais, filtros
        │   └── providers/
        │       └── AppProviders.jsx
        ├── layouts/
        │   ├── AppLayout.jsx
        │   ├── Sidebar.jsx           ← Gerado a partir de modules config
        │   └── TopBar.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   └── HomePage.jsx
        ├── shared/
        │   └── ui/                   ← Primitivos UI (Button, Input, etc.)
        │       ├── Button.jsx
        │       ├── Input.jsx
        │       ├── Select.jsx
        │       ├── Modal.jsx
        │       ├── Badge.jsx
        │       ├── Spinner.jsx
        │       ├── EmptyState.jsx
        │       ├── SearchBar.jsx
        │       └── Pagination.jsx
        └── custom/                   ← Escape hatch: componentes custom
            └── .gitkeep
```

---

## 4. DSL — Especificação Completa

### 4.1 Ficheiro de Entidade

```js
export default {
  // ── Identidade ──────────────────────────────────────────────────────────
  key:         'offices',        // slug único — usado em URL e API
  label:       'Ofício',         // singular, para títulos
  labelPlural: 'Ofícios',        // plural, para listas
  icon:        'Mail',           // nome de ícone Lucide

  // ── Base de Dados ────────────────────────────────────────────────────────
  db: {
    readView:  'vbl_letter',     // view de leitura (SELECT)
    writeView: 'vbf_letter',     // view/tabela de escrita (INSERT/UPDATE)
    pkField:   'pk',             // campo primary key
  },

  // ── Permissões ───────────────────────────────────────────────────────────
  permissions: {
    view: 'letters.view',        // string de ts_interface
    edit: 'letters.edit',
  },

  // ── Campos ───────────────────────────────────────────────────────────────
  fields: [
    // type: 'id'       → PK, nunca editável
    // type: 'text'     → input texto
    // type: 'textarea' → textarea
    // type: 'number'   → input numérico
    // type: 'boolean'  → checkbox/toggle
    // type: 'date'     → date picker
    // type: 'datetime' → datetime picker
    // type: 'select'   → dropdown de metadata
    // type: 'relation' → FK para outra entidade

    { key: 'pk',          label: 'ID',          type: 'id'                             },
    { key: 'regnumber',   label: 'Nº Registo',  type: 'text',   readonly: true         },
    { key: 'subject',     label: 'Assunto',     type: 'text',   required: true         },
    {
      key:   'ts_letterstatus',
      label: 'Estado',
      type:  'select',
      meta:  'letterstatus',     // chave no response de GET /meta
    },
    {
      key:      'tb_parent',
      label:    'Entidade Mãe',
      type:     'relation',
      relation: {
        type:         'belongsTo',   // este registo pertence a outro
        entity:       'entities',    // key da entidade referenciada
        displayField: 'name',        // campo a mostrar no dropdown
      },
    },
    { key: 'emission_date', label: 'Data Emissão', type: 'date' },
  ],

  // ── Relações ─────────────────────────────────────────────────────────────
  relations: {
    attachments: {
      type:       'hasMany',     // esta entidade tem muitos filhos
      entity:     'attachment',  // key da entidade filho
      foreignKey: 'tb_letter',   // campo no filho que aponta para este pai
      label:      'Anexos',
      icon:       'Paperclip',
    },
  },

  // ── Vistas ───────────────────────────────────────────────────────────────
  listView: {
    columns:     ['regnumber', 'subject', 'ts_letterstatus', 'emission_date'],
    defaultSort: { field: 'emission_date', dir: 'desc' },
    searchable:  true,
  },

  formView: {
    sections: [
      {
        title:  'Dados Gerais',
        fields: ['subject', 'ts_letterstatus', 'emission_date'],
        cols:   2,               // colunas no grid (1–4)
      },
    ],
  },

  detailView: {
    tabs: [
      { label: 'Anexos', relation: 'attachments', icon: 'Paperclip' },
    ],
  },

  // ── Escape Hatch ─────────────────────────────────────────────────────────
  // null       → gerado automaticamente
  // './custom/OfficesPage.jsx' → usa este componente em vez do gerado
  custom: null,
}
```

### 4.2 Config Mestre

```js
// config/app.config.js
import offices     from './entities/offices.js'
import instalacao  from './entities/instalacao.js'
import equipamento from './entities/equipamento.js'

export default {
  app: {
    name:    'AINTAR',
    apiBase: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  },

  modules: [
    {
      id:         'gestao',
      label:      'Gestão',
      icon:       'Building2',
      color:      '#10b981',
      permission: 'etar.view',
      entities:   ['instalacao', 'equipamento'],
    },
    {
      id:         'interno',
      label:      'Interno',
      icon:       'Briefcase',
      color:      '#64748b',
      permission: 'intern.access',
      entities:   ['offices'],
    },
  ],

  entities: { offices, instalacao, equipamento },
}
```

---

## 5. API Gerada (Backend)

Para cada entidade, o `router_factory.py` gera automaticamente:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/{entity}` | Lista paginada com search + sort |
| `GET` | `/api/{entity}/{pk}` | Registo único |
| `POST` | `/api/{entity}` | Criar registo |
| `PUT` | `/api/{entity}/{pk}` | Actualizar registo |
| `DELETE` | `/api/{entity}/{pk}` | Eliminar registo |
| `GET` | `/api/{entity}/{pk}/{relation}` | Lista de filhos (hasMany) |
| `GET` | `/api/meta` | Todos os lookups/metadados |
| `GET` | `/api/schema/{entity}` | Schema da entidade (para debug) |

**Response uniforme (lista):**
```json
{
  "data":     [...],
  "total":    100,
  "page":     1,
  "per_page": 25,
  "pages":    4
}
```

**Query params aceites:**
```
?search=texto     → ILIKE em campos text
?page=1           → página (default 1)
?per_page=25      → tamanho (max 200)
?sort=name        → campo de ordenação
?dir=asc|desc     → direcção (default asc)
```

---

## 6. Fluxo de Renderização (Frontend)

```
app.config.js
     │
     ▼
DynamicRouter ──── gera <Route> por entidade de cada módulo
     │
     ▼
DynamicPage  ──── listView config
  ├── SearchBar
  ├── DynamicTable ─── TanStack Table, colunas de listView.columns
  │     └── FieldRenderer (por célula)
  └── Pagination
     │
     ▼ (click em linha ou botão "Novo")
     │
DynamicDetail / DynamicForm ──── formView config
  ├── Secções com grid de campos
  ├── FieldRenderer (por campo)
  │   ├── type=text      → <Input />
  │   ├── type=select    → <Select /> com options de MetaContext
  │   ├── type=relation  → <Select /> com fetch da entidade pai
  │   ├── type=date      → <Input type="date" />
  │   └── type=boolean   → <Checkbox />
  └── Tabs de relações (detailView.tabs)
        └── RelationTab → DynamicTable filtrado por FK
```

---

## 7. Como Adicionar uma Nova Entidade

**3 passos, sem tocar no engine:**

```bash
# 1. Criar ficheiro de config
touch frontend/src/config/entities/nova_entidade.js
touch backend/entities/nova_entidade.py

# 2. Definir o config (copiar de um existente e adaptar)
# 3. Registar no config mestre
```

```js
// frontend/src/config/app.config.js
import novaEntidade from './entities/nova_entidade.js'

export default {
  // ...
  entities: { ..., novaEntidade },
  modules: [
    { ..., entities: [..., 'novaEntidade'] }
  ]
}
```

```python
# backend/app_config.py
from entities.nova_entidade import ENTITY as nova_entidade
APP_CONFIG = {
    "entities": { ..., "nova_entidade": nova_entidade }
}
```

**Resultado:** Rota nova, tabela, formulário, guards de permissão — tudo funcional.

---

## 8. Tipos de Campo — Referência

| type | DB type | Componente | Validação Zod |
|---|---|---|---|
| `id` | int | — (readonly) | `z.number()` |
| `text` | varchar/text | `<Input>` | `z.string()` |
| `textarea` | text | `<Textarea>` | `z.string()` |
| `number` | int/float | `<Input type="number">` | `z.number()` |
| `boolean` | bool | `<Checkbox>` | `z.boolean()` |
| `date` | date | `<Input type="date">` | `z.string()` |
| `datetime` | timestamp | `<Input type="datetime-local">` | `z.string()` |
| `select` | int (FK meta) | `<Select>` via MetaContext | `z.number()` |
| `relation` | int (FK entity) | `<Select>` via API | `z.number()` |

---

## 9. Tipos de Relação — Referência

| type | Direcção | Efeito no engine |
|---|---|---|
| `hasMany` | Pai → Filhos | Tab no detalhe do pai; endpoint `GET /api/{pai}/{pk}/{relação}` |
| `belongsTo` | Filho → Pai | Campo FK renderizado como dropdown do pai |

---

## 10. Escape Hatch — Componente Custom

Quando o gerado não é suficiente (workflow complexo, kanban, assinatura):

```js
// config/entities/documents.js
export default {
  key: 'documents',
  // ... config normal para o engine backend (endpoints ainda gerados)

  // Frontend: usar componente custom em vez do gerado
  custom: () => import('../../custom/DocumentsPage.jsx'),
}
```

O `DynamicRouter` faz lazy-load do componente se `custom !== null`. O backend continua a gerar os endpoints — só o frontend é substituído.

---

## 11. Autenticação

- Backend gera `/auth/login` (POST) — verifica `ts_user` + `ts_password` na BD
- JWT assinado com o mesmo `JWT_SECRET` do Flask → tokens interoperáveis
- Frontend guarda `access_token` em memória (não localStorage) — segurança XSS
- `refresh_token` em httpOnly cookie
- `AuthContext` expõe `user`, `permissions[]`, `login()`, `logout()`
- `PermissionGuard` wraps cada rota — lê `entity.permissions.view`

---

## 12. Variáveis de Ambiente

**Backend `.env`:**
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aintar
JWT_SECRET=mesmo_secret_do_flask
JWT_ALGORITHM=HS256
CORS_ORIGINS=http://localhost:5173
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:8000
```
