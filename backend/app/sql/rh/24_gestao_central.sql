-- backend/app/sql/rh/24_gestao_central.sql
-- Gestão Centralizada RH: fila unificada de pendentes + snapshot de equipa
-- Executar APÓS 23_participacao_ausencias.sql

-- ═══════════════════════════════════════════════════════════════
-- 1. VIEW: vbl_rh_pendentes
--    Fila unificada de todos os itens que aguardam validação/aprovação.
--    Agrupa: férias (estado 1), faltas (estado 1), ponto mensal (estado 1),
--    participações (estados 1, 3, 5 — consoante o nível do workflow).
--    Inclui superior_fk para filtrar por supervisor.
-- ═══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS vbl_rh_pendentes CASCADE;

CREATE VIEW vbl_rh_pendentes AS

-- Férias pendentes (estado 1 = Pendente)
SELECT
    'ferias'                        AS tipo,
    f.pk,
    f.tb_user_fk,
    c.name                          AS colaborador_nome,
    COALESCE(col.superior_fk, NULL) AS superior_fk,
    f.data_inicio::TEXT             AS data_inicio,
    f.data_fim::TEXT                AS data_fim,
    NULL::INTEGER                   AS mes,
    NULL::INTEGER                   AS ano,
    f.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    f.notas,
    f.created_at
FROM tb_rh_ferias f
JOIN ts_client c              ON c.pk = f.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = f.ts_estado_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = f.tb_user_fk
WHERE f.ts_estado_fk = 1

UNION ALL

-- Faltas pendentes (estado 1 = Pendente)
SELECT
    'faltas'                        AS tipo,
    fa.pk,
    fa.tb_user_fk,
    c.name                          AS colaborador_nome,
    COALESCE(col.superior_fk, NULL) AS superior_fk,
    fa.data::TEXT                   AS data_inicio,
    fa.data::TEXT                   AS data_fim,
    NULL::INTEGER                   AS mes,
    NULL::INTEGER                   AS ano,
    fa.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    fa.notas,
    fa.created_at
FROM tb_rh_faltas fa
JOIN ts_client c              ON c.pk = fa.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = fa.ts_estado_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = fa.tb_user_fk
WHERE fa.ts_estado_fk = 1

UNION ALL

-- Mapas de ponto mensais submetidos (estado 1 = Submetido / aguarda aprovação)
SELECT
    'ponto'                         AS tipo,
    m.pk,
    m.tb_user_fk,
    c.name                          AS colaborador_nome,
    COALESCE(col.superior_fk, NULL) AS superior_fk,
    make_date(m.ano, m.mes, 1)::TEXT AS data_inicio,
    (make_date(m.ano, m.mes, 1) + INTERVAL '1 month - 1 day')::TEXT AS data_fim,
    m.mes,
    m.ano,
    m.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    m.notas_colaborador             AS notas,
    m.submetido_em                  AS created_at
FROM tb_rh_ponto_mensal m
JOIN ts_client c              ON c.pk = m.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = m.ts_estado_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = m.tb_user_fk
WHERE m.ts_estado_fk = 1

UNION ALL

-- Participações de ausências pendentes (estados 1, 3, 5 — pendentes nos 3 níveis)
SELECT
    'participacao'                  AS tipo,
    p.pk,
    p.tb_user_fk,
    c.name                          AS colaborador_nome,
    COALESCE(col.superior_fk, NULL) AS superior_fk,
    p.data_inicio::TEXT             AS data_inicio,
    COALESCE(p.data_fim, p.data_inicio)::TEXT AS data_fim,
    NULL::INTEGER                   AS mes,
    NULL::INTEGER                   AS ano,
    p.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    NULL::TEXT                      AS notas,
    p.ts_criado_em                  AS created_at
FROM tb_rh_participacao p
JOIN ts_client c              ON c.pk = p.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = p.ts_estado_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = p.tb_user_fk
WHERE p.ts_estado_fk IN (1, 3, 5);


-- ═══════════════════════════════════════════════════════════════
-- 2. VIEW: vbl_rh_equipa_hoje
--    Snapshot diário de cada colaborador: check-in hoje, férias activas,
--    faltas registadas hoje, piquete activo.
--    Usado na Tab "Equipa" do painel de gestão.
-- ═══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS vbl_rh_equipa_hoje CASCADE;

CREATE VIEW vbl_rh_equipa_hoje AS
SELECT
    c.pk,
    c.name,
    col.superior_fk,
    col.departamento,

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

    -- Horário activo (cast para TEXT para evitar problemas de serialização JSON)
    h.hora_entrada::TEXT            AS hora_entrada,
    h.hora_saida::TEXT              AS hora_saida,
    h.descr                         AS horario_descr

FROM ts_client c
LEFT JOIN ts_rh_colaborador col
    ON col.pk = c.pk
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk
   AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL;


-- ═══════════════════════════════════════════════════════════════
-- 3. VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════

SELECT 'vbl_rh_pendentes' AS view_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'vbl_rh_pendentes'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'vbl_rh_equipa_hoje' AS view_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'vbl_rh_equipa_hoje'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
