-- ====================================================================
-- Fix vbl_letter_template view - Add both ts_lettertype (PK) and name
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

-- Verificar estrutura
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'aintar_server_dev'
  AND table_name = 'vbl_letter_template'
ORDER BY ordinal_position;

-- Testar com dados reais
SELECT
    pk,
    ts_lettertype,           -- Deve ser INTEGER (PK)
    ts_lettertype_name,      -- Deve ser TEXT (Nome)
    name,
    version,
    active
FROM aintar_server_dev.vbl_letter_template
ORDER BY pk DESC
LIMIT 5;
