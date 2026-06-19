-- =============================================================
-- WhatsApp — Permissões
-- Data: 2026-06-11
--
-- Insere a permissão de gestão do módulo WhatsApp em ts_interface.
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- PK 1614.
-- =============================================================

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1614, 'whatsapp.manage', 'WhatsApp', 'Gerir WhatsApp',
       'Ligar/desligar sessão, gerir grupos e enviar alertas via WhatsApp', 'whatsapp', 1614
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'whatsapp.manage');

-- Verificação
SELECT pk, value, category, label
FROM ts_interface
WHERE value LIKE 'whatsapp.%'
ORDER BY pk;
