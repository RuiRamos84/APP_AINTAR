-- ============================================================
-- AINTAR — Migração para Produção
-- Data: 2026-03-31
--
-- PASSO 1: Migrar grupos para ts_interface (dev → prod)
-- PASSO 2: Limpar permissões de todos os utilizadores
--
-- Executar em produção APÓS add_view_edit_permissions.sql
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PASSO 1 — MIGRAR GRUPOS (ts_interface.groups)
-- Repõe os grupos definidos em dev para cada permissão
-- ════════════════════════════════════════════════════════════

BEGIN;

-- Limpar grupos existentes em produção (começar do zero)
UPDATE ts_interface SET groups = NULL;

-- Atribuir grupos por permissão (fonte: BD de desenvolvimento)
UPDATE ts_interface SET groups = ARRAY['teste']                                                              WHERE pk = 20;
UPDATE ts_interface SET groups = ARRAY['teste']                                                              WHERE pk = 70;
UPDATE ts_interface SET groups = ARRAY['teste']                                                              WHERE pk = 80;
UPDATE ts_interface SET groups = ARRAY['teste']                                                              WHERE pk = 100;
UPDATE ts_interface SET groups = ARRAY['teste']                                                              WHERE pk = 110;
UPDATE ts_interface SET groups = ARRAY['Internos']                                                           WHERE pk = 201;
UPDATE ts_interface SET groups = ARRAY['Internos']                                                           WHERE pk = 220;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 310;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 311;
UPDATE ts_interface SET groups = ARRAY['Internos']                                                           WHERE pk = 312;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 313;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 314;
UPDATE ts_interface SET groups = ARRAY['Internos','Presidentes']                                             WHERE pk = 400;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 500;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 510;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 520;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 530;
UPDATE ts_interface SET groups = ARRAY['Clientte','Freguesias','Internos','Municípios']                      WHERE pk = 540;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 560;
UPDATE ts_interface SET groups = ARRAY['Clientte','Freguesias','Internos','Municípios']                      WHERE pk = 561;
UPDATE ts_interface SET groups = ARRAY['Internos','Municípios']                                              WHERE pk = 600;
UPDATE ts_interface SET groups = ARRAY['Clientte','Freguesias','Internos','Municípios']                      WHERE pk = 700;
UPDATE ts_interface SET groups = ARRAY['Clientte','Freguesias','Internos','Municípios']                      WHERE pk = 710;
UPDATE ts_interface SET groups = ARRAY['Clientte','Freguesias','Internos','Municípios']                      WHERE pk = 720;
UPDATE ts_interface SET groups = ARRAY['Municípios']                                                         WHERE pk = 740;
UPDATE ts_interface SET groups = ARRAY['Internos']                                                           WHERE pk = 750;
UPDATE ts_interface SET groups = ARRAY['Internos']                                                           WHERE pk = 760;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 800;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 810;
UPDATE ts_interface SET groups = ARRAY['Clientte','Externos','Freguesias','Internos','Municípios']           WHERE pk = 820;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 870;
UPDATE ts_interface SET groups = ARRAY['Externos','Internos']                                                WHERE pk = 871;
UPDATE ts_interface SET groups = ARRAY['Clientte','Freguesias','Internos','Municípios']                      WHERE pk = 880;

COMMIT;

-- Verificar grupos migrados:
SELECT g.name, COUNT(i.pk) AS num_permissoes
FROM ts_interface i
CROSS JOIN LATERAL unnest(i.groups) AS g(name)
WHERE i.groups IS NOT NULL AND array_length(i.groups, 1) > 0
GROUP BY g.name
ORDER BY g.name;


-- ════════════════════════════════════════════════════════════
-- PASSO 2 — LIMPAR PERMISSÕES DE TODOS OS UTILIZADORES
-- Super-admins (ts_profile = 0) não são afectados
-- ════════════════════════════════════════════════════════════

BEGIN;

UPDATE ts_client
SET interface = NULL
WHERE COALESCE(active, 1) = 1
  AND ts_profile != 0;

COMMIT;

-- Verificar: todos os utilizadores não-admin sem permissões
SELECT pk, name, ts_profile, interface
FROM ts_client
WHERE COALESCE(active, 1) = 1
  AND ts_profile != 0
ORDER BY ts_profile, name;
