-- backend/app/sql/rh/29_fix_ponto_submeter_mes_fechado.sql
-- Corrige fbo_rh_ponto_submeter: permitia submeter o mapa mensal do mês
-- corrente (ainda a decorrer) ou até de um mês futuro, sem qualquer
-- validação. Consequência real: ao submeter um mês incompleto, o
-- total_horas/total_dias fica gravado de forma estática em
-- tb_rh_ponto_mensal — registos de ponto feitos DEPOIS da submissão
-- continuam a ser aceites (registar_ponto_evento/fbo_rh_ponto_evento não
-- verifica mapa mensal já submetido), mas deixam de contar para o mapa
-- aprovado. Perda silenciosa de dados no mapa oficial, não só UX prematura.
-- Executar DEPOIS de 28_fix_participacao_review.sql

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
    -- Só é possível submeter um mês já terminado — nunca o corrente nem um futuro.
    IF make_date(p_ano, p_mes, 1) >= date_trunc('month', CURRENT_DATE)::DATE THEN
        RETURN '<error>Só é possível submeter o mapa de um mês já terminado</error>';
    END IF;

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


-- Verificação
SELECT 'fbo_rh_ponto_submeter (mês corrente bloqueado)' AS check_name,
    CASE WHEN fbo_rh_ponto_submeter(
        -1, EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT
    ) LIKE '<error>%já terminado%'
    THEN 'OK' ELSE 'FALHOU' END AS resultado;
