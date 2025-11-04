-- ====================================================================
-- PASSO 2: Verificar e testar a view (executar DEPOIS do passo 1)
-- ====================================================================

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
