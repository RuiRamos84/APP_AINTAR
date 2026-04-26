# RH Pessoal — Plano 1: Base de Dados Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar todos os objectos de base de dados (tabelas, lookups, views, funções) necessários para o módulo RH Pessoal — pré-requisito para os Planos 2, 3 e 4.

**Architecture:** PostgreSQL com stored functions no padrão `fbo_xxx(params) RETURNS TEXT` que devolvem `<sucess>` em caso de sucesso. PKs geradas internamente via `fs_nextcode()`. Leituras via views `vbl_rh_*`. Writes via funções `fbo_rh_*`. Função utilitária `fn_rh_dias_uteis` central para Férias.

**Tech Stack:** PostgreSQL · PL/pgSQL · SQLAlchemy (apenas para verificação) · padrão `fbo_`/`vbl_`/`ts_`/`tb_`/`tt_` do projecto AINTAR

---

## Ficheiros a criar

| Ficheiro | Responsabilidade |
|---|---|
| `backend/app/sql/rh/01_lookups.sql` | Tabelas de tipo/lookup `tt_rh_*` com dados seed |
| `backend/app/sql/rh/02_tables_config.sql` | `ts_rh_config`, `ts_rh_horario`, `ts_feriados` |
| `backend/app/sql/rh/03_tables_ponto.sql` | `tb_rh_ponto`, `tb_rh_ponto_mensal` |
| `backend/app/sql/rh/04_tables_ferias_faltas.sql` | `tb_rh_ferias`, `tb_rh_faltas`, `tb_rh_workflow` |
| `backend/app/sql/rh/05_tables_piquete.sql` | `tb_rh_piquete_escala`, `tb_rh_piquete_ocorrencia`, `ts_rh_piquete_regras` |
| `backend/app/sql/rh/06_feriados_seed.sql` | Feriados nacionais PT 2025–2027 |
| `backend/app/sql/rh/07_fn_dias_uteis.sql` | `fn_rh_dias_uteis(inicio, fim)` |
| `backend/app/sql/rh/08_fbo_ponto.sql` | `fbo_rh_ponto_evento`, `fbo_rh_ponto_submeter`, `fbo_rh_ponto_corrigir` |
| `backend/app/sql/rh/09_fbo_workflow.sql` | `fbo_rh_workflow` (genérico ponto/férias/faltas) |
| `backend/app/sql/rh/10_fbo_ferias.sql` | `fbo_rh_ferias`, `fbo_rh_config_upsert` |
| `backend/app/sql/rh/11_fbo_faltas.sql` | `fbo_rh_faltas` |
| `backend/app/sql/rh/12_fbo_horario.sql` | `fbo_rh_horario` |
| `backend/app/sql/rh/13_fbo_piquete.sql` | `fbo_rh_piquete_generate`, `fbo_rh_piquete_confirmar`, `fbo_rh_ocorrencia` |
| `backend/app/sql/rh/14_views.sql` | Todas as views `vbl_rh_*` |
| `backend/app/sql/rh/15_verify.sql` | Queries de verificação (smoke test) |

---

## Task 1: Lookup Tables (tt_rh_*)

**Files:**
- Create: `backend/app/sql/rh/01_lookups.sql`

- [ ] **Step 1.1: Criar ficheiro de lookups**

```sql
-- backend/app/sql/rh/01_lookups.sql
-- Lookups do módulo RH Pessoal
-- Executar como superuser ou owner da BD

-- Tipo de jornada
CREATE TABLE IF NOT EXISTS tt_rh_tipo_jornada (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(50) NOT NULL
);
INSERT INTO tt_rh_tipo_jornada (pk, descr) VALUES
    (1, 'Partida'),
    (2, 'Contínua')
ON CONFLICT (pk) DO NOTHING;

-- Tipo de evento de ponto
CREATE TABLE IF NOT EXISTS tt_rh_ponto_evento (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(50) NOT NULL,
    ordem INTEGER NOT NULL  -- para ordenação lógica
);
INSERT INTO tt_rh_ponto_evento (pk, descr, ordem) VALUES
    (1, 'Entrada',         1),
    (2, 'Início Almoço',   2),
    (3, 'Fim Almoço',      3),
    (4, 'Saída',           4)
ON CONFLICT (pk) DO NOTHING;

-- Tipo de férias/tolerância
CREATE TABLE IF NOT EXISTS tt_rh_tipo_ferias (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(80) NOT NULL,
    debita_saldo BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO tt_rh_tipo_ferias (pk, descr, debita_saldo) VALUES
    (1, 'Férias',              TRUE),
    (2, 'Tolerância de Ponto', FALSE),
    (3, 'Aniversário',         FALSE)
ON CONFLICT (pk) DO NOTHING;

-- Tipo de falta
CREATE TABLE IF NOT EXISTS tt_rh_tipo_falta (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(80) NOT NULL,
    requer_justificativo BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO tt_rh_tipo_falta (pk, descr, requer_justificativo) VALUES
    (1, 'Justificada',         TRUE),
    (2, 'Injustificada',       FALSE),
    (3, 'Tolerância de Ponto', FALSE),
    (4, 'Licença',             TRUE)
ON CONFLICT (pk) DO NOTHING;

-- Estado do workflow (partilhado por ponto, férias e faltas)
CREATE TABLE IF NOT EXISTS tt_rh_estado_workflow (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(50) NOT NULL,
    cor   VARCHAR(20)  -- para UI: 'warning', 'info', 'success', 'error'
);
INSERT INTO tt_rh_estado_workflow (pk, descr, cor) VALUES
    (1, 'Pendente',            'warning'),
    (2, 'Validado Superior',   'info'),
    (3, 'Aprovado RH',         'success'),
    (4, 'Rejeitado',           'error')
ON CONFLICT (pk) DO NOTHING;

-- Tipo de ocorrência de piquete
CREATE TABLE IF NOT EXISTS tt_rh_piquete_ocorrencia (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(80) NOT NULL
);
INSERT INTO tt_rh_piquete_ocorrencia (pk, descr) VALUES
    (1, 'Chamada Telefónica'),
    (2, 'Intervenção no Local'),
    (3, 'Equipa Accionada'),
    (4, 'Outro')
ON CONFLICT (pk) DO NOTHING;
```

- [ ] **Step 1.2: Executar no PostgreSQL e verificar**

```sql
-- Colar e executar no pgAdmin ou psql
-- Depois verificar:
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'tt_rh_%'
ORDER BY table_name;
-- Deve retornar 6 linhas
```

- [ ] **Step 1.3: Commit**

```bash
git add backend/app/sql/rh/01_lookups.sql
git commit -m "feat(rh-bd): criar lookup tables tt_rh_*"
```

---

## Task 2: Tabelas de Configuração

**Files:**
- Create: `backend/app/sql/rh/02_tables_config.sql`

- [ ] **Step 2.1: Criar tabelas de configuração**

```sql
-- backend/app/sql/rh/02_tables_config.sql

-- Saldo anual de férias por colaborador
CREATE TABLE IF NOT EXISTS ts_rh_config (
    pk                  INTEGER NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk          INTEGER NOT NULL,   -- FK → ts_client.pk
    ano                 INTEGER NOT NULL,
    dias_ferias_total   INTEGER NOT NULL DEFAULT 22,
    dias_ferias_gozados INTEGER NOT NULL DEFAULT 0,
    notas               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ts_rh_config PRIMARY KEY (pk),
    CONSTRAINT uq_ts_rh_config_user_ano UNIQUE (tb_user_fk, ano)
);

CREATE INDEX IF NOT EXISTS idx_ts_rh_config_user ON ts_rh_config (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_ts_rh_config_ano  ON ts_rh_config (ano);

-- Horário fixo por colaborador
CREATE TABLE IF NOT EXISTS ts_rh_horario (
    pk                  INTEGER NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk          INTEGER NOT NULL,
    tt_jornada_fk       INTEGER NOT NULL REFERENCES tt_rh_tipo_jornada(pk),
    descr               VARCHAR(100) NOT NULL,
    hora_entrada        TIME NOT NULL,
    hora_saida          TIME NOT NULL,
    hora_inicio_almoco  TIME,       -- NULL se jornada contínua
    hora_fim_almoco     TIME,       -- NULL se jornada contínua
    dias_semana         INTEGER[]   NOT NULL DEFAULT '{1,2,3,4,5}',  -- 1=seg..7=dom
    data_inicio         DATE NOT NULL,
    data_fim            DATE,       -- NULL = indefinido (activo)
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ts_rh_horario PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_ts_rh_horario_user   ON ts_rh_horario (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_ts_rh_horario_activo ON ts_rh_horario (tb_user_fk, data_fim)
    WHERE data_fim IS NULL;

-- Feriados nacionais portugueses
CREATE TABLE IF NOT EXISTS ts_feriados (
    pk       INTEGER NOT NULL DEFAULT fs_nextcode(),
    data     DATE    NOT NULL,
    descr    VARCHAR(100) NOT NULL,
    nacional BOOLEAN NOT NULL DEFAULT TRUE,
    regiao   VARCHAR(50),   -- para feriados municipais futuros
    CONSTRAINT pk_ts_feriados PRIMARY KEY (pk),
    CONSTRAINT uq_ts_feriados_data UNIQUE (data)
);

CREATE INDEX IF NOT EXISTS idx_ts_feriados_data ON ts_feriados (data);
```

- [ ] **Step 2.2: Executar e verificar**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('ts_rh_config','ts_rh_horario','ts_feriados');
-- Deve retornar 3 linhas
```

- [ ] **Step 2.3: Commit**

```bash
git add backend/app/sql/rh/02_tables_config.sql
git commit -m "feat(rh-bd): criar tabelas de configuração ts_rh_config, ts_rh_horario, ts_feriados"
```

---

## Task 3: Tabelas de Ponto

**Files:**
- Create: `backend/app/sql/rh/03_tables_ponto.sql`

- [ ] **Step 3.1: Criar tabelas de ponto**

```sql
-- backend/app/sql/rh/03_tables_ponto.sql

-- Registo diário de ponto (cada evento: entrada, almoço, saída)
CREATE TABLE IF NOT EXISTS tb_rh_ponto (
    pk              INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk      INTEGER  NOT NULL,
    data            DATE     NOT NULL,
    tt_evento_fk    INTEGER  NOT NULL REFERENCES tt_rh_ponto_evento(pk),
    ts_registo      TIMESTAMP NOT NULL DEFAULT NOW(),
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    precisao_metros INTEGER,
    fonte           VARCHAR(20) NOT NULL DEFAULT 'app',  -- 'app','manual','correcao'
    notas           TEXT,
    CONSTRAINT pk_tb_rh_ponto PRIMARY KEY (pk),
    CONSTRAINT uq_tb_rh_ponto_user_data_evento UNIQUE (tb_user_fk, data, tt_evento_fk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_user_data ON tb_rh_ponto (tb_user_fk, data);
CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_data      ON tb_rh_ponto (data);

-- Mapa mensal — agrupa registos do mês para workflow de aprovação
CREATE TABLE IF NOT EXISTS tb_rh_ponto_mensal (
    pk                  INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk          INTEGER  NOT NULL,
    ano                 INTEGER  NOT NULL,
    mes                 INTEGER  NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ts_estado_fk        INTEGER  NOT NULL DEFAULT 1 REFERENCES tt_rh_estado_workflow(pk),
    total_horas         DECIMAL(6,2),   -- calculado ao submeter
    total_dias          INTEGER,        -- dias com entrada registada
    submetido_em        TIMESTAMP,
    notas_colaborador   TEXT,
    CONSTRAINT pk_tb_rh_ponto_mensal PRIMARY KEY (pk),
    CONSTRAINT uq_tb_rh_ponto_mensal UNIQUE (tb_user_fk, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_mensal_user ON tb_rh_ponto_mensal (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_mensal_ano  ON tb_rh_ponto_mensal (ano, mes);
```

- [ ] **Step 3.2: Executar e verificar**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('tb_rh_ponto','tb_rh_ponto_mensal');
-- Deve retornar 2 linhas
```

- [ ] **Step 3.3: Commit**

```bash
git add backend/app/sql/rh/03_tables_ponto.sql
git commit -m "feat(rh-bd): criar tabelas de registo de ponto"
```

---

## Task 4: Tabelas de Férias, Faltas e Workflow

**Files:**
- Create: `backend/app/sql/rh/04_tables_ferias_faltas.sql`

- [ ] **Step 4.1: Criar tabelas**

```sql
-- backend/app/sql/rh/04_tables_ferias_faltas.sql

-- Pedidos de férias e tolerâncias
CREATE TABLE IF NOT EXISTS tb_rh_ferias (
    pk              INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk      INTEGER  NOT NULL,
    tt_tipo_fk      INTEGER  NOT NULL REFERENCES tt_rh_tipo_ferias(pk),
    data_inicio     DATE     NOT NULL,
    data_fim        DATE     NOT NULL,
    dias_uteis      INTEGER  NOT NULL,  -- calculado por fn_rh_dias_uteis
    ts_estado_fk    INTEGER  NOT NULL DEFAULT 1 REFERENCES tt_rh_estado_workflow(pk),
    notas           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_ferias PRIMARY KEY (pk),
    CONSTRAINT ck_tb_rh_ferias_datas CHECK (data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_ferias_user   ON tb_rh_ferias (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_ferias_estado ON tb_rh_ferias (ts_estado_fk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_ferias_datas  ON tb_rh_ferias (data_inicio, data_fim);

-- Registos de faltas
CREATE TABLE IF NOT EXISTS tb_rh_faltas (
    pk                  INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk          INTEGER  NOT NULL,
    tt_tipo_falta_fk    INTEGER  NOT NULL REFERENCES tt_rh_tipo_falta(pk),
    data                DATE     NOT NULL,
    ts_estado_fk        INTEGER  NOT NULL DEFAULT 1 REFERENCES tt_rh_estado_workflow(pk),
    justificativo_path  VARCHAR(500),
    comunicado_por      INTEGER,   -- FK → ts_client (pode ser superior ou o próprio)
    notas               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_faltas PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_faltas_user   ON tb_rh_faltas (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_faltas_data   ON tb_rh_faltas (data);
CREATE INDEX IF NOT EXISTS idx_tb_rh_faltas_estado ON tb_rh_faltas (ts_estado_fk);

-- Workflow genérico (ponto mensal, férias, faltas)
-- tipo_ref: 'ponto' | 'ferias' | 'faltas'
-- ref_pk: PK da tabela respectiva
CREATE TABLE IF NOT EXISTS tb_rh_workflow (
    pk              INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tipo_ref        VARCHAR(20) NOT NULL,
    ref_pk          INTEGER  NOT NULL,
    step            INTEGER  NOT NULL,  -- 1=Superior, 2=Admin RH
    tb_user_fk      INTEGER  NOT NULL,  -- quem actuou
    ts_estado_fk    INTEGER  NOT NULL REFERENCES tt_rh_estado_workflow(pk),
    notas           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_workflow PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_workflow_ref ON tb_rh_workflow (tipo_ref, ref_pk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_workflow_user ON tb_rh_workflow (tb_user_fk);
```

- [ ] **Step 4.2: Executar e verificar**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('tb_rh_ferias','tb_rh_faltas','tb_rh_workflow');
-- Deve retornar 3 linhas
```

- [ ] **Step 4.3: Commit**

```bash
git add backend/app/sql/rh/04_tables_ferias_faltas.sql
git commit -m "feat(rh-bd): criar tabelas de férias, faltas e workflow"
```

---

## Task 5: Tabelas de Piquete

**Files:**
- Create: `backend/app/sql/rh/05_tables_piquete.sql`

- [ ] **Step 5.1: Criar tabelas de piquete**

```sql
-- backend/app/sql/rh/05_tables_piquete.sql

-- Escala semanal de piquete
CREATE TABLE IF NOT EXISTS tb_rh_piquete_escala (
    pk              INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk      INTEGER  NOT NULL,
    data_inicio     DATE     NOT NULL,  -- segunda-feira da semana
    data_fim        DATE     NOT NULL,  -- domingo da semana
    confirmado      BOOLEAN  NOT NULL DEFAULT FALSE,
    ts_confirmacao  TIMESTAMP,
    ts_estado_fk    INTEGER  NOT NULL DEFAULT 1 REFERENCES tt_rh_estado_workflow(pk),
    gerado_auto     BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_piquete_escala PRIMARY KEY (pk),
    CONSTRAINT uq_tb_rh_piquete_user_semana UNIQUE (tb_user_fk, data_inicio),
    CONSTRAINT ck_tb_rh_piquete_datas CHECK (data_fim > data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_piquete_user  ON tb_rh_piquete_escala (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_piquete_datas ON tb_rh_piquete_escala (data_inicio, data_fim);

-- Ocorrências durante piquete
CREATE TABLE IF NOT EXISTS tb_rh_piquete_ocorrencia (
    pk                  INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_piquete_escala_fk INTEGER NOT NULL REFERENCES tb_rh_piquete_escala(pk),
    tt_tipo_fk          INTEGER  NOT NULL REFERENCES tt_rh_piquete_ocorrencia(pk),
    descr               TEXT     NOT NULL,
    equipas_accionadas  VARCHAR(500),
    evidencia_path      VARCHAR(500),
    created_by          INTEGER  NOT NULL,  -- FK → ts_client
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_piquete_ocorrencia PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_piquete_ocorr_escala ON tb_rh_piquete_ocorrencia (tb_piquete_escala_fk);

-- Regras de geração automática da escala (configurável pelo Admin RH)
CREATE TABLE IF NOT EXISTS ts_rh_piquete_regras (
    pk      INTEGER  NOT NULL DEFAULT fs_nextcode(),
    codigo  VARCHAR(50)  NOT NULL,
    descr   VARCHAR(200) NOT NULL,
    valor   VARCHAR(100),   -- valor configurável (ex: '2' = 2 semanas de intervalo)
    ativo   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_ts_rh_piquete_regras PRIMARY KEY (pk),
    CONSTRAINT uq_ts_rh_piquete_regras_codigo UNIQUE (codigo)
);

-- Seed: regras base
INSERT INTO ts_rh_piquete_regras (pk, codigo, descr, valor, ativo) VALUES
    (fs_nextcode(), 'sem_ferias',       'Exclui colaborador com férias aprovadas na semana', NULL,  TRUE),
    (fs_nextcode(), 'sem_consecutivas', 'Intervalo mínimo entre piquetes (semanas)',          '2',   TRUE),
    (fs_nextcode(), 'sem_baixa',        'Exclui colaborador com falta tipo Licença activa',   NULL,  TRUE),
    (fs_nextcode(), 'equitativo',       'Distribuir equitativamente por todos os elegíveis',  NULL,  TRUE)
ON CONFLICT (codigo) DO NOTHING;
```

- [ ] **Step 5.2: Executar e verificar**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('tb_rh_piquete_escala','tb_rh_piquete_ocorrencia','ts_rh_piquete_regras');
-- Deve retornar 3 linhas

SELECT codigo, descr, ativo FROM ts_rh_piquete_regras;
-- Deve mostrar 4 regras
```

- [ ] **Step 5.3: Commit**

```bash
git add backend/app/sql/rh/05_tables_piquete.sql
git commit -m "feat(rh-bd): criar tabelas de piquete e regras de geração"
```

---

## Task 6: Seed — Feriados Nacionais PT 2025–2027

**Files:**
- Create: `backend/app/sql/rh/06_feriados_seed.sql`

- [ ] **Step 6.1: Criar seed de feriados**

```sql
-- backend/app/sql/rh/06_feriados_seed.sql
-- Feriados nacionais obrigatórios PT (fixos + móveis pré-calculados)

INSERT INTO ts_feriados (pk, data, descr, nacional) VALUES
-- 2025
(fs_nextcode(), '2025-01-01', 'Ano Novo',                          TRUE),
(fs_nextcode(), '2025-04-18', 'Sexta-Feira Santa',                 TRUE),
(fs_nextcode(), '2025-04-20', 'Domingo de Páscoa',                 TRUE),
(fs_nextcode(), '2025-04-25', 'Dia da Liberdade',                  TRUE),
(fs_nextcode(), '2025-05-01', 'Dia do Trabalhador',                TRUE),
(fs_nextcode(), '2025-06-19', 'Corpo de Deus',                     TRUE),
(fs_nextcode(), '2025-06-10', 'Dia de Portugal',                   TRUE),
(fs_nextcode(), '2025-08-15', 'Assunção de Nossa Senhora',         TRUE),
(fs_nextcode(), '2025-10-05', 'Implantação da República',          TRUE),
(fs_nextcode(), '2025-11-01', 'Dia de Todos os Santos',            TRUE),
(fs_nextcode(), '2025-12-01', 'Restauração da Independência',      TRUE),
(fs_nextcode(), '2025-12-08', 'Imaculada Conceição',               TRUE),
(fs_nextcode(), '2025-12-25', 'Natal',                             TRUE),
-- 2026
(fs_nextcode(), '2026-01-01', 'Ano Novo',                          TRUE),
(fs_nextcode(), '2026-04-03', 'Sexta-Feira Santa',                 TRUE),
(fs_nextcode(), '2026-04-05', 'Domingo de Páscoa',                 TRUE),
(fs_nextcode(), '2026-04-25', 'Dia da Liberdade',                  TRUE),
(fs_nextcode(), '2026-05-01', 'Dia do Trabalhador',                TRUE),
(fs_nextcode(), '2026-06-04', 'Corpo de Deus',                     TRUE),
(fs_nextcode(), '2026-06-10', 'Dia de Portugal',                   TRUE),
(fs_nextcode(), '2026-08-15', 'Assunção de Nossa Senhora',         TRUE),
(fs_nextcode(), '2026-10-05', 'Implantação da República',          TRUE),
(fs_nextcode(), '2026-11-01', 'Dia de Todos os Santos',            TRUE),
(fs_nextcode(), '2026-12-01', 'Restauração da Independência',      TRUE),
(fs_nextcode(), '2026-12-08', 'Imaculada Conceição',               TRUE),
(fs_nextcode(), '2026-12-25', 'Natal',                             TRUE),
-- 2027
(fs_nextcode(), '2027-01-01', 'Ano Novo',                          TRUE),
(fs_nextcode(), '2027-03-26', 'Sexta-Feira Santa',                 TRUE),
(fs_nextcode(), '2027-03-28', 'Domingo de Páscoa',                 TRUE),
(fs_nextcode(), '2027-04-25', 'Dia da Liberdade',                  TRUE),
(fs_nextcode(), '2027-05-01', 'Dia do Trabalhador',                TRUE),
(fs_nextcode(), '2027-05-27', 'Corpo de Deus',                     TRUE),
(fs_nextcode(), '2027-06-10', 'Dia de Portugal',                   TRUE),
(fs_nextcode(), '2027-08-15', 'Assunção de Nossa Senhora',         TRUE),
(fs_nextcode(), '2027-10-05', 'Implantação da República',          TRUE),
(fs_nextcode(), '2027-11-01', 'Dia de Todos os Santos',            TRUE),
(fs_nextcode(), '2027-12-01', 'Restauração da Independência',      TRUE),
(fs_nextcode(), '2027-12-08', 'Imaculada Conceição',               TRUE),
(fs_nextcode(), '2027-12-25', 'Natal',                             TRUE)
ON CONFLICT (data) DO NOTHING;
```

- [ ] **Step 6.2: Executar e verificar**

```sql
SELECT COUNT(*) FROM ts_feriados;
-- Deve retornar 39

SELECT data, descr FROM ts_feriados
WHERE EXTRACT(YEAR FROM data) = 2026
ORDER BY data;
-- Deve mostrar 13 feriados de 2026
```

- [ ] **Step 6.3: Commit**

```bash
git add backend/app/sql/rh/06_feriados_seed.sql
git commit -m "feat(rh-bd): seed feriados nacionais PT 2025-2027"
```

---

## Task 7: Função fn_rh_dias_uteis

**Files:**
- Create: `backend/app/sql/rh/07_fn_dias_uteis.sql`

- [ ] **Step 7.1: Criar função utilitária**

```sql
-- backend/app/sql/rh/07_fn_dias_uteis.sql

CREATE OR REPLACE FUNCTION fn_rh_dias_uteis(
    p_inicio DATE,
    p_fim    DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_count   INTEGER := 0;
    v_current DATE    := p_inicio;
    v_dow     INTEGER;
BEGIN
    IF p_inicio > p_fim THEN
        RETURN 0;
    END IF;

    WHILE v_current <= p_fim LOOP
        -- 0=domingo, 6=sábado em EXTRACT(DOW)
        v_dow := EXTRACT(DOW FROM v_current)::INTEGER;

        IF v_dow NOT IN (0, 6) THEN
            -- Não é fim de semana — verificar feriados nacionais
            IF NOT EXISTS (
                SELECT 1 FROM ts_feriados
                WHERE data = v_current AND nacional = TRUE
            ) THEN
                v_count := v_count + 1;
            END IF;
        END IF;

        v_current := v_current + INTERVAL '1 day';
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;
```

- [ ] **Step 7.2: Testar a função**

```sql
-- Semana normal (seg-sex), sem feriados
SELECT fn_rh_dias_uteis('2026-05-04', '2026-05-08');
-- Esperado: 5

-- Semana com feriado (1 Maio 2026 = quinta-feira)
SELECT fn_rh_dias_uteis('2026-04-27', '2026-05-01');
-- Esperado: 4 (seg+ter+qua+qui com feriado = 4 dias úteis, sexta não conta)
-- Nota: 2026-05-01 é feriado, conta os outros 4: 27,28,29,30 Abr

-- Um dia no fim-de-semana
SELECT fn_rh_dias_uteis('2026-05-09', '2026-05-10');
-- Esperado: 0 (sáb + dom)

-- Mesmo dia útil
SELECT fn_rh_dias_uteis('2026-05-04', '2026-05-04');
-- Esperado: 1

-- Mesmo dia feriado
SELECT fn_rh_dias_uteis('2026-04-25', '2026-04-25');
-- Esperado: 0
```

- [ ] **Step 7.3: Commit**

```bash
git add backend/app/sql/rh/07_fn_dias_uteis.sql
git commit -m "feat(rh-bd): criar fn_rh_dias_uteis com exclusão de feriados PT"
```

---

## Task 8: Funções de Ponto

**Files:**
- Create: `backend/app/sql/rh/08_fbo_ponto.sql`

- [ ] **Step 8.1: Criar funções de ponto**

```sql
-- backend/app/sql/rh/08_fbo_ponto.sql

-- Registar um evento de ponto (entrada, almoço, saída)
CREATE OR REPLACE FUNCTION fbo_rh_ponto_evento(
    p_user_fk       INTEGER,
    p_tt_evento_fk  INTEGER,
    p_latitude      DECIMAL,
    p_longitude     DECIMAL,
    p_precisao      INTEGER,
    p_notas         TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk        INTEGER;
    v_data      DATE := CURRENT_DATE;
    v_jornada   INTEGER;
    v_count_valid INTEGER;
BEGIN
    -- Verificar se já existe este evento hoje
    IF EXISTS (
        SELECT 1 FROM tb_rh_ponto
        WHERE tb_user_fk = p_user_fk
          AND data = v_data
          AND tt_evento_fk = p_tt_evento_fk
    ) THEN
        RETURN '<error>Evento já registado para hoje</error>';
    END IF;

    -- Para Início/Fim Almoço: verificar se jornada é Partida
    IF p_tt_evento_fk IN (2, 3) THEN
        SELECT tt_jornada_fk INTO v_jornada
        FROM ts_rh_horario
        WHERE tb_user_fk = p_user_fk AND data_fim IS NULL
        LIMIT 1;

        IF v_jornada = 2 THEN  -- Contínua
            RETURN '<error>Jornada contínua não tem registo de almoço</error>';
        END IF;
    END IF;

    -- Validar ordem lógica: não pode registar Saída sem Entrada
    IF p_tt_evento_fk = 4 THEN
        IF NOT EXISTS (
            SELECT 1 FROM tb_rh_ponto
            WHERE tb_user_fk = p_user_fk AND data = v_data AND tt_evento_fk = 1
        ) THEN
            RETURN '<error>Não é possível registar saída sem entrada</error>';
        END IF;
    END IF;

    v_pk := fs_nextcode();

    INSERT INTO tb_rh_ponto (
        pk, tb_user_fk, data, tt_evento_fk, ts_registo,
        latitude, longitude, precisao_metros, fonte, notas
    ) VALUES (
        v_pk, p_user_fk, v_data, p_tt_evento_fk, NOW(),
        p_latitude, p_longitude, p_precisao, 'app', p_notas
    );

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;


-- Submeter mapa mensal para aprovação
CREATE OR REPLACE FUNCTION fbo_rh_ponto_submeter(
    p_user_fk INTEGER,
    p_ano     INTEGER,
    p_mes     INTEGER,
    p_notas   TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk            INTEGER;
    v_total_horas   DECIMAL(6,2);
    v_total_dias    INTEGER;
    v_exists        INTEGER;
BEGIN
    -- Verificar se já existe mapa para este mês
    SELECT pk INTO v_exists
    FROM tb_rh_ponto_mensal
    WHERE tb_user_fk = p_user_fk AND ano = p_ano AND mes = p_mes;

    IF v_exists IS NOT NULL THEN
        RETURN '<error>Mapa mensal já submetido para ' || p_ano || '-' || p_mes || '</error>';
    END IF;

    -- Calcular totais
    SELECT
        COUNT(DISTINCT data),
        COALESCE(SUM(
            CASE
                WHEN tt_evento_fk = 4 THEN  -- Saída
                    EXTRACT(EPOCH FROM (
                        ts_registo - (
                            SELECT ts_registo FROM tb_rh_ponto p2
                            WHERE p2.tb_user_fk = p.tb_user_fk
                              AND p2.data = p.data
                              AND p2.tt_evento_fk = 1  -- Entrada
                        )
                    )) / 3600.0
                ELSE 0
            END
        ), 0)
    INTO v_total_dias, v_total_horas
    FROM tb_rh_ponto p
    WHERE tb_user_fk = p_user_fk
      AND EXTRACT(YEAR FROM data) = p_ano
      AND EXTRACT(MONTH FROM data) = p_mes;

    v_pk := fs_nextcode();

    INSERT INTO tb_rh_ponto_mensal (
        pk, tb_user_fk, ano, mes, ts_estado_fk,
        total_horas, total_dias, submetido_em, notas_colaborador
    ) VALUES (
        v_pk, p_user_fk, p_ano, p_mes, 1,
        v_total_horas, v_total_dias, NOW(), p_notas
    );

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;


-- Corrigir um registo de ponto (Admin RH)
CREATE OR REPLACE FUNCTION fbo_rh_ponto_corrigir(
    p_pk            INTEGER,
    p_ts_registo    TIMESTAMP,
    p_notas         TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
    UPDATE tb_rh_ponto
    SET ts_registo = p_ts_registo,
        fonte      = 'correcao',
        notas      = COALESCE(p_notas, notas)
    WHERE pk = p_pk;

    IF NOT FOUND THEN
        RETURN '<error>Registo não encontrado: ' || p_pk || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 8.2: Testar funções de ponto**

```sql
-- Testar registo de evento (usar um user_fk válido da ts_client)
-- Substituir 1 por um pk real de ts_client
SELECT fbo_rh_ponto_evento(1, 1, 38.7169, -9.1399, 10, 'Teste entrada');
-- Esperado: '<sucess>|pk=XXXX'

-- Tentar registar mesmo evento duas vezes
SELECT fbo_rh_ponto_evento(1, 1, 38.7169, -9.1399, 10, NULL);
-- Esperado: '<error>Evento já registado para hoje</error>'

-- Verificar registo criado
SELECT * FROM tb_rh_ponto WHERE tb_user_fk = 1 AND data = CURRENT_DATE;
```

- [ ] **Step 8.3: Commit**

```bash
git add backend/app/sql/rh/08_fbo_ponto.sql
git commit -m "feat(rh-bd): criar funções fbo_rh_ponto_evento, submeter, corrigir"
```

---

## Task 9: Função de Workflow Genérico

**Files:**
- Create: `backend/app/sql/rh/09_fbo_workflow.sql`

- [ ] **Step 9.1: Criar função de workflow**

```sql
-- backend/app/sql/rh/09_fbo_workflow.sql

-- Workflow genérico — valida ou aprova ponto mensal, férias ou falta
-- p_tipo_ref: 'ponto' | 'ferias' | 'faltas'
-- p_step: 1=Superior, 2=Admin RH
-- p_ts_estado_fk: 2=Validado, 3=Aprovado, 4=Rejeitado
CREATE OR REPLACE FUNCTION fbo_rh_workflow(
    p_tipo_ref      VARCHAR,
    p_ref_pk        INTEGER,
    p_step          INTEGER,
    p_user_fk       INTEGER,
    p_ts_estado_fk  INTEGER,
    p_notas         TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk            INTEGER;
    v_estado_atual  INTEGER;
    v_user_fk_ref   INTEGER;
    v_tipo_ferias   INTEGER;
    v_dias_uteis    INTEGER;
    v_debita        BOOLEAN;
BEGIN
    -- Ler estado actual e user do registo
    IF p_tipo_ref = 'ponto' THEN
        SELECT ts_estado_fk, tb_user_fk
        INTO v_estado_atual, v_user_fk_ref
        FROM tb_rh_ponto_mensal WHERE pk = p_ref_pk;
    ELSIF p_tipo_ref = 'ferias' THEN
        SELECT ts_estado_fk, tb_user_fk
        INTO v_estado_atual, v_user_fk_ref
        FROM tb_rh_ferias WHERE pk = p_ref_pk;
    ELSIF p_tipo_ref = 'faltas' THEN
        SELECT ts_estado_fk, tb_user_fk
        INTO v_estado_atual, v_user_fk_ref
        FROM tb_rh_faltas WHERE pk = p_ref_pk;
    ELSE
        RETURN '<error>Tipo de referência inválido: ' || p_tipo_ref || '</error>';
    END IF;

    IF v_user_fk_ref IS NULL THEN
        RETURN '<error>Registo não encontrado: ' || p_ref_pk || '</error>';
    END IF;

    -- Validar transição de estado
    IF p_ts_estado_fk NOT IN (2, 3, 4) THEN
        RETURN '<error>Estado inválido para workflow</error>';
    END IF;
    IF p_step = 1 AND v_estado_atual != 1 THEN
        RETURN '<error>Superior só pode actuar em estado Pendente</error>';
    END IF;
    IF p_step = 2 AND v_estado_atual NOT IN (1, 2) THEN
        RETURN '<error>Admin RH só pode actuar em estado Pendente ou Validado</error>';
    END IF;

    -- Actualizar estado no registo original
    IF p_tipo_ref = 'ponto' THEN
        UPDATE tb_rh_ponto_mensal SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;
    ELSIF p_tipo_ref = 'ferias' THEN
        UPDATE tb_rh_ferias SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;

        -- Se aprovação final de férias → debitar saldo se aplicável
        IF p_step = 2 AND p_ts_estado_fk = 3 THEN
            SELECT tt_tipo_fk, dias_uteis INTO v_tipo_ferias, v_dias_uteis
            FROM tb_rh_ferias WHERE pk = p_ref_pk;

            SELECT debita_saldo INTO v_debita
            FROM tt_rh_tipo_ferias WHERE pk = v_tipo_ferias;

            IF v_debita THEN
                UPDATE ts_rh_config
                SET dias_ferias_gozados = dias_ferias_gozados + v_dias_uteis
                WHERE tb_user_fk = v_user_fk_ref
                  AND ano = EXTRACT(YEAR FROM NOW())::INT;
            END IF;
        END IF;
    ELSIF p_tipo_ref = 'faltas' THEN
        UPDATE tb_rh_faltas SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;
    END IF;

    -- Registar no histórico de workflow
    v_pk := fs_nextcode();
    INSERT INTO tb_rh_workflow (pk, tipo_ref, ref_pk, step, tb_user_fk, ts_estado_fk, notas)
    VALUES (v_pk, p_tipo_ref, p_ref_pk, p_step, p_user_fk, p_ts_estado_fk, p_notas);

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 9.2: Testar workflow**

```sql
-- Preparar: inserir config de saldo (usar user_fk real)
INSERT INTO ts_rh_config (pk, tb_user_fk, ano, dias_ferias_total)
VALUES (fs_nextcode(), 1, 2026, 22)
ON CONFLICT (tb_user_fk, ano) DO NOTHING;

-- Preparar: inserir férias de teste directamente (fbo_rh_ferias criada no Task 10)
-- Usar INSERT directo para este smoke test
DECLARE v_ferias_pk INTEGER := fs_nextcode();
INSERT INTO tb_rh_ferias (pk, tb_user_fk, tt_tipo_fk, data_inicio, data_fim, dias_uteis)
VALUES (v_ferias_pk, 1, 1, '2026-08-03', '2026-08-14', fn_rh_dias_uteis('2026-08-03','2026-08-14'));

-- Superior valida (step=1, estado=2=Validado)
SELECT fbo_rh_workflow('ferias', v_ferias_pk, 1, 99, 2, 'Validado pelo superior');
-- Esperado: '<sucess>|pk=XXXX'

-- Admin RH aprova (step=2, estado=3=Aprovado)
SELECT fbo_rh_workflow('ferias', v_ferias_pk, 2, 98, 3, 'Aprovado RH');
-- Esperado: '<sucess>|pk=XXXX'

-- Verificar que estado foi actualizado
SELECT ts_estado_fk FROM tb_rh_ferias WHERE pk = v_ferias_pk;
-- Deve retornar 3 (Aprovado RH)

-- Verificar que saldo foi debitado em ts_rh_config
SELECT dias_ferias_gozados FROM ts_rh_config WHERE tb_user_fk = 1 AND ano = 2026;
-- Deve ser > 0 (igual a fn_rh_dias_uteis('2026-08-03','2026-08-14'))
```

- [ ] **Step 9.3: Commit**

```bash
git add backend/app/sql/rh/09_fbo_workflow.sql
git commit -m "feat(rh-bd): criar fbo_rh_workflow com débito automático de saldo"
```

---

## Task 10: Funções de Férias e Configuração

**Files:**
- Create: `backend/app/sql/rh/10_fbo_ferias.sql`

- [ ] **Step 10.1: Criar funções de férias**

```sql
-- backend/app/sql/rh/10_fbo_ferias.sql

-- INSERT/UPDATE de pedido de férias
-- p_op: 0=INSERT, 1=UPDATE
CREATE OR REPLACE FUNCTION fbo_rh_ferias(
    p_op            INTEGER,
    p_pk            INTEGER,
    p_user_fk       INTEGER,
    p_tt_tipo_fk    INTEGER,
    p_data_inicio   DATE,
    p_data_fim      DATE,
    p_notas         TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk        INTEGER;
    v_dias      INTEGER;
    v_saldo     INTEGER;
    v_gozados   INTEGER;
    v_ano       INTEGER;
BEGIN
    -- Calcular dias úteis
    v_dias := fn_rh_dias_uteis(p_data_inicio, p_data_fim);

    IF v_dias <= 0 THEN
        RETURN '<error>Período não contém dias úteis válidos</error>';
    END IF;

    v_ano := EXTRACT(YEAR FROM p_data_inicio)::INTEGER;

    IF p_op = 0 THEN  -- INSERT
        -- Verificar saldo disponível (só para tipo=1 Férias)
        IF p_tt_tipo_fk = 1 THEN
            SELECT dias_ferias_total, dias_ferias_gozados
            INTO v_saldo, v_gozados
            FROM ts_rh_config
            WHERE tb_user_fk = p_user_fk AND ano = v_ano;

            IF v_saldo IS NULL THEN
                RETURN '<error>Sem configuração de saldo para ' || p_user_fk || ' em ' || v_ano || '</error>';
            END IF;

            -- Saldo disponível = total - gozados - pendentes aprovação
            DECLARE
                v_pendentes INTEGER;
            BEGIN
                SELECT COALESCE(SUM(dias_uteis), 0) INTO v_pendentes
                FROM tb_rh_ferias
                WHERE tb_user_fk = p_user_fk
                  AND EXTRACT(YEAR FROM data_inicio) = v_ano
                  AND ts_estado_fk IN (1, 2)  -- Pendente ou Validado
                  AND tt_tipo_fk = 1;

                IF v_gozados + v_pendentes + v_dias > v_saldo THEN
                    RETURN '<error>Saldo insuficiente. Disponível: ' ||
                           (v_saldo - v_gozados - v_pendentes) || ' dias</error>';
                END IF;
            END;
        END IF;

        -- Verificar sobreposição com férias existentes aprovadas/pendentes
        IF EXISTS (
            SELECT 1 FROM tb_rh_ferias
            WHERE tb_user_fk = p_user_fk
              AND ts_estado_fk IN (1, 2, 3)  -- exclui Rejeitado
              AND data_inicio <= p_data_fim
              AND data_fim >= p_data_inicio
        ) THEN
            RETURN '<error>Já existe um pedido de férias que se sobrepõe com este período</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_ferias (pk, tb_user_fk, tt_tipo_fk, data_inicio, data_fim, dias_uteis, notas)
        VALUES (v_pk, p_user_fk, p_tt_tipo_fk, p_data_inicio, p_data_fim, v_dias, p_notas);

    ELSIF p_op = 1 THEN  -- UPDATE (só Pendente)
        SELECT pk INTO v_pk FROM tb_rh_ferias WHERE pk = p_pk AND ts_estado_fk = 1;
        IF v_pk IS NULL THEN
            RETURN '<error>Não é possível editar: registo não encontrado ou não está Pendente</error>';
        END IF;

        UPDATE tb_rh_ferias
        SET tt_tipo_fk = p_tt_tipo_fk,
            data_inicio = p_data_inicio,
            data_fim = p_data_fim,
            dias_uteis = v_dias,
            notas = p_notas
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida: ' || p_op || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;


-- Upsert do saldo anual de um colaborador (Admin RH)
CREATE OR REPLACE FUNCTION fbo_rh_config_upsert(
    p_user_fk       INTEGER,
    p_ano           INTEGER,
    p_dias_total    INTEGER,
    p_notas         TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    SELECT pk INTO v_pk FROM ts_rh_config WHERE tb_user_fk = p_user_fk AND ano = p_ano;

    IF v_pk IS NULL THEN
        v_pk := fs_nextcode();
        INSERT INTO ts_rh_config (pk, tb_user_fk, ano, dias_ferias_total, notas)
        VALUES (v_pk, p_user_fk, p_ano, p_dias_total, p_notas);
    ELSE
        UPDATE ts_rh_config
        SET dias_ferias_total = p_dias_total,
            notas = COALESCE(p_notas, notas)
        WHERE pk = v_pk;
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 10.2: Testar funções de férias**

```sql
-- Criar config de saldo (usar user_fk real)
SELECT fbo_rh_config_upsert(1, 2026, 25, 'Colaborador com 10 anos de casa');
-- Esperado: '<sucess>|pk=XXXX'

-- Criar pedido de férias válido
SELECT fbo_rh_ferias(0, NULL, 1, 1, '2026-08-03', '2026-08-14', 'Férias verão');
-- Esperado: '<sucess>|pk=XXXX' (calcula ~10 dias úteis)

-- Tentar criar com sobreposição
SELECT fbo_rh_ferias(0, NULL, 1, 1, '2026-08-10', '2026-08-20', 'Sobreposição');
-- Esperado: '<error>Já existe um pedido...'

-- Verificar dias calculados
SELECT pk, data_inicio, data_fim, dias_uteis FROM tb_rh_ferias WHERE tb_user_fk = 1;
```

- [ ] **Step 10.3: Commit**

```bash
git add backend/app/sql/rh/10_fbo_ferias.sql
git commit -m "feat(rh-bd): criar fbo_rh_ferias com validação de saldo e sobreposição"
```

---

## Task 11: Funções de Faltas e Horário

**Files:**
- Create: `backend/app/sql/rh/11_fbo_faltas.sql`
- Create: `backend/app/sql/rh/12_fbo_horario.sql`

- [ ] **Step 11.1: Criar função de faltas**

```sql
-- backend/app/sql/rh/11_fbo_faltas.sql

CREATE OR REPLACE FUNCTION fbo_rh_faltas(
    p_op                INTEGER,
    p_pk                INTEGER,
    p_user_fk           INTEGER,
    p_tt_tipo_falta_fk  INTEGER,
    p_data              DATE,
    p_justificativo_path VARCHAR DEFAULT NULL,
    p_notas             TEXT DEFAULT NULL,
    p_comunicado_por    INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_op = 0 THEN  -- INSERT
        -- Não pode ter falta e férias aprovadas no mesmo dia
        IF EXISTS (
            SELECT 1 FROM tb_rh_ferias
            WHERE tb_user_fk = p_user_fk
              AND ts_estado_fk = 3  -- Aprovado
              AND p_data BETWEEN data_inicio AND data_fim
        ) THEN
            RETURN '<error>Colaborador tem férias aprovadas nesta data</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_faltas (
            pk, tb_user_fk, tt_tipo_falta_fk, data,
            justificativo_path, notas, comunicado_por
        ) VALUES (
            v_pk, p_user_fk, p_tt_tipo_falta_fk, p_data,
            p_justificativo_path, p_notas, p_comunicado_por
        );

    ELSIF p_op = 1 THEN  -- UPDATE (upload justificativo ou edição)
        SELECT pk INTO v_pk FROM tb_rh_faltas WHERE pk = p_pk AND ts_estado_fk IN (1, 2);
        IF v_pk IS NULL THEN
            RETURN '<error>Falta não encontrada ou já aprovada/rejeitada</error>';
        END IF;

        UPDATE tb_rh_faltas
        SET justificativo_path = COALESCE(p_justificativo_path, justificativo_path),
            tt_tipo_falta_fk   = COALESCE(NULLIF(p_tt_tipo_falta_fk, 0), tt_tipo_falta_fk),
            notas              = COALESCE(p_notas, notas)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 11.2: Criar função de horário**

```sql
-- backend/app/sql/rh/12_fbo_horario.sql

CREATE OR REPLACE FUNCTION fbo_rh_horario(
    p_op                    INTEGER,
    p_pk                    INTEGER,
    p_user_fk               INTEGER,
    p_tt_jornada_fk         INTEGER,
    p_descr                 VARCHAR,
    p_hora_entrada          TIME,
    p_hora_saida            TIME,
    p_hora_inicio_almoco    TIME DEFAULT NULL,
    p_hora_fim_almoco       TIME DEFAULT NULL,
    p_dias_semana           INTEGER[] DEFAULT '{1,2,3,4,5}',
    p_data_inicio           DATE DEFAULT CURRENT_DATE,
    p_data_fim              DATE DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    -- Validar: jornada partida requer horas de almoço
    IF p_tt_jornada_fk = 1 AND (p_hora_inicio_almoco IS NULL OR p_hora_fim_almoco IS NULL) THEN
        RETURN '<error>Jornada Partida requer horas de início e fim de almoço</error>';
    END IF;

    IF p_op = 0 THEN  -- INSERT — fechar horário activo anterior
        UPDATE ts_rh_horario
        SET data_fim = p_data_inicio - INTERVAL '1 day'
        WHERE tb_user_fk = p_user_fk AND data_fim IS NULL;

        v_pk := fs_nextcode();
        INSERT INTO ts_rh_horario (
            pk, tb_user_fk, tt_jornada_fk, descr,
            hora_entrada, hora_saida, hora_inicio_almoco, hora_fim_almoco,
            dias_semana, data_inicio, data_fim
        ) VALUES (
            v_pk, p_user_fk, p_tt_jornada_fk, p_descr,
            p_hora_entrada, p_hora_saida, p_hora_inicio_almoco, p_hora_fim_almoco,
            p_dias_semana, p_data_inicio, p_data_fim
        );

    ELSIF p_op = 1 THEN  -- UPDATE
        SELECT pk INTO v_pk FROM ts_rh_horario WHERE pk = p_pk;
        IF v_pk IS NULL THEN
            RETURN '<error>Horário não encontrado: ' || p_pk || '</error>';
        END IF;

        UPDATE ts_rh_horario
        SET tt_jornada_fk       = p_tt_jornada_fk,
            descr               = p_descr,
            hora_entrada        = p_hora_entrada,
            hora_saida          = p_hora_saida,
            hora_inicio_almoco  = p_hora_inicio_almoco,
            hora_fim_almoco     = p_hora_fim_almoco,
            dias_semana         = p_dias_semana,
            data_fim            = p_data_fim
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 11.3: Testar**

```sql
-- Criar horário partida (user 1)
SELECT fbo_rh_horario(0, NULL, 1, 1, 'Sede - Horário Normal',
    '08:00', '17:00', '12:30', '13:30', '{1,2,3,4,5}', '2026-01-01', NULL);
-- Esperado: '<sucess>|pk=XXXX'

-- Criar falta de teste
SELECT fbo_rh_faltas(0, NULL, 1, 1, '2026-05-05', NULL, 'Baixa médica', NULL);
-- Esperado: '<sucess>|pk=XXXX'

-- Verificar
SELECT * FROM ts_rh_horario WHERE tb_user_fk = 1;
SELECT * FROM tb_rh_faltas WHERE tb_user_fk = 1;
```

- [ ] **Step 11.4: Commit**

```bash
git add backend/app/sql/rh/11_fbo_faltas.sql backend/app/sql/rh/12_fbo_horario.sql
git commit -m "feat(rh-bd): criar fbo_rh_faltas e fbo_rh_horario"
```

---

## Task 12: Funções de Piquete

**Files:**
- Create: `backend/app/sql/rh/13_fbo_piquete.sql`

- [ ] **Step 12.1: Criar funções de piquete**

```sql
-- backend/app/sql/rh/13_fbo_piquete.sql

-- Gerar escala mensal de piquete aplicando as regras activas
CREATE OR REPLACE FUNCTION fbo_rh_piquete_generate(
    p_ano INTEGER,
    p_mes INTEGER
)
RETURNS TEXT AS $$
DECLARE
    v_semana_inicio DATE;
    v_semana_fim    DATE;
    v_primeiro_dia  DATE;
    v_user_fk       INTEGER;
    v_intervalo     INTEGER;
    v_semanas_geradas INTEGER := 0;
    v_regra_consecutivas BOOLEAN;
    v_regra_ferias       BOOLEAN;
    v_regra_baixa        BOOLEAN;
BEGIN
    v_primeiro_dia := make_date(p_ano, p_mes, 1);

    -- Ler configuração das regras activas
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_consecutivas' AND ativo)
    INTO v_regra_consecutivas;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_ferias' AND ativo)
    INTO v_regra_ferias;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_baixa' AND ativo)
    INTO v_regra_baixa;

    -- Intervalo mínimo entre piquetes (em semanas)
    SELECT COALESCE(valor::INTEGER, 2) INTO v_intervalo
    FROM ts_rh_piquete_regras WHERE codigo = 'sem_consecutivas';

    -- Apagar escalas auto-geradas deste mês (para re-geração)
    DELETE FROM tb_rh_piquete_escala
    WHERE gerado_auto = TRUE
      AND EXTRACT(YEAR FROM data_inicio) = p_ano
      AND EXTRACT(MONTH FROM data_inicio) = p_mes;

    -- Encontrar a 1ª segunda-feira do mês (ou dia 1 se for segunda)
    v_semana_inicio := v_primeiro_dia +
        ((8 - EXTRACT(DOW FROM v_primeiro_dia)::INTEGER) % 7) * INTERVAL '1 day';

    IF EXTRACT(DOW FROM v_primeiro_dia) = 1 THEN
        v_semana_inicio := v_primeiro_dia;
    END IF;

    -- Iterar semanas que começam dentro do mês
    WHILE EXTRACT(MONTH FROM v_semana_inicio) = p_mes LOOP
        v_semana_fim := v_semana_inicio + INTERVAL '6 days';

        -- Seleccionar colaborador elegível com menos piquetes recentes
        SELECT c.pk INTO v_user_fk
        FROM ts_client c
        WHERE c.ativo = TRUE  -- apenas colaboradores activos
          -- Regra: não pode ter férias aprovadas nesta semana
          AND (NOT v_regra_ferias OR NOT EXISTS (
              SELECT 1 FROM tb_rh_ferias f
              WHERE f.tb_user_fk = c.pk
                AND f.ts_estado_fk = 3
                AND f.data_inicio <= v_semana_fim
                AND f.data_fim >= v_semana_inicio
          ))
          -- Regra: não pode ter baixa/licença activa nesta semana
          AND (NOT v_regra_baixa OR NOT EXISTS (
              SELECT 1 FROM tb_rh_faltas fa
              WHERE fa.tb_user_fk = c.pk
                AND fa.tt_tipo_falta_fk = 4  -- Licença
                AND fa.ts_estado_fk IN (2, 3)
                AND fa.data = v_semana_inicio
          ))
          -- Regra: intervalo mínimo entre piquetes
          AND (NOT v_regra_consecutivas OR NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e
              WHERE e.tb_user_fk = c.pk
                AND e.data_inicio >= v_semana_inicio - (v_intervalo * 7 || ' days')::INTERVAL
                AND e.data_inicio < v_semana_inicio
          ))
          -- Não pode já estar escalado nesta semana
          AND NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e2
              WHERE e2.tb_user_fk = c.pk AND e2.data_inicio = v_semana_inicio
          )
        ORDER BY (
            -- Priorizar quem fez piquete há mais tempo
            SELECT COALESCE(MAX(data_inicio), '1900-01-01'::DATE)
            FROM tb_rh_piquete_escala
            WHERE tb_user_fk = c.pk
        ) ASC
        LIMIT 1;

        IF v_user_fk IS NOT NULL THEN
            INSERT INTO tb_rh_piquete_escala (
                pk, tb_user_fk, data_inicio, data_fim,
                confirmado, ts_estado_fk, gerado_auto
            ) VALUES (
                fs_nextcode(), v_user_fk, v_semana_inicio, v_semana_fim,
                FALSE, 1, TRUE
            );
            v_semanas_geradas := v_semanas_geradas + 1;
        END IF;

        v_semana_inicio := v_semana_inicio + INTERVAL '7 days';
    END LOOP;

    RETURN '<sucess>|semanas=' || v_semanas_geradas;
END;
$$ LANGUAGE plpgsql;


-- Colaborador confirma conhecimento do piquete
CREATE OR REPLACE FUNCTION fbo_rh_piquete_confirmar(
    p_pk        INTEGER,
    p_user_fk   INTEGER
)
RETURNS TEXT AS $$
BEGIN
    UPDATE tb_rh_piquete_escala
    SET confirmado     = TRUE,
        ts_confirmacao = NOW()
    WHERE pk = p_pk AND tb_user_fk = p_user_fk;

    IF NOT FOUND THEN
        RETURN '<error>Escala não encontrada ou não pertence ao colaborador</error>';
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;


-- Criar/editar ocorrência de piquete
CREATE OR REPLACE FUNCTION fbo_rh_ocorrencia(
    p_op                    INTEGER,
    p_pk                    INTEGER,
    p_tb_piquete_escala_fk  INTEGER,
    p_tt_tipo_fk            INTEGER,
    p_descr                 TEXT,
    p_equipas_accionadas    VARCHAR DEFAULT NULL,
    p_evidencia_path        VARCHAR DEFAULT NULL,
    p_created_by            INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_op = 0 THEN  -- INSERT
        v_pk := fs_nextcode();
        INSERT INTO tb_rh_piquete_ocorrencia (
            pk, tb_piquete_escala_fk, tt_tipo_fk, descr,
            equipas_accionadas, evidencia_path, created_by
        ) VALUES (
            v_pk, p_tb_piquete_escala_fk, p_tt_tipo_fk, p_descr,
            p_equipas_accionadas, p_evidencia_path, p_created_by
        );
    ELSIF p_op = 1 THEN  -- UPDATE
        SELECT pk INTO v_pk FROM tb_rh_piquete_ocorrencia WHERE pk = p_pk;
        IF v_pk IS NULL THEN
            RETURN '<error>Ocorrência não encontrada: ' || p_pk || '</error>';
        END IF;

        UPDATE tb_rh_piquete_ocorrencia
        SET tt_tipo_fk          = p_tt_tipo_fk,
            descr               = p_descr,
            equipas_accionadas  = COALESCE(p_equipas_accionadas, equipas_accionadas),
            evidencia_path      = COALESCE(p_evidencia_path, evidencia_path)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 12.2: Testar**

```sql
-- Gerar escala para Julho 2026
SELECT fbo_rh_piquete_generate(2026, 7);
-- Esperado: '<sucess>|semanas=N' (N = nº de semanas de Segunda no mês)

-- Verificar escalas geradas
SELECT e.pk, e.tb_user_fk, e.data_inicio, e.data_fim, e.confirmado
FROM tb_rh_piquete_escala e
WHERE EXTRACT(YEAR FROM data_inicio) = 2026
  AND EXTRACT(MONTH FROM data_inicio) = 7
ORDER BY data_inicio;

-- Confirmar piquete (usar pk real da escala acima)
SELECT fbo_rh_piquete_confirmar(XXXX, 1);
-- Esperado: '<sucess>|pk=XXXX'
```

- [ ] **Step 12.3: Commit**

```bash
git add backend/app/sql/rh/13_fbo_piquete.sql
git commit -m "feat(rh-bd): criar fbo_rh_piquete_generate, confirmar e fbo_rh_ocorrencia"
```

---

## Task 13: Views de Leitura (vbl_rh_*)

**Files:**
- Create: `backend/app/sql/rh/14_views.sql`

- [ ] **Step 13.1: Criar todas as views**

```sql
-- backend/app/sql/rh/14_views.sql

-- Vista de colaboradores com saldo e horário activo
CREATE OR REPLACE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    c.email,
    COALESCE(cfg.dias_ferias_total, 22)  AS dias_ferias_total,
    COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_gozados,
    COALESCE(cfg.dias_ferias_total, 22) - COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_disponiveis,
    cfg.ano                              AS config_ano,
    h.pk                                 AS horario_pk,
    h.descr                              AS horario_descr,
    j.descr                              AS jornada_descr,
    j.pk                                 AS tt_jornada_fk,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco
FROM ts_client c
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j
    ON j.pk = h.tt_jornada_fk;


-- Vista de registos de ponto com informação do utilizador
CREATE OR REPLACE VIEW vbl_rh_ponto AS
SELECT
    p.pk,
    p.tb_user_fk,
    c.name                          AS colaborador_nome,
    p.data,
    p.tt_evento_fk,
    e.descr                         AS evento_descr,
    e.ordem                         AS evento_ordem,
    p.ts_registo,
    p.latitude,
    p.longitude,
    p.precisao_metros,
    p.fonte,
    p.notas,
    CASE WHEN p.latitude IS NOT NULL THEN TRUE ELSE FALSE END AS tem_gps
FROM tb_rh_ponto p
JOIN ts_client c     ON c.pk = p.tb_user_fk
JOIN tt_rh_ponto_evento e ON e.pk = p.tt_evento_fk;


-- Vista de mapas mensais
CREATE OR REPLACE VIEW vbl_rh_ponto_mensal AS
SELECT
    m.pk,
    m.tb_user_fk,
    c.name                          AS colaborador_nome,
    m.ano,
    m.mes,
    m.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    m.total_horas,
    m.total_dias,
    m.submetido_em,
    m.notas_colaborador
FROM tb_rh_ponto_mensal m
JOIN ts_client c                   ON c.pk = m.tb_user_fk
JOIN tt_rh_estado_workflow es      ON es.pk = m.ts_estado_fk;


-- Vista de pedidos de férias
CREATE OR REPLACE VIEW vbl_rh_ferias AS
SELECT
    f.pk,
    f.tb_user_fk,
    c.name                          AS colaborador_nome,
    f.tt_tipo_fk,
    t.descr                         AS tipo_descr,
    t.debita_saldo,
    f.data_inicio,
    f.data_fim,
    f.dias_uteis,
    f.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    f.notas,
    f.created_at
FROM tb_rh_ferias f
JOIN ts_client c                   ON c.pk = f.tb_user_fk
JOIN tt_rh_tipo_ferias t           ON t.pk = f.tt_tipo_fk
JOIN tt_rh_estado_workflow es      ON es.pk = f.ts_estado_fk;


-- Vista de saldo de férias (total - gozados - pendentes)
CREATE OR REPLACE VIEW vbl_rh_saldo_ferias AS
SELECT
    c.pk                            AS tb_user_fk,
    c.name                          AS colaborador_nome,
    EXTRACT(YEAR FROM NOW())::INT   AS ano,
    COALESCE(cfg.dias_ferias_total, 22)  AS dias_total,
    COALESCE(cfg.dias_ferias_gozados, 0) AS dias_gozados,
    COALESCE((
        SELECT SUM(dias_uteis) FROM tb_rh_ferias
        WHERE tb_user_fk = c.pk
          AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
          AND ts_estado_fk IN (1, 2)
          AND tt_tipo_fk = 1
    ), 0)                           AS dias_pendentes,
    COALESCE(cfg.dias_ferias_total, 22)
        - COALESCE(cfg.dias_ferias_gozados, 0)
        - COALESCE((
            SELECT SUM(dias_uteis) FROM tb_rh_ferias
            WHERE tb_user_fk = c.pk
              AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
              AND ts_estado_fk IN (1, 2) AND tt_tipo_fk = 1
          ), 0)                     AS dias_disponiveis
FROM ts_client c
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT;


-- Vista de faltas
CREATE OR REPLACE VIEW vbl_rh_faltas AS
SELECT
    fa.pk,
    fa.tb_user_fk,
    c.name                          AS colaborador_nome,
    fa.tt_tipo_falta_fk,
    t.descr                         AS tipo_descr,
    t.requer_justificativo,
    fa.data,
    fa.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    fa.justificativo_path,
    fa.comunicado_por,
    CASE WHEN fa.comunicado_por IS NOT NULL THEN cp.name ELSE NULL END AS comunicado_por_nome,
    fa.notas,
    fa.created_at
FROM tb_rh_faltas fa
JOIN ts_client c                   ON c.pk = fa.tb_user_fk
JOIN tt_rh_tipo_falta t            ON t.pk = fa.tt_tipo_falta_fk
JOIN tt_rh_estado_workflow es      ON es.pk = fa.ts_estado_fk
LEFT JOIN ts_client cp             ON cp.pk = fa.comunicado_por;


-- Vista de horários
CREATE OR REPLACE VIEW vbl_rh_horario AS
SELECT
    h.pk,
    h.tb_user_fk,
    c.name                          AS colaborador_nome,
    h.tt_jornada_fk,
    j.descr                         AS jornada_descr,
    h.descr,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    h.dias_semana,
    h.data_inicio,
    h.data_fim,
    CASE WHEN h.data_fim IS NULL THEN TRUE ELSE FALSE END AS activo
FROM ts_rh_horario h
JOIN ts_client c                   ON c.pk = h.tb_user_fk
JOIN tt_rh_tipo_jornada j          ON j.pk = h.tt_jornada_fk;


-- Vista de escala de piquete
CREATE OR REPLACE VIEW vbl_rh_piquete AS
SELECT
    e.pk,
    e.tb_user_fk,
    c.name                          AS colaborador_nome,
    e.data_inicio,
    e.data_fim,
    e.confirmado,
    e.ts_confirmacao,
    e.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    e.gerado_auto,
    e.created_at,
    EXTRACT(YEAR FROM e.data_inicio)::INT   AS ano,
    EXTRACT(MONTH FROM e.data_inicio)::INT  AS mes
FROM tb_rh_piquete_escala e
JOIN ts_client c                   ON c.pk = e.tb_user_fk
JOIN tt_rh_estado_workflow es      ON es.pk = e.ts_estado_fk;


-- Vista de ocorrências de piquete
CREATE OR REPLACE VIEW vbl_rh_piquete_ocorrencias AS
SELECT
    o.pk,
    o.tb_piquete_escala_fk,
    e.tb_user_fk,
    e.data_inicio                   AS semana_inicio,
    e.data_fim                      AS semana_fim,
    c.name                          AS colaborador_nome,
    o.tt_tipo_fk,
    t.descr                         AS tipo_descr,
    o.descr,
    o.equipas_accionadas,
    o.evidencia_path,
    o.created_by,
    cb.name                         AS created_by_nome,
    o.created_at
FROM tb_rh_piquete_ocorrencia o
JOIN tb_rh_piquete_escala e        ON e.pk = o.tb_piquete_escala_fk
JOIN ts_client c                   ON c.pk = e.tb_user_fk
JOIN tt_rh_piquete_ocorrencia t    ON t.pk = o.tt_tipo_fk
LEFT JOIN ts_client cb             ON cb.pk = o.created_by;
```

- [ ] **Step 13.2: Executar e verificar views**

```sql
SELECT table_name FROM information_schema.views
WHERE table_name LIKE 'vbl_rh_%'
ORDER BY table_name;
-- Deve retornar 9 views

-- Smoke test: cada view deve executar sem erros
SELECT COUNT(*) FROM vbl_rh_colaborador;
SELECT COUNT(*) FROM vbl_rh_ponto;
SELECT COUNT(*) FROM vbl_rh_ponto_mensal;
SELECT COUNT(*) FROM vbl_rh_ferias;
SELECT COUNT(*) FROM vbl_rh_saldo_ferias;
SELECT COUNT(*) FROM vbl_rh_faltas;
SELECT COUNT(*) FROM vbl_rh_horario;
SELECT COUNT(*) FROM vbl_rh_piquete;
SELECT COUNT(*) FROM vbl_rh_piquete_ocorrencias;
```

- [ ] **Step 13.3: Commit**

```bash
git add backend/app/sql/rh/14_views.sql
git commit -m "feat(rh-bd): criar todas as views vbl_rh_*"
```

---

## Task 14: Smoke Tests e Verificação Final

**Files:**
- Create: `backend/app/sql/rh/15_verify.sql`

- [ ] **Step 14.1: Criar script de verificação**

```sql
-- backend/app/sql/rh/15_verify.sql
-- Executar após toda a BD estar criada — verifica integridade do esquema

-- 1. Todas as tabelas existem
SELECT
    CASE WHEN COUNT(*) = 12 THEN 'OK' ELSE 'FALHOU' END AS tabelas_check,
    COUNT(*) AS total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tt_rh_tipo_jornada', 'tt_rh_ponto_evento', 'tt_rh_tipo_ferias',
    'tt_rh_tipo_falta', 'tt_rh_estado_workflow', 'tt_rh_piquete_ocorrencia',
    'ts_rh_config', 'ts_rh_horario', 'ts_feriados',
    'tb_rh_ponto', 'tb_rh_ponto_mensal', 'tb_rh_ferias',
    'tb_rh_faltas', 'tb_rh_workflow', 'tb_rh_piquete_escala',
    'tb_rh_piquete_ocorrencia', 'ts_rh_piquete_regras'
  );

-- 2. Todas as views existem
SELECT
    CASE WHEN COUNT(*) = 9 THEN 'OK' ELSE 'FALHOU' END AS views_check,
    COUNT(*) AS total
FROM information_schema.views
WHERE table_name LIKE 'vbl_rh_%';

-- 3. Todas as funções existem
SELECT
    CASE WHEN COUNT(*) >= 12 THEN 'OK' ELSE 'FALHOU' END AS funcoes_check,
    COUNT(*) AS total
FROM information_schema.routines
WHERE routine_name IN (
    'fn_rh_dias_uteis',
    'fbo_rh_ponto_evento', 'fbo_rh_ponto_submeter', 'fbo_rh_ponto_corrigir',
    'fbo_rh_workflow',
    'fbo_rh_ferias', 'fbo_rh_config_upsert',
    'fbo_rh_faltas',
    'fbo_rh_horario',
    'fbo_rh_piquete_generate', 'fbo_rh_piquete_confirmar', 'fbo_rh_ocorrencia'
);

-- 4. Seed data correcta
SELECT 'Feriados 2026' AS check_name,
    CASE WHEN COUNT(*) = 13 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || ')' END AS resultado
FROM ts_feriados WHERE EXTRACT(YEAR FROM data) = 2026;

SELECT 'Regras piquete' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || ')' END AS resultado
FROM ts_rh_piquete_regras;

SELECT 'Lookups completos' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU' END AS resultado
FROM tt_rh_estado_workflow;

-- 5. Função dias_uteis correcta
SELECT 'fn_rh_dias_uteis' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-04', '2026-05-08') = 5 THEN 'OK'
         ELSE 'FALHOU' END AS resultado;
```

- [ ] **Step 14.2: Executar e confirmar todos os checks OK**

Todos os resultados devem mostrar `OK`. Se algum mostrar `FALHOU`, rever o task correspondente.

- [ ] **Step 14.3: Commit final do plano 1**

```bash
git add backend/app/sql/rh/15_verify.sql
git commit -m "feat(rh-bd): script de verificação do schema RH

Plano 1 completo — BD Foundation pronta para Planos 2, 3 e 4.
17 tabelas/lookups, 9 views, 12 funções, feriados PT 2025-2027."
```

---

## Checklist Final — Plano 1

- [ ] Task 1: Lookups `tt_rh_*` criados e com seed
- [ ] Task 2: Tabelas config `ts_rh_config`, `ts_rh_horario`, `ts_feriados`
- [ ] Task 3: Tabelas ponto `tb_rh_ponto`, `tb_rh_ponto_mensal`
- [ ] Task 4: Tabelas férias, faltas, workflow
- [ ] Task 5: Tabelas piquete + regras seed
- [ ] Task 6: Feriados PT 2025–2027 seed
- [ ] Task 7: `fn_rh_dias_uteis` com testes passados
- [ ] Task 8: `fbo_rh_ponto_*` (3 funções)
- [ ] Task 9: `fbo_rh_workflow` com débito automático de saldo
- [ ] Task 10: `fbo_rh_ferias` + `fbo_rh_config_upsert`
- [ ] Task 11: `fbo_rh_faltas` + `fbo_rh_horario`
- [ ] Task 12: `fbo_rh_piquete_generate` + confirmar + ocorrência
- [ ] Task 13: Todas as 9 views `vbl_rh_*`
- [ ] Task 14: Script de verificação passa todos os checks

**Próximo:** Plano 2 — Horário + Ponto (Backend Flask + Frontend React)
