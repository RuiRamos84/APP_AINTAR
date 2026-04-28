-- backend/app/sql/rh/15_verify.sql
-- Executar após toda a BD estar criada — verifica integridade do esquema

-- ─── 1. Todas as tabelas existem (deve retornar 18) ──────────────────────────
SELECT
    CASE WHEN COUNT(*) = 18 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/18)' END AS tabelas_check,
    COUNT(*) AS total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    -- Lookups (6)
    'tt_rh_tipo_jornada', 'tt_rh_ponto_evento', 'tt_rh_tipo_ferias',
    'tt_rh_tipo_falta', 'tt_rh_estado_workflow', 'tt_rh_piquete_ocorrencia',
    -- Config (4)
    'ts_rh_config', 'ts_rh_horario', 'ts_feriados', 'ts_rh_colaborador',
    -- Piquete regras (1)
    'ts_rh_piquete_regras',
    -- Transaccionais (7)
    'tb_rh_ponto', 'tb_rh_ponto_mensal', 'tb_rh_ferias',
    'tb_rh_faltas', 'tb_rh_workflow', 'tb_rh_piquete_escala',
    'tb_rh_piquete_ocorrencia'
  );

-- ─── 2. Todas as views existem (deve retornar 16) ───────────────────────────────────
SELECT
    CASE WHEN COUNT(*) = 16 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/16)' END AS views_check,
    COUNT(*) AS total
FROM information_schema.views
WHERE table_name LIKE 'vbl_rh_%';

-- ─── 3. Todas as funções existem (deve retornar >= 15) ───────────────────────
SELECT
    CASE WHEN COUNT(*) >= 15 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/15)' END AS funcoes_check,
    COUNT(*) AS total
FROM information_schema.routines
WHERE routine_name IN (
    -- Utilitárias (3)
    'fn_rh_dias_uteis',
    'fn_rh_calcular_ferias_ano',
    'fn_rh_col_updated_at',
    -- Ponto (3)
    'fbo_rh_ponto_evento', 'fbo_rh_ponto_submeter', 'fbo_rh_ponto_corrigir',
    -- Workflow (1)
    'fbo_rh_workflow',
    -- Férias + Config (3)
    'fbo_rh_ferias', 'fbo_rh_config_upsert', 'fbo_rh_config_ano_init',
    -- Faltas + Horário (2)
    'fbo_rh_faltas', 'fbo_rh_horario',
    -- Piquete (3)
    'fbo_rh_piquete_generate', 'fbo_rh_piquete_confirmar', 'fbo_rh_ocorrencia',
    -- Colaborador (1)
    'fbo_rh_colaborador'
);

-- ─── 4. Seed data ─────────────────────────────────────────────────────────────
SELECT 'Feriados 2026' AS check_name,
    CASE WHEN COUNT(*) = 13 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/13)' END AS resultado
FROM ts_feriados WHERE EXTRACT(YEAR FROM data) = 2026;

SELECT 'Regras piquete' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM ts_rh_piquete_regras;

SELECT 'Lookups estado workflow' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM tt_rh_estado_workflow;

SELECT 'Lookups tipo jornada' AS check_name,
    CASE WHEN COUNT(*) = 2 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/2)' END AS resultado
FROM tt_rh_tipo_jornada;

SELECT 'Lookups tipo falta' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM tt_rh_tipo_falta;

-- ─── 5. Funções utilitárias ───────────────────────────────────────────────────
SELECT 'fn_rh_dias_uteis semana normal' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-04', '2026-05-08') = 5 THEN 'OK'
         ELSE 'FALHOU (esperado 5, obtido ' || fn_rh_dias_uteis('2026-05-04', '2026-05-08') || ')' END AS resultado;

SELECT 'fn_rh_dias_uteis com feriado (1 Mai)' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-04-27', '2026-05-01') = 4 THEN 'OK'
         ELSE 'FALHOU (esperado 4, obtido ' || fn_rh_dias_uteis('2026-04-27', '2026-05-01') || ')' END AS resultado;

SELECT 'fn_rh_dias_uteis fim-de-semana' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-09', '2026-05-10') = 0 THEN 'OK'
         ELSE 'FALHOU (esperado 0)' END AS resultado;

SELECT 'fn_rh_calcular_ferias_ano (sem perfil → 22)' AS check_name,
    CASE WHEN fn_rh_calcular_ferias_ano(0, 2026) = 22 THEN 'OK'
         ELSE 'FALHOU (esperado 22, obtido ' || fn_rh_calcular_ferias_ano(0, 2026) || ')' END AS resultado;

-- ─── 6. Filtro de perfis aplicado nas views ───────────────────────────────────
SELECT 'Filtro perfis vbl_rh_colaborador' AS check_name,
    CASE WHEN (
        SELECT view_definition FROM information_schema.views
        WHERE table_name = 'vbl_rh_colaborador' AND table_schema = 'public'
    ) ILIKE '%ts_profile%' THEN 'OK' ELSE 'FALHOU (filtro ts_profile em falta)' END AS resultado;

-- ─── 7. Permissões RH na ts_interface ────────────────────────────────────────
SELECT 'Permissões RH' AS check_name,
    CASE WHEN COUNT(*) = 5 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/5 — correr 16_permissions.sql)' END AS resultado
FROM ts_interface
WHERE value LIKE 'rh.%';

-- ─── 8. Smoke test: views executam sem erros ─────────────────────────────────
SELECT 'vbl_rh_colaborador'          AS view_name, COUNT(*) AS rows FROM vbl_rh_colaborador
UNION ALL
SELECT 'vbl_rh_ponto',                COUNT(*) FROM vbl_rh_ponto
UNION ALL
SELECT 'vbl_rh_ponto_mensal',         COUNT(*) FROM vbl_rh_ponto_mensal
UNION ALL
SELECT 'vbl_rh_ferias',               COUNT(*) FROM vbl_rh_ferias
UNION ALL
SELECT 'vbl_rh_saldo_ferias',         COUNT(*) FROM vbl_rh_saldo_ferias
UNION ALL
SELECT 'vbl_rh_faltas',               COUNT(*) FROM vbl_rh_faltas
UNION ALL
SELECT 'vbl_rh_horario',              COUNT(*) FROM vbl_rh_horario
UNION ALL
SELECT 'vbl_rh_piquete',              COUNT(*) FROM vbl_rh_piquete
UNION ALL
SELECT 'vbl_rh_piquete_ocorrencias',  COUNT(*) FROM vbl_rh_piquete_ocorrencias
UNION ALL
-- Lookups
SELECT 'vbl_rh_tipo_jornada',         COUNT(*) FROM vbl_rh_tipo_jornada
UNION ALL
SELECT 'vbl_rh_ponto_evento',         COUNT(*) FROM vbl_rh_ponto_evento
UNION ALL
SELECT 'vbl_rh_tipo_ferias',          COUNT(*) FROM vbl_rh_tipo_ferias
UNION ALL
SELECT 'vbl_rh_tipo_falta',           COUNT(*) FROM vbl_rh_tipo_falta
UNION ALL
SELECT 'vbl_rh_estado_workflow',      COUNT(*) FROM vbl_rh_estado_workflow
UNION ALL
SELECT 'vbl_rh_tipo_ocorrencia',      COUNT(*) FROM vbl_rh_tipo_ocorrencia
UNION ALL
-- Config
SELECT 'vbl_rh_config',               COUNT(*) FROM vbl_rh_config;
