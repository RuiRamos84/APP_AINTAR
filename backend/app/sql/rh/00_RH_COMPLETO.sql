-- =============================================================
-- RH PESSOAL - SCHEMA COMPLETO v4
-- AINTAR - Modulo Recursos Humanos
-- =============================================================
-- INSTRUCOES DBEAVER: Ctrl+A -> Alt+X (Execute SQL Script)
-- =============================================================

-- [01] 01_lookups.sql
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
    ordem INTEGER NOT NULL
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
    cor   VARCHAR(20)
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

-- [02] 02_tables_config.sql
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

-- [03] 03_tables_ponto.sql
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

-- [04] 04_tables_ferias_faltas.sql
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

-- [05] 05_tables_piquete.sql
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

-- [06] 06_feriados_seed.sql
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

-- [07] 07_fn_dias_uteis.sql
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
        v_dow := EXTRACT(DOW FROM v_current)::INTEGER;

        IF v_dow NOT IN (0, 6) THEN
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

-- [08] 08_fbo_ponto.sql
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
    v_pk      INTEGER;
    v_data    DATE := CURRENT_DATE;
    v_jornada INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM tb_rh_ponto
        WHERE tb_user_fk = p_user_fk
          AND data = v_data
          AND tt_evento_fk = p_tt_evento_fk
    ) THEN
        RETURN '<error>Evento já registado para hoje</error>';
    END IF;

    IF p_tt_evento_fk IN (2, 3) THEN
        SELECT tt_jornada_fk INTO v_jornada
        FROM ts_rh_horario
        WHERE tb_user_fk = p_user_fk AND data_fim IS NULL
        LIMIT 1;

        IF v_jornada = 2 THEN
            RETURN '<error>Jornada contínua não tem registo de almoço</error>';
        END IF;
    END IF;

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
    v_pk          INTEGER;
    v_total_horas DECIMAL(6,2);
    v_total_dias  INTEGER;
    v_exists      INTEGER;
BEGIN
    SELECT pk INTO v_exists
    FROM tb_rh_ponto_mensal
    WHERE tb_user_fk = p_user_fk AND ano = p_ano AND mes = p_mes;

    IF v_exists IS NOT NULL THEN
        RETURN '<error>Mapa mensal já submetido para ' || p_ano || '-' || p_mes || '</error>';
    END IF;

    SELECT
        COUNT(DISTINCT data),
        COALESCE(SUM(
            CASE
                WHEN tt_evento_fk = 4 THEN
                    EXTRACT(EPOCH FROM (
                        ts_registo - (
                            SELECT ts_registo FROM tb_rh_ponto p2
                            WHERE p2.tb_user_fk = p.tb_user_fk
                              AND p2.data = p.data
                              AND p2.tt_evento_fk = 1
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
    p_pk         INTEGER,
    p_ts_registo TIMESTAMP,
    p_notas      TEXT DEFAULT NULL
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

-- [09] 09_fbo_workflow.sql
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
    v_pk           INTEGER;
    v_estado_atual INTEGER;
    v_user_fk_ref  INTEGER;
    v_tipo_ferias  INTEGER;
    v_dias_uteis   INTEGER;
    v_debita       BOOLEAN;
BEGIN
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

    IF p_ts_estado_fk NOT IN (2, 3, 4) THEN
        RETURN '<error>Estado inválido para workflow</error>';
    END IF;
    IF p_step = 1 AND v_estado_atual != 1 THEN
        RETURN '<error>Superior só pode actuar em estado Pendente</error>';
    END IF;
    IF p_step = 2 AND v_estado_atual NOT IN (1, 2) THEN
        RETURN '<error>Admin RH só pode actuar em estado Pendente ou Validado</error>';
    END IF;

    IF p_tipo_ref = 'ponto' THEN
        UPDATE tb_rh_ponto_mensal SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;
    ELSIF p_tipo_ref = 'ferias' THEN
        UPDATE tb_rh_ferias SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;

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

    v_pk := fs_nextcode();
    INSERT INTO tb_rh_workflow (pk, tipo_ref, ref_pk, step, tb_user_fk, ts_estado_fk, notas)
    VALUES (v_pk, p_tipo_ref, p_ref_pk, p_step, p_user_fk, p_ts_estado_fk, p_notas);

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;

-- [10] 10_fbo_ferias.sql
-- backend/app/sql/rh/10_fbo_ferias.sql

-- INSERT/UPDATE de pedido de férias
-- p_op: 0=INSERT, 1=UPDATE
CREATE OR REPLACE FUNCTION fbo_rh_ferias(
    p_op          INTEGER,
    p_pk          INTEGER,
    p_user_fk     INTEGER,
    p_tt_tipo_fk  INTEGER,
    p_data_inicio DATE,
    p_data_fim    DATE,
    p_notas       TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk        INTEGER;
    v_dias      INTEGER;
    v_saldo     INTEGER;
    v_gozados   INTEGER;
    v_pendentes INTEGER;
    v_ano       INTEGER;
BEGIN
    v_dias := fn_rh_dias_uteis(p_data_inicio, p_data_fim);

    IF v_dias <= 0 THEN
        RETURN '<error>Período não contém dias úteis válidos</error>';
    END IF;

    v_ano := EXTRACT(YEAR FROM p_data_inicio)::INTEGER;

    IF p_op = 0 THEN
        IF p_tt_tipo_fk = 1 THEN
            SELECT dias_ferias_total, dias_ferias_gozados
            INTO v_saldo, v_gozados
            FROM ts_rh_config
            WHERE tb_user_fk = p_user_fk AND ano = v_ano;

            IF v_saldo IS NULL THEN
                RETURN '<error>Sem configuração de saldo para ' || p_user_fk || ' em ' || v_ano || '</error>';
            END IF;

            SELECT COALESCE(SUM(dias_uteis), 0) INTO v_pendentes
            FROM tb_rh_ferias
            WHERE tb_user_fk = p_user_fk
              AND EXTRACT(YEAR FROM data_inicio) = v_ano
              AND ts_estado_fk IN (1, 2)
              AND tt_tipo_fk = 1;

            IF v_gozados + v_pendentes + v_dias > v_saldo THEN
                RETURN '<error>Saldo insuficiente. Disponível: ' ||
                       (v_saldo - v_gozados - v_pendentes) || ' dias</error>';
            END IF;
        END IF;

        IF EXISTS (
            SELECT 1 FROM tb_rh_ferias
            WHERE tb_user_fk = p_user_fk
              AND ts_estado_fk IN (1, 2, 3)
              AND data_inicio <= p_data_fim
              AND data_fim >= p_data_inicio
        ) THEN
            RETURN '<error>Já existe um pedido de férias que se sobrepõe com este período</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_ferias (pk, tb_user_fk, tt_tipo_fk, data_inicio, data_fim, dias_uteis, notas)
        VALUES (v_pk, p_user_fk, p_tt_tipo_fk, p_data_inicio, p_data_fim, v_dias, p_notas);

    ELSIF p_op = 1 THEN
        SELECT pk INTO v_pk FROM tb_rh_ferias WHERE pk = p_pk AND ts_estado_fk = 1;
        IF v_pk IS NULL THEN
            RETURN '<error>Não é possível editar: registo não encontrado ou não está Pendente</error>';
        END IF;

        UPDATE tb_rh_ferias
        SET tt_tipo_fk  = p_tt_tipo_fk,
            data_inicio = p_data_inicio,
            data_fim    = p_data_fim,
            dias_uteis  = v_dias,
            notas       = p_notas
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida: ' || p_op || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;


-- Upsert do saldo anual de um colaborador (Admin RH)
CREATE OR REPLACE FUNCTION fbo_rh_config_upsert(
    p_user_fk    INTEGER,
    p_ano        INTEGER,
    p_dias_total INTEGER,
    p_notas      TEXT DEFAULT NULL
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
            notas             = COALESCE(p_notas, notas)
        WHERE pk = v_pk;
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;

-- [11] 11_fbo_faltas.sql
-- backend/app/sql/rh/11_fbo_faltas.sql

CREATE OR REPLACE FUNCTION fbo_rh_faltas(
    p_op                 INTEGER,
    p_pk                 INTEGER,
    p_user_fk            INTEGER,
    p_tt_tipo_falta_fk   INTEGER,
    p_data               DATE,
    p_justificativo_path VARCHAR DEFAULT NULL,
    p_notas              TEXT DEFAULT NULL,
    p_comunicado_por     INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_op = 0 THEN
        IF EXISTS (
            SELECT 1 FROM tb_rh_ferias
            WHERE tb_user_fk = p_user_fk
              AND ts_estado_fk = 3
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

    ELSIF p_op = 1 THEN
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

-- [12] 12_fbo_horario.sql
-- backend/app/sql/rh/12_fbo_horario.sql

CREATE OR REPLACE FUNCTION fbo_rh_horario(
    p_op                 INTEGER,
    p_pk                 INTEGER,
    p_user_fk            INTEGER,
    p_tt_jornada_fk      INTEGER,
    p_descr              VARCHAR,
    p_hora_entrada       TIME,
    p_hora_saida         TIME,
    p_hora_inicio_almoco TIME    DEFAULT NULL,
    p_hora_fim_almoco    TIME    DEFAULT NULL,
    p_dias_semana        INTEGER[] DEFAULT '{1,2,3,4,5}',
    p_data_inicio        DATE    DEFAULT CURRENT_DATE,
    p_data_fim           DATE    DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_tt_jornada_fk = 1 AND (p_hora_inicio_almoco IS NULL OR p_hora_fim_almoco IS NULL) THEN
        RETURN '<error>Jornada Partida requer horas de início e fim de almoço</error>';
    END IF;

    IF p_op = 0 THEN
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

    ELSIF p_op = 1 THEN
        SELECT pk INTO v_pk FROM ts_rh_horario WHERE pk = p_pk;
        IF v_pk IS NULL THEN
            RETURN '<error>Horário não encontrado: ' || p_pk || '</error>';
        END IF;

        UPDATE ts_rh_horario
        SET tt_jornada_fk      = p_tt_jornada_fk,
            descr              = p_descr,
            hora_entrada       = p_hora_entrada,
            hora_saida         = p_hora_saida,
            hora_inicio_almoco = p_hora_inicio_almoco,
            hora_fim_almoco    = p_hora_fim_almoco,
            dias_semana        = p_dias_semana,
            data_fim           = p_data_fim
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;

-- [13] 13_fbo_piquete.sql
-- backend/app/sql/rh/13_fbo_piquete.sql

-- Gerar escala mensal de piquete aplicando as regras activas
CREATE OR REPLACE FUNCTION fbo_rh_piquete_generate(
    p_ano INTEGER,
    p_mes INTEGER
)
RETURNS TEXT AS $$
DECLARE
    v_semana_inicio      DATE;
    v_semana_fim         DATE;
    v_primeiro_dia       DATE;
    v_user_fk            INTEGER;
    v_intervalo          INTEGER;
    v_semanas_geradas    INTEGER := 0;
    v_regra_consecutivas BOOLEAN;
    v_regra_ferias       BOOLEAN;
    v_regra_baixa        BOOLEAN;
BEGIN
    v_primeiro_dia := make_date(p_ano, p_mes, 1);

    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_consecutivas' AND ativo)
    INTO v_regra_consecutivas;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_ferias' AND ativo)
    INTO v_regra_ferias;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_baixa' AND ativo)
    INTO v_regra_baixa;

    SELECT COALESCE(valor::INTEGER, 2) INTO v_intervalo
    FROM ts_rh_piquete_regras WHERE codigo = 'sem_consecutivas';

    DELETE FROM tb_rh_piquete_escala
    WHERE gerado_auto = TRUE
      AND EXTRACT(YEAR FROM data_inicio) = p_ano
      AND EXTRACT(MONTH FROM data_inicio) = p_mes;

    -- Encontrar a 1ª segunda-feira do mês
    v_semana_inicio := v_primeiro_dia +
        ((8 - EXTRACT(DOW FROM v_primeiro_dia)::INTEGER) % 7) * INTERVAL '1 day';

    IF EXTRACT(DOW FROM v_primeiro_dia) = 1 THEN
        v_semana_inicio := v_primeiro_dia;
    END IF;

    WHILE EXTRACT(MONTH FROM v_semana_inicio) = p_mes LOOP
        v_semana_fim := v_semana_inicio + INTERVAL '6 days';

        SELECT c.pk INTO v_user_fk
        FROM ts_client c
        WHERE COALESCE(c.active, 1) = 1
          AND (NOT v_regra_ferias OR NOT EXISTS (
              SELECT 1 FROM tb_rh_ferias f
              WHERE f.tb_user_fk = c.pk
                AND f.ts_estado_fk = 3
                AND f.data_inicio <= v_semana_fim
                AND f.data_fim >= v_semana_inicio
          ))
          AND (NOT v_regra_baixa OR NOT EXISTS (
              SELECT 1 FROM tb_rh_faltas fa
              WHERE fa.tb_user_fk = c.pk
                AND fa.tt_tipo_falta_fk = 4
                AND fa.ts_estado_fk IN (2, 3)
                AND fa.data = v_semana_inicio
          ))
          AND (NOT v_regra_consecutivas OR NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e
              WHERE e.tb_user_fk = c.pk
                AND e.data_inicio >= v_semana_inicio - (v_intervalo * 7 || ' days')::INTERVAL
                AND e.data_inicio < v_semana_inicio
          ))
          AND NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e2
              WHERE e2.tb_user_fk = c.pk AND e2.data_inicio = v_semana_inicio
          )
        ORDER BY (
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
    p_pk      INTEGER,
    p_user_fk INTEGER
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
    p_op                   INTEGER,
    p_pk                   INTEGER,
    p_tb_piquete_escala_fk INTEGER,
    p_tt_tipo_fk           INTEGER,
    p_descr                TEXT,
    p_equipas_accionadas   VARCHAR DEFAULT NULL,
    p_evidencia_path       VARCHAR DEFAULT NULL,
    p_created_by           INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_op = 0 THEN
        v_pk := fs_nextcode();
        INSERT INTO tb_rh_piquete_ocorrencia (
            pk, tb_piquete_escala_fk, tt_tipo_fk, descr,
            equipas_accionadas, evidencia_path, created_by
        ) VALUES (
            v_pk, p_tb_piquete_escala_fk, p_tt_tipo_fk, p_descr,
            p_equipas_accionadas, p_evidencia_path, p_created_by
        );
    ELSIF p_op = 1 THEN
        SELECT pk INTO v_pk FROM tb_rh_piquete_ocorrencia WHERE pk = p_pk;
        IF v_pk IS NULL THEN
            RETURN '<error>Ocorrência não encontrada: ' || p_pk || '</error>';
        END IF;

        UPDATE tb_rh_piquete_ocorrencia
        SET tt_tipo_fk         = p_tt_tipo_fk,
            descr              = p_descr,
            equipas_accionadas = COALESCE(p_equipas_accionadas, equipas_accionadas),
            evidencia_path     = COALESCE(p_evidencia_path, evidencia_path)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;

-- [14] 14_views.sql
-- backend/app/sql/rh/14_views.sql

-- Vista de colaboradores com saldo e horário activo
CREATE OR REPLACE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
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
LEFT JOIN ts_entity e
    ON e.pk = c.ts_entity
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
JOIN ts_client c          ON c.pk = p.tb_user_fk
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
JOIN ts_client c              ON c.pk = m.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = m.ts_estado_fk;


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
JOIN ts_client c              ON c.pk = f.tb_user_fk
JOIN tt_rh_tipo_ferias t      ON t.pk = f.tt_tipo_fk
JOIN tt_rh_estado_workflow es ON es.pk = f.ts_estado_fk;


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
JOIN ts_client c              ON c.pk = fa.tb_user_fk
JOIN tt_rh_tipo_falta t       ON t.pk = fa.tt_tipo_falta_fk
JOIN tt_rh_estado_workflow es ON es.pk = fa.ts_estado_fk
LEFT JOIN ts_client cp        ON cp.pk = fa.comunicado_por;


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
JOIN ts_client c            ON c.pk = h.tb_user_fk
JOIN tt_rh_tipo_jornada j   ON j.pk = h.tt_jornada_fk;


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
    EXTRACT(YEAR FROM e.data_inicio)::INT  AS ano,
    EXTRACT(MONTH FROM e.data_inicio)::INT AS mes
FROM tb_rh_piquete_escala e
JOIN ts_client c              ON c.pk = e.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = e.ts_estado_fk;


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
JOIN tb_rh_piquete_escala e       ON e.pk = o.tb_piquete_escala_fk
JOIN ts_client c                  ON c.pk = e.tb_user_fk
JOIN tt_rh_piquete_ocorrencia t   ON t.pk = o.tt_tipo_fk
LEFT JOIN ts_client cb            ON cb.pk = o.created_by;

-- [17] 17_ts_rh_colaborador.sql
-- backend/app/sql/rh/17_ts_rh_colaborador.sql
-- Tabela de extensão RH — perfil de colaborador (herança 1-to-1 de ts_client)
--
-- O PK desta tabela = ts_client.pk. Não usa fs_nextcode().
-- Apenas colaboradores internos têm registo aqui.

-- ─── 1. Tabela principal ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_rh_colaborador (
    pk                  INTEGER      NOT NULL,
    data_nascimento     DATE,
    data_admissao       DATE,
    categoria           VARCHAR(100),
    tipo_contrato       VARCHAR(50),          -- 'Efectivo','A Prazo','Estágio', etc.
    num_mecanografico   VARCHAR(20),          -- número interno de funcionário
    departamento        VARCHAR(100),
    superior_fk         INTEGER REFERENCES ts_client(pk) ON DELETE SET NULL,
    dias_ferias_base    INTEGER NOT NULL DEFAULT 22,  -- base para novos anos
    elegivel_piquete    BOOLEAN NOT NULL DEFAULT TRUE,
    notas               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ts_rh_colaborador   PRIMARY KEY (pk),
    CONSTRAINT fk_ts_rh_col_client    FOREIGN KEY (pk) REFERENCES ts_client(pk) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ts_rh_col_superior   ON ts_rh_colaborador (superior_fk);
CREATE INDEX IF NOT EXISTS idx_ts_rh_col_depto      ON ts_rh_colaborador (departamento);
CREATE INDEX IF NOT EXISTS idx_ts_rh_col_piquete    ON ts_rh_colaborador (elegivel_piquete) WHERE elegivel_piquete = TRUE;


-- ─── 2. Trigger updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_rh_col_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ts_rh_col_updated_at ON ts_rh_colaborador;
CREATE TRIGGER trg_ts_rh_col_updated_at
    BEFORE UPDATE ON ts_rh_colaborador
    FOR EACH ROW EXECUTE FUNCTION fn_rh_col_updated_at();


-- ─── 3. fn_rh_calcular_ferias_ano ────────────────────────────────────────────
-- Calcula os dias de férias a que o colaborador tem direito num dado ano,
-- considerando a data de admissão (proporcional no 1º ano) e a base configurada.
CREATE OR REPLACE FUNCTION fn_rh_calcular_ferias_ano(
    p_user_fk INTEGER,
    p_ano     INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_data_admissao  DATE;
    v_dias_base      INTEGER;
    v_ano_admissao   INTEGER;
    v_dias_calc      INTEGER;
    v_dias_no_ano    INTEGER;   -- dias de trabalho a partir da admissão até fim do ano
BEGIN
    SELECT data_admissao, dias_ferias_base
    INTO v_data_admissao, v_dias_base
    FROM ts_rh_colaborador
    WHERE pk = p_user_fk;

    -- Sem perfil de colaborador → devolver base padrão 22
    IF v_data_admissao IS NULL THEN
        RETURN COALESCE(v_dias_base, 22);
    END IF;

    v_ano_admissao := EXTRACT(YEAR FROM v_data_admissao)::INTEGER;

    -- Ano anterior à admissão → 0 dias
    IF p_ano < v_ano_admissao THEN
        RETURN 0;
    END IF;

    -- Ano de admissão → proporcional: dias restantes no ano / 365 × base
    IF p_ano = v_ano_admissao THEN
        v_dias_no_ano := make_date(p_ano, 12, 31) - v_data_admissao + 1;
        v_dias_calc   := ROUND(v_dias_no_ano::NUMERIC / 365.0 * v_dias_base)::INTEGER;
        RETURN GREATEST(v_dias_calc, 0);
    END IF;

    -- Anos seguintes → base completa
    RETURN COALESCE(v_dias_base, 22);
END;
$$ LANGUAGE plpgsql STABLE;


-- ─── 4. fbo_rh_colaborador (upsert) ─────────────────────────────────────────
-- p_op: 0 = INSERT (cria perfil), 1 = UPDATE (actualiza campos não-nulos)
CREATE OR REPLACE FUNCTION fbo_rh_colaborador(
    p_op                INTEGER,
    p_pk                INTEGER,
    p_data_nascimento   DATE        DEFAULT NULL,
    p_data_admissao     DATE        DEFAULT NULL,
    p_categoria         VARCHAR     DEFAULT NULL,
    p_tipo_contrato     VARCHAR     DEFAULT NULL,
    p_num_mecanografico VARCHAR     DEFAULT NULL,
    p_departamento      VARCHAR     DEFAULT NULL,
    p_superior_fk       INTEGER     DEFAULT NULL,
    p_dias_ferias_base  INTEGER     DEFAULT NULL,
    p_elegivel_piquete  BOOLEAN     DEFAULT NULL,
    p_notas             TEXT        DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Verificar que o utilizador existe em ts_client
    IF NOT EXISTS (SELECT 1 FROM ts_client WHERE pk = p_pk) THEN
        RETURN '<error>Utilizador não encontrado: ' || p_pk || '</error>';
    END IF;

    SELECT EXISTS(SELECT 1 FROM ts_rh_colaborador WHERE pk = p_pk) INTO v_exists;

    IF p_op = 0 THEN  -- INSERT / UPSERT
        IF v_exists THEN
            -- Já existe → actualizar campos fornecidos
            UPDATE ts_rh_colaborador SET
                data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
                data_admissao     = COALESCE(p_data_admissao,     data_admissao),
                categoria         = COALESCE(p_categoria,         categoria),
                tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
                num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
                departamento      = COALESCE(p_departamento,      departamento),
                superior_fk       = COALESCE(p_superior_fk,       superior_fk),
                dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
                elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
                notas             = COALESCE(p_notas,             notas)
            WHERE pk = p_pk;
        ELSE
            INSERT INTO ts_rh_colaborador (
                pk, data_nascimento, data_admissao, categoria, tipo_contrato,
                num_mecanografico, departamento, superior_fk,
                dias_ferias_base, elegivel_piquete, notas
            ) VALUES (
                p_pk, p_data_nascimento, p_data_admissao, p_categoria, p_tipo_contrato,
                p_num_mecanografico, p_departamento, p_superior_fk,
                COALESCE(p_dias_ferias_base, 22), COALESCE(p_elegivel_piquete, TRUE), p_notas
            );
        END IF;

    ELSIF p_op = 1 THEN  -- UPDATE explícito (requer existência)
        IF NOT v_exists THEN
            RETURN '<error>Perfil RH não encontrado para utilizador ' || p_pk || '</error>';
        END IF;

        UPDATE ts_rh_colaborador SET
            data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
            data_admissao     = COALESCE(p_data_admissao,     data_admissao),
            categoria         = COALESCE(p_categoria,         categoria),
            tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
            num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
            departamento      = COALESCE(p_departamento,      departamento),
            superior_fk       = COALESCE(p_superior_fk,       superior_fk),
            dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
            elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
            notas             = COALESCE(p_notas,             notas)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida: ' || p_op || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;


-- ─── 5. fbo_rh_config_ano_init ───────────────────────────────────────────────
-- Inicializa o saldo anual de um colaborador usando fn_rh_calcular_ferias_ano.
-- Útil para criar configs no início de cada ano em massa.
CREATE OR REPLACE FUNCTION fbo_rh_config_ano_init(
    p_user_fk   INTEGER,
    p_ano       INTEGER,
    p_force     BOOLEAN DEFAULT FALSE   -- TRUE = recalcular mesmo se já existir
)
RETURNS TEXT AS $$
DECLARE
    v_dias   INTEGER;
    v_pk     INTEGER;
    v_exists INTEGER;
BEGIN
    v_dias := fn_rh_calcular_ferias_ano(p_user_fk, p_ano);

    SELECT pk INTO v_exists
    FROM ts_rh_config
    WHERE tb_user_fk = p_user_fk AND ano = p_ano;

    IF v_exists IS NOT NULL THEN
        IF NOT p_force THEN
            RETURN '<error>Configuração já existe para ' || p_user_fk || '/' || p_ano || '</error>';
        END IF;
        UPDATE ts_rh_config
        SET dias_ferias_total = v_dias
        WHERE pk = v_exists;
        RETURN '<sucess>|pk=' || v_exists || '|dias=' || v_dias;
    END IF;

    v_pk := fs_nextcode();
    INSERT INTO ts_rh_config (pk, tb_user_fk, ano, dias_ferias_total)
    VALUES (v_pk, p_user_fk, p_ano, v_dias);

    RETURN '<sucess>|pk=' || v_pk || '|dias=' || v_dias;
END;
$$ LANGUAGE plpgsql;


-- ─── 6. Actualizar vbl_rh_colaborador ────────────────────────────────────────
DROP VIEW IF EXISTS vbl_rh_colaborador CASCADE;
CREATE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
    -- Perfil RH
    col.data_nascimento,
    col.data_admissao,
    col.categoria,
    col.tipo_contrato,
    col.num_mecanografico,
    col.departamento,
    col.superior_fk,
    sup.name                              AS superior_nome,
    col.elegivel_piquete,
    col.notas                             AS notas_rh,
    -- Saldo férias do ano corrente
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)                               AS dias_ferias_total,
    COALESCE(cfg.dias_ferias_gozados, 0)  AS dias_ferias_gozados,
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22) - COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_disponiveis,
    cfg.ano                               AS config_ano,
    -- Horário activo
    h.pk                                  AS horario_pk,
    h.descr                               AS horario_descr,
    j.descr                               AS jornada_descr,
    j.pk                                  AS tt_jornada_fk,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    -- Antiguidade em anos completos
    CASE WHEN col.data_admissao IS NOT NULL
         THEN DATE_PART('year', AGE(NOW(), col.data_admissao))::INTEGER
         ELSE NULL
    END                                   AS anos_antiguidade
FROM ts_client c
LEFT JOIN ts_entity e
    ON e.pk = c.ts_entity
LEFT JOIN ts_rh_colaborador col
    ON col.pk = c.pk
LEFT JOIN ts_client sup
    ON sup.pk = col.superior_fk
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j
    ON j.pk = h.tt_jornada_fk;


-- ─── 7. Actualizar fbo_rh_piquete_generate ────────────────────────────────────
-- Adicionar verificação de elegivel_piquete ao gerador de escalas
CREATE OR REPLACE FUNCTION fbo_rh_piquete_generate(
    p_ano INTEGER,
    p_mes INTEGER
)
RETURNS TEXT AS $$
DECLARE
    v_semana_inicio      DATE;
    v_semana_fim         DATE;
    v_primeiro_dia       DATE;
    v_user_fk            INTEGER;
    v_intervalo          INTEGER;
    v_semanas_geradas    INTEGER := 0;
    v_regra_consecutivas BOOLEAN;
    v_regra_ferias       BOOLEAN;
    v_regra_baixa        BOOLEAN;
BEGIN
    v_primeiro_dia := make_date(p_ano, p_mes, 1);

    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_consecutivas' AND ativo)
    INTO v_regra_consecutivas;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_ferias' AND ativo)
    INTO v_regra_ferias;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_baixa' AND ativo)
    INTO v_regra_baixa;

    SELECT COALESCE(valor::INTEGER, 2) INTO v_intervalo
    FROM ts_rh_piquete_regras WHERE codigo = 'sem_consecutivas';

    DELETE FROM tb_rh_piquete_escala
    WHERE gerado_auto = TRUE
      AND EXTRACT(YEAR FROM data_inicio) = p_ano
      AND EXTRACT(MONTH FROM data_inicio) = p_mes;

    v_semana_inicio := v_primeiro_dia +
        ((8 - EXTRACT(DOW FROM v_primeiro_dia)::INTEGER) % 7) * INTERVAL '1 day';

    IF EXTRACT(DOW FROM v_primeiro_dia) = 1 THEN
        v_semana_inicio := v_primeiro_dia;
    END IF;

    WHILE EXTRACT(MONTH FROM v_semana_inicio) = p_mes LOOP
        v_semana_fim := v_semana_inicio + INTERVAL '6 days';

        SELECT c.pk INTO v_user_fk
        FROM ts_client c
        -- Apenas colaboradores elegíveis para piquete
        LEFT JOIN ts_rh_colaborador col ON col.pk = c.pk
        WHERE COALESCE(c.active, 1) = 1
          AND COALESCE(col.elegivel_piquete, TRUE) = TRUE
          AND (NOT v_regra_ferias OR NOT EXISTS (
              SELECT 1 FROM tb_rh_ferias f
              WHERE f.tb_user_fk = c.pk
                AND f.ts_estado_fk = 3
                AND f.data_inicio <= v_semana_fim
                AND f.data_fim >= v_semana_inicio
          ))
          AND (NOT v_regra_baixa OR NOT EXISTS (
              SELECT 1 FROM tb_rh_faltas fa
              WHERE fa.tb_user_fk = c.pk
                AND fa.tt_tipo_falta_fk = 4
                AND fa.ts_estado_fk IN (2, 3)
                AND fa.data = v_semana_inicio
          ))
          AND (NOT v_regra_consecutivas OR NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e
              WHERE e.tb_user_fk = c.pk
                AND e.data_inicio >= v_semana_inicio - (v_intervalo * 7 || ' days')::INTERVAL
                AND e.data_inicio < v_semana_inicio
          ))
          AND NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e2
              WHERE e2.tb_user_fk = c.pk AND e2.data_inicio = v_semana_inicio
          )
        ORDER BY (
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


-- ─── 8. Verificação ──────────────────────────────────────────────────────────
SELECT 'ts_rh_colaborador' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ts_rh_colaborador'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'fn_rh_calcular_ferias_ano' AS check_name,
    CASE WHEN fn_rh_calcular_ferias_ano(0, EXTRACT(YEAR FROM NOW())::INT) = 22
    THEN 'OK (user sem perfil → 22 dias)' ELSE 'FALHOU' END AS resultado;

-- [18] 18_filtro_perfis_rh.sql
-- backend/app/sql/rh/18_filtro_perfis_rh.sql
-- Restringe toda a gestão RH Pessoal a utilizadores internos:
--   ts_profile IN (0, 1, 6) — Super Admin, AINTAR, perfil 6
--
-- Executa APÓS 17_ts_rh_colaborador.sql

-- ─── 1. vbl_rh_colaborador — apenas colaboradores internos ──────────────────
DROP VIEW IF EXISTS vbl_rh_colaborador CASCADE;
CREATE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
    c.ts_profile                          AS perfil,
    -- Perfil RH
    col.data_nascimento,
    col.data_admissao,
    col.categoria,
    col.tipo_contrato,
    col.num_mecanografico,
    col.departamento,
    col.superior_fk,
    sup.name                              AS superior_nome,
    col.elegivel_piquete,
    col.notas                             AS notas_rh,
    -- Saldo férias do ano corrente
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)                               AS dias_ferias_total,
    COALESCE(cfg.dias_ferias_gozados, 0)  AS dias_ferias_gozados,
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22) - COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_disponiveis,
    cfg.ano                               AS config_ano,
    -- Horário activo
    h.pk                                  AS horario_pk,
    h.descr                               AS horario_descr,
    j.descr                               AS jornada_descr,
    j.pk                                  AS tt_jornada_fk,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    -- Antiguidade
    CASE WHEN col.data_admissao IS NOT NULL
         THEN DATE_PART('year', AGE(NOW(), col.data_admissao))::INTEGER
         ELSE NULL
    END                                   AS anos_antiguidade
FROM ts_client c
LEFT JOIN ts_entity e
    ON e.pk = c.ts_entity
LEFT JOIN ts_rh_colaborador col
    ON col.pk = c.pk
LEFT JOIN ts_client sup
    ON sup.pk = col.superior_fk
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j
    ON j.pk = h.tt_jornada_fk
-- FILTRO: só colaboradores internos (WHERE depois dos JOINs)
WHERE c.ts_profile IN (0, 1, 6);


-- ─── 2. vbl_rh_saldo_ferias — idem ──────────────────────────────────────────
CREATE OR REPLACE VIEW vbl_rh_saldo_ferias AS
SELECT
    c.pk                            AS tb_user_fk,
    c.name                          AS colaborador_nome,
    EXTRACT(YEAR FROM NOW())::INT   AS ano,
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)                         AS dias_total,
    COALESCE(cfg.dias_ferias_gozados, 0) AS dias_gozados,
    COALESCE((
        SELECT SUM(dias_uteis) FROM tb_rh_ferias
        WHERE tb_user_fk = c.pk
          AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
          AND ts_estado_fk IN (1, 2)
          AND tt_tipo_fk = 1
    ), 0)                           AS dias_pendentes,
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)
        - COALESCE(cfg.dias_ferias_gozados, 0)
        - COALESCE((
            SELECT SUM(dias_uteis) FROM tb_rh_ferias
            WHERE tb_user_fk = c.pk
              AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
              AND ts_estado_fk IN (1, 2) AND tt_tipo_fk = 1
          ), 0)                     AS dias_disponiveis
FROM ts_client c
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
WHERE c.ts_profile IN (0, 1, 6);


-- ─── 3. fbo_rh_colaborador — validar perfil antes de criar ──────────────────
CREATE OR REPLACE FUNCTION fbo_rh_colaborador(
    p_op                INTEGER,
    p_pk                INTEGER,
    p_data_nascimento   DATE        DEFAULT NULL,
    p_data_admissao     DATE        DEFAULT NULL,
    p_categoria         VARCHAR     DEFAULT NULL,
    p_tipo_contrato     VARCHAR     DEFAULT NULL,
    p_num_mecanografico VARCHAR     DEFAULT NULL,
    p_departamento      VARCHAR     DEFAULT NULL,
    p_superior_fk       INTEGER     DEFAULT NULL,
    p_dias_ferias_base  INTEGER     DEFAULT NULL,
    p_elegivel_piquete  BOOLEAN     DEFAULT NULL,
    p_notas             TEXT        DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_exists BOOLEAN;
    v_perfil INTEGER;
BEGIN
    -- Verificar utilizador existe e tem perfil elegível
    SELECT ts_profile INTO v_perfil
    FROM ts_client WHERE pk = p_pk;

    IF v_perfil IS NULL THEN
        RETURN '<error>Utilizador não encontrado: ' || p_pk || '</error>';
    END IF;

    IF v_perfil NOT IN (0, 1, 6) THEN
        RETURN '<error>Utilizador com perfil ' || v_perfil ||
               ' não é elegível para gestão RH (requer perfil 0, 1 ou 6)</error>';
    END IF;

    SELECT EXISTS(SELECT 1 FROM ts_rh_colaborador WHERE pk = p_pk) INTO v_exists;

    IF p_op = 0 THEN  -- INSERT / UPSERT
        IF v_exists THEN
            UPDATE ts_rh_colaborador SET
                data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
                data_admissao     = COALESCE(p_data_admissao,     data_admissao),
                categoria         = COALESCE(p_categoria,         categoria),
                tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
                num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
                departamento      = COALESCE(p_departamento,      departamento),
                superior_fk       = COALESCE(p_superior_fk,       superior_fk),
                dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
                elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
                notas             = COALESCE(p_notas,             notas)
            WHERE pk = p_pk;
        ELSE
            INSERT INTO ts_rh_colaborador (
                pk, data_nascimento, data_admissao, categoria, tipo_contrato,
                num_mecanografico, departamento, superior_fk,
                dias_ferias_base, elegivel_piquete, notas
            ) VALUES (
                p_pk, p_data_nascimento, p_data_admissao, p_categoria, p_tipo_contrato,
                p_num_mecanografico, p_departamento, p_superior_fk,
                COALESCE(p_dias_ferias_base, 22), COALESCE(p_elegivel_piquete, TRUE), p_notas
            );
        END IF;

    ELSIF p_op = 1 THEN  -- UPDATE explícito
        IF NOT v_exists THEN
            RETURN '<error>Perfil RH não encontrado para utilizador ' || p_pk || '</error>';
        END IF;
        UPDATE ts_rh_colaborador SET
            data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
            data_admissao     = COALESCE(p_data_admissao,     data_admissao),
            categoria         = COALESCE(p_categoria,         categoria),
            tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
            num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
            departamento      = COALESCE(p_departamento,      departamento),
            superior_fk       = COALESCE(p_superior_fk,       superior_fk),
            dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
            elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
            notas             = COALESCE(p_notas,             notas)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida: ' || p_op || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;


-- ─── 4. fbo_rh_piquete_generate — filtrar por perfil ────────────────────────
CREATE OR REPLACE FUNCTION fbo_rh_piquete_generate(
    p_ano INTEGER,
    p_mes INTEGER
)
RETURNS TEXT AS $$
DECLARE
    v_semana_inicio      DATE;
    v_semana_fim         DATE;
    v_primeiro_dia       DATE;
    v_user_fk            INTEGER;
    v_intervalo          INTEGER;
    v_semanas_geradas    INTEGER := 0;
    v_regra_consecutivas BOOLEAN;
    v_regra_ferias       BOOLEAN;
    v_regra_baixa        BOOLEAN;
BEGIN
    v_primeiro_dia := make_date(p_ano, p_mes, 1);

    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_consecutivas' AND ativo)
    INTO v_regra_consecutivas;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_ferias' AND ativo)
    INTO v_regra_ferias;
    SELECT EXISTS(SELECT 1 FROM ts_rh_piquete_regras WHERE codigo='sem_baixa' AND ativo)
    INTO v_regra_baixa;

    SELECT COALESCE(valor::INTEGER, 2) INTO v_intervalo
    FROM ts_rh_piquete_regras WHERE codigo = 'sem_consecutivas';

    DELETE FROM tb_rh_piquete_escala
    WHERE gerado_auto = TRUE
      AND EXTRACT(YEAR FROM data_inicio) = p_ano
      AND EXTRACT(MONTH FROM data_inicio) = p_mes;

    v_semana_inicio := v_primeiro_dia +
        ((8 - EXTRACT(DOW FROM v_primeiro_dia)::INTEGER) % 7) * INTERVAL '1 day';

    IF EXTRACT(DOW FROM v_primeiro_dia) = 1 THEN
        v_semana_inicio := v_primeiro_dia;
    END IF;

    WHILE EXTRACT(MONTH FROM v_semana_inicio) = p_mes LOOP
        v_semana_fim := v_semana_inicio + INTERVAL '6 days';

        SELECT c.pk INTO v_user_fk
        FROM ts_client c
        LEFT JOIN ts_rh_colaborador col ON col.pk = c.pk
        WHERE COALESCE(c.active, 1) = 1
          -- FILTRO: apenas colaboradores internos
          AND c.ts_profile IN (0, 1, 6)
          -- Apenas elegíveis para piquete
          AND COALESCE(col.elegivel_piquete, TRUE) = TRUE
          AND (NOT v_regra_ferias OR NOT EXISTS (
              SELECT 1 FROM tb_rh_ferias f
              WHERE f.tb_user_fk = c.pk
                AND f.ts_estado_fk = 3
                AND f.data_inicio <= v_semana_fim
                AND f.data_fim >= v_semana_inicio
          ))
          AND (NOT v_regra_baixa OR NOT EXISTS (
              SELECT 1 FROM tb_rh_faltas fa
              WHERE fa.tb_user_fk = c.pk
                AND fa.tt_tipo_falta_fk = 4
                AND fa.ts_estado_fk IN (2, 3)
                AND fa.data = v_semana_inicio
          ))
          AND (NOT v_regra_consecutivas OR NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e
              WHERE e.tb_user_fk = c.pk
                AND e.data_inicio >= v_semana_inicio - (v_intervalo * 7 || ' days')::INTERVAL
                AND e.data_inicio < v_semana_inicio
          ))
          AND NOT EXISTS (
              SELECT 1 FROM tb_rh_piquete_escala e2
              WHERE e2.tb_user_fk = c.pk AND e2.data_inicio = v_semana_inicio
          )
        ORDER BY (
            SELECT COALESCE(MAX(data_inicio), '1900-01-01'::DATE)
            FROM tb_rh_piquete_escala WHERE tb_user_fk = c.pk
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


-- ─── 5. fbo_rh_config_ano_init — validar perfil ──────────────────────────────
CREATE OR REPLACE FUNCTION fbo_rh_config_ano_init(
    p_user_fk   INTEGER,
    p_ano       INTEGER,
    p_force     BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
DECLARE
    v_dias   INTEGER;
    v_pk     INTEGER;
    v_exists INTEGER;
    v_perfil INTEGER;
BEGIN
    SELECT ts_profile INTO v_perfil FROM ts_client WHERE pk = p_user_fk;

    IF v_perfil IS NULL THEN
        RETURN '<error>Utilizador não encontrado: ' || p_user_fk || '</error>';
    END IF;

    IF v_perfil NOT IN (0, 1, 6) THEN
        RETURN '<error>Perfil ' || v_perfil || ' não elegível para gestão RH</error>';
    END IF;

    v_dias := fn_rh_calcular_ferias_ano(p_user_fk, p_ano);

    SELECT pk INTO v_exists
    FROM ts_rh_config
    WHERE tb_user_fk = p_user_fk AND ano = p_ano;

    IF v_exists IS NOT NULL THEN
        IF NOT p_force THEN
            RETURN '<error>Configuração já existe para ' || p_user_fk || '/' || p_ano || '</error>';
        END IF;
        UPDATE ts_rh_config
        SET dias_ferias_total = v_dias
        WHERE pk = v_exists;
        RETURN '<sucess>|pk=' || v_exists || '|dias=' || v_dias;
    END IF;

    v_pk := fs_nextcode();
    INSERT INTO ts_rh_config (pk, tb_user_fk, ano, dias_ferias_total)
    VALUES (v_pk, p_user_fk, p_ano, v_dias);

    RETURN '<sucess>|pk=' || v_pk || '|dias=' || v_dias;
END;
$$ LANGUAGE plpgsql;


-- ─── 6. Verificação ──────────────────────────────────────────────────────────
SELECT 'Filtro perfis aplicado' AS check_name,
    CASE WHEN (
        SELECT COUNT(*) FROM information_schema.views
        WHERE table_name = 'vbl_rh_colaborador'
    ) = 1 THEN 'OK' ELSE 'FALHOU' END AS resultado;

-- Conta quantos ts_client têm perfil elegível
SELECT 'Colaboradores elegíveis (ts_profile IN 0,1,6)' AS info,
    COUNT(*) AS total
FROM ts_client
WHERE ts_profile IN (0, 1, 6) AND COALESCE(active, 1) = 1;

-- [15] 15_verify.sql
-- backend/app/sql/rh/15_verify.sql
-- Executar após toda a BD estar criada — verifica integridade do esquema

-- ─── 1. Todas as tabelas existem (deve retornar 18) ──────────────────────────
SELECT
    CASE WHEN COUNT(*) = 18 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/18)' END AS tabelas_check,
    COUNT(*) AS total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    -- Lookups (6)
    'tt_rh_tipo_jornada', 'tt_rh_ponto_evento', 'tt_rh_tipo_ferias',
    'tt_rh_tipo_falta', 'tt_rh_estado_workflow', 'tt_rh_piquete_ocorrencia',
    -- Config (4)
    'ts_rh_config', 'ts_rh_horario', 'ts_feriados', 'ts_rh_colaborador',
    -- Piquete regras (1)
    'ts_rh_piquete_regras',
    -- Transaccionais (7)
    'tb_rh_ponto', 'tb_rh_ponto_mensal', 'tb_rh_ferias',
    'tb_rh_faltas', 'tb_rh_workflow', 'tb_rh_piquete_escala',
    'tb_rh_piquete_ocorrencia'
  );

-- ─── 2. Todas as views existem (deve retornar 9) ─────────────────────────────
SELECT
    CASE WHEN COUNT(*) = 9 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/9)' END AS views_check,
    COUNT(*) AS total
FROM information_schema.views
WHERE table_name LIKE 'vbl_rh_%';

-- ─── 3. Todas as funções existem (deve retornar >= 15) ───────────────────────
SELECT
    CASE WHEN COUNT(*) >= 15 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/15)' END AS funcoes_check,
    COUNT(*) AS total
FROM information_schema.routines
WHERE routine_name IN (
    -- Utilitárias (3)
    'fn_rh_dias_uteis',
    'fn_rh_calcular_ferias_ano',
    'fn_rh_col_updated_at',
    -- Ponto (3)
    'fbo_rh_ponto_evento', 'fbo_rh_ponto_submeter', 'fbo_rh_ponto_corrigir',
    -- Workflow (1)
    'fbo_rh_workflow',
    -- Férias + Config (3)
    'fbo_rh_ferias', 'fbo_rh_config_upsert', 'fbo_rh_config_ano_init',
    -- Faltas + Horário (2)
    'fbo_rh_faltas', 'fbo_rh_horario',
    -- Piquete (3)
    'fbo_rh_piquete_generate', 'fbo_rh_piquete_confirmar', 'fbo_rh_ocorrencia',
    -- Colaborador (1)
    'fbo_rh_colaborador'
);

-- ─── 4. Seed data ─────────────────────────────────────────────────────────────
SELECT 'Feriados 2026' AS check_name,
    CASE WHEN COUNT(*) = 13 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/13)' END AS resultado
FROM ts_feriados WHERE EXTRACT(YEAR FROM data) = 2026;

SELECT 'Regras piquete' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM ts_rh_piquete_regras;

SELECT 'Lookups estado workflow' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM tt_rh_estado_workflow;

SELECT 'Lookups tipo jornada' AS check_name,
    CASE WHEN COUNT(*) = 2 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/2)' END AS resultado
FROM tt_rh_tipo_jornada;

SELECT 'Lookups tipo falta' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM tt_rh_tipo_falta;

-- ─── 5. Funções utilitárias ───────────────────────────────────────────────────
SELECT 'fn_rh_dias_uteis semana normal' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-04', '2026-05-08') = 5 THEN 'OK'
         ELSE 'FALHOU (esperado 5, obtido ' || fn_rh_dias_uteis('2026-05-04', '2026-05-08') || ')' END AS resultado;

SELECT 'fn_rh_dias_uteis com feriado (1 Mai)' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-04-27', '2026-05-01') = 4 THEN 'OK'
         ELSE 'FALHOU (esperado 4, obtido ' || fn_rh_dias_uteis('2026-04-27', '2026-05-01') || ')' END AS resultado;

SELECT 'fn_rh_dias_uteis fim-de-semana' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-09', '2026-05-10') = 0 THEN 'OK'
         ELSE 'FALHOU (esperado 0)' END AS resultado;

SELECT 'fn_rh_calcular_ferias_ano (sem perfil → 22)' AS check_name,
    CASE WHEN fn_rh_calcular_ferias_ano(0, 2026) = 22 THEN 'OK'
         ELSE 'FALHOU (esperado 22, obtido ' || fn_rh_calcular_ferias_ano(0, 2026) || ')' END AS resultado;

-- ─── 6. Filtro de perfis aplicado nas views ───────────────────────────────────
SELECT 'Filtro perfis vbl_rh_colaborador' AS check_name,
    CASE WHEN (
        SELECT view_definition FROM information_schema.views
        WHERE table_name = 'vbl_rh_colaborador'
    ) ILIKE '%ts_profile%' THEN 'OK' ELSE 'FALHOU (filtro ts_profile em falta)' END AS resultado;

-- ─── 7. Permissões RH na ts_interface ────────────────────────────────────────
SELECT 'Permissões RH' AS check_name,
    CASE WHEN COUNT(*) = 5 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/5 — correr 16_permissions.sql)' END AS resultado
FROM ts_interface
WHERE value LIKE 'rh.%';

-- ─── 8. Smoke test: views executam sem erros ─────────────────────────────────
SELECT 'vbl_rh_colaborador'          AS view_name, COUNT(*) AS rows FROM vbl_rh_colaborador
UNION ALL
SELECT 'vbl_rh_ponto',                COUNT(*) FROM vbl_rh_ponto
UNION ALL
SELECT 'vbl_rh_ponto_mensal',         COUNT(*) FROM vbl_rh_ponto_mensal
UNION ALL
SELECT 'vbl_rh_ferias',               COUNT(*) FROM vbl_rh_ferias
UNION ALL
SELECT 'vbl_rh_saldo_ferias',         COUNT(*) FROM vbl_rh_saldo_ferias
UNION ALL
SELECT 'vbl_rh_faltas',               COUNT(*) FROM vbl_rh_faltas
UNION ALL
SELECT 'vbl_rh_horario',              COUNT(*) FROM vbl_rh_horario
UNION ALL
SELECT 'vbl_rh_piquete',              COUNT(*) FROM vbl_rh_piquete
UNION ALL
SELECT 'vbl_rh_piquete_ocorrencias',  COUNT(*) FROM vbl_rh_piquete_ocorrencias;

-- [16] 16_permissions.sql
-- backend/app/sql/rh/16_permissions.sql
-- Permissões do módulo RH Pessoal → ts_interface
-- Executar APÓS os ficheiros 01-15 (BD Foundation)
--
-- Hierarquia:
--   rh.view
--     └── rh.pessoal.view
--           └── rh.edit
--               └── rh.validate
--                     └── rh.admin

-- ─── 1. Inserir permissões (sem requires ainda) ─────────────────────────────
INSERT INTO ts_interface (pk, value, category, label, description, icon, is_critical, is_sensitive, sort_order)
VALUES
    (fs_nextcode(), 'rh.view',
        'Recursos Humanos',
        'Ver RH',
        'Aceder ao módulo Recursos Humanos e consultar dados.',
        'Badge',
        false, false, 1500),

    (fs_nextcode(), 'rh.pessoal.view',
        'Recursos Humanos',
        'Ver Gestão Pessoal',
        'Consultar ponto, férias, faltas, horários e piquete.',
        'ManageAccounts',
        false, false, 1510),

    (fs_nextcode(), 'rh.edit',
        'Recursos Humanos',
        'Editar Gestão Pessoal',
        'Registar ponto diário, submeter pedidos de férias e registar faltas.',
        'EditCalendar',
        false, false, 1520),

    (fs_nextcode(), 'rh.validate',
        'Recursos Humanos',
        'Validar RH (Superior)',
        'Validar pedidos de ponto, férias e faltas como superior hierárquico.',
        'HowToReg',
        false, true, 1530),

    (fs_nextcode(), 'rh.admin',
        'Recursos Humanos',
        'Admin RH',
        'Aprovação final, correcção de ponto, geração de escalas de piquete e configuração de saldos.',
        'AdminPanelSettings',
        false, true, 1540)

ON CONFLICT (value) DO NOTHING;


-- ─── 2. Definir cascata de dependências (requires) ──────────────────────────
-- rh.pessoal.view requer rh.view
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.view')
WHERE value = 'rh.pessoal.view';

-- rh.edit requer rh.pessoal.view
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.pessoal.view')
WHERE value = 'rh.edit';

-- rh.validate requer rh.view
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.view')
WHERE value = 'rh.validate';

-- rh.admin requer rh.validate
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.validate')
WHERE value = 'rh.admin';


-- ─── 3. Verificação ─────────────────────────────────────────────────────────
SELECT
    pk,
    value,
    label,
    sort_order,
    CASE WHEN requires IS NOT NULL AND array_length(requires, 1) > 0
         THEN (SELECT value FROM ts_interface r WHERE r.pk = requires[1])
         ELSE '—'
    END AS requer
FROM ts_interface
WHERE value LIKE 'rh.%'
ORDER BY sort_order;
-- Deve retornar 5 linhas com a cascata correcta
