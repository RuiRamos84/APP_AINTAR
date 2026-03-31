-- ============================================================
-- AINTAR — Reatribuição de Permissões por Grupos (De Raiz)
-- Data: 2026-03-31
--
-- CONCEITO:
--   Em vez de mapear permissões antigas, atribui grupos da BD
--   directamente a utilizadores/perfis. Os PKs vêm sempre da
--   ts_interface — zero hardcoding.
--
-- FLUXO:
--   1. DIAGNÓSTICO  — ver estado actual
--   2. PREPARAÇÃO   — limpar permissões antigas
--   3. ATRIBUIÇÃO   — atribuir grupos por perfil ou por utilizador
--   4. VERIFICAÇÃO  — confirmar resultado
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PASSO 1 — DIAGNÓSTICO (só leitura, sem alterações)
-- ════════════════════════════════════════════════════════════

-- 1a. Grupos disponíveis na BD (criados na UI de permissões)
SELECT
    g.name                                          AS grupo,
    COUNT(i.pk)                                     AS num_permissoes,
    ARRAY_AGG(i.value ORDER BY i.sort_order, i.pk)  AS permissoes
FROM ts_interface i
CROSS JOIN LATERAL unnest(i.groups) AS g(name)
WHERE i.groups IS NOT NULL AND array_length(i.groups, 1) > 0
GROUP BY g.name
ORDER BY g.name;


-- 1b. Utilizadores activos e as suas permissões actuais (mapeadas para value strings)
SELECT
    c.pk                                                AS user_pk,
    c.name                                              AS username,
    c.profil                                            AS profil,
    COALESCE(
        ARRAY(
            SELECT i.value
            FROM ts_interface i
            WHERE i.pk = ANY(c.interface)
            ORDER BY i.pk
        ),
        ARRAY[]::text[]
    )                                                   AS permissoes_actuais,
    array_length(c.interface, 1)                        AS total
FROM ts_client c
WHERE c.active = true
ORDER BY c.profil, c.name;


-- 1c. Permissões inválidas (PKs que já não existem na ts_interface)
SELECT
    c.pk    AS user_pk,
    c.name  AS username,
    c.profil,
    p.id    AS pk_invalido
FROM ts_client c
CROSS JOIN LATERAL unnest(c.interface) AS p(id)
WHERE NOT EXISTS (SELECT 1 FROM ts_interface i WHERE i.pk = p.id)
  AND c.interface IS NOT NULL
ORDER BY c.name;


-- ════════════════════════════════════════════════════════════
-- PASSO 2 — PREPARAÇÃO
-- Zerar permissões de TODOS os utilizadores activos
-- (super-admins com profil='0' são ignorados)
-- ════════════════════════════════════════════════════════════

BEGIN;

UPDATE ts_client
SET interface = NULL
WHERE active = true
  AND profil != '0';   -- Nunca tocar nos super-admins

-- Confirmar:
SELECT pk, name, profil, interface
FROM ts_client
WHERE active = true AND profil != '0'
ORDER BY profil, name;

COMMIT;


-- ════════════════════════════════════════════════════════════
-- PASSO 3 — ATRIBUIÇÃO POR GRUPO
--
-- Opção A: Por PERFIL — atribui o mesmo grupo a todos
--          os utilizadores com o mesmo perfil.
--
-- Opção B: Por UTILIZADOR — atribui grupo específico
--          a um utilizador concreto.
--
-- Os PKs são resolvidos dinamicamente da ts_interface.
-- Substituir 'NOME_DO_GRUPO' pelo grupo pretendido.
-- ════════════════════════════════════════════════════════════

-- ── Opção A: Por Perfil ──────────────────────────────────────

-- Atribuir grupo a todos os utilizadores com profil = '1'
-- (substituir 'NOME_DO_GRUPO' e o valor do profil conforme necessário)
/*
UPDATE ts_client
SET interface = ARRAY(
    SELECT DISTINCT i.pk
    FROM ts_interface i
    WHERE 'NOME_DO_GRUPO' = ANY(i.groups)
    ORDER BY 1
)
WHERE active = true
  AND profil = '1';
*/

-- ── Opção B: Por Utilizador (PK específico) ──────────────────

-- Atribuir grupo a um utilizador específico
-- (substituir 'NOME_DO_GRUPO' e o user_pk)
/*
UPDATE ts_client
SET interface = ARRAY(
    SELECT DISTINCT i.pk
    FROM ts_interface i
    WHERE 'NOME_DO_GRUPO' = ANY(i.groups)
    ORDER BY 1
)
WHERE pk = <USER_PK>;
*/

-- ── Opção C: Múltiplos grupos para um utilizador ─────────────

-- Atribuir permissões de VÁRIOS grupos (união) a um utilizador
-- (útil para utilizadores com funções mistas)
/*
UPDATE ts_client
SET interface = ARRAY(
    SELECT DISTINCT i.pk
    FROM ts_interface i
    WHERE i.groups && ARRAY['GRUPO_1', 'GRUPO_2']::text[]
    ORDER BY 1
)
WHERE pk = <USER_PK>;
*/


-- ════════════════════════════════════════════════════════════
-- PASSO 4 — VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════

-- Estado final: utilizadores e as suas novas permissões
SELECT
    c.pk,
    c.name,
    c.profil,
    COALESCE(
        ARRAY(
            SELECT i.value
            FROM ts_interface i
            WHERE i.pk = ANY(c.interface)
            ORDER BY i.pk
        ),
        ARRAY[]::text[]
    )                            AS permissoes,
    array_length(c.interface, 1) AS total
FROM ts_client c
WHERE c.active = true AND profil != '0'
ORDER BY c.profil, c.name;


-- Utilizadores SEM permissões após migração (requerem atenção):
SELECT pk, name, profil
FROM ts_client
WHERE active = true
  AND profil != '0'
  AND (interface IS NULL OR array_length(interface, 1) = 0)
ORDER BY profil, name;
