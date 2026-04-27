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
