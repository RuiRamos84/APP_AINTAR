-- ============================================================
-- AINTAR — Migração de Permissões para Grupos
-- Executar APÓS o backup_permissions_before_migration.sql
-- Data: 2026-03-31
--
-- Objectivo: Limpar permissões antigas (PKs que já não existem
-- na ts_interface) e preparar para reatribuição via grupos.
--
-- FLUXO RECOMENDADO:
--   1. Executar backup_permissions_before_migration.sql
--   2. Executar este script
--   3. Reatribuir permissões via UI (Administração → Utilizadores)
-- ============================================================


-- ── PRÉ-VERIFICAÇÃO ─────────────────────────────────────────
-- Correr primeiro, sem COMMIT, para ver o impacto:

-- Permissões actualmente atribuídas que JÁ NÃO EXISTEM na ts_interface:
SELECT
    c.pk        AS user_pk,
    c.name      AS username,
    p.pk_orphan AS permission_id_inexistente
FROM ts_client c
CROSS JOIN LATERAL unnest(c.interface) AS p(pk_orphan)
WHERE NOT EXISTS (
    SELECT 1 FROM ts_interface i WHERE i.pk = p.pk_orphan
)
  AND c.interface IS NOT NULL
ORDER BY c.name, p.pk_orphan;


-- ── LIMPEZA DE PKs ÓRFÃOS ───────────────────────────────────
-- Remove de cada utilizador os IDs que já não existem na ts_interface
-- (PKs de permissões antigas que foram substituídas ou removidas)

BEGIN;

UPDATE ts_client
SET interface = ARRAY(
    SELECT p
    FROM unnest(interface) AS p
    WHERE EXISTS (SELECT 1 FROM ts_interface i WHERE i.pk = p)
)
WHERE interface IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM unnest(interface) AS p
      WHERE NOT EXISTS (SELECT 1 FROM ts_interface i WHERE i.pk = p)
  );

-- Verificar resultado:
SELECT
    c.pk,
    c.name,
    c.interface AS permissions_after_cleanup,
    array_length(c.interface, 1) AS total
FROM ts_client c
WHERE c.active = true
ORDER BY c.name;

COMMIT;


-- ── PÓS-MIGRAÇÃO: Verificação Final ─────────────────────────

-- 1. Utilizadores sem nenhuma permissão (após limpeza)
SELECT pk, name, profil
FROM ts_client
WHERE (interface IS NULL OR array_length(interface, 1) = 0)
  AND active = true
  AND profil != '0'   -- excluir super-admins
ORDER BY name;

-- 2. Comparar antes vs depois (requer tabela de backup criada no passo 1)
SELECT
    b.username,
    b.profil,
    b.permission_ids  AS antes,
    c.interface       AS depois,
    array_length(b.permission_ids, 1) - array_length(c.interface, 1) AS removidas
FROM _backup_permissions_20260331 b
JOIN ts_client c ON c.pk = b.user_pk
WHERE b.permission_ids IS DISTINCT FROM c.interface
ORDER BY b.username;


-- ── ROLLBACK (em caso de problema) ──────────────────────────
-- Para repor TODOS os utilizadores ao estado anterior:
--
-- UPDATE ts_client c
-- SET interface = b.permission_ids
-- FROM _backup_permissions_20260331 b
-- WHERE c.pk = b.user_pk;
