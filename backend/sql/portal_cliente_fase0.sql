-- =============================================================
-- Portal Cliente — Fase 0: Permissões
-- Autor: Rui Ramos
-- Data: 2026-05-06
--
-- NOTA: O perfil pk=3 "Perfil Cliente" já existe em ts_profile.
--       Apenas criamos as permissões e as atribuímos.
--
-- PKs gerados com fs_nextcode() conforme padrão do projecto.
-- =============================================================

-- 1. Criar permissões do portal em ts_interface
--    (apenas se não existirem — IDEMPOTENTE)
--    Usamos PKs manuais na gama 1600+

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1600, 'portal.access', 'Portal Cliente', 'Acesso ao Portal', 'Acesso ao Portal do Cliente', 'web', 1600
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.access');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1601, 'portal.invoices.view', 'Portal Cliente', 'Consultar Faturas', 'Portal: Consultar facturas próprias', 'receipt', 1601
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.invoices.view');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1602, 'portal.payments.pay', 'Portal Cliente', 'Pagar Faturas', 'Portal: Iniciar pagamento', 'payment', 1602
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.payments.pay');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1603, 'portal.profile.edit', 'Portal Cliente', 'Editar Perfil', 'Portal: Editar dados próprios', 'person', 1603
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'portal.profile.edit');
-- 2. Verificação final: listar todas as permissões do portal criadas
SELECT pk, value, category, label, description
FROM ts_interface
WHERE value LIKE 'portal.%'
ORDER BY pk;
