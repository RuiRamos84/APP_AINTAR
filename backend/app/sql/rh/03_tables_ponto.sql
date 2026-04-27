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
    fonte           VARCHAR(20) NOT NULL DEFAULT 'app',
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
    total_horas         DECIMAL(6,2),
    total_dias          INTEGER,
    submetido_em        TIMESTAMP,
    notas_colaborador   TEXT,
    CONSTRAINT pk_tb_rh_ponto_mensal PRIMARY KEY (pk),
    CONSTRAINT uq_tb_rh_ponto_mensal UNIQUE (tb_user_fk, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_mensal_user ON tb_rh_ponto_mensal (tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_mensal_ano  ON tb_rh_ponto_mensal (ano, mes);
