-- backend/app/sql/rh/03_tables_ponto.sql

-- Registo diário de ponto (cada evento: entrada, almoço, saída, saída temporária, regresso)
-- Eventos 1-4 são únicos por dia; eventos 5 (saída temporária) e 6 (regresso) são repetíveis
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
    CONSTRAINT pk_tb_rh_ponto PRIMARY KEY (pk)
    -- NOTA: sem UNIQUE global — constraint parcial abaixo permite repetição dos eventos 5 e 6
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_user_data ON tb_rh_ponto (tb_user_fk, data);
CREATE INDEX IF NOT EXISTS idx_tb_rh_ponto_data      ON tb_rh_ponto (data);

-- Unicidade apenas para eventos não repetíveis (Entrada=1, Início Almoço=2, Fim Almoço=3, Saída=4)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_rh_ponto_user_data_evento_unico
    ON tb_rh_ponto (tb_user_fk, data, tt_evento_fk)
    WHERE tt_evento_fk NOT IN (5, 6);

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
