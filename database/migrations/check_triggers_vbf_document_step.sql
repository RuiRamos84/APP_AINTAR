-- =====================================================
-- Script para verificar triggers de vbf_document_step
-- Execute este script em DEV e depois em PROD
-- =====================================================

-- 1. Verificar se a view existe
SELECT
    'VIEW EXISTS' as check_type,
    schemaname,
    viewname
FROM pg_views
WHERE viewname = 'vbf_document_step';

-- 2. Ver estrutura da view
SELECT
    'VIEW DEFINITION' as check_type,
    pg_get_viewdef('vbf_document_step'::regclass, true) as view_definition;

-- 3. Listar triggers da view
SELECT
    'TRIGGERS LIST' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vbf_document_step'
ORDER BY trigger_name;

-- 4. Exportar definição completa dos triggers
SELECT
    'TRIGGER DEFINITION' as check_type,
    tgname as trigger_name,
    pg_get_triggerdef(oid, true) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'vbf_document_step'::regclass
  AND tgisinternal = false
ORDER BY tgname;

-- 5. Exportar funções trigger associadas
SELECT
    'TRIGGER FUNCTIONS' as check_type,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.oid IN (
    SELECT tgfoid
    FROM pg_trigger
    WHERE tgrelid = 'vbf_document_step'::regclass
      AND tgisinternal = false
)
ORDER BY p.proname;

-- 6. Verificar permissões na view
SELECT
    'VIEW PERMISSIONS' as check_type,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'vbf_document_step'
ORDER BY grantee, privilege_type;
