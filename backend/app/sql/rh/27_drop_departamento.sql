-- backend/app/sql/rh/27_drop_departamento.sql
-- Remove o campo departamento (texto livre) substituído por tt_rh_equipa_fk.
-- Executar DEPOIS de 26_ferias_equipas.sql.

-- ─── 1. Recriar vbl_rh_equipa_hoje sem departamento, com equipa ──────────────
DROP VIEW IF EXISTS vbl_rh_equipa_hoje CASCADE;

CREATE VIEW vbl_rh_equipa_hoje AS
SELECT
    c.pk,
    c.name,
    col.superior_fk,
    col.tt_rh_equipa_fk,
    eq.codigo  AS equipa_codigo,
    eq.nome    AS equipa_nome,

    -- Check-in hoje: hora da entrada (evento 1)
    (
        SELECT p.ts_registo
        FROM tb_rh_ponto p
        WHERE p.tb_user_fk = c.pk
          AND p.data = CURRENT_DATE
          AND p.tt_evento_fk = 1
        LIMIT 1
    )                               AS entrada_hoje,

    -- Saída hoje: hora da saída (evento 4)
    (
        SELECT p.ts_registo
        FROM tb_rh_ponto p
        WHERE p.tb_user_fk = c.pk
          AND p.data = CURRENT_DATE
          AND p.tt_evento_fk = 4
        LIMIT 1
    )                               AS saida_hoje,

    -- Férias activas hoje (aprovadas — estado 3)
    EXISTS (
        SELECT 1 FROM tb_rh_ferias f
        WHERE f.tb_user_fk = c.pk
          AND f.ts_estado_fk = 3
          AND f.data_inicio <= CURRENT_DATE
          AND f.data_fim    >= CURRENT_DATE
    )                               AS em_ferias_hoje,

    -- Falta registada hoje (qualquer estado)
    EXISTS (
        SELECT 1 FROM tb_rh_faltas fa
        WHERE fa.tb_user_fk = c.pk
          AND fa.data = CURRENT_DATE
    )                               AS tem_falta_hoje,

    -- Piquete activo esta semana
    (
        SELECT e.data_inicio
        FROM tb_rh_piquete_escala e
        WHERE e.tb_user_fk = c.pk
          AND e.data_inicio <= CURRENT_DATE
          AND e.data_fim    >= CURRENT_DATE
        LIMIT 1
    )                               AS piquete_semana_inicio,

    -- Saldo de férias disponível (ano corrente)
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22) - COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_disponiveis,

    -- Conta de faltas no ano corrente (justificadas ou não)
    (
        SELECT COUNT(*) FROM tb_rh_faltas fa
        WHERE fa.tb_user_fk = c.pk
          AND EXTRACT(YEAR FROM fa.data) = EXTRACT(YEAR FROM NOW())::INT
          AND fa.ts_estado_fk IN (2, 3)
    )                               AS faltas_ano,

    -- Horário activo
    h.hora_entrada::TEXT            AS hora_entrada,
    h.hora_saida::TEXT              AS hora_saida,
    h.descr                         AS horario_descr

FROM ts_client c
LEFT JOIN ts_rh_colaborador col ON col.pk = c.pk
LEFT JOIN tt_rh_equipa eq       ON eq.pk = col.tt_rh_equipa_fk
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk
   AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL;

-- ─── 2. Remover coluna e índice da tabela ────────────────────────────────────
DROP INDEX IF EXISTS idx_ts_rh_col_depto;
ALTER TABLE ts_rh_colaborador DROP COLUMN IF EXISTS departamento;
