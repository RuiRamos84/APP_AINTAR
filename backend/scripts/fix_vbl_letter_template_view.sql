-- ====================================================================
-- Fix vbl_letter_template view to include ts_lettertype_name
-- ====================================================================

-- Drop existing view
DROP VIEW IF EXISTS vbl_letter_template CASCADE;

-- Recreate view with JOIN to get lettertype name
CREATE OR REPLACE VIEW vbl_letter_template AS
SELECT
    t.pk,
    t.ts_lettertype,
    lt.name AS ts_lettertype_name,
    t.name,
    t.body,
    t.header_template,
    t.footer_template,
    t.version,
    t.active,
    t.metadata,
    t.hist_client,
    t.hist_time
FROM tb_letter_template t
LEFT JOIN ts_lettertype lt ON lt.pk = t.ts_lettertype
ORDER BY t.hist_time DESC;

-- Verify view structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vbl_letter_template'
ORDER BY ordinal_position;

-- Test view with sample query
SELECT
    pk,
    name,
    ts_lettertype,
    ts_lettertype_name,
    version,
    active
FROM vbl_letter_template
LIMIT 5;
