-- backend/app/sql/rh/05_tables_piquete.sql

-- Escala semanal de piquete
CREATE TABLE IF NOT EXISTS tb_rh_piquete_escala (
    pk              INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk      INTEGER  NOT NULL,
    data_inicio     DATE     NOT NULL,
    data_fim        DATE     NOT NULL,
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
    pk                   INTEGER  NOT NULL DEFAULT fs_nextcode(),
    tb_piquete_escala_fk INTEGER  NOT NULL REFERENCES tb_rh_piquete_escala(pk),
    tt_tipo_fk           INTEGER  NOT NULL REFERENCES tt_rh_piquete_ocorrencia(pk),
    descr                TEXT     NOT NULL,
    equipas_accionadas   VARCHAR(500),
    evidencia_path       VARCHAR(500),
    created_by           INTEGER  NOT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_piquete_ocorrencia PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_piquete_ocorr_escala ON tb_rh_piquete_ocorrencia (tb_piquete_escala_fk);

-- Regras de geração automática da escala (configurável pelo Admin RH)
CREATE TABLE IF NOT EXISTS ts_rh_piquete_regras (
    pk      INTEGER      NOT NULL DEFAULT fs_nextcode(),
    codigo  VARCHAR(50)  NOT NULL,
    descr   VARCHAR(200) NOT NULL,
    valor   VARCHAR(100),
    ativo   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_ts_rh_piquete_regras PRIMARY KEY (pk),
    CONSTRAINT uq_ts_rh_piquete_regras_codigo UNIQUE (codigo)
);

INSERT INTO ts_rh_piquete_regras (pk, codigo, descr, valor, ativo) VALUES
    (fs_nextcode(), 'sem_ferias',       'Exclui colaborador com férias aprovadas na semana', NULL,  TRUE),
    (fs_nextcode(), 'sem_consecutivas', 'Intervalo mínimo entre piquetes (semanas)',          '2',   TRUE),
    (fs_nextcode(), 'sem_baixa',        'Exclui colaborador com falta tipo Licença activa',   NULL,  TRUE),
    (fs_nextcode(), 'equitativo',       'Distribuir equitativamente por todos os elegíveis',  NULL,  TRUE)
ON CONFLICT (codigo) DO NOTHING;
