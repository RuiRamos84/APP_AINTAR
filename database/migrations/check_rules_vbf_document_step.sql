-- =====================================================
-- Verificar RULES da view vbf_document_step
-- Execute em DEV e PROD para comparar
-- =====================================================

-- 1. Listar todas as RULES da view
SELECT
    'RULES' as check_type,
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules
WHERE tablename = 'vbf_document_step'
ORDER BY rulename;

-- 2. Detalhes das RULES (formato completo)
SELECT
    'RULE DETAILS' as check_type,
    r.rulename,
    r.ev_type as event_type,
    r.ev_enabled as enabled,
    r.is_instead,
    pg_get_ruledef(r.oid, true) as rule_definition
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
WHERE c.relname = 'vbf_document_step'
  AND r.rulename != '_RETURN'
ORDER BY r.rulename;

-- 3. Verificar se a view é "automatically updatable"
SELECT
    'UPDATABILITY' as check_type,
    table_name,
    is_insertable_into,
    is_updatable
FROM information_schema.tables
WHERE table_name = 'vbf_document_step';

-- 4. Verificar colunas updatable
SELECT
    'COLUMNS UPDATABILITY' as check_type,
    column_name,
    is_updatable
FROM information_schema.columns
WHERE table_name = 'vbf_document_step'
ORDER BY ordinal_position;

-- 5. Comparar estrutura: VIEW vs TABLE base
SELECT 'VIEW COLUMNS' as source, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vbf_document_step'
UNION ALL
SELECT 'TABLE COLUMNS' as source, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tb_document_step'
ORDER BY source, column_name;
