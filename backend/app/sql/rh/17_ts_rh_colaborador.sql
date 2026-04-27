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
CREATE OR REPLACE VIEW vbl_rh_colaborador AS
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
        WHERE c.ativo = TRUE
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
