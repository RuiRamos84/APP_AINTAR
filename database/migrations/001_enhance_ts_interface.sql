-- ============================================================================
-- MIGRATION: Melhorar tabela ts_interface com metadados
-- Data: 2025-10-19
-- Descrição: Adicionar colunas para categorização, descrições e dependências
-- ============================================================================

-- Adicionar novas colunas (apenas se não existirem)
ALTER TABLE ts_interface
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS label VARCHAR(200),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
ADD COLUMN IF NOT EXISTS requires INTEGER[],
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_interface_category ON ts_interface(category);
CREATE INDEX IF NOT EXISTS idx_interface_sort ON ts_interface(sort_order);

-- ============================================================================
-- POPULAR METADADOS DAS PERMISSÕES EXISTENTES
-- ============================================================================

-- ==================== ADMINISTRAÇÃO ====================

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Dashboard Administrativo',
    description = 'Aceder ao painel de controlo da administração',
    icon = 'dashboard',
    sort_order = 10,
    is_critical = FALSE
WHERE pk = 10;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Gerir Utilizadores',
    description = 'Criar, editar e remover utilizadores do sistema',
    icon = 'people',
    sort_order = 20,
    is_critical = TRUE
WHERE pk = 20;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Gerir Pagamentos',
    description = 'Visualizar e aprovar todos os pagamentos manuais',
    icon = 'payment',
    sort_order = 30,
    is_critical = FALSE
WHERE pk = 30;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Gerir Caixa',
    description = 'Gerir caixa e movimentos financeiros',
    icon = 'account_balance',
    sort_order = 40,
    is_critical = FALSE
WHERE pk = 40;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Gerir Todos os Documentos',
    description = 'Editar, eliminar e gerir todos os documentos do sistema',
    icon = 'folder_shared',
    sort_order = 50,
    is_critical = FALSE
WHERE pk = 50;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Reabrir Documentos',
    description = 'Reabrir documentos que foram fechados',
    icon = 'folder_open',
    sort_order = 60,
    is_critical = FALSE,
    requires = ARRAY[50]  -- Requer "Gerir Todos os Documentos"
WHERE pk = 60;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Gerir Base de Dados',
    description = 'Aceder a ferramentas de gestão da base de dados e backups',
    icon = 'storage',
    sort_order = 70,
    is_critical = TRUE
WHERE pk = 70;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Visualizar Logs',
    description = 'Aceder aos logs de sistema e auditoria',
    icon = 'description',
    sort_order = 80,
    is_critical = FALSE
WHERE pk = 80;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Relatórios Avançados',
    description = 'Aceder a relatórios estatísticos e analytics',
    icon = 'assessment',
    sort_order = 90,
    is_critical = FALSE
WHERE pk = 90;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Configurações do Sistema',
    description = 'Alterar configurações críticas do sistema',
    icon = 'settings',
    sort_order = 100,
    is_critical = TRUE
WHERE pk = 100;

UPDATE ts_interface SET
    category = 'Administração',
    label = 'Gerir Cache',
    description = 'Limpar e gerir cache do sistema',
    icon = 'cached',
    sort_order = 110,
    is_critical = FALSE
WHERE pk = 110;

-- ==================== TAREFAS ====================

UPDATE ts_interface SET
    category = 'Tarefas',
    label = 'Gerir Todas as Tarefas',
    description = 'Aceder e gerir todas as tarefas do sistema',
    icon = 'task',
    sort_order = 200,
    is_critical = FALSE
WHERE pk = 200;

UPDATE ts_interface SET
    category = 'Equipamentos',
    label = 'Gerir EPIs',
    description = 'Gerir equipamentos de proteção individual',
    icon = 'safety_divider',
    sort_order = 210,
    is_critical = FALSE
WHERE pk = 210;

UPDATE ts_interface SET
    category = 'Correspondência',
    label = 'Gerir Correspondência',
    description = 'Gerir correspondência e ofícios',
    icon = 'mail',
    sort_order = 220,
    is_critical = FALSE
WHERE pk = 220;

UPDATE ts_interface SET
    category = 'Tarefas',
    label = 'Gerir Tarefas Atribuídas',
    description = 'Gerir tarefas atribuídas a si',
    icon = 'assignment',
    sort_order = 750,
    is_critical = FALSE
WHERE pk = 750;

-- ==================== ACESSOS ====================

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Acesso Interno',
    description = 'Aceder à área interna do sistema',
    icon = 'login',
    sort_order = 300,
    is_critical = FALSE
WHERE pk = 300;

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Acesso a Operações',
    description = 'Aceder ao módulo de operações',
    icon = 'work',
    sort_order = 310,
    is_critical = FALSE
WHERE pk = 310;

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Executar Operações',
    description = 'Executar e completar operações',
    icon = 'play_circle',
    sort_order = 311,
    is_critical = FALSE,
    requires = ARRAY[310]  -- Requer "Acesso a Operações"
WHERE pk = 311;

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Supervisionar Operações',
    description = 'Supervisionar e validar operações',
    icon = 'supervisor_account',
    sort_order = 312,
    is_critical = FALSE,
    requires = ARRAY[310]  -- Requer "Acesso a Operações"
WHERE pk = 312;

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Gerir Operações',
    description = 'Configurar e gerir o módulo de operações',
    icon = 'settings',
    sort_order = 313,
    is_critical = FALSE,
    requires = ARRAY[310]  -- Requer "Acesso a Operações"
WHERE pk = 313;

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Acesso Global',
    description = 'Acesso global a todas as áreas (exceto admin)',
    icon = 'public',
    sort_order = 320,
    is_critical = FALSE
WHERE pk = 320;

UPDATE ts_interface SET
    category = 'Acessos',
    label = 'Visualizar Dashboard',
    description = 'Ver o dashboard principal',
    icon = 'dashboard',
    sort_order = 400,
    is_critical = FALSE
WHERE pk = 400;

-- ==================== DOCUMENTOS ====================

UPDATE ts_interface SET
    category = 'Documentos',
    label = 'Ver Todos os Documentos',
    description = 'Visualizar todos os documentos do sistema',
    icon = 'folder_shared',
    sort_order = 500,
    is_critical = FALSE
WHERE pk = 500;

UPDATE ts_interface SET
    category = 'Documentos',
    label = 'Ver Documentos Próprios',
    description = 'Visualizar documentos criados por si',
    icon = 'folder',
    sort_order = 510,
    is_critical = FALSE
WHERE pk = 510;

UPDATE ts_interface SET
    category = 'Documentos',
    label = 'Ver Documentos Atribuídos',
    description = 'Visualizar documentos atribuídos a si',
    icon = 'folder_shared',
    sort_order = 520,
    is_critical = FALSE
WHERE pk = 520;

UPDATE ts_interface SET
    category = 'Documentos',
    label = 'Visualizar Documentos',
    description = 'Visualização básica de documentos',
    icon = 'visibility',
    sort_order = 530,
    is_critical = FALSE
WHERE pk = 530;

UPDATE ts_interface SET
    category = 'Documentos',
    label = 'Gestor Moderno de Documentos',
    description = 'Aceder ao gestor moderno de documentos',
    icon = 'article',
    sort_order = 540,
    is_critical = FALSE
WHERE pk = 540;

UPDATE ts_interface SET
    category = 'Documentos',
    label = 'Criar Documentos',
    description = 'Criar novos documentos',
    icon = 'add_circle',
    sort_order = 560,
    is_critical = FALSE
WHERE pk = 560;

-- ==================== OUTROS ====================

UPDATE ts_interface SET
    category = 'Outros',
    label = 'Visualizar PAV',
    description = 'Aceder ao módulo PAV',
    icon = 'visibility',
    sort_order = 600,
    is_critical = FALSE
WHERE pk = 600;

-- ==================== PAGAMENTOS ====================

UPDATE ts_interface SET
    category = 'Pagamentos',
    label = 'Processar MB WAY',
    description = 'Processar pagamentos via MB WAY',
    icon = 'smartphone',
    sort_order = 700,
    is_critical = FALSE
WHERE pk = 700;

UPDATE ts_interface SET
    category = 'Pagamentos',
    label = 'Processar Multibanco',
    description = 'Processar pagamentos via Multibanco',
    icon = 'credit_card',
    sort_order = 710,
    is_critical = FALSE
WHERE pk = 710;

UPDATE ts_interface SET
    category = 'Pagamentos',
    label = 'Processar Transferências',
    description = 'Processar transferências bancárias',
    icon = 'account_balance',
    sort_order = 720,
    is_critical = FALSE
WHERE pk = 720;

UPDATE ts_interface SET
    category = 'Pagamentos',
    label = 'Processar Numerário',
    description = 'Processar pagamentos em numerário',
    icon = 'local_atm',
    sort_order = 730,
    is_critical = FALSE,
    is_sensitive = TRUE  -- Permissão sensível!
WHERE pk = 730;

UPDATE ts_interface SET
    category = 'Pagamentos',
    label = 'Pagamentos Municípios',
    description = 'Processar pagamentos de municípios',
    icon = 'account_balance',
    sort_order = 740,
    is_critical = FALSE
WHERE pk = 740;

-- ==================== ENTIDADES ====================

UPDATE ts_interface SET
    category = 'Entidades',
    label = 'Visualizar Entidades',
    description = 'Visualizar informações de entidades',
    icon = 'business',
    sort_order = 800,
    is_critical = FALSE
WHERE pk = 800;

UPDATE ts_interface SET
    category = 'Entidades',
    label = 'Criar Entidades',
    description = 'Criar novas entidades no sistema',
    icon = 'add_business',
    sort_order = 810,
    is_critical = FALSE
WHERE pk = 810;

UPDATE ts_interface SET
    category = 'Entidades',
    label = 'Gerir Entidades',
    description = 'Editar e gerir todas as entidades',
    icon = 'business_center',
    sort_order = 820,
    is_critical = FALSE
WHERE pk = 820;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Ver resultado da migration
SELECT
    pk as "ID",
    value as "Key",
    category as "Categoria",
    label as "Label",
    description as "Descrição",
    CASE
        WHEN is_critical THEN '🔴 Crítica'
        WHEN is_sensitive THEN '⚠️ Sensível'
        ELSE '✓'
    END as "Flags",
    CASE
        WHEN requires IS NOT NULL AND array_length(requires, 1) > 0
        THEN '🔗 ' || array_to_string(requires, ', ')
        ELSE '-'
    END as "Dependências"
FROM ts_interface
ORDER BY sort_order, pk;

-- Estatísticas
SELECT
    category as "Categoria",
    COUNT(*) as "Total",
    COUNT(*) FILTER (WHERE is_critical) as "Críticas",
    COUNT(*) FILTER (WHERE is_sensitive) as "Sensíveis",
    COUNT(*) FILTER (WHERE requires IS NOT NULL AND array_length(requires, 1) > 0) as "Com Dependências"
FROM ts_interface
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

COMMIT;
