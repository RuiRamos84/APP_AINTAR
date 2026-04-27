-- backend/app/sql/rh/16_permissions.sql
-- Permissões do módulo RH Pessoal → ts_interface
-- Executar APÓS os ficheiros 01-15 (BD Foundation)
--
-- Hierarquia:
--   rh.view
--     └── rh.pessoal.view
--           └── rh.edit
--               └── rh.validate
--                     └── rh.admin

-- ─── 1. Inserir permissões (sem requires ainda) ─────────────────────────────
INSERT INTO ts_interface (pk, value, category, label, description, icon, is_critical, is_sensitive, sort_order)
VALUES
    (fs_nextcode(), 'rh.view',
        'Recursos Humanos',
        'Ver RH',
        'Aceder ao módulo Recursos Humanos e consultar dados.',
        'Badge',
        false, false, 1500),

    (fs_nextcode(), 'rh.pessoal.view',
        'Recursos Humanos',
        'Ver Gestão Pessoal',
        'Consultar ponto, férias, faltas, horários e piquete.',
        'ManageAccounts',
        false, false, 1510),

    (fs_nextcode(), 'rh.edit',
        'Recursos Humanos',
        'Editar Gestão Pessoal',
        'Registar ponto diário, submeter pedidos de férias e registar faltas.',
        'EditCalendar',
        false, false, 1520),

    (fs_nextcode(), 'rh.validate',
        'Recursos Humanos',
        'Validar RH (Superior)',
        'Validar pedidos de ponto, férias e faltas como superior hierárquico.',
        'HowToReg',
        false, true, 1530),

    (fs_nextcode(), 'rh.admin',
        'Recursos Humanos',
        'Admin RH',
        'Aprovação final, correcção de ponto, geração de escalas de piquete e configuração de saldos.',
        'AdminPanelSettings',
        false, true, 1540)

ON CONFLICT (value) DO NOTHING;


-- ─── 2. Definir cascata de dependências (requires) ──────────────────────────
-- rh.pessoal.view requer rh.view
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.view')
WHERE value = 'rh.pessoal.view';

-- rh.edit requer rh.pessoal.view
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.pessoal.view')
WHERE value = 'rh.edit';

-- rh.validate requer rh.view
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.view')
WHERE value = 'rh.validate';

-- rh.admin requer rh.validate
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'rh.validate')
WHERE value = 'rh.admin';


-- ─── 3. Verificação ─────────────────────────────────────────────────────────
SELECT
    pk,
    value,
    label,
    sort_order,
    CASE WHEN requires IS NOT NULL AND array_length(requires, 1) > 0
         THEN (SELECT value FROM ts_interface r WHERE r.pk = requires[1])
         ELSE '—'
    END AS requer
FROM ts_interface
WHERE value LIKE 'rh.%'
ORDER BY sort_order;
-- Deve retornar 5 linhas com a cascata correcta
