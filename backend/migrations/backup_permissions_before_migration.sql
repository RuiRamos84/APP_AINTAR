-- ============================================================
-- AINTAR — Backup de Permissões Antes da Migração
-- Executar ANTES de qualquer alteração em produção
-- Data: 2026-03-31
-- ============================================================

-- ── 1. Estado actual de TODOS os utilizadores ───────────────
-- Exporta: pk, username, profil, e lista de permissões (value strings)
SELECT
    c.pk                                          AS user_pk,
    c.name                                        AS username,
    c.profil                                      AS profil,
    c.interface                                   AS permission_ids_raw,
    COALESCE(
        ARRAY(
            SELECT i.value
            FROM ts_interface i
            WHERE i.pk = ANY(c.interface)
            ORDER BY i.pk
        ),
        ARRAY[]::text[]
    )                                             AS permission_values,
    array_length(c.interface, 1)                  AS total_permissions
FROM ts_client c
WHERE c.active = true
ORDER BY c.profil, c.name;


-- ── 2. Grupos actuais e as suas permissões ──────────────────
SELECT
    g.name                                         AS grupo,
    COUNT(i.pk)                                    AS num_permissoes,
    ARRAY_AGG(i.pk    ORDER BY i.sort_order, i.pk) AS permission_ids,
    ARRAY_AGG(i.value ORDER BY i.sort_order, i.pk) AS permission_values
FROM ts_interface i
CROSS JOIN LATERAL unnest(i.groups) AS g(name)
WHERE i.groups IS NOT NULL
  AND array_length(i.groups, 1) > 0
GROUP BY g.name
ORDER BY g.name;


-- ── 3. Utilizadores por permissão ───────────────────────────
-- Mostra quantos utilizadores têm cada permissão
SELECT
    i.pk,
    i.value,
    i.label,
    i.category,
    COUNT(c.pk) AS num_utilizadores
FROM ts_interface i
LEFT JOIN ts_client c ON i.pk = ANY(c.interface) AND c.active = true
GROUP BY i.pk, i.value, i.label, i.category
ORDER BY i.pk;


-- ── 4. Tabela de backup (snapshot permanente) ───────────────
-- Cria uma tabela com o estado actual para referência futura
-- ATENÇÃO: só executar UMA vez antes da migração

CREATE TABLE IF NOT EXISTS _backup_permissions_20260331 AS
SELECT
    c.pk         AS user_pk,
    c.name       AS username,
    c.profil     AS profil,
    c.interface  AS permission_ids,
    NOW()        AS backup_at
FROM ts_client c
WHERE c.active = true;

-- Para repor um utilizador específico se necessário:
-- UPDATE ts_client SET interface = b.permission_ids
-- FROM _backup_permissions_20260331 b
-- WHERE ts_client.pk = b.user_pk AND b.user_pk = <PK_DO_UTILIZADOR>;
