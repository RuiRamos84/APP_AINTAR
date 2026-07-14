-- backend/app/sql/rh/32_documento_data_validade.sql
-- Data de validade opcional em documentos do colaborador — permite alertar
-- antes de um exame de medicina no trabalho (ou outro documento com prazo)
-- vencer. Campo livre em qualquer categoria; não se restringe por
-- tt_tipo_fk — é o RH que decide, caso a caso, quando faz sentido preencher
-- (ex: "Exame de Medicina no Trabalho" sim, "Correspondência" não).
-- Executar DEPOIS de 31_documentos_colaborador.sql

ALTER TABLE tb_rh_documento
    ADD COLUMN IF NOT EXISTS data_validade DATE;

DROP VIEW IF EXISTS vbl_rh_documento CASCADE;
CREATE VIEW vbl_rh_documento AS
SELECT
    d.pk,
    d.tb_user_fk,
    c.name          AS colaborador_nome,
    d.ano,
    d.tt_tipo_fk,
    t.descr         AS tipo_descr,
    d.nome_original,
    d.filename,
    d.tamanho,
    d.notas,
    d.uploaded_by,
    up.name         AS uploaded_by_nome,
    d.created_at,
    d.data_validade
FROM tb_rh_documento d
JOIN ts_client c              ON c.pk = d.tb_user_fk
JOIN tt_rh_tipo_documento t   ON t.pk = d.tt_tipo_fk
LEFT JOIN ts_client up        ON up.pk = d.uploaded_by;

-- Verificação
SELECT 'vbl_rh_documento (data_validade)' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vbl_rh_documento' AND column_name = 'data_validade'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
