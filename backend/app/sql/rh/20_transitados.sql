-- backend/app/sql/rh/20_transitados.sql
-- Implementa a transição de dias de férias não gozados para o ano seguinte.
--
-- Regra legal (Código do Trabalho, art. 237.º):
--   Os dias não gozados podem transitar para o ano seguinte, mas devem ser
--   gozados até 30 de Abril — e são os PRIMEIROS a ser consumidos.
--
-- Estratégia de implementação:
--   1. ALTER TABLE ts_rh_config — adicionar dias_transitados e data_limite_transitados
--   2. Actualizar fbo_rh_config_ano_init — calcular automaticamente o saldo transitado
--   3. Actualizar fbo_rh_config_upsert — aceitar dias_transitados no upsert manual
--   4. Actualizar fbo_rh_workflow — ao aprovar férias, debitar transitados primeiro
--   5. Recrear vbl_rh_saldo_ferias — expor transitados e prazo
--   6. Recrear vbl_rh_colaborador — incluir dias_transitados no perfil
--   7. Smoke test


-- ─── 1. Alterar ts_rh_config ─────────────────────────────────────────────────

ALTER TABLE ts_rh_config
    ADD COLUMN IF NOT EXISTS dias_transitados          INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dias_transitados_gozados  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS data_limite_transitados   DATE;

COMMENT ON COLUMN ts_rh_config.dias_transitados
    IS 'Dias de férias transitados do ano anterior (saldo remanescente)';
COMMENT ON COLUMN ts_rh_config.dias_transitados_gozados
    IS 'Dias transitados já gozados no ano corrente (debitados primeiro)';
COMMENT ON COLUMN ts_rh_config.data_limite_transitados
    IS 'Prazo legal para gozar os dias transitados (normalmente 30 Abr)';


-- ─── 2. Actualizar fbo_rh_config_ano_init ────────────────────────────────────
-- Calcula automaticamente o saldo transitado do ano anterior ao inicializar.

CREATE OR REPLACE FUNCTION fbo_rh_config_ano_init(
    p_user_fk   INTEGER,
    p_ano       INTEGER,
    p_force     BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
DECLARE
    v_dias            INTEGER;
    v_pk              INTEGER;
    v_exists          INTEGER;
    v_perfil          INTEGER;
    v_prev_total      INTEGER := 0;
    v_prev_gozados    INTEGER := 0;
    v_prev_transitados INTEGER := 0;
    v_prev_trans_goz  INTEGER := 0;
    v_prev_pendentes  INTEGER := 0;
    v_transitados     INTEGER := 0;
    v_limite          DATE;
BEGIN
    -- Validar perfil
    SELECT ts_profile INTO v_perfil FROM ts_client WHERE pk = p_user_fk;

    IF v_perfil IS NULL THEN
        RETURN '<error>Utilizador não encontrado: ' || p_user_fk || '</error>';
    END IF;

    IF v_perfil NOT IN (0, 1, 6) THEN
        RETURN '<error>Perfil ' || v_perfil || ' não elegível para gestão RH</error>';
    END IF;

    -- Calcular dias para o novo ano
    v_dias := fn_rh_calcular_ferias_ano(p_user_fk, p_ano);

    -- ── Calcular saldo transitado do ano anterior ─────────────────────────────
    SELECT
        COALESCE(dias_ferias_total, 22),
        COALESCE(dias_ferias_gozados, 0),
        COALESCE(dias_transitados, 0),
        COALESCE(dias_transitados_gozados, 0)
    INTO
        v_prev_total, v_prev_gozados, v_prev_transitados, v_prev_trans_goz
    FROM ts_rh_config
    WHERE tb_user_fk = p_user_fk AND ano = p_ano - 1;

    IF v_prev_total IS NOT NULL THEN
        -- Dias pendentes (aprovados mas ainda não gozados) do ano anterior
        SELECT COALESCE(SUM(dias_uteis), 0)
        INTO v_prev_pendentes
        FROM tb_rh_ferias
        WHERE tb_user_fk = p_user_fk
          AND EXTRACT(YEAR FROM data_inicio) = p_ano - 1
          AND ts_estado_fk = 3   -- Aprovado
          AND tt_tipo_fk = 1     -- Férias normais (debita saldo)
          AND data_inicio > NOW()::DATE;  -- Ainda futuras

        -- Saldo remanescente = (total_ano_ant + transitados_ant) - gozados - transitados_gozados - pendentes
        v_transitados := GREATEST(
            (v_prev_total + v_prev_transitados)
            - v_prev_gozados
            - v_prev_trans_goz
            - v_prev_pendentes,
            0
        );

        -- Prazo legal: 30 de Abril do novo ano
        IF v_transitados > 0 THEN
            v_limite := make_date(p_ano, 4, 30);
        END IF;
    END IF;

    -- ── INSERT ou UPDATE ──────────────────────────────────────────────────────
    SELECT pk INTO v_exists
    FROM ts_rh_config
    WHERE tb_user_fk = p_user_fk AND ano = p_ano;

    IF v_exists IS NOT NULL THEN
        IF NOT p_force THEN
            RETURN '<error>Configuração já existe para ' || p_user_fk || '/' || p_ano || '</error>';
        END IF;
        UPDATE ts_rh_config
        SET dias_ferias_total          = v_dias,
            dias_transitados           = v_transitados,
            dias_transitados_gozados   = 0,
            data_limite_transitados    = v_limite
        WHERE pk = v_exists;
        RETURN '<sucess>|pk=' || v_exists
            || '|dias=' || v_dias
            || '|transitados=' || v_transitados;
    END IF;

    v_pk := fs_nextcode();
    INSERT INTO ts_rh_config (
        pk, tb_user_fk, ano,
        dias_ferias_total, dias_ferias_gozados,
        dias_transitados, dias_transitados_gozados,
        data_limite_transitados
    ) VALUES (
        v_pk, p_user_fk, p_ano,
        v_dias, 0,
        v_transitados, 0,
        v_limite
    );

    RETURN '<sucess>|pk=' || v_pk
        || '|dias=' || v_dias
        || '|transitados=' || v_transitados;
END;
$$ LANGUAGE plpgsql;


-- ─── 3. Actualizar fbo_rh_config_upsert ──────────────────────────────────────
-- Permite editar manualmente os dias transitados (e o prazo) pelo Admin RH.

CREATE OR REPLACE FUNCTION fbo_rh_config_upsert(
    p_user_fk               INTEGER,
    p_ano                   INTEGER,
    p_dias_total            INTEGER,
    p_notas                 TEXT    DEFAULT NULL,
    p_dias_transitados      INTEGER DEFAULT NULL,
    p_data_limite           DATE    DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk     INTEGER;
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM ts_rh_config WHERE tb_user_fk = p_user_fk AND ano = p_ano
    ) INTO v_exists;

    IF v_exists THEN
        UPDATE ts_rh_config SET
            dias_ferias_total        = p_dias_total,
            notas                    = COALESCE(p_notas, notas),
            dias_transitados         = COALESCE(p_dias_transitados, dias_transitados),
            data_limite_transitados  = COALESCE(p_data_limite, data_limite_transitados)
        WHERE tb_user_fk = p_user_fk AND ano = p_ano;

        SELECT pk INTO v_pk FROM ts_rh_config WHERE tb_user_fk = p_user_fk AND ano = p_ano;
        RETURN '<sucess>|pk=' || v_pk;
    ELSE
        v_pk := fs_nextcode();
        INSERT INTO ts_rh_config (
            pk, tb_user_fk, ano, dias_ferias_total, notas,
            dias_transitados, data_limite_transitados
        ) VALUES (
            v_pk, p_user_fk, p_ano, p_dias_total, p_notas,
            COALESCE(p_dias_transitados, 0), p_data_limite
        );
        RETURN '<sucess>|pk=' || v_pk;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ─── 4. Actualizar fbo_rh_workflow ───────────────────────────────────────────
-- Ao aprovar férias (step 2, estado 3), debita transitados PRIMEIRO,
-- e só depois debita do saldo do ano corrente.

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
    v_pk                  INTEGER;
    v_estado_atual        INTEGER;
    v_user_fk_ref         INTEGER;
    v_tipo_ferias         INTEGER;
    v_dias_uteis          INTEGER;
    v_debita              BOOLEAN;
    v_ano_ferias          INTEGER;
    -- Campos de transição
    v_trans_disp          INTEGER := 0;   -- transitados disponíveis
    v_debitar_trans       INTEGER := 0;   -- a debitar dos transitados
    v_debitar_corrente    INTEGER := 0;   -- a debitar do saldo do ano
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

    -- ── Actualizar estado ─────────────────────────────────────────────────────
    IF p_tipo_ref = 'ponto' THEN
        UPDATE tb_rh_ponto_mensal SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;

    ELSIF p_tipo_ref = 'ferias' THEN
        UPDATE tb_rh_ferias SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;

        -- Debitar saldo apenas na aprovação final (step 2, estado Aprovado)
        IF p_step = 2 AND p_ts_estado_fk = 3 THEN
            SELECT tt_tipo_fk, dias_uteis,
                   EXTRACT(YEAR FROM data_inicio)::INT
            INTO   v_tipo_ferias, v_dias_uteis, v_ano_ferias
            FROM tb_rh_ferias WHERE pk = p_ref_pk;

            SELECT debita_saldo INTO v_debita
            FROM tt_rh_tipo_ferias WHERE pk = v_tipo_ferias;

            IF v_debita THEN
                -- ── Regra: debitar transitados PRIMEIRO ──────────────────────
                SELECT
                    GREATEST(
                        COALESCE(dias_transitados, 0) - COALESCE(dias_transitados_gozados, 0),
                        0
                    )
                INTO v_trans_disp
                FROM ts_rh_config
                WHERE tb_user_fk = v_user_fk_ref
                  AND ano = v_ano_ferias;

                v_debitar_trans    := LEAST(v_trans_disp, v_dias_uteis);
                v_debitar_corrente := v_dias_uteis - v_debitar_trans;

                UPDATE ts_rh_config SET
                    dias_transitados_gozados = dias_transitados_gozados + v_debitar_trans,
                    dias_ferias_gozados      = dias_ferias_gozados + v_debitar_corrente
                WHERE tb_user_fk = v_user_fk_ref
                  AND ano = v_ano_ferias;
            END IF;
        END IF;

        -- Se rejeitado (estado 4), reverter débito se estava aprovado
        IF p_ts_estado_fk = 4 AND v_estado_atual = 3 THEN
            SELECT tt_tipo_fk, dias_uteis,
                   EXTRACT(YEAR FROM data_inicio)::INT
            INTO   v_tipo_ferias, v_dias_uteis, v_ano_ferias
            FROM tb_rh_ferias WHERE pk = p_ref_pk;

            SELECT debita_saldo INTO v_debita
            FROM tt_rh_tipo_ferias WHERE pk = v_tipo_ferias;

            IF v_debita THEN
                -- Reverter: primeiro reverter gozados correntes, depois transitados
                SELECT
                    COALESCE(dias_transitados_gozados, 0),
                    COALESCE(dias_ferias_gozados, 0)
                INTO v_debitar_trans, v_debitar_corrente
                FROM ts_rh_config
                WHERE tb_user_fk = v_user_fk_ref AND ano = v_ano_ferias;

                -- Calcular quanto foi debitado de cada fonte (re-derivar)
                -- Simplificação: reverter proporcional (ou registar na tb_rh_workflow)
                -- Neste caso revertemos: primeiro correntes, depois transitados
                v_debitar_corrente := LEAST(v_debitar_corrente, v_dias_uteis);
                v_debitar_trans    := v_dias_uteis - v_debitar_corrente;

                UPDATE ts_rh_config SET
                    dias_ferias_gozados      = GREATEST(dias_ferias_gozados - v_debitar_corrente, 0),
                    dias_transitados_gozados = GREATEST(dias_transitados_gozados - v_debitar_trans, 0)
                WHERE tb_user_fk = v_user_fk_ref AND ano = v_ano_ferias;
            END IF;
        END IF;

    ELSIF p_tipo_ref = 'faltas' THEN
        UPDATE tb_rh_faltas SET ts_estado_fk = p_ts_estado_fk WHERE pk = p_ref_pk;
    END IF;

    -- ── Registar no histórico de workflow ─────────────────────────────────────
    v_pk := fs_nextcode();
    INSERT INTO tb_rh_workflow (pk, tipo_ref, ref_pk, step, tb_user_fk, ts_estado_fk, notas)
    VALUES (v_pk, p_tipo_ref, p_ref_pk, p_step, p_user_fk, p_ts_estado_fk, p_notas);

    RETURN '<sucess>|pk=' || v_pk
        || '|trans_debitados=' || v_debitar_trans
        || '|corrente_debitado=' || v_debitar_corrente;
END;
$$ LANGUAGE plpgsql;


-- ─── 5. Recrear vbl_rh_saldo_ferias ──────────────────────────────────────────
-- Expõe o saldo completo: dias_transitados + dias_ano + prazo + disponíveis.

DROP VIEW IF EXISTS vbl_rh_saldo_ferias CASCADE;
CREATE VIEW vbl_rh_saldo_ferias AS
SELECT
    c.pk                               AS tb_user_fk,
    c.name                             AS colaborador_nome,
    EXTRACT(YEAR FROM NOW())::INT      AS ano,

    -- Saldo do ano corrente
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)                            AS dias_ano_corrente,

    -- Saldo transitado do ano anterior
    COALESCE(cfg.dias_transitados, 0)  AS dias_transitados,
    COALESCE(cfg.dias_transitados_gozados, 0) AS dias_transitados_gozados,
    cfg.data_limite_transitados,

    -- Transitados ainda disponíveis
    GREATEST(
        COALESCE(cfg.dias_transitados, 0)
        - COALESCE(cfg.dias_transitados_gozados, 0),
        0
    )                                  AS dias_transitados_disponiveis,

    -- Total = ano corrente + transitados
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)
    + COALESCE(cfg.dias_transitados, 0) AS dias_total,

    -- Gozados (só do ano corrente; transitados têm coluna própria)
    COALESCE(cfg.dias_ferias_gozados, 0) AS dias_gozados,

    -- Pendentes de aprovação (férias submetidas ainda não aprovadas)
    COALESCE((
        SELECT SUM(dias_uteis) FROM tb_rh_ferias
        WHERE tb_user_fk = c.pk
          AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
          AND ts_estado_fk IN (1, 2)
          AND tt_tipo_fk = 1
    ), 0)                              AS dias_pendentes,

    -- Total disponível real = (ano + transitados) - gozados - trans_gozados - pendentes
    GREATEST(
        COALESCE(cfg.dias_ferias_total,
            fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
            22)
        + COALESCE(cfg.dias_transitados, 0)
        - COALESCE(cfg.dias_ferias_gozados, 0)
        - COALESCE(cfg.dias_transitados_gozados, 0)
        - COALESCE((
            SELECT SUM(dias_uteis) FROM tb_rh_ferias
            WHERE tb_user_fk = c.pk
              AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
              AND ts_estado_fk IN (1, 2) AND tt_tipo_fk = 1
          ), 0),
        0
    )                                  AS dias_disponiveis
FROM ts_client c
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
WHERE c.ts_profile IN (0, 1, 6);


-- ─── 6. Recrear vbl_rh_colaborador ───────────────────────────────────────────
-- Inclui dias_transitados e data_limite_transitados no perfil.

DROP VIEW IF EXISTS vbl_rh_colaborador CASCADE;
CREATE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
    c.ts_profile                                AS perfil,
    -- Perfil RH
    col.data_nascimento,
    col.data_admissao,
    col.categoria,
    col.tipo_contrato,
    col.num_mecanografico,
    col.departamento,
    col.superior_fk,
    sup.name                                    AS superior_nome,
    col.elegivel_piquete,
    col.ts_rh_local_fk,
    l.nome                                      AS local_predefinido_nome,
    col.notas                                   AS notas_rh,
    -- Saldo férias do ano corrente
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)                                     AS dias_ferias_total,
    COALESCE(cfg.dias_ferias_gozados, 0)        AS dias_ferias_gozados,
    -- Transitados
    COALESCE(cfg.dias_transitados, 0)           AS dias_transitados,
    COALESCE(cfg.dias_transitados_gozados, 0)   AS dias_transitados_gozados,
    GREATEST(
        COALESCE(cfg.dias_transitados, 0)
        - COALESCE(cfg.dias_transitados_gozados, 0), 0
    )                                           AS dias_transitados_disponiveis,
    cfg.data_limite_transitados,
    -- Disponíveis totais
    GREATEST(
        COALESCE(cfg.dias_ferias_total,
            fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
            22)
        + COALESCE(cfg.dias_transitados, 0)
        - COALESCE(cfg.dias_ferias_gozados, 0)
        - COALESCE(cfg.dias_transitados_gozados, 0),
        0
    )                                           AS dias_ferias_disponiveis,
    cfg.ano                                     AS config_ano,
    -- Horário activo
    h.pk                                        AS horario_pk,
    h.descr                                     AS horario_descr,
    j.descr                                     AS jornada_descr,
    j.pk                                        AS tt_jornada_fk,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    -- Antiguidade
    CASE WHEN col.data_admissao IS NOT NULL
         THEN DATE_PART('year', AGE(NOW(), col.data_admissao))::INTEGER
         ELSE NULL
    END                                         AS anos_antiguidade
FROM ts_client c
LEFT JOIN ts_entity e
    ON e.pk = c.ts_entity
LEFT JOIN ts_rh_colaborador col
    ON col.pk = c.pk
LEFT JOIN ts_client sup
    ON sup.pk = col.superior_fk
LEFT JOIN ts_rh_local l
    ON l.pk = col.ts_rh_local_fk
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j
    ON j.pk = h.tt_jornada_fk
WHERE c.ts_profile IN (0, 1, 6);


-- ─── 7. Actualizar vbl_rh_config ─────────────────────────────────────────────
DROP VIEW IF EXISTS vbl_rh_config CASCADE;
CREATE VIEW vbl_rh_config AS
SELECT
    cfg.pk,
    cfg.tb_user_fk,
    c.name                                  AS colaborador_nome,
    cfg.ano,
    cfg.dias_ferias_total,
    cfg.dias_ferias_gozados,
    cfg.dias_transitados,
    cfg.dias_transitados_gozados,
    GREATEST(
        cfg.dias_transitados - cfg.dias_transitados_gozados, 0
    )                                       AS dias_transitados_disponiveis,
    cfg.data_limite_transitados,
    cfg.notas
FROM ts_rh_config cfg
JOIN ts_client c ON c.pk = cfg.tb_user_fk;


-- ─── 8. Smoke test ───────────────────────────────────────────────────────────
SELECT 'Colunas transitados em ts_rh_config' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ts_rh_config'
          AND column_name = 'dias_transitados'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'vbl_rh_saldo_ferias expõe transitados' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vbl_rh_saldo_ferias'
          AND column_name = 'dias_transitados'
    ) THEN 'OK' ELSE 'FALHOU (vista não actualizada)' END AS resultado;

SELECT 'vbl_rh_colaborador expõe transitados' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vbl_rh_colaborador'
          AND column_name = 'dias_transitados'
    ) THEN 'OK' ELSE 'FALHOU (vista não actualizada)' END AS resultado;
