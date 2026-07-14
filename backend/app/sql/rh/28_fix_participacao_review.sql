-- backend/app/sql/rh/28_fix_participacao_review.sql
-- Corrige a fila de pendentes e enriquece a view de participações com
-- evidência de ponto biométrico, para suportar o novo fluxo de validação
-- (ver ao supervisor/RH os dados recolhidos antes de aprovar/rejeitar).
-- Executar DEPOIS de 27_drop_departamento.sql

-- ═══════════════════════════════════════════════════════════════
-- 1. vbl_rh_pendentes — corrigir estados de participação na fila
--
--    Bug: filtro incluía o estado 3 (nunca ocorre em participações —
--    é exclusivo de férias/faltas) e excluía o estado 2 (Validado
--    Superior), que é exactamente o que fica pendente para o Admin RH.
--    Também trocamos NULL::TEXT por p.observacoes na coluna notas.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vbl_rh_pendentes AS

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

-- Participações de ausências pendentes
-- Estados válidos: 1 (Pendente, aguarda chefe), 2 (Validado Superior,
-- aguarda Admin RH), 5 (Autorizado RH, aguarda Presidência).
-- O estado 3 não existe neste workflow (fica de fora deliberadamente).
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
    p.observacoes                   AS notas,
    p.ts_criado_em                  AS created_at
FROM tb_rh_participacao p
JOIN ts_client c              ON c.pk = p.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = p.ts_estado_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = p.tb_user_fk
WHERE p.ts_estado_fk IN (1, 2, 5);


-- ═══════════════════════════════════════════════════════════════
-- 2. vbl_rh_participacao — acrescentar evidência de ponto biométrico
--
--    Quando a participação foi auto-criada a partir de uma Saída
--    Temporária/Regresso (ver fbo_rh_ponto_evento + rh_service.py),
--    ponto_saida_fk/ponto_regresso_fk apontam para tb_rh_ponto.
--    Expomos os timestamps e o alerta de geofencing para o validador
--    (chefe/RH) ver a evidência real do relógio antes de decidir.
--
--    Colunas novas acrescentadas SEMPRE no fim — CREATE OR REPLACE VIEW
--    não permite reordenar/remover colunas existentes.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vbl_rh_participacao AS
SELECT
    p.pk,
    p.tb_user_fk,
    c.name                                              AS colaborador_nome,
    p.ts_rh_falta_motivo_fk,
    m.artigo                                            AS motivo_artigo,
    m.descricao                                         AS motivo_descricao,
    m.parcial_ok                                        AS motivo_parcial_ok,
    p.tipo,
    p.data_inicio,
    p.data_fim,
    p.hora_inicio,
    p.hora_fim,

    -- Duração calculada
    CASE
        WHEN p.tipo = 'dia'
        THEN (p.data_fim - p.data_inicio + 1)
        ELSE NULL
    END                                                 AS total_dias,
    CASE
        WHEN p.tipo = 'parcial'
             AND p.hora_inicio IS NOT NULL
             AND p.hora_fim    IS NOT NULL
        THEN ROUND(
            EXTRACT(EPOCH FROM (p.hora_fim - p.hora_inicio)) / 3600.0,
            2
        )
        ELSE NULL
    END                                                 AS total_horas,

    -- Pré-aviso
    (p.data_inicio - p.data_participacao)               AS pre_aviso_dias,
    CASE
        WHEN (p.data_inicio - p.data_participacao) < 5
        THEN TRUE ELSE FALSE
    END                                                 AS pre_aviso_tardio,

    -- Ponto vinculado
    p.ponto_saida_fk,
    p.ponto_regresso_fk,

    -- Comunicação
    p.data_participacao,
    p.observacoes,
    p.documentos,

    -- Workflow
    p.ts_estado_fk,
    e.descr                                             AS estado_descricao,
    e.cor                                               AS estado_cor,

    -- Autorização dos Serviços
    p.autorizado_servico_por,
    p.autorizado_servico_em,
    p.autorizacao_servico_nota,

    -- Autorização RH
    p.autorizado_rh_por,
    p.autorizado_rh_em,
    p.autorizacao_rh_nota,

    -- Despacho Presidência
    p.despachado_por,
    p.despachado_em,
    p.despacho_nota,

    -- Auditoria
    p.ts_criado_em,
    p.ts_atualizado_em,

    -- Evidência de ponto biométrico (novo — dados recolhidos para validação)
    ps.ts_registo                                       AS ponto_saida_ts,
    ps.fora_local                                        AS ponto_saida_fora_local,
    pr.ts_registo                                        AS ponto_regresso_ts,
    pr.fora_local                                        AS ponto_regresso_fora_local
FROM tb_rh_participacao p
JOIN  ts_client              c ON c.pk = p.tb_user_fk
LEFT JOIN ts_rh_falta_motivo m ON m.pk = p.ts_rh_falta_motivo_fk
JOIN  tt_rh_estado_workflow  e ON e.pk = p.ts_estado_fk
LEFT JOIN tb_rh_ponto ps ON ps.pk = p.ponto_saida_fk
LEFT JOIN tb_rh_ponto pr ON pr.pk = p.ponto_regresso_fk;


-- ═══════════════════════════════════════════════════════════════
-- 3. Verificação
-- ═══════════════════════════════════════════════════════════════

SELECT 'vbl_rh_pendentes (estados participação)' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views WHERE table_name = 'vbl_rh_pendentes'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'vbl_rh_participacao (colunas de ponto)' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vbl_rh_participacao' AND column_name = 'ponto_saida_ts'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;