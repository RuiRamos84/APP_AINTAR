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
