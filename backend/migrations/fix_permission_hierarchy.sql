-- ============================================================
-- AINTAR – Hierarquia de Permissões (Menu → Submenu)
-- Regra: acesso a submenu requer sempre o menu pai.
--        acesso ao menu pai NÃO obriga a nenhum submenu.
-- EXECUTAR EM TRANSACÇÃO
-- ============================================================
-- Verificação prévia:
--   SELECT pk, value, requires FROM ts_interface
--   WHERE pk IN (211,310,311,312,313,530,540,560,870,900)
--   ORDER BY pk;
-- ============================================================

BEGIN;

-- ============================================================
-- MÓDULO: OPERAÇÃO (gateway: operation.access = 310)
-- ============================================================
-- operation.execute (311) → requer operation.access (310)
UPDATE ts_interface SET requires = '{310}' WHERE pk = 311 AND value = 'operation.execute';
-- operation.supervise (312) → requer operation.access (310)
UPDATE ts_interface SET requires = '{310}' WHERE pk = 312 AND value = 'operation.supervise';
-- operation.manage (313) → requer operation.access (310)
UPDATE ts_interface SET requires = '{310}' WHERE pk = 313 AND value = 'operation.manage';

-- ============================================================
-- MÓDULO: RECURSOS HUMANOS (gateway: rh.view = 900)
-- ============================================================
-- epi.view (211) → requer rh.view (900)
UPDATE ts_interface SET requires = '{900}' WHERE pk = 211 AND value = 'epi.view';
-- aval.view (870) → requer rh.view (900)
UPDATE ts_interface SET requires = '{900}' WHERE pk = 870 AND value = 'aval.view';
-- aval.edit (871) → requer aval.view (870) — já tinha, confirmar
UPDATE ts_interface SET requires = '{870}' WHERE pk = 871 AND value = 'aval.edit';
-- rh.pessoal.view (901) → requer rh.view (900) — já tinha, confirmar
UPDATE ts_interface SET requires = '{900}' WHERE pk = 901 AND value = 'rh.pessoal.view';
-- rh.pessoal.edit (902) → requer rh.pessoal.view (901) — já tinha, confirmar
UPDATE ts_interface SET requires = '{901}' WHERE pk = 902 AND value = 'rh.pessoal.edit';

-- ============================================================
-- MÓDULO: DOCUMENTOS (gateway: docs.view = 530)
-- ============================================================
-- docs.view.assigned (520) → requer docs.view (530)
UPDATE ts_interface SET requires = '{530}' WHERE pk = 520 AND value = 'docs.view.assigned';
-- docs.view.owner (510) → requer docs.view (530)
UPDATE ts_interface SET requires = '{530}' WHERE pk = 510 AND value = 'docs.view.owner';
-- docs.view.all (500) → requer docs.view (530)
UPDATE ts_interface SET requires = '{530}' WHERE pk = 500 AND value = 'docs.view.all';
-- docs.modern (540) → requer docs.view (530)
UPDATE ts_interface SET requires = '{530}' WHERE pk = 540 AND value = 'docs.modern';
-- docs.create (560) → requer docs.view (530)
UPDATE ts_interface SET requires = '{530}' WHERE pk = 560 AND value = 'docs.create';
-- docs.edit (561) já requer docs.view (530) — confirmar
UPDATE ts_interface SET requires = '{530}' WHERE pk = 561 AND value = 'docs.edit';
-- docs.delete (562) → requer docs.edit (561)
UPDATE ts_interface SET requires = '{561}' WHERE pk = 562 AND value = 'docs.delete';

COMMIT;

-- ============================================================
-- Verificação pós-migração
-- ============================================================
SELECT pk, value, requires
FROM ts_interface
WHERE pk IN (
  -- Operação
  310, 311, 312, 313,
  -- RH
  211, 870, 871, 900, 901, 902,
  -- Documentos
  500, 510, 520, 530, 540, 560, 561, 562
)
ORDER BY pk;
