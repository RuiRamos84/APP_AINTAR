-- backend/app/sql/rh/02_tables_config.sql

-- Saldo anual de férias por colaborador
CREATE TABLE IF NOT EXISTS ts_rh_config (
    pk                  INTEGER NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk          INTEGER NOT NULL,
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
    hora_inicio_almoco  TIME,
    hora_fim_almoco     TIME,
    dias_semana         INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    data_inicio         DATE NOT NULL,
    data_fim            DATE,
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
    regiao   VARCHAR(50),
    CONSTRAINT pk_ts_feriados PRIMARY KEY (pk),
    CONSTRAINT uq_ts_feriados_data UNIQUE (data)
);

CREATE INDEX IF NOT EXISTS idx_ts_feriados_data ON ts_feriados (data);
