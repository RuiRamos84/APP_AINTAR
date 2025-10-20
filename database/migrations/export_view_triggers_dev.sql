-- Script para exportar triggers da view vbf_document_step em DEV
-- Execute este script em DEV e copie o resultado para aplicar em PROD

-- 1. Verificar se a view existe
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE viewname = 'vbf_document_step';

-- 2. Listar todos os triggers associados à view
SELECT
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'vbf_document_step'
ORDER BY trigger_name;

-- 3. Exportar definição completa dos triggers (executar este query e copiar resultado)
SELECT
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'vbf_document_step'::regclass
ORDER BY tgname;

-- 4. Exportar funções trigger associadas
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%document_step%'
  AND p.proname LIKE '%trigger%'
ORDER BY p.proname;
