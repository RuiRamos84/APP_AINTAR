# Spec — Módulo RH Pessoal + Registo de Ponto

**Data:** 2026-04-26
**Estado:** Aprovado — pronto para implementação
**Módulo:** Recursos Humanos (`/rh/pessoal/*`)

---

## 1. Contexto e Objectivo

A AINTAR tem 45 colaboradores: 15 na sede e 30 no terreno (em pares, com supervisor sempre presente). Actualmente o controlo de assiduidade é feito em papel — folha mensal com 4 momentos do dia, validada pelo superior e entregue ao RH. O módulo RH Pessoal substitui este processo integralmente e acrescenta gestão de férias, faltas, horários e piquete.

### O que existe hoje
- **EPI** — totalmente implementado (frontend + backend)
- **AVAL** — totalmente implementado (frontend + backend)
- **RH Pessoal** — 4 páginas placeholder `ComingSoon` sem qualquer backend

### O que vamos construir
6 serviços novos integrados no módulo RH existente, com BD de raiz seguindo os padrões `tb_`, `ts_`, `tt_`, `vbl_`, `vbf_`, `fbo_`, `fn_`.

---

## 2. Estrutura de Navegação — H3 (Overview + Páginas com Mini-Dashboard)

Cada serviço tem página própria com URL independente. A página de entrada (`/rh/pessoal`) é um dashboard de visão geral. Cada página de serviço começa com um mini-dashboard contextual antes da tabela/lista detalhada.

| Rota | Página | Descrição |
|---|---|---|
| `/rh/pessoal` | `RhOverviewPage` | Dashboard: 5 cards resumo (Ponto, Férias, Faltas, Horário, Piquete) + info pessoal |
| `/rh/pessoal/ponto` | `PontoPage` | Registo diário de ponto + mapa mensal + validação |
| `/rh/pessoal/ferias` | `FeriasPage` | Pedidos de férias + saldo + calendário + workflow |
| `/rh/pessoal/faltas` | `FaltasPage` | Registo de faltas + upload justificativo + workflow |
| `/rh/pessoal/horarios` | `HorariosPage` | Horário fixo do colaborador + histórico |
| `/rh/pessoal/piquete` | `PiquetePage` | Escala semanal + ocorrências + confirmação |

---

## 3. Perfis e Permissões

### 3.1 Níveis de Acesso

| Nível | Descrição |
|---|---|
| **Colaborador** | Vê e age apenas nos seus próprios dados |
| **Superior / Chefe de Equipa** | Vê e valida a sua equipa (1ª fase aprovação) |
| **Admin RH** | Gestão total: aprovação final, configurações, saldos, relatórios |
| **Admin Sistema** | Acesso total via `admin.users` |

### 3.2 Permissões Granulares (strings para `ts_interface`)

```
rh.view                  — porta de entrada ao módulo
rh.ponto.view            — ver registos próprios
rh.ponto.create          — registar entrada/saída
rh.ponto.validate        — validar registos da equipa (Superior)
rh.ponto.approve         — aprovação final mapa mensal (Admin RH)
rh.ponto.manage          — gerir configurações de jornada (Admin RH)
rh.ferias.view           — ver férias próprias
rh.ferias.create         — pedir férias
rh.ferias.validate       — validar pedidos da equipa (Superior)
rh.ferias.approve        — aprovação final (Admin RH)
rh.ferias.manage         — gerir saldos e configurações (Admin RH)
rh.faltas.view           — ver faltas próprias
rh.faltas.create         — comunicar falta
rh.faltas.validate       — validar faltas da equipa (Superior)
rh.faltas.approve        — aprovação final (Admin RH)
rh.horario.view          — ver horário próprio
rh.horario.manage        — gerir horários de todos (Admin RH)
rh.piquete.view          — ver escala própria
rh.piquete.confirm       — confirmar conhecimento do piquete
rh.piquete.create        — criar/editar escala (Superior + Admin RH)
rh.piquete.manage        — configurar regras e gerar escala (Admin RH)
rh.equipa.view           — ver dados da equipa (Superior + Admin RH)
rh.all.view              — ver todos os colaboradores (Admin RH)
rh.config.manage         — configurações gerais RH (Admin RH)
```

---

## 4. Base de Dados

### 4.1 Lookups (tt_)

```sql
tt_rh_tipo_jornada       — Partida (1), Contínua (2)
tt_rh_tipo_ferias        — Férias (1), Tolerância Ponto (2), Aniversário (3)
tt_rh_tipo_falta         — Justificada (1), Injustificada (2), Tolerância Ponto (3), Licença (4)
tt_rh_estado_workflow    — Pendente (1), Validado Superior (2), Aprovado RH (3), Rejeitado (4)
tt_rh_ponto_evento       — Entrada (1), Início Almoço (2), Fim Almoço (3), Saída (4)
tt_rh_piquete_ocorrencia — Chamada (1), Intervenção (2), Equipa Accionada (3), Outro (4)
```

### 4.2 Tabelas de Configuração (ts_)

```sql
-- Configuração anual por colaborador
ts_rh_config (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,          -- FK → ts_client
  ano                   INT NOT NULL,
  dias_ferias_total     INT NOT NULL DEFAULT 22,
  dias_ferias_gozados   INT NOT NULL DEFAULT 0,
  notas                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(tb_user_fk, ano)
)

-- Horário fixo por colaborador
ts_rh_horario (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,
  descr                 VARCHAR(100) NOT NULL,
  tt_jornada_fk         INT NOT NULL,          -- FK → tt_rh_tipo_jornada
  hora_entrada          TIME NOT NULL,
  hora_saida            TIME NOT NULL,
  hora_inicio_almoco    TIME,                  -- NULL se jornada contínua
  hora_fim_almoco       TIME,                  -- NULL se jornada contínua
  dias_semana           INT[] NOT NULL,        -- [1,2,3,4,5] = seg-sex
  data_inicio           DATE NOT NULL,
  data_fim              DATE,                  -- NULL = indefinido
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Feriados nacionais portugueses (pré-carregado)
ts_feriados (
  pk                    SERIAL PRIMARY KEY,
  data                  DATE NOT NULL UNIQUE,
  descr                 VARCHAR(100) NOT NULL,
  nacional              BOOLEAN DEFAULT TRUE,
  regiao                VARCHAR(50)            -- para feriados regionais
)
```

### 4.3 Tabelas de Transacção (tb_)

```sql
-- Registo diário de ponto
tb_rh_ponto (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,
  data                  DATE NOT NULL,
  tt_evento_fk          INT NOT NULL,          -- FK → tt_rh_ponto_evento
  ts_registo            TIMESTAMP NOT NULL DEFAULT NOW(),
  latitude              DECIMAL(10,8),
  longitude             DECIMAL(11,8),
  precisao_metros       INT,
  fonte                 VARCHAR(20) DEFAULT 'app',  -- 'app', 'manual', 'correcao'
  notas                 TEXT,
  UNIQUE(tb_user_fk, data, tt_evento_fk)
)

-- Mapa mensal (agrupa registos do mês para workflow de aprovação)
tb_rh_ponto_mensal (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,
  ano                   INT NOT NULL,
  mes                   INT NOT NULL,          -- 1-12
  ts_estado_fk          INT NOT NULL DEFAULT 1, -- FK → tt_rh_estado_workflow
  total_horas           DECIMAL(5,2),          -- calculado ao submeter
  total_dias            INT,
  submetido_em          TIMESTAMP,
  notas_colaborador     TEXT,
  UNIQUE(tb_user_fk, ano, mes)
)

-- Pedidos de férias / tolerâncias
tb_rh_ferias (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,
  tt_tipo_fk            INT NOT NULL,          -- FK → tt_rh_tipo_ferias
  data_inicio           DATE NOT NULL,
  data_fim              DATE NOT NULL,
  dias_uteis            INT NOT NULL,          -- calculado por fn_rh_dias_uteis
  ts_estado_fk          INT NOT NULL DEFAULT 1,
  notas                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Registos de faltas
tb_rh_faltas (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,
  tt_tipo_falta_fk      INT NOT NULL,          -- FK → tt_rh_tipo_falta
  data                  DATE NOT NULL,
  ts_estado_fk          INT NOT NULL DEFAULT 1,
  justificativo_path    VARCHAR(500),
  notas                 TEXT,
  comunicado_por        INT,                   -- FK → ts_client (pode ser superior)
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Escala semanal de piquete
tb_rh_piquete_escala (
  pk                    SERIAL PRIMARY KEY,
  tb_user_fk            INT NOT NULL,
  data_inicio           DATE NOT NULL,         -- segunda-feira da semana
  data_fim              DATE NOT NULL,         -- domingo da semana
  confirmado            BOOLEAN DEFAULT FALSE,
  ts_confirmacao        TIMESTAMP,
  ts_estado_fk          INT NOT NULL DEFAULT 1,
  gerado_auto           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(tb_user_fk, data_inicio)
)

-- Ocorrências durante piquete
tb_rh_piquete_ocorrencia (
  pk                    SERIAL PRIMARY KEY,
  tb_piquete_escala_fk  INT NOT NULL,          -- FK → tb_rh_piquete_escala
  tt_tipo_fk            INT NOT NULL,          -- FK → tt_rh_piquete_ocorrencia
  descr                 TEXT NOT NULL,
  equipas_accionadas    VARCHAR(500),
  evidencia_path        VARCHAR(500),
  created_by            INT NOT NULL,          -- FK → ts_client
  created_at            TIMESTAMP DEFAULT NOW()
)
```

### 4.4 Tabelas de Workflow (tb_)

```sql
-- Workflow partilhado para ponto mensal, férias e faltas
tb_rh_workflow (
  pk                    SERIAL PRIMARY KEY,
  tipo_ref              VARCHAR(20) NOT NULL,  -- 'ponto', 'ferias', 'faltas'
  ref_pk                INT NOT NULL,          -- FK para a tabela respectiva
  step                  INT NOT NULL,          -- 1=Superior, 2=Admin RH
  tb_user_fk            INT NOT NULL,          -- quem actuou
  ts_estado_fk          INT NOT NULL,          -- estado após esta acção
  notas                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
)
```

### 4.5 Regras de Geração de Piquete (ts_)

```sql
ts_rh_piquete_regras (
  pk                    SERIAL PRIMARY KEY,
  codigo                VARCHAR(50) NOT NULL UNIQUE,
  descr                 VARCHAR(200) NOT NULL,
  valor                 VARCHAR(100),          -- ex: '2' para semanas mínimas de intervalo
  ativo                 BOOLEAN DEFAULT TRUE
)
-- Regras pré-carregadas:
-- 'sem_ferias'          — colaborador com férias aprovadas não pode ser escalado
-- 'sem_consecutivas'    — mínimo N semanas de intervalo entre piquetes
-- 'sem_baixa'           — colaborador com baixa activa excluído
-- 'cargo_minimo'        — cargos mínimos representados por semana
-- 'sem_falta_prev'      — colaborador com falta prevista na semana excluído
```

### 4.6 Views de Leitura (vbl_)

```sql
vbl_rh_colaborador       -- ts_client + ts_rh_config (ano actual) + ts_rh_horario activo
vbl_rh_ponto             -- tb_rh_ponto + user info + evento texto + horas calculadas
vbl_rh_ponto_mensal      -- tb_rh_ponto_mensal + user info + estado texto + horas totais
vbl_rh_ferias            -- tb_rh_ferias + user info + tipo texto + estado texto + dias
vbl_rh_faltas            -- tb_rh_faltas + user info + tipo texto + estado texto
vbl_rh_horario           -- ts_rh_horario + user info + jornada texto
vbl_rh_piquete           -- tb_rh_piquete_escala + user info + confirmação + estado
vbl_rh_piquete_ocorrencias -- tb_rh_piquete_ocorrencia + escala info + user info
vbl_rh_saldo_ferias      -- saldo anual calculado: total - gozados - pendentes aprovação
```

### 4.7 Funções (fbo_ / fn_)

```sql
-- Utilitário: conta dias úteis entre datas, excluindo fins-de-semana e feriados PT
fn_rh_dias_uteis(p_inicio DATE, p_fim DATE) RETURNS INT

-- Ponto
fbo_rh_ponto_evento(
  p_user_fk INT, p_tt_evento_fk INT,
  p_latitude DECIMAL, p_longitude DECIMAL, p_precisao INT,
  p_notas TEXT
) RETURNS INT  -- pk do registo criado

fbo_rh_ponto_submeter(p_user_fk INT, p_ano INT, p_mes INT) RETURNS VOID
fbo_rh_ponto_corrigir(p_pk INT, p_ts_registo TIMESTAMP, p_notas TEXT) RETURNS VOID

-- Workflow genérico (ponto/férias/faltas)
fbo_rh_workflow(
  p_tipo_ref VARCHAR, p_ref_pk INT,
  p_step INT, p_user_fk INT,
  p_ts_estado_fk INT, p_notas TEXT
) RETURNS VOID
-- Ao aprovar férias: debita automaticamente de ts_rh_config.dias_ferias_gozados

-- Férias
fbo_rh_ferias(
  p_op INT,  -- 0=INSERT, 1=UPDATE
  p_pk INT, p_user_fk INT, p_tt_tipo_fk INT,
  p_data_inicio DATE, p_data_fim DATE, p_notas TEXT
) RETURNS INT

-- Faltas
fbo_rh_faltas(
  p_op INT, p_pk INT, p_user_fk INT, p_tt_tipo_falta_fk INT,
  p_data DATE, p_justificativo_path VARCHAR, p_notas TEXT, p_comunicado_por INT
) RETURNS INT

-- Horário
fbo_rh_horario(
  p_op INT, p_pk INT, p_user_fk INT,
  p_descr VARCHAR, p_tt_jornada_fk INT,
  p_hora_entrada TIME, p_hora_saida TIME,
  p_hora_inicio_almoco TIME, p_hora_fim_almoco TIME,
  p_dias_semana INT[], p_data_inicio DATE, p_data_fim DATE
) RETURNS INT

-- Piquete
fbo_rh_piquete_generate(p_ano INT, p_mes INT) RETURNS VOID
-- Aplica todas as regras activas de ts_rh_piquete_regras
-- Distribui equitativamente pelos colaboradores elegíveis
-- Garante representação de cargos mínimos

fbo_rh_piquete_confirmar(p_pk INT, p_user_fk INT) RETURNS VOID

fbo_rh_piquete_ocorrencia(
  p_op INT, p_pk INT, p_tb_escala_fk INT,
  p_tt_tipo_fk INT, p_descr TEXT,
  p_equipas_accionadas VARCHAR, p_evidencia_path VARCHAR,
  p_created_by INT
) RETURNS INT

-- Configuração
fbo_rh_config_upsert(p_user_fk INT, p_ano INT, p_dias_total INT) RETURNS VOID
fbo_rh_piquete_regra_toggle(p_pk INT, p_ativo BOOLEAN) RETURNS VOID
```

---

## 5. Fluxos de Aprovação

### 5.1 Registo de Ponto (mensal)
```
Colaborador regista diariamente (4 ou 2 eventos conforme jornada)
    ↓
Fim do mês: colaborador submete mapa → estado: Pendente
    ↓
Superior revê e valida → estado: Validado Superior
    ↓
Admin RH aprova → estado: Aprovado RH → arquivo digital
```

**Nota:** Se colaborador não submete até dia X do mês seguinte, Superior ou Admin RH podem submeter por ele.

### 5.2 Férias
```
Colaborador pede (data_inicio, data_fim, tipo)
    → fn_rh_dias_uteis calcula dias úteis automaticamente
    → verifica saldo disponível
    ↓
Superior valida → estado: Validado Superior
    ↓
Admin RH aprova → estado: Aprovado RH
    → ts_rh_config.dias_ferias_gozados debitado automaticamente
    → notificação ao colaborador
```

### 5.3 Faltas
```
Colaborador OU Superior comunica falta (data, tipo)
    ↓
Colaborador faz upload do justificativo (se aplicável)
    ↓
Superior valida → estado: Validado Superior
    ↓
Admin RH aprova → estado: Aprovado RH
```

### 5.4 Piquete (geração automática)
```
Admin RH define/confirma regras activas em ts_rh_piquete_regras
    ↓
Admin RH acciona fbo_rh_piquete_generate(ano, mes)
    → exclui colaboradores com férias aprovadas
    → exclui colaboradores com baixa activa
    → respeita intervalo mínimo entre piquetes
    → garante cargos mínimos representados
    → distribui equitativamente
    ↓
Escala publicada → notificação a todos os escalados
    ↓
Cada colaborador confirma conhecimento (fbo_rh_piquete_confirmar)
    ↓
Durante piquete: colaborador/supervisor regista ocorrências
```

---

## 6. Lógica de Registo de Ponto

### 6.1 Tipos de Jornada

| Tipo | Eventos obrigatórios | Quem tem |
|---|---|---|
| **Jornada Partida** | Entrada + Início Almoço + Fim Almoço + Saída | Sede + alguns terreno |
| **Jornada Contínua** | Entrada + Saída | Maioria terreno |

O tipo é definido em `ts_rh_horario.tt_jornada_fk` e editável pelo Admin RH.

### 6.2 GPS
- Capturado em **todos os eventos** para **todos os trabalhadores**
- GPS é **opcional** tecnicamente (pode estar desactivado/sem sinal) — registo é aceite sem coordenadas mas fica marcado como `sem_gps`
- Admin RH vê localização em todos os registos
- Para trabalhadores de terreno é especialmente relevante para verificar início/fim em local de obra

### 6.3 Validações automáticas
- Não pode registar "Fim Almoço" sem "Início Almoço" (para jornada partida)
- Não pode registar "Saída" sem "Entrada"
- Não pode registar dois eventos iguais no mesmo dia
- Se colaborador tem férias aprovadas nessa data → alerta (registo ainda permitido)
- Horas calculadas automaticamente ao submeter mapa mensal

---

## 7. Frontend

### 7.1 Estrutura de Ficheiros

```
frontend-v2/src/features/rh/
├── pages/
│   ├── RhOverviewPage.jsx          /rh/pessoal
│   ├── PontoPage.jsx               /rh/pessoal/ponto
│   ├── FeriasPage.jsx              /rh/pessoal/ferias
│   ├── FaltasPage.jsx              /rh/pessoal/faltas
│   ├── HorariosPage.jsx            /rh/pessoal/horarios
│   └── PiquetePage.jsx             /rh/pessoal/piquete
├── components/
│   ├── overview/
│   │   ├── RhOverviewDashboard.jsx  5 cards: Ponto, Férias, Faltas, Horário, Piquete
│   │   └── RhStatCard.jsx           card reutilizável
│   ├── ponto/
│   │   ├── PontoStats.jsx           mini-dashboard: horas mês, dias registados
│   │   ├── PontoBotoes.jsx          botões Entrada/Almoço/Saída adaptativos
│   │   ├── PontoMapaMensal.jsx      tabela do mês com todos os registos
│   │   ├── PontoCorrecaoModal.jsx   Admin RH corrige um registo
│   │   └── PontoWorkflowBadge.jsx   estado do mapa mensal
│   ├── ferias/
│   │   ├── FeriasStats.jsx          mini-dashboard: saldo, gozados, pendentes
│   │   ├── FeriasCalendar.jsx       calendário visual do ano
│   │   ├── FeriasTable.jsx          lista de pedidos com estado
│   │   ├── FeriasFormModal.jsx      novo pedido
│   │   └── FeriasWorkflowPanel.jsx  aprovação (Superior/Admin RH)
│   ├── faltas/
│   │   ├── FaltasStats.jsx
│   │   ├── FaltasTable.jsx
│   │   ├── FaltasFormModal.jsx
│   │   └── FaltasUploadModal.jsx    upload justificativo
│   ├── horarios/
│   │   ├── HorarioCard.jsx          horário actual do colaborador
│   │   └── HorarioAdminForm.jsx     Admin RH define/edita horário
│   ├── piquete/
│   │   ├── PiqueteStats.jsx         próximo piquete, último piquete
│   │   ├── PiqueteEscalaMensal.jsx  grid semanal do mês
│   │   ├── PiqueteGenerator.jsx     UI geração automática (Admin RH)
│   │   ├── PiqueteRegras.jsx        configurar regras (Admin RH)
│   │   ├── PiqueteOcorrencias.jsx   lista ocorrências com evidências
│   │   ├── PiqueteOcorrenciaForm.jsx registar nova ocorrência
│   │   └── PiqueteConfirmModal.jsx  colaborador confirma conhecimento
│   └── shared/
│       └── WorkflowStepper.jsx      stepper reutilizável Pendente→Validado→Aprovado
├── hooks/
│   ├── useRhOverview.js
│   ├── usePonto.js
│   ├── useFerias.js
│   ├── useFaltas.js
│   ├── useHorarios.js
│   └── usePiquete.js
├── services/
│   ├── pontoService.js
│   ├── feriasService.js
│   ├── faltasService.js
│   ├── horariosService.js
│   └── piqueteService.js
└── index.js
```

### 7.2 Padrões a seguir
- **State:** React Query (TanStack) para fetch + Zustand para estado UI (como EPI)
- **Pesquisa:** `useSearch` de `@/shared/hooks` — nunca `.filter()` manual
- **Notificações:** `toast` de `sonner`
- **Formulários:** React Hook Form + Zod
- **Tabelas:** `DataTable` de `@/shared/components/data`
- **Layout:** `ModulePage` com `actions` e `search`
- **GPS:** `navigator.geolocation.getCurrentPosition()` na PWA
- **Permissões:** `usePermissionContext` → `hasPermission('rh.ponto.create')`

### 7.3 Comportamento Adaptativo por Perfil

**`PontoBotoes.jsx`** — adapta botões conforme:
- Jornada do utilizador (`ts_rh_horario.tt_jornada_fk`)
- Eventos já registados hoje
- Se colaborador tem férias aprovadas hoje → aviso mas não bloqueia

**`FeriasStats.jsx`** — mostra:
- Saldo disponível (total - gozados - pendentes)
- Barra de progresso anual
- Próximas férias aprovadas

**`PiqueteEscalaMensal.jsx`** — vistas diferentes por role:
- Colaborador: vê a sua semana em destaque
- Superior: vê a equipa toda
- Admin RH: vê todos + botão "Gerar Escala"

---

## 8. Backend (Flask)

### 8.1 Rotas a criar

```python
# rh_ponto_routes.py
GET    /rh/ponto/hoje          — eventos de hoje do utilizador
GET    /rh/ponto/mensal        — registos do mês (com filtros)
POST   /rh/ponto/evento        — registar evento (entrada/almoço/saída)
POST   /rh/ponto/submeter      — submeter mapa mensal
PUT    /rh/ponto/<pk>/corrigir — Admin RH corrige registo
GET    /rh/ponto/equipa        — registos da equipa (Superior)
POST   /rh/ponto/workflow      — validar/aprovar mapa (Superior/Admin RH)

# rh_ferias_routes.py
GET    /rh/ferias              — pedidos do utilizador (ou equipa/todos)
GET    /rh/ferias/saldo        — saldo anual
POST   /rh/ferias              — novo pedido
PUT    /rh/ferias/<pk>         — editar pedido (só Pendente)
DELETE /rh/ferias/<pk>         — cancelar pedido (só Pendente)
POST   /rh/ferias/workflow     — validar/aprovar (Superior/Admin RH)
PUT    /rh/ferias/config/<user_pk> — editar saldo anual (Admin RH)

# rh_faltas_routes.py
GET    /rh/faltas              — registos do utilizador (ou equipa/todos)
POST   /rh/faltas              — comunicar falta
PUT    /rh/faltas/<pk>/justificativo — upload justificativo
POST   /rh/faltas/workflow     — validar/aprovar
DELETE /rh/faltas/<pk>         — cancelar (só Pendente)

# rh_horarios_routes.py
GET    /rh/horarios            — horário activo do utilizador
GET    /rh/horarios/todos      — todos os horários (Admin RH)
POST   /rh/horarios            — criar horário (Admin RH)
PUT    /rh/horarios/<pk>       — actualizar horário (Admin RH)

# rh_piquete_routes.py
GET    /rh/piquete/escala      — escala do utilizador / equipa / todos
GET    /rh/piquete/ocorrencias — ocorrências do utilizador
POST   /rh/piquete/ocorrencia  — registar ocorrência
PUT    /rh/piquete/ocorrencia/<pk> — editar ocorrência
POST   /rh/piquete/<pk>/confirmar  — confirmar conhecimento
GET    /rh/piquete/regras      — listar regras (Admin RH)
PUT    /rh/piquete/regras/<pk> — activar/desactivar regra (Admin RH)
POST   /rh/piquete/generate    — gerar escala mensal (Admin RH)
```

### 8.2 Padrões a seguir
- Decorator `@require_permission('rh.ponto.create')` em todas as rotas
- Decorator `@api_error_handler` em todas as rotas
- Validação Pydantic em todos os bodies
- DB reads via `vbl_*`, writes via `fbo_*`
- `db_session_manager(current_user)` em todas as operações de escrita
- Prefixo API: `/api/v1/`
- Mensagens de erro em português

---

## 9. Routing Frontend (alterações ao routeConfig.js)

```javascript
// Substituir placeholders ComingSoon pelas rotas reais
'/rh/pessoal': {
  id: 'rh_pessoal', text: 'Gestão Pessoal',
  icon: ManageAccountsIcon, module: 'rh',
  permissions: { required: 'rh.view' },
  showInSidebar: true,
  submenu: {
    '/rh/pessoal/ponto':    { text: 'Registo de Ponto',  permissions: 'rh.ponto.view' },
    '/rh/pessoal/ferias':   { text: 'Férias',            permissions: 'rh.ferias.view' },
    '/rh/pessoal/faltas':   { text: 'Faltas',            permissions: 'rh.faltas.view' },
    '/rh/pessoal/horarios': { text: 'Horário',           permissions: 'rh.horario.view' },
    '/rh/pessoal/piquete':  { text: 'Piquete',           permissions: 'rh.piquete.view' },
  }
}
```

Adicionar ao `App.jsx`:
```jsx
<Route path="/rh/pessoal"          element={<RhOverviewPage />} />
<Route path="/rh/pessoal/ponto"    element={<PontoPage />} />
<Route path="/rh/pessoal/ferias"   element={<FeriasPage />} />
<Route path="/rh/pessoal/faltas"   element={<FaltasPage />} />
<Route path="/rh/pessoal/horarios" element={<HorariosPage />} />
<Route path="/rh/pessoal/piquete"  element={<PiquetePage />} />
```

---

## 10. Ordem de Implementação Faseada

### Fase 1 — Base de Dados (semana 1)
1. Lookups (`tt_rh_*`)
2. Tabelas de configuração (`ts_rh_config`, `ts_rh_horario`, `ts_feriados`)
3. Função utilitária `fn_rh_dias_uteis`
4. Tabela e função de ponto (`tb_rh_ponto`, `tb_rh_ponto_mensal`, `fbo_rh_ponto_evento`)
5. Tabelas de férias e workflow (`tb_rh_ferias`, `tb_rh_workflow`, `fbo_rh_workflow`)
6. Tabelas de faltas (`tb_rh_faltas`)
7. Tabelas de piquete (`tb_rh_piquete_escala`, `tb_rh_piquete_ocorrencia`, `ts_rh_piquete_regras`)
8. Todas as views `vbl_rh_*`

### Fase 2 — Backend Flask (semana 2)
1. `rh_horarios_routes.py` + `horarios_service.py` ← começa aqui (sem workflow)
2. `rh_ponto_routes.py` + `ponto_service.py` ← mais usado diariamente
3. `rh_ferias_routes.py` + `ferias_service.py`
4. `rh_faltas_routes.py` + `faltas_service.py`
5. `rh_piquete_routes.py` + `piquete_service.py` ← mais complexo, fica para o fim

### Fase 3 — Frontend (semana 3-4, serviço a serviço)
1. Routing + páginas skeleton (substituir ComingSoon)
2. `HorariosPage` + `HorarioCard` (leitura simples, sem workflow)
3. `PontoPage` + `PontoBotoes` + GPS (feature mais usada diariamente)
4. `FeriasPage` + workflow completo
5. `FaltasPage` + upload justificativo
6. `PiquetePage` + gerador automático
7. `RhOverviewPage` (dashboard final, agrega tudo)

---

## 11. Integrações com Módulos Existentes

| Integração | Descrição |
|---|---|
| **ts_client** | Fonte de dados dos colaboradores (nome, cargo, email) |
| **tb_epi** | Referência do colaborador (já existente, mesmo FK) |
| **AVAL** | Piquete e férias informam disponibilidade para avaliações |
| **Notificações Socket.IO** | Alertas de workflow (pedido aprovado/rejeitado, piquete publicado) |
| **Permissões RBAC** | Todas as permissões `rh.*` registadas em `ts_interface` |

---

## 12. Decisões em Aberto

| Questão | Decisão tomada |
|---|---|
| GPS obrigatório? | Não — opcional, registo aceite sem coordenadas |
| Jornada contínua tem almoço? | Não — apenas Entrada + Saída |
| Desconto salarial nas faltas? | Fora de scope — gerido por aplicação externa |
| Regras de piquete completas? | Parcialmente definidas — Admin RH pode afinar via `ts_rh_piquete_regras` |
| Feriados regionais? | Suportados via `ts_feriados.regiao` — a preencher conforme necessidade |
| Notificações push mobile? | Usar Socket.IO existente — PWA notifications como melhoria futura |
