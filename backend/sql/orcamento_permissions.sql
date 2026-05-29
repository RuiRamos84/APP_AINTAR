-- =============================================================
-- Orçamento — Permissões
-- Data: 2026-05-19
--
-- Insere as permissões do módulo Orçamento em ts_interface.
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- PKs na gama 1610-1611.
-- =============================================================

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1610, 'orcamento.view', 'Orçamento', 'Consultar Orçamento',
       'Visualizar dotações, resumos e análise SNC-AP', 'account_balance', 1610
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'orcamento.view');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1611, 'orcamento.edit', 'Orçamento', 'Gerir Orçamento',
       'Criar, editar e eliminar dotações e catálogo (classes/subclasses)', 'edit', 1611
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'orcamento.edit');

-- Verificação
SELECT pk, value, category, label
FROM ts_interface
WHERE value LIKE 'orcamento.%'
ORDER BY pk;
