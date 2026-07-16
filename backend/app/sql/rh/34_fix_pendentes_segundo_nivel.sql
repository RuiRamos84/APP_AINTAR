-- backend/app/sql/rh/34_fix_pendentes_segundo_nivel.sql
-- vbl_rh_pendentes só incluía férias/faltas/ponto no estado 1 (Pendente),
-- escondendo os itens já validados pelo chefe (estado 2 = Validado) que
-- aguardam o 2º nível (Admin RH) — mesmo bug já corrigido para participações
-- em 28_fix_participacao_review.sql (lá a causa era 1,3,5; aqui é só 1).
-- Fluxo destes três tipos é de 2 níveis (Vault: "Colaborador submete →
-- Step1(Chefe) → Step2(Admin RH)"), terminando em estado 3 (Aprovado).
-- Executar DEPOIS de 28_fix_participacao_review.sql.

CREATE OR REPLACE VIEW vbl_rh_pendentes AS

-- Férias pendentes ou validadas pelo chefe (aguardam Admin RH)
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
WHERE f.ts_estado_fk IN (1, 2)

UNION ALL

-- Faltas pendentes ou validadas pelo chefe (aguardam Admin RH)
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
WHERE fa.ts_estado_fk IN (1, 2)

UNION ALL

-- Mapas de ponto mensais submetidos ou validados pelo chefe (aguardam Admin RH)
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
WHERE m.ts_estado_fk IN (1, 2)

UNION ALL

-- Participações de ausências pendentes (inalterado desde 28_fix_participacao_review.sql)
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


-- Verificação
SELECT 'vbl_rh_pendentes (ferias/faltas/ponto estados 1,2)' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views WHERE table_name = 'vbl_rh_pendentes'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
