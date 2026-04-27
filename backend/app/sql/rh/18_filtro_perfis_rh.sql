-- backend/app/sql/rh/18_filtro_perfis_rh.sql
-- Restringe toda a gestão RH Pessoal a utilizadores internos:
--   ts_profile IN (0, 1, 6) — Super Admin, AINTAR, perfil 6
--
-- Executa APÓS 17_ts_rh_colaborador.sql

-- ─── 1. vbl_rh_colaborador — apenas colaboradores internos ──────────────────
CREATE OR REPLACE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    c.email,
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
-- FILTRO: só colaboradores internos
WHERE c.ts_profile IN (0, 1, 6)
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
WHERE c.ts_profile IN (0, 1, 6)
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT;


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
        WHERE c.ativo = TRUE
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
WHERE ts_profile IN (0, 1, 6) AND ativo = TRUE;
