-- ============================================================
-- AINTAR – Migração de Permissões
-- Inserção das novas entradas na ts_interface
-- EXECUTAR EM TRANSACÇÃO — não altera nenhum registo existente
-- ============================================================
-- Pré-requisito: correr primeiro para verificar colisões:
--   SELECT pk, value FROM ts_interface WHERE pk IN
--   (201,211,561,562,601,760,830,831,840,841,850,851,860,861,870,871,880,890,900);
-- ============================================================

BEGIN;

INSERT INTO ts_interface
  (pk, value, category, label, description, icon, requires, is_critical, is_sensitive, sort_order)
VALUES

  -- Documentos — completar modelo view / edit / delete
  (561, 'docs.edit',   'Documentos',   'Editar Documentos',
   'Editar e actualizar documentos existentes', 'edit', '{530}', false, false, 561),

  (562, 'docs.delete', 'Documentos',   'Apagar Documentos',
   'Eliminar documentos do sistema', 'delete', '{561}', false, false, 562),

  -- Tarefas — separação view / edit
  (201, 'tasks.view',  'Tarefas',      'Visualizar Tarefas',
   'Ver tarefas sem permissão de gestão', 'visibility', NULL, false, false, 201),

  (760, 'tasks.edit',  'Tarefas',      'Editar Tarefas',
   'Editar tarefas atribuídas', 'edit', '{201}', false, false, 760),

  -- EPI — separação view / manage
  (211, 'epi.view',    'Equipamentos', 'Visualizar EPIs',
   'Ver equipamentos de protecção individual sem gerir', 'visibility', NULL, false, false, 211),

  -- Pagamentos — ver sem processar
  (880, 'payments.view', 'Pagamentos', 'Visualizar Pagamentos',
   'Ver pagamentos e histórico sem permissão para processar', 'visibility', NULL, false, false, 880),

  -- Frota / Veículos — módulo novo
  (830, 'fleet.view',  'Frota',        'Visualizar Frota',
   'Ver veículos, atribuições e manutenções', 'directions_car', NULL, false, false, 830),

  (831, 'fleet.edit',  'Frota',        'Gerir Frota',
   'Criar, editar e gerir veículos e atribuições', 'build', '{830}', false, false, 831),

  -- Obras — módulo novo
  (840, 'obras.view',  'Obras',        'Visualizar Obras',
   'Ver obras e despesas associadas', 'construction', NULL, false, false, 840),

  (841, 'obras.edit',  'Obras',        'Gerir Obras',
   'Criar, editar e gerir obras e despesas', 'edit', '{840}', false, false, 841),

  -- Telemetria — módulo novo
  (850, 'telemetry.view', 'Telemetria', 'Visualizar Telemetria',
   'Ver dados de telemetria IoT de activos hídricos', 'sensors', NULL, false, false, 850),

  (851, 'telemetry.edit', 'Telemetria', 'Gerir Telemetria',
   'Configurar e gerir telemetria IoT', 'settings', '{850}', false, false, 851),

  -- Equipamentos — módulo novo (distinto de EPI)
  (860, 'equipamentos.view', 'Equipamentos', 'Visualizar Equipamentos',
   'Ver equipamentos e inventário', 'inventory', NULL, false, false, 860),

  (861, 'equipamentos.edit', 'Equipamentos', 'Gerir Equipamentos',
   'Criar, editar e gerir equipamentos', 'build', '{860}', false, false, 861),

  -- Avaliações — módulo novo
  (870, 'aval.view',   'Avaliações',   'Visualizar Avaliações',
   'Ver avaliações e resultados', 'star', NULL, false, false, 870),

  (871, 'aval.edit',   'Avaliações',   'Gerir Avaliações',
   'Criar e editar avaliações', 'star_rate', '{870}', false, false, 871),

  -- Pavimentações — separação view / edit
  (601, 'pav.edit',    'Pavimentações', 'Gerir Pavimentações',
   'Executar e concluir pavimentações', 'edit', '{600}', false, false, 601),

  -- Pagamentos — gestão (processar, aprovar)
  (890, 'payments.manage', 'Pagamentos', 'Gerir Pagamentos',
   'Processar e aprovar pagamentos SIBS e outros', 'payment', '{880}', false, true, 890),

  -- Recursos Humanos — visualização geral
  (900, 'rh.view',        'Recursos Humanos', 'Visualizar RH',
   'Aceder ao módulo de recursos humanos (férias, faltas, horários)', 'people', NULL, false, false, 900),

  -- Recursos Humanos — Gestão Pessoal (férias, faltas, horários, piquete)
  (901, 'rh.pessoal.view', 'Recursos Humanos', 'Visualizar Gestão Pessoal',
   'Ver férias, faltas, horários e piquete', 'calendar_month', '{900}', false, false, 901),

  (902, 'rh.pessoal.edit', 'Recursos Humanos', 'Gerir Gestão Pessoal',
   'Criar, editar e gerir férias, faltas, horários e piquete', 'edit_calendar', '{901}', false, false, 902),

  -- Despesas Operacionais — módulo específico (rede, ramais, manutenção, equipamentos)
  (910, 'expenses.view',   'Despesas', 'Visualizar Despesas',
   'Ver despesas operacionais (rede, ramais, manutenção, equipamentos)', 'visibility', '{310}', false, false, 910),

  (911, 'expenses.edit',   'Despesas', 'Gerir Despesas',
   'Registar e editar despesas operacionais', 'edit', '{910}', false, false, 911),

  -- Análises Laboratoriais
  (920, 'analyses.view',   'Análises', 'Visualizar Análises',
   'Ver resultados de análises laboratoriais', 'science', NULL, false, false, 920),

  (921, 'analyses.edit',   'Análises', 'Gerir Análises',
   'Registar e editar análises laboratoriais', 'edit', '{920}', false, false, 921),

  -- Ofícios / Correspondência — granularidade por acção
  (1300, 'offices.view',      'Ofícios', 'Visualizar Ofícios',
   'Ver ofícios e correspondência', 'article', NULL, false, false, 1300),

  (1310, 'offices.create',    'Ofícios', 'Criar Ofícios',
   'Criar novos ofícios e correspondência', 'note_add', '{1300}', false, false, 1310),

  (1330, 'offices.close',     'Ofícios', 'Fechar/Assinar Ofícios',
   'Assinar e fechar ofícios', 'check_circle', '{1300}', false, false, 1330),

  (1340, 'offices.replicate', 'Ofícios', 'Replicar Ofícios',
   'Replicar ofícios para múltiplos destinatários', 'content_copy', '{1300}', false, false, 1340)

ON CONFLICT (pk) DO NOTHING;  -- Seguro: ignora se já existir

COMMIT;

-- ============================================================
-- Verificação pós-migração
-- ============================================================
SELECT pk, value, category, label, requires
FROM ts_interface
WHERE pk IN (
  201,211,561,562,601,760,
  830,831,840,841,850,851,860,861,870,871,
  880,890,
  900,901,902,
  910,911,920,921,
  1300,1310,1330,1340
)
ORDER BY pk;
