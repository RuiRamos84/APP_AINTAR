-- ============================================================
-- AINTAR – Permissões do Módulo Orçamento
-- Separação de expenses (despesas operacionais) vs orcamento (dotações)
-- EXECUTAR EM TRANSACÇÃO
-- ============================================================

BEGIN;

INSERT INTO ts_interface
  (pk, value, category, label, description, icon, requires, is_critical, is_sensitive, sort_order)
VALUES
  (930, 'orcamento.view', 'Orçamento', 'Visualizar Orçamento',
   'Ver dotações orçamentais, classes, subclasses e resumos por ano',
   'account_balance', NULL, false, false, 930),

  (931, 'orcamento.edit', 'Orçamento', 'Gerir Orçamento',
   'Criar, editar e eliminar dotações orçamentais e gerir o catálogo (classes e subclasses)',
   'edit', '{930}', false, false, 931)

ON CONFLICT (pk) DO NOTHING;

COMMIT;

-- Verificação
SELECT pk, value, category, label, requires
FROM ts_interface
WHERE value IN ('orcamento.view', 'orcamento.edit')
ORDER BY pk;
