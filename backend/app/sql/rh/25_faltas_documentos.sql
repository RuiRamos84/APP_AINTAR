-- ═══════════════════════════════════════════════════════════════
-- Migração: suporte a múltiplos anexos em tb_rh_faltas
-- Adiciona coluna documentos JSONB e actualiza vbl_rh_faltas
-- ═══════════════════════════════════════════════════════════════

-- 1. Adicionar coluna documentos (idempotente)
ALTER TABLE tb_rh_faltas
    ADD COLUMN IF NOT EXISTS documentos JSONB DEFAULT '[]'::JSONB;

-- 2. Recriar vista para incluir a nova coluna
DROP VIEW IF EXISTS vbl_rh_faltas;

CREATE VIEW vbl_rh_faltas AS
SELECT
    fa.pk,
    fa.tb_user_fk,
    c.name                          AS colaborador_nome,
    fa.tt_tipo_falta_fk,
    t.descr                         AS tipo_descr,
    t.requer_justificativo,
    fa.data,
    fa.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    fa.justificativo_path,
    fa.documentos,
    fa.comunicado_por,
    CASE WHEN fa.comunicado_por IS NOT NULL THEN cp.name ELSE NULL END AS comunicado_por_nome,
    fa.notas,
    fa.created_at
FROM tb_rh_faltas fa
JOIN ts_client c              ON c.pk = fa.tb_user_fk
JOIN tt_rh_tipo_falta t       ON t.pk = fa.tt_tipo_falta_fk
JOIN tt_rh_estado_workflow es ON es.pk = fa.ts_estado_fk
LEFT JOIN ts_client cp        ON cp.pk = fa.comunicado_por;
