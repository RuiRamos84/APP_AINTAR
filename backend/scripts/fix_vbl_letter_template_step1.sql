-- ====================================================================
-- PASSO 1: Recriar a view com ambas as colunas
-- ====================================================================

-- Drop and recreate view with correct structure
DROP VIEW IF EXISTS aintar_server_dev.vbl_letter_template CASCADE;

CREATE OR REPLACE VIEW aintar_server_dev.vbl_letter_template AS
SELECT
    b.pk,
    b.ts_lettertype,                -- PK do tipo (INTEGER)
    t.name AS ts_lettertype_name,   -- Nome do tipo (TEXT)
    b.name,
    b.body,
    b.header_template,
    b.footer_template,
    b.version,
    b.active,
    b.metadata,
    b.hist_client,
    b.hist_time
FROM aintar_server_dev.tb_letter_template b
JOIN aintar_server_dev.ts_lettertype t ON t.pk = b.ts_lettertype;
