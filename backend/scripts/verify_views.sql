-- ====================================================================
-- Verificar se as views existem
-- ====================================================================

-- Verificar todas as views no schema aintar_server_dev
SELECT
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'aintar_server_dev'
  AND viewname LIKE '%letter%'
ORDER BY viewname;

-- Verificar se a view vbl_letter_template existe especificamente
SELECT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'aintar_server_dev'
      AND viewname = 'vbl_letter_template'
) AS view_exists;

-- Se não existir, mostrar a query para recriar
SELECT 'A view vbl_letter_template NÃO existe. Execute o script fix_vbl_letter_template_step1.sql' AS status
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'aintar_server_dev'
      AND viewname = 'vbl_letter_template'
);

-- Se existir, mostrar estrutura
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'aintar_server_dev'
  AND table_name = 'vbl_letter_template'
ORDER BY ordinal_position;
