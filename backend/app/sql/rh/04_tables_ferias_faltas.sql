-- backend/app/sql/rh/04_tables_ferias_faltas.sql

-- Pedidos de férias e tolerâncias
CREATE TABLE IF NOT EXISTS tb_rh_ferias (
    pk              INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk      INTEGER  NOT NULL,
    tt_tipo_fk      INTEGER  NOT NULL REFERENCES tt_rh_tipo_ferias(pk),
    data_inicio     DATE     NOT NULL,
    data_fim        DATE     NOT NULL,
    dias_uteis      INTEGER  NOT NULL,
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
    comunicado_por      INTEGER,
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
    step            INTEGER  NOT NULL,
    tb_user_fk      INTEGER  NOT NULL,
    ts_estado_fk    INTEGER  NOT NULL REFERENCES tt_rh_estado_workflow(pk),
    notas           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_workflow PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_workflow_ref  ON tb_rh_workflow (tipo_ref, ref_pk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_workflow_user ON tb_rh_workflow (tb_user_fk);
