-- backend/app/sql/rh/08_fbo_ponto.sql
-- NOTA: fbo_rh_ponto_evento está em 21_geofencing.sql (versão com geofencing)


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
