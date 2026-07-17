-- Permissões dedicadas de alertas por módulo (2026-07-17).
-- Quem recebe alertas/notificações broadcast de um módulo passa a ser
-- controlado por permissão própria (atribuível na UI de permissões),
-- desacoplada da permissão de gestão do módulo. O código lê estas
-- permissões via get_alert_recipients() (app/services/notification_service.py).
--
-- Idempotente — seguro correr mais do que uma vez. Executar em dev E prod
-- (aintar_server_dev / aintar_server) ANTES do deploy do código que as lê:
-- sem elas, os jobs de alertas encontram 0 destinatários e não notificam.

-- 1. Criar as permissões (PKs manuais na gama 1620+, livre em ambos os schemas)

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1620, 'payments.alerts', 'Pagamentos', 'Alertas de Pagamentos', 'Receber notificação quando um pagamento dá entrada (webhook SIBS)', 'notifications', 1620
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'payments.alerts');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1621, 'fleet.alerts', 'Frota', 'Alertas de Frota', 'Receber alertas de frota: avarias reportadas, documentos e manutenções a expirar', 'notifications', 1621
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'fleet.alerts');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1622, 'licenca.alerts', 'Gestão', 'Alertas de Licenças', 'Receber alertas de licenças APA de ETAR a expirar/expiradas (in-app + email se tiver email)', 'notifications', 1622
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'licenca.alerts');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT 1623, 'rh.alerts', 'Recursos Humanos', 'Alertas de RH', 'Receber alertas RH: contratos a terminar, férias transitadas, documentos a vencer', 'notifications', 1623
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'rh.alerts');

-- 2. Grants iniciais — preservam exatamente quem recebia antes da migração.
--    (array_append só se ainda não tiver, para manter a idempotência)

-- payments.alerts → contabilidade: quem tem payments.manage e não é admin de
-- sistema (em prod: Vânia Trovão, Cláudia Marques, Rita Laranjeira). O admin
-- pode auto-atribuir na UI se quiser receber também.
UPDATE ts_client c
SET interface = array_append(interface, (SELECT pk FROM ts_interface WHERE value = 'payments.alerts'))
WHERE c.ts_profile <> 0
  AND EXISTS (SELECT 1 FROM ts_interface i WHERE i.value = 'payments.manage' AND c.interface @> ARRAY[i.pk])
  AND NOT c.interface @> ARRAY[(SELECT pk FROM ts_interface WHERE value = 'payments.alerts')];

-- fleet.alerts → destinatários atuais: fleet.edit OU admin de sistema
UPDATE ts_client c
SET interface = array_append(COALESCE(interface, ARRAY[]::integer[]), (SELECT pk FROM ts_interface WHERE value = 'fleet.alerts'))
WHERE (c.ts_profile = 0
       OR EXISTS (SELECT 1 FROM ts_interface i WHERE i.value = 'fleet.edit' AND c.interface @> ARRAY[i.pk]))
  AND NOT COALESCE(c.interface, ARRAY[]::integer[]) @> ARRAY[(SELECT pk FROM ts_interface WHERE value = 'fleet.alerts')];

-- licenca.alerts → destinatários atuais: operation.access (o requisito antigo
-- de ter email deixa de excluir da notificação in-app; o email continua a só
-- ir para quem o tem configurado)
UPDATE ts_client c
SET interface = array_append(interface, (SELECT pk FROM ts_interface WHERE value = 'licenca.alerts'))
WHERE EXISTS (SELECT 1 FROM ts_interface i WHERE i.value = 'operation.access' AND c.interface @> ARRAY[i.pk])
  AND NOT c.interface @> ARRAY[(SELECT pk FROM ts_interface WHERE value = 'licenca.alerts')];

-- rh.alerts → destinatários atuais: rh.admin OU admin de sistema
UPDATE ts_client c
SET interface = array_append(COALESCE(interface, ARRAY[]::integer[]), (SELECT pk FROM ts_interface WHERE value = 'rh.alerts'))
WHERE (c.ts_profile = 0
       OR EXISTS (SELECT 1 FROM ts_interface i WHERE i.value = 'rh.admin' AND c.interface @> ARRAY[i.pk]))
  AND NOT COALESCE(c.interface, ARRAY[]::integer[]) @> ARRAY[(SELECT pk FROM ts_interface WHERE value = 'rh.alerts')];

-- 3. Verificação: quem ficou com cada permissão de alerta
SELECT i.value AS permissao, c.pk, c.name
FROM ts_interface i
JOIN ts_client c ON c.interface @> ARRAY[i.pk]
WHERE i.value IN ('payments.alerts', 'fleet.alerts', 'licenca.alerts', 'rh.alerts')
ORDER BY i.value, c.name;
