-- =============================================================
-- Stock — Permissões
-- Data: 2026-05-27
--
-- Insere as permissões do módulo Stock em ts_interface.
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- PKs na gama 1612-1613.
-- =============================================================

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1612, 'stock.view', 'Stock', 'Consultar Stock',
       'Visualizar stock atual, artigos, entradas e saídas de materiais', 'inventory', 1612
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'stock.view');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1613, 'stock.manage', 'Stock', 'Gerir Stock',
       'Criar, editar e eliminar artigos, entradas e saídas de stock (requer stock.view)', 'edit', 1613
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'stock.manage');

-- Verificação
SELECT pk, value, category, label
FROM ts_interface
WHERE value LIKE 'stock.%'
ORDER BY pk;
