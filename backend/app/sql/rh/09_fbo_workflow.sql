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
