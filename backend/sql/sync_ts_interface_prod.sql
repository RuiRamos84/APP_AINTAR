-- =============================================================
-- Sync ts_interface: DEV → PROD
-- Data: 2026-05-08
--
-- O que faz:
--   1. Insere as 4 permissões do Portal Cliente (1600-1603)
--   2. Insere concursal.admin (912) — presente em DEV
--   3. Actualiza website.view (930) com label/categoria correctos
--   4. Actualiza website.edit (940 em prod) com label/categoria correctos
--
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- NÃO altera PKs de rh.* (diferentes entre ambientes — não é problema).
-- =============================================================

-- ── 1. Portal Cliente (inserções) ────────────────────────────────────────────

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1600, 'portal.access', 'Portal Cliente', 'Acesso ao Portal',
       'Acesso ao Portal do Cliente', 'web', 1600
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.access');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1601, 'portal.invoices.view', 'Portal Cliente', 'Consultar Faturas',
       'Portal: Consultar facturas próprias', 'receipt', 1601
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.invoices.view');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1602, 'portal.payments.pay', 'Portal Cliente', 'Pagar Faturas',
       'Portal: Iniciar pagamento', 'payment', 1602
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.payments.pay');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1603, 'portal.profile.edit', 'Portal Cliente', 'Editar Perfil',
       'Portal: Editar dados próprios', 'person', 1603
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.profile.edit');

-- ── 2. concursal.admin (inserção) ────────────────────────────────────────────

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order, requires)
SELECT 912, 'concursal.admin', '', 'Procedimentos Concursais - Administrar',
       '', '', 0, ARRAY[911]::integer[]
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'concursal.admin');

-- ── 3. website.view — actualizar label/categoria (pk=930 existe em prod) ─────

UPDATE ts_interface SET
    category   = 'Website',
    label      = 'Visualizar Website',
    icon       = 'public',
    sort_order = 930
WHERE pk = 930 AND value = 'website.view';

-- ── 4. website.edit — actualizar label/categoria (pk=940 em prod, 931 em dev) ─

UPDATE ts_interface SET
    category   = 'Website',
    label      = 'Gerir Website',
    icon       = 'edit',
    sort_order = 940
WHERE pk = 940 AND value = 'website.edit';

-- ── Verificação final ─────────────────────────────────────────────────────────

SELECT pk, value, category, label, icon, sort_order
FROM ts_interface
WHERE value IN (
    'portal.access', 'portal.invoices.view', 'portal.payments.pay', 'portal.profile.edit',
    'concursal.admin', 'website.view', 'website.edit'
)
ORDER BY pk;
