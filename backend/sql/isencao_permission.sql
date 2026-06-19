-- =============================================================
-- Pagamentos — Permissão Granular de Isenção
-- Data: 2026-06-19
--
-- Cria a permissão payments.isencao (PK 1615) e atribui-a
-- individualmente ao Tiago Matos e à Karine Costa.
--
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- =============================================================

-- 1. Criar a permissão em ts_interface
INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1615, 'payments.isencao', 'Pagamentos', 'Aplicar Isenção',
       'Aplicar isenção de pagamento a 0€ após validação de comprovativo de fatura de água',
       'verified_user', 1615
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'payments.isencao');

-- 2. Verificar utilizadores (confirmar antes de atualizar)
SELECT pk, name, ts_profile
FROM ts_client
WHERE name ILIKE '%Tiago%Matos%' OR name ILIKE '%Karine%Costa%'
ORDER BY name;

-- 3. Atribuir permissão aos utilizadores
--    array_append só adiciona se o PK ainda não estiver no array (guarda pelo NOT @>)
UPDATE ts_client
SET interface = array_append(interface, 1615)
WHERE (name ILIKE '%Tiago%Matos%' OR name ILIKE '%Karine%Costa%')
  AND NOT (COALESCE(interface, ARRAY[]::integer[]) @> ARRAY[1615]);

-- 4. Verificação final
SELECT pk, name, interface
FROM ts_client
WHERE name ILIKE '%Tiago%Matos%' OR name ILIKE '%Karine%Costa%'
ORDER BY name;

-- 5. Confirmar que a permissão existe no catálogo
SELECT pk, value, category, label
FROM ts_interface
WHERE value = 'payments.isencao';
