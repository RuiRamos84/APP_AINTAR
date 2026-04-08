-- ============================================================
-- AINTAR – Dependências de Permissões do Módulo RH
-- Garante que epi.view e aval.view exigem rh.view (pk=900)
-- EXECUTAR EM TRANSACÇÃO
-- ============================================================
-- Verificação prévia:
--   SELECT pk, value, requires FROM ts_interface
--   WHERE pk IN (211, 870, 871, 900, 901, 902);
-- ============================================================

BEGIN;

-- epi.view (211) → requer rh.view (900)
UPDATE ts_interface SET requires = '{900}' WHERE pk = 211 AND value = 'epi.view';

-- aval.view (870) → requer rh.view (900)
UPDATE ts_interface SET requires = '{900}' WHERE pk = 870 AND value = 'aval.view';

-- aval.edit (871) → requer aval.view (870), que já requer rh.view
UPDATE ts_interface SET requires = '{870}' WHERE pk = 871 AND value = 'aval.edit';

COMMIT;

-- Verificação pós-migração:
SELECT pk, value, requires
FROM ts_interface
WHERE pk IN (211, 870, 871, 900, 901, 902)
ORDER BY pk;
